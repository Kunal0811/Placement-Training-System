import os
import json
import time
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google import genai
from google.genai import types
from database import get_cursor

router = APIRouter(prefix="/api/interview", tags=["Interview"])

# --- PYDANTIC SCHEMAS ---
class GenerateQuestionsReq(BaseModel):
    role: str
    count: int = 10

class QAItem(BaseModel):
    question: str
    candidate_answer: str

class EvaluateInterviewReq(BaseModel):
    user_id: int 
    role: str
    qa_pairs: List[QAItem]

class MetricsModel(BaseModel):
    clarity: int
    technical_accuracy: int
    confidence: int
    communication_skills: int
    completeness: int

class PerQuestionAnalysisModel(BaseModel):
    question: str
    candidate_answer: str
    ideal_answer: str
    metrics: MetricsModel

class OverallModel(BaseModel):
    score: int
    communication: int
    technical: int
    confidence: int
    problem_solving: int
    suggestions: str

class InterviewReportModel(BaseModel):
    overall: OverallModel
    per_question_analysis: list[PerQuestionAnalysisModel]


# --- 1. GENERATE QUESTIONS BATCH ---
@router.post("/generate-questions")
async def generate_interview_questions(req: GenerateQuestionsReq):
    api_key = os.getenv("GEMINI_API_KEY_INTERVIEW_INTERVIEW") or os.getenv("GEMINI_API_KEY_INTERVIEW")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    
    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert FAANG-level technical recruiter. You are interviewing a candidate for the role of '{req.role}'.
    Generate exactly {req.count} interview questions. 
    
    Structure the questions naturally:
    - Question 1: An introductory/background question.
    - Middle Questions: A mix of deep technical concepts, scenario-based problem solving, and behavioral questions related to '{req.role}'.
    - Final Question: A concluding or system-design/architecture question.
    
    Make the questions sound like a natural spoken conversation.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[str], 
                temperature=0.7,
            )
        )
        questions = json.loads(response.text)
        return {"questions": questions}

    except Exception as e:
        print(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate interview questions.")


# --- 2. BATCH EVALUATION & DATABASE SAVING ---
@router.post("/evaluate-batch")
async def evaluate_interview_batch(req: EvaluateInterviewReq, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor 
    
    api_key = os.getenv("GEMINI_API_KEY_INTERVIEW_INTERVIEW") or os.getenv("GEMINI_API_KEY_INTERVIEW")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    
    client = genai.Client(api_key=api_key)

    transcript = ""
    for i, qa in enumerate(req.qa_pairs):
        transcript += f"\n--- Question {i+1} ---\nAI: {qa.question}\nCandidate: {qa.candidate_answer}\n"

    prompt = f"""
    You are an expert FAANG-level Hiring Manager. You just finished conducting an interview for the role of '{req.role}'.
    Review the following transcript of the candidate's answers and provide a highly detailed, strict evaluation.
    
    TRANSCRIPT:
    {transcript}

    INSTRUCTIONS:
    1. Be highly critical. Do not give 10/10 easily. 
    2. Evaluate technical accuracy strictly.
    3. Generate the 'ideal_answer' showing exactly how a senior engineer would have answered the question.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InterviewReportModel, 
                temperature=0.4, 
            )
        )
        
        report = json.loads(response.text)

        # ==========================================
        # 🔥 DATABASE SAVING LOGIC (Self-Healing)
        # ==========================================
        try:
            # 1. Ensure base table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS interview_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 2. Self-Healing: Inject any missing columns safely!
            alter_queries = [
                "ALTER TABLE interview_attempts ADD COLUMN role VARCHAR(255)",
                "ALTER TABLE interview_attempts ADD COLUMN score INT",
                "ALTER TABLE interview_attempts ADD COLUMN technical_score INT",
                "ALTER TABLE interview_attempts ADD COLUMN communication_score INT",
                "ALTER TABLE interview_attempts ADD COLUMN report_json LONGTEXT"
            ]
            for query in alter_queries:
                try: cursor.execute(query)
                except Exception: pass # Column already exists, safe to ignore

            # 3. Insert the new data
            cursor.execute("""
                INSERT INTO interview_attempts (user_id, role, score, technical_score, communication_score, report_json)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                req.user_id, 
                req.role, 
                report["overall"]["score"], 
                report["overall"]["technical"], 
                report["overall"]["communication"],
                json.dumps(report) 
            ))
            db.commit()
            print(f"✅ Successfully saved interview score ({report['overall']['score']}) for User {req.user_id}")
            
        except Exception as db_err:
            print(f"⚠️ Failed to save to database: {db_err}")
            db.rollback()

        return {"report": report}

    except Exception as e:
        print(f"Error evaluating interview: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate evaluation report.")


# --- 3. FETCH HISTORY FOR DASHBOARD ---
@router.get("/history/{user_id}")
async def get_interview_history(user_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        # Prevent crash if the table hasn't been created yet
        cursor.execute("SHOW TABLES LIKE 'interview_attempts'")
        if not cursor.fetchone():
            return {"history": []}

        cursor.execute("""
            SELECT id, role, score, technical_score, communication_score, timestamp 
            FROM interview_attempts 
            WHERE user_id = %s 
            ORDER BY timestamp DESC
        """, (user_id,))
        
        history = cursor.fetchall()
        
        for attempt in history:
            if 'timestamp' in attempt and attempt['timestamp']:
                attempt['timestamp'] = attempt['timestamp'].strftime("%b %d, %Y - %I:%M %p")
                
        return {"history": history}
        
    except Exception as e:
        print(f"Error fetching interview history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch interview history.")