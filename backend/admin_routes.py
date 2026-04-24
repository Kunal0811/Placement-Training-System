import os
import json
import smtplib
import asyncio
import mysql.connector
from email.message import EmailMessage
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from database import get_cursor
from passlib.hash import bcrypt
from google import genai

router = APIRouter(prefix="/api/admin", tags=["Admin"])

class AdminLoginReq(BaseModel):
    admin_id: str
    password: str

class ScheduleTestReq(BaseModel):
    title: str
    category: str
    scheduled_time: str
    duration: int

def send_mass_email(emails, subject, body):
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = os.getenv("EMAIL_USER")
        msg.set_content(body)
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_PASS"))
            for email in emails:
                msg["To"] = email
                smtp.send_message(msg)
                del msg["To"]
    except Exception as e:
        print(f"Mass email failed: {e}")

@router.post("/login")
def admin_login(req: AdminLoginReq, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT * FROM admins WHERE admin_id = %s", (req.admin_id,))
    admin = cursor.fetchone()

    if not admin or not bcrypt.verify(req.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid Admin ID or Password")
    
    return {
        "message": "Login successful",
        "user": {"id": admin['id'], "admin_id": admin['admin_id'], "name": admin['name'], "role": "admin"}
    }

@router.get("/stats")
def get_admin_stats(db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT COUNT(*) as count FROM users")
    users = cursor.fetchone()['count']
    cursor.execute("SELECT COUNT(*) as count FROM scheduled_tests")
    tests = cursor.fetchone()['count']
    return {"total_users": users, "total_tests": tests}

@router.get("/tests")
def get_all_tests(db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT id, title, test_category, scheduled_time, duration_minutes, status FROM scheduled_tests ORDER BY scheduled_time DESC")
    return cursor.fetchall()

@router.delete("/tests/{test_id}")
def delete_test(test_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("DELETE FROM scheduled_tests WHERE id = %s", (test_id,))
    db.commit()
    return {"message": "Test deleted successfully"}

# --- 🔥 NEW: Get ALL Users for the Admin Dashboard ---
@router.get("/users")
def get_all_users(db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        cursor.execute("""
            SELECT id, fname, lname, email, created_at 
            FROM users 
            ORDER BY created_at DESC
        """)
        return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users list")

# --- HELPER: Async chunk fetching with BULLETPROOF JSON Rules ---
async def fetch_question_chunk_async(client, category: str, diff: str, count: int):
    prompt = f"""
    You are an expert exam setter creating a rigorous campus placement assessment for final-year engineering/IT students.
    Generate exactly {count} UNIQUE and DISTINCT multiple-choice questions for a {category} assessment.
    DIFFICULTY LEVEL: {diff}.
    
    CRITICAL RULES FOR QUESTIONS:
    1. ZERO REPETITION: Every single question MUST test a completely different sub-topic. If you generate a Syllogism question, do NOT generate another Syllogism. Force maximum diversity.
    2. TARGET AUDIENCE: University graduates preparing for top-tier corporate hiring exams. No elementary math.
    3. If category is 'Aptitude': Mix Quantitative Aptitude, Logical Reasoning, and Advanced Verbal.
    4. If category is 'Technical': Mix DBMS, OS, Networking, OOPs, DSA, and Code output tracing.
    
    CRITICAL JSON FORMATTING RULES (FAILURE TO FOLLOW WILL BREAK THE SYSTEM):
    1. DO NOT use unescaped double quotes (") inside your strings. If you need to quote something, use single quotes (') or escape them (\\").
    2. DO NOT use raw line breaks (hitting the Enter key) inside your string values. 
    3. To create paragraph breaks in the explanation, you MUST use the literal characters \\n\\n typed out.
    4. Break the explanation into logical steps (e.g., Step 1, Step 2, Final Answer).

    Return STRICTLY a valid JSON array of objects. DO NOT wrap in markdown formatting.
    [
        {{
            "q": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "ans": "Option A",
            "diff": "{diff}",
            "exp": "Step 1: Identify the core pattern.\\n\\nStep 2: Apply the formula.\\n\\nConclusion: Therefore, the correct answer is Option A."
        }}
    ]
    """
    print(f"⏳ Background: Generating {count} {diff} questions for University Level...")
    for attempt in range(3):
        try:
            response = await client.aio.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
            
            text = response.text
            start_idx, end_idx = text.find('['), text.rfind(']')
            
            if start_idx != -1 and end_idx != -1:
                cleaned = text[start_idx:end_idx+1]
            else:
                cleaned = text.replace("```json", "").replace("```", "").strip()
                
            cleaned = cleaned.replace('\r', '').replace('\t', ' ')
            
            data = json.loads(cleaned)
            print(f"✅ Background: Successfully generated {len(data)} {diff} questions!")
            return data
        except Exception as e:
            print(f"⚠️ Background: Attempt {attempt+1} failed for {diff}: {e}")
            await asyncio.sleep(5)
    return []

# --- Delete a user and all their history ---
@router.delete("/users/{user_id}")
def delete_user(user_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        print(f"🗑️ Attempting to delete user {user_id} and all their data...")
        
        cursor.execute("DELETE FROM test_results WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM coding_attempts WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM gd_participants WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM gd_evaluations WHERE user_id = %s", (user_id,))
        
        # 🔥 FIX: Safely delete from the NEW interview_attempts table
        try:
            cursor.execute("DELETE FROM interview_attempts WHERE user_id = %s", (user_id,))
        except Exception:
            pass # Table might not exist yet
        
        cursor.execute("SET FOREIGN_KEY_CHECKS=0")
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        cursor.execute("SET FOREIGN_KEY_CHECKS=1")
        db.commit()
        
        print(f"✅ Successfully deleted user {user_id}")
        return {"message": "User and all associated data deleted successfully"}
        
    except Exception as e:
        db.rollback()
        cursor.execute("SET FOREIGN_KEY_CHECKS=1") 
        print(f"❌ Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user from database.")

# --- THE BACKGROUND TASK: Generate MCQs ---
async def generate_test_background(test_id: int, req: ScheduleTestReq):
    print(f"🚀 Background Task Started for Test ID {test_id}")
    api_key = os.getenv("GEMINI_API_KEY_APTITUDE") or os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    easy_qs = await fetch_question_chunk_async(client, req.category, "Easy", 10)
    print("😴 Sleeping for 60 seconds to reset rate limit...")
    await asyncio.sleep(60)

    med_qs = await fetch_question_chunk_async(client, req.category, "Medium", 15)
    print("😴 Sleeping for 60 seconds to reset rate limit...")
    await asyncio.sleep(60)

    hard_qs_1 = await fetch_question_chunk_async(client, req.category, "Hard", 15)
    print("😴 Sleeping for 60 seconds to reset rate limit...")
    await asyncio.sleep(60)

    hard_qs_2 = await fetch_question_chunk_async(client, req.category, "Hard", 10)

    all_questions = easy_qs + med_qs + hard_qs_1 + hard_qs_2
    print(f"🎉 Background Task Finished Generation. Total: {len(all_questions)}")

    try:
        db = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "placify"),
            port=int(os.getenv("DB_PORT", 3306)),  # <-- ADD THIS
            ssl_disabled=False                     # <-- ADD THIS
        )
        cursor = db.cursor(dictionary=True)
        
        questions_json = json.dumps(all_questions)
        cursor.execute("UPDATE scheduled_tests SET questions = %s WHERE id = %s", (questions_json, test_id))
        db.commit()

        cursor.execute("SELECT email FROM users")
        emails = [u['email'] for u in cursor.fetchall()]

        email_body = f"Hello Student,\n\nA new {req.category.capitalize()} test has been scheduled!\nTest: {req.title}\nTime: {req.scheduled_time}\nDuration: {req.duration} mins\n\nYou MUST start the test within 10 minutes of the scheduled time.\n\nBest of luck!"
        send_mass_email(emails, f"New Scheduled Test: {req.title}", email_body)
        print("✅ Emails sent in background.")

    except Exception as e:
        print(f"❌ Background DB/Email Error: {e}")
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'db' in locals(): db.close()

# --- Get Leaderboard/Results for a specific test ---
@router.get("/tests/{test_id}/results")
def get_test_results(test_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        cursor.execute("""
            SELECT r.user_id, r.user_name, r.score, r.total, r.created_at, u.email
            FROM test_results r
            JOIN users u ON r.user_id = u.id
            WHERE r.test_id = %s
            ORDER BY r.score DESC, r.created_at ASC
        """, (test_id,))
        return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching results: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch test results")

# --- Background Task for Coding Tests with BULLETPROOF JSON Rules ---
async def generate_coding_test_background(test_id: int, req: ScheduleTestReq):
    print(f"🚀 Background Task Started for Coding Test ID {test_id}")
    api_key = os.getenv("GEMINI_API_KEY_INTERVIEW") or os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    prompt = """
    Generate exactly 3 distinct coding challenges for a programming assessment.
    DIFFICULTY BREAKDOWN: Exactly 1 Easy, 1 Medium, and 1 Hard.
    
    CRITICAL JSON FORMATTING RULES:
    1. DO NOT use unescaped double quotes (") inside strings (especially in the code strings). Use single quotes or escape them (\\").
    2. For multi-line strings (like the starter_code and driver_code), you MUST use the literal characters \\n instead of pressing the Enter key.
    
    Return STRICTLY a valid JSON array of objects. DO NOT wrap in markdown formatting.
    [
        {
            "title": "Problem Name",
            "description": "Detailed problem statement...",
            "difficulty": "Easy",
            "test_cases": [
                {"input": "2 3", "expected_output": "5"}
            ],
            "starter_code": {
                "python": "def solve(a, b):\\n    # Write your code here\\n    pass",
                "java": "class Solution {\\n    public int solve(int a, int b) {\\n        // Write your code here\\n        return 0;\\n    }\\n}",
                "cpp": "class Solution {\\npublic:\\n    int solve(int a, int b) {\\n        // Write your code here\\n        return 0;\\n    }\\n};"
            },
            "driver_code": {
                "python": "\\nimport sys\\nif __name__ == '__main__':\\n    input_data = sys.stdin.read().split()\\n    if input_data:\\n        print(solve(int(input_data[0]), int(input_data[1])))",
                "java": "\\nimport java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        if(sc.hasNextInt()) {\\n            int a = sc.nextInt();\\n            int b = sc.nextInt();\\n            Solution sol = new Solution();\\n            System.out.println(sol.solve(a, b));\\n        }\\n    }\\n}",
                "cpp": "\\n#include <iostream>\\nusing namespace std;\\nint main() {\\n    int a, b;\\n    if(cin >> a >> b) {\\n        Solution sol;\\n        cout << sol.solve(a, b) << endl;\\n    }\\n    return 0;\\n}"
            }
        }
    ]
    IMPORTANT RULES FOR DRIVER CODE: 
    1. The user's starter code will be pasted EXACTLY ABOVE your driver code.
    2. The driver code MUST parse standard input, call the user's function/class, and print the result.
    3. In Java, DO NOT make the user's class 'public'. ONLY the driver code should have 'public class Main'.
    """
    
    all_questions = []
    for attempt in range(3):
        try:
            print(f"⏳ Generating Coding Questions (Attempt {attempt+1})...")
            response = await client.aio.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
            
            text = response.text
            start_idx, end_idx = text.find('['), text.rfind(']')
            
            if start_idx != -1 and end_idx != -1:
                cleaned = text[start_idx:end_idx+1]
            else:
                cleaned = text.replace("```json", "").replace("```", "").strip()
                
            cleaned = cleaned.replace('\r', '').replace('\t', ' ')
            all_questions = json.loads(cleaned)
            break
        except Exception as e:
            print(f"⚠️ Coding Gen Error: {e}")
            await asyncio.sleep(5)

    print(f"🎉 Background Task Finished Coding Generation. Total: {len(all_questions)}")

    try:
        db = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"), 
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""), 
            database=os.getenv("DB_NAME", "placify"),
            port=int(os.getenv("DB_PORT", 3306)),  # <-- ADD THIS
            ssl_disabled=False                     # <-- ADD THIS
        )
        cursor = db.cursor(dictionary=True)
        cursor.execute("UPDATE scheduled_tests SET questions = %s WHERE id = %s", (json.dumps(all_questions), test_id))
        db.commit()

        cursor.execute("SELECT email FROM users")
        emails = [u['email'] for u in cursor.fetchall()]
        email_body = f"Hello Student,\n\nA new Coding Assessment has been scheduled!\nTest: {req.title}\nTime: {req.scheduled_time}\nDuration: {req.duration} mins\n\nYou MUST start the test within 10 minutes of the scheduled time.\n\nBest of luck!"
        send_mass_email(emails, f"New Scheduled Coding Test: {req.title}", email_body)
    except Exception as e:
        print(f"❌ Background DB/Email Error: {e}")
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'db' in locals(): db.close()

@router.post("/schedule-test")
def schedule_test(req: ScheduleTestReq, background_tasks: BackgroundTasks, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        cursor.execute(
            "INSERT INTO scheduled_tests (title, test_category, scheduled_time, duration_minutes, questions) VALUES (%s, %s, %s, %s, %s)",
            (req.title, req.category, req.scheduled_time, req.duration, "[]")
        )
        db.commit()
        test_id = cursor.lastrowid

        if req.category.lower() == "coding":
            background_tasks.add_task(generate_coding_test_background, test_id, req)
            return {"message": "Coding Test scheduling started! AI is generating 3 problems in the background."}
        else:
            background_tasks.add_task(generate_test_background, test_id, req)
            return {"message": "MCQ Test scheduling started! AI is generating 50 questions in the background (takes ~3 mins)."}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to initiate schedule: {str(e)}")

@router.get("/users/{user_id}/profile")
def get_student_profile(user_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        # 1. Basic Info
        cursor.execute("SELECT id, fname, lname, email, created_at FROM users WHERE id = %s", (user_id,))
        user_info = cursor.fetchone()
        if not user_info: raise HTTPException(status_code=404, detail="User not found")

        # 2. Test History & Trends
        cursor.execute("""
            SELECT t.title, t.test_category, r.score, r.total, r.created_at 
            FROM test_results r 
            JOIN scheduled_tests t ON r.test_id = t.id 
            WHERE r.user_id = %s 
            ORDER BY r.created_at DESC
        """, (user_id,))
        tests = cursor.fetchall()

        test_trend = []
        category_stats = {}
        
        for i, t in enumerate(reversed(tests[:10])):
            pct = round((t['score'] / max(1, t['total'])) * 100)
            test_trend.append({"name": f"Test {i+1}", "score": pct})
            
            cat = t['test_category'].capitalize()
            if cat not in category_stats:
                category_stats[cat] = {'score': 0, 'total': 0}
            category_stats[cat]['score'] += t['score']
            category_stats[cat]['total'] += t['total']

        subject_mastery = [
            {"subject": k, "accuracy": round((v['score'] / max(1, v['total'])) * 100)} 
            for k, v in category_stats.items()
        ]

        weakest_subject = "None"
        if subject_mastery:
            weakest_subject = min(subject_mastery, key=lambda x: x['accuracy'])['subject']

        # 3. Coding Analytics
        cursor.execute("""
            SELECT difficulty, COUNT(DISTINCT problem_title) as solved 
            FROM coding_attempts 
            WHERE user_id = %s AND is_correct = 1 
            GROUP BY difficulty
        """, (user_id,))
        coding_stats = {"easy": 0, "medium": 0, "hard": 0, "total": 0}
        for row in cursor.fetchall():
            diff = row['difficulty'].lower()
            coding_stats[diff] = row['solved']
            coding_stats['total'] += row['solved']

        # 4. Soft Skills & Gamification (🔥 FIXED TO USE NEW INTERVIEW TABLE)
        try:
            cursor.execute("SELECT COUNT(*) as count, AVG(score) as avg_score FROM interview_attempts WHERE user_id = %s", (user_id,))
            int_data = cursor.fetchone()
        except Exception:
            int_data = {'count': 0, 'avg_score': 0}
            
        try:
            cursor.execute("SELECT COUNT(*) as count FROM gd_participants WHERE user_id = %s", (user_id,))
            gd_data = cursor.fetchone()
        except Exception:
            gd_data = {'count': 0}

        soft_skills = {
            "interviews_taken": int_data['count'] if int_data and int_data['count'] else 0,
            "avg_interview_score": round(int_data['avg_score'] or 0, 1) if int_data else 0,
            "gds_attended": gd_data['count'] if gd_data and gd_data['count'] else 0
        }

        # 5. Calculate Health Score
        health_score = 100
        test_avg = sum([t['score'] for t in test_trend]) / len(test_trend) if test_trend else 0
        
        if not tests: health_score -= 30
        if test_avg < 50: health_score -= 20
        elif test_avg < 75: health_score -= 10
        if coding_stats['total'] < 5: health_score -= 20
        elif coding_stats['total'] < 15: health_score -= 10

        health_score = max(0, min(100, int(health_score)))

        if health_score >= 80: readiness = "Placement Ready"
        elif health_score >= 50: readiness = "Needs Practice"
        else: readiness = "At Risk"

        return {
            "user": user_info,
            "health_score": health_score,
            "readiness": readiness,
            "test_avg": round(test_avg, 1),
            "tests_taken": len(tests),
            "test_history": tests,
            "test_trend": test_trend,
            "subject_mastery": subject_mastery,
            "weakest_subject": weakest_subject,
            "coding": coding_stats,
            "soft_skills": soft_skills
        }
    except Exception as e:
        print(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch student profile")