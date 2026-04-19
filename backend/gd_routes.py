import os
import json
from typing import Dict
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from google import genai
from database import get_cursor
from datetime import datetime
import smtplib
from email.message import EmailMessage

router = APIRouter(prefix="/api/gd", tags=["Group Discussion"])

def send_notification_email(to_email: str, subject: str, body: str):
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = os.getenv("EMAIL_USER")
        msg["To"] = to_email
        msg.set_content(body)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_PASS"))
            smtp.send_message(msg)
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")

class CreateSessionReq(BaseModel):
    host_id: int
    host_name: str
    scheduled_time: str

class JoinSessionReq(BaseModel):
    session_id: int
    user_id: int
    user_name: str

class EvaluateReq(BaseModel):
    session_id: int
    topic: str

# --- 1. REST APIs for Lobby ---

@router.post("/create")
async def create_session(req: CreateSessionReq, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        api_key = os.getenv("GEMINI_API_KEY_INTERVIEW") or os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        prompt = """
        Generate exactly ONE standard, real-world Group Discussion (GD) topic commonly asked in IT/Engineering corporate campus placements. 
        Topics should be about modern workplace culture, software industry trends, or general technology (e.g., 'Work from Home vs Office', 'Will AI replace software engineers?', 'Impact of Social Media'). 
        Keep it relatable for 22-year-old college students. Return ONLY the topic string, no quotes or intro.
        """
        response = await client.aio.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
        ai_topic = response.text.strip().strip('"').strip("'")

        cursor.execute(
            "INSERT INTO gd_sessions (host_id, host_name, scheduled_time, topic, status) VALUES (%s, %s, %s, %s, %s)",
            (req.host_id, req.host_name, req.scheduled_time, ai_topic, "scheduled")
        )
        session_id = cursor.lastrowid
        
        cursor.execute(
            "INSERT INTO gd_participants (session_id, user_id, user_name) VALUES (%s, %s, %s)",
            (session_id, req.host_id, req.host_name)
        )
        db.commit()

        cursor.execute("SELECT email FROM users WHERE id != %s", (req.host_id,))
        users = cursor.fetchall()
        time_formatted = datetime.fromisoformat(req.scheduled_time).strftime("%B %d, %Y at %I:%M %p")
        
        for u in users:
            body = f"Hello,\n\n{req.host_name} has scheduled a Group Discussion session.\nTime: {time_formatted}\nThe topic will be revealed by AI at the start of the session.\n\nLogin to Placify to book your spot!"
            send_notification_email(u['email'], "New Live GD Scheduled!", body)

        return {"message": "Session created, AI generated the topic, and users notified!", "session_id": session_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
def get_sessions(db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("""
        SELECT s.id, s.host_id, s.host_name as host, s.scheduled_time as time, s.topic, s.status,
               (SELECT COUNT(*) FROM gd_participants WHERE session_id = s.id) as participants,
               (SELECT GROUP_CONCAT(user_id) FROM gd_participants WHERE session_id = s.id) as participant_ids
        FROM gd_sessions s
        WHERE s.status IN ('scheduled', 'active')
        ORDER BY s.scheduled_time ASC
    """)
    return cursor.fetchall()

@router.post("/book")
def book_session(req: JoinSessionReq, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        cursor.execute("SELECT COUNT(*) as count FROM gd_participants WHERE session_id = %s", (req.session_id,))
        if cursor.fetchone()['count'] >= 6:
            raise HTTPException(status_code=400, detail="Room is full")
            
        cursor.execute(
            "INSERT IGNORE INTO gd_participants (session_id, user_id, user_name) VALUES (%s, %s, %s)",
            (req.session_id, req.user_id, req.user_name)
        )
        db.commit()
        return {"message": "Seat booked successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. WEBSOCKETS FOR LIVE ROOM ---

class GDConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Dict] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str, user_name: str):
        await websocket.accept()
        if session_id not in self.rooms:
            self.rooms[session_id] = {"participants": {}, "transcript": []}
        
        self.rooms[session_id]["participants"][user_id] = websocket
        await self.broadcast(session_id, {"type": "system", "text": f"{user_name} joined the room."})

    def disconnect(self, session_id: str, user_id: str, user_name: str):
        if session_id in self.rooms and user_id in self.rooms[session_id]["participants"]:
            del self.rooms[session_id]["participants"][user_id]

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.rooms:
            if message.get("type") == "user_message":
                self.rooms[session_id]["transcript"].append(message)
            for ws in self.rooms[session_id]["participants"].values():
                await ws.send_json(message)

manager = GDConnectionManager()

@router.websocket("/ws/{session_id}/{user_id}/{user_name}")
async def gd_websocket(websocket: WebSocket, session_id: str, user_id: str, user_name: str):
    await manager.connect(websocket, session_id, user_id, user_name)
    try:
        while True:
            data = await websocket.receive_text()
            if data.startswith("SYS_CMD:"):
                await manager.broadcast(session_id, {"type": "system_command", "cmd": data.replace("SYS_CMD:", "")})
            else:
                await manager.broadcast(session_id, {"type": "user_message", "user": user_name, "text": data})
    except WebSocketDisconnect:
        manager.disconnect(session_id, user_id, user_name)
        await manager.broadcast(session_id, {"type": "system", "text": f"{user_name} left the room."})

# --- 3. AI EVALUATION ---

@router.post("/evaluate")
async def evaluate_gd(req: EvaluateReq, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    room_data = manager.rooms.get(str(req.session_id))
    
    # 1. Check if already evaluated to prevent double-generation
    cursor.execute("SELECT status FROM gd_sessions WHERE id=%s", (req.session_id,))
    session = cursor.fetchone()
    if session and session['status'] == 'completed':
        cursor.execute("""
            SELECT e.*, p.user_name FROM gd_evaluations e
            JOIN gd_participants p ON e.user_id = p.user_id AND e.session_id = p.session_id
            WHERE e.session_id = %s
        """, (req.session_id,))
        evals = cursor.fetchall()
        if evals:
            return [{
                "user_name": e["user_name"], "clarity": e["clarity"], "confidence": e["confidence"],
                "logic": e["content"], "communication": e["communication"], "leadership": e["leadership"],
                "total": e["overall_score"], 
                "strengths": json.loads(e["strengths"]) if isinstance(e["strengths"], str) else e["strengths"],
                "weaknesses": json.loads(e["improvements"]) if isinstance(e["improvements"], str) else e["improvements"],
                "advice": e["ideal_response"]
            } for e in evals]

    # 2. Grab actual Participants from the Database
    cursor.execute("SELECT user_id, user_name FROM gd_participants WHERE session_id=%s", (req.session_id,))
    participants = cursor.fetchall()
    participant_names = [p['user_name'] for p in participants]
    name_to_id = {p['user_name'].lower(): p['user_id'] for p in participants}

    transcript_text = "Silent room. No one spoke."
    if room_data and room_data["transcript"]:
        transcript_text = "\n".join([f"{msg['user']}: {msg['text']}" for msg in room_data["transcript"]])
    
    # 3. STRICT AI Prompt forcing it to use real names
    prompt = f"""
    You are an expert HR Interviewer. Analyze this Group Discussion transcript.
    Topic: {req.topic}
    
    The official participants in this room are: {', '.join(participant_names)}

    Transcript:
    {transcript_text}

    RULES:
    1. You MUST evaluate EVERY SINGLE PARTICIPANT listed above.
    2. Do NOT use placeholder names like 'Test User'. ONLY use the exact names from the official participants list.
    3. If a participant did not speak at all, give them a low score (e.g., 2 or 3) and mention "Did not participate" in their weaknesses.
    4. Provide 5 metrics (each out of 10): Clarity, Confidence, Logic, Communication, Leadership.
    
    Return a STRICT JSON array exactly like this:
    [
      {{
        "user_name": "Exact Name", "clarity": 5, "confidence": 5, "logic": 5, "communication": 5, "leadership": 5,
        "total": 25, "strengths": ["Good point"], "weaknesses": ["Spoke too fast"], "advice": "Please speak clearly."
      }},
      {{ ... next participant ... }}
    ]
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY_INTERVIEW") or os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        response = await client.aio.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
        
        cleaned = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        
        # 4. Save to Database
        for ev in data:
            u_name = ev.get("user_name", "")
            u_id = name_to_id.get(u_name.lower())
            
            # Save if the user exists
            if u_id:
                cursor.execute("""
                    INSERT INTO gd_evaluations
                    (session_id, user_id, overall_score, communication, content, confidence, leadership, clarity, strengths, improvements, ideal_response)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    req.session_id, u_id, ev.get("total", 0), ev.get("communication", 0),
                    ev.get("logic", 0), ev.get("confidence", 0), ev.get("leadership", 0),
                    ev.get("clarity", 0), json.dumps(ev.get("strengths", [])),
                    json.dumps(ev.get("weaknesses", [])), ev.get("advice", "")
                ))

        cursor.execute("UPDATE gd_sessions SET status='completed' WHERE id=%s", (req.session_id,))
        db.commit()

        # 5. Send exact evaluated data back to React
        cursor.execute("""
            SELECT e.*, p.user_name FROM gd_evaluations e
            JOIN gd_participants p ON e.user_id = p.user_id AND e.session_id = p.session_id
            WHERE e.session_id = %s
        """, (req.session_id,))
        final_evals = cursor.fetchall()

        return [{
            "user_name": e["user_name"], "clarity": e["clarity"], "confidence": e["confidence"],
            "logic": e["content"], "communication": e["communication"], "leadership": e["leadership"],
            "total": e["overall_score"], 
            "strengths": json.loads(e["strengths"]) if isinstance(e["strengths"], str) else e["strengths"],
            "weaknesses": json.loads(e["improvements"]) if isinstance(e["improvements"], str) else e["improvements"],
            "advice": e["ideal_response"]
        } for e in final_evals]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ADD THIS TO THE BOTTOM OF backend/gd_routes.py ---

@router.get("/user/{user_id}/history")
def get_user_gd_history(user_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        cursor.execute("""
            SELECT e.overall_score, e.communication, e.content, e.confidence, 
                   e.leadership, e.clarity, e.strengths, e.improvements, e.ideal_response,
                   s.topic, s.scheduled_time as created_at
            FROM gd_evaluations e
            JOIN gd_sessions s ON e.session_id = s.id
            WHERE e.user_id = %s
            ORDER BY s.scheduled_time ASC
        """, (user_id,))
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))