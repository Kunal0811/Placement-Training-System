# backend/main.py
import os
import re
import json
import mysql.connector
from fastapi import FastAPI, Body, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import secrets
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage
from passlib.hash import argon2
import shutil
import uuid
import nltk
import interview_models
from sqlalchemy import text
import resource_routes

# Import from the new database file and other route files
from database import get_cursor, engine, Base, db_config
from aptitude_routes import router as aptitude_router
from technical_routes import router as technical_router
from coding_routes import router as coding_router
from resume_routes import router as resume_router
from interview_routes import router as interview_router
from gd_routes import router as gd_router
from admin_routes import router as admin_router
from test_routes import router as test_router

# --- Setup ---
load_dotenv()

Base.metadata.create_all(bind=engine)


try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    print("Downloading NLTK 'punkt' package...")
    nltk.download('punkt_tab')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    print("Downloading NLTK 'stopwords' package...")
    nltk.download('stopwords')

app = FastAPI(title="Placify Backend", version="1.0.0")

# --- PASTE THE NEW CODE RIGHT HERE ---
@app.on_event("startup")
def create_legacy_tables():
    """Automatically builds all missing MySQL tables in Aiven when Render starts."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # NOTE: Order matters here! Tables without foreign keys MUST be created first.
        queries = [
            # --- LEVEL 0: Base Tables (No dependencies) ---
            """CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fname VARCHAR(50),
                lname VARCHAR(50),
                email VARCHAR(100) UNIQUE,
                year INT,
                field VARCHAR(50),
                password VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                profile_picture_url VARCHAR(255)
            )""",
            """CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS module_resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                module_name VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                resource_type VARCHAR(50) NOT NULL,
                resource_url TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) NOT NULL,
                resource_type VARCHAR(100) NOT NULL,
                content_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS scheduled_tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                test_category VARCHAR(50) NOT NULL,
                scheduled_time DATETIME NOT NULL,
                duration_minutes INT NOT NULL,
                status VARCHAR(50) DEFAULT 'upcoming',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                questions JSON
            )""",
            """CREATE TABLE IF NOT EXISTS interview_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                role VARCHAR(255),
                score INT,
                technical_score INT,
                communication_score INT,
                report_json LONGTEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS user_question_tracking (
                user_id INT NOT NULL,
                question_id VARCHAR(100) NOT NULL,
                is_correct TINYINT(1),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, question_id)
            )""",

            # --- LEVEL 1: Tables that depend on Level 0 (users, scheduled_tests) ---
            """CREATE TABLE IF NOT EXISTS coding_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                problem_title VARCHAR(255) NOT NULL,
                difficulty VARCHAR(50) NOT NULL,
                is_correct TINYINT(1) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )""",
            """CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                otp VARCHAR(6) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE IF NOT EXISTS test_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                topic VARCHAR(255) NOT NULL,
                mode VARCHAR(20),
                score INT NOT NULL,
                total INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                time_taken INT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )""",
            """CREATE TABLE IF NOT EXISTS test_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                test_id INT,
                user_id INT,
                user_name VARCHAR(100),
                score INT,
                total INT,
                answers JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (test_id) REFERENCES scheduled_tests(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE IF NOT EXISTS user_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                topic VARCHAR(255) NOT NULL,
                completed_notes TINYINT(1) DEFAULT 0,
                completed_videos TINYINT(1) DEFAULT 0,
                UNIQUE KEY unique_progress (user_id, topic),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )""",
            """CREATE TABLE IF NOT EXISTS gd_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                host_id INT,
                host_name VARCHAR(255),
                scheduled_time VARCHAR(100),
                topic VARCHAR(255),
                status VARCHAR(50) DEFAULT 'scheduled',
                FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE IF NOT EXISTS interview_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                job_role VARCHAR(100),
                difficulty VARCHAR(50),
                interview_type VARCHAR(50),
                topic VARCHAR(100),
                start_time DATETIME,
                end_time DATETIME,
                overall_score FLOAT,
                feedback_summary TEXT,
                communication_score FLOAT,
                technical_score FLOAT,
                confidence_score FLOAT,
                problem_solving_score FLOAT
            )""",

            # --- LEVEL 2: Tables that depend on Level 1 (gd_sessions, interview_sessions) ---
            """CREATE TABLE IF NOT EXISTS gd_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT,
                user_id INT,
                user_name VARCHAR(255),
                UNIQUE KEY unique_booking (session_id, user_id),
                FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE IF NOT EXISTS gd_evaluations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT,
                user_id INT,
                overall_score FLOAT,
                communication FLOAT,
                content FLOAT,
                confidence FLOAT,
                leadership FLOAT,
                clarity FLOAT,
                strengths JSON,
                improvements JSON,
                ideal_response TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE IF NOT EXISTS interview_turns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT,
                question_text TEXT,
                question_type VARCHAR(50),
                user_answer_text TEXT,
                user_answer_audio_url VARCHAR(255),
                ai_score INT,
                ai_feedback TEXT,
                ai_suggested_answer TEXT,
                turn_number INT,
                FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
            )"""
        ]
        
        for q in queries:
            cursor.execute(q)
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ All 17 MySQL Tables Created Successfully in Aiven!")
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")

# -------------------------------------
# Create the directory if it doesn't exist
os.makedirs("static/resources", exist_ok=True)
# Mount it to the server
app.mount("/static/resources", StaticFiles(directory="static/resources"), name="resources")

# --- Mount Static Files Directory ---
os.makedirs("static/profile_pics", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- CORS Middleware ---
# Change this block in main.py
origins = [
    "https://placement-training-system-55wp.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(aptitude_router)
app.include_router(technical_router)
app.include_router(coding_router)
app.include_router(resume_router, prefix="/api")
app.include_router(interview_router)
app.include_router(gd_router)
app.include_router(admin_router)
app.include_router(test_router)
app.include_router(resource_routes.router)

registration_otps = {}

# ---- Pydantic Models ----
class RegisterUser(BaseModel):
    fname: str
    lname: str
    email: EmailStr
    year: int
    field: str
    password: str
    otp: str 

class RegistrationOTPRequest(BaseModel):
    email: EmailStr

class LoginUser(BaseModel):
    email: EmailStr
    password: str

class SubmitTest(BaseModel):
    user_id: int
    topic: str
    mode: str
    score: int
    total: int = 20
    time_taken: int | None = None

class ModeStatusRequest(BaseModel):
    userId: int
    topic: str
    mode: str

class BestScoreRequest(BaseModel):
    userId: int
    topic: str
    mode: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    
class ResetPasswordWithIDRequest(BaseModel):
    user_id: int
    password: str

# ---- Utility Functions ----
def send_email(to_email: str, subject: str, body: str):
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASS")
    
    if not email_user or not email_pass:
        print("CRITICAL: EMAIL_USER or EMAIL_PASS environment variables are missing in Render!")
        raise HTTPException(status_code=500, detail="Server email configuration is missing.")

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = email_user
        msg["To"] = to_email
        msg.set_content(body)
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(email_user, email_pass)
            smtp.send_message(msg)
            
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email. Check Gmail App Password.")

def validate_password(password: str):
    if len(password) < 8: return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password): return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password): return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password): return False, "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password): return False, "Password must contain at least one special character"
    return True, ""

# ---- API Routes ----
@app.get("/health")
def health():
    return {"status": "ok"}

# ---- Password Reset Routes ----
@app.post("/api/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT id, fname FROM users WHERE email=%s", (req.email,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = f"{secrets.randbelow(1000000):06}"
    expiry = datetime.now() + timedelta(minutes=10)
    cursor.execute("INSERT INTO password_resets (user_id, otp, expires_at) VALUES (%s,%s,%s)", (user["id"], otp, expiry))
    db.commit()

    send_email(req.email, "Your OTP for Password Reset", f"Hello {user['fname']},\n\nYour OTP is: {otp}\nIt expires in 10 minutes.")
    return {"message": "OTP sent to your email"}

@app.post("/api/verify-otp")
def verify_otp(req: VerifyOTPRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute(
        """
        SELECT pr.*, u.id as user_id FROM password_resets pr
        JOIN users u ON pr.user_id = u.id
        WHERE u.email=%s AND pr.otp=%s AND pr.expires_at > NOW()
        ORDER BY pr.id DESC LIMIT 1
        """,
        (req.email, req.otp)
    )
    record = cursor.fetchone()
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    return {"message": "OTP verified", "user_id": record["user_id"]}

@app.post("/api/reset-password")
def reset_password_with_otp(req: ResetPasswordWithIDRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    valid, msg = validate_password(req.password)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    hashed_pwd = argon2.hash(req.password)
    cursor.execute("UPDATE users SET password=%s WHERE id=%s", (hashed_pwd, req.user_id))
    cursor.execute("DELETE FROM password_resets WHERE user_id=%s", (req.user_id,))
    db.commit()
    return {"message": "Password reset successful"}

# ---- Auth Routes ----
@app.post("/api/send-registration-otp")
def send_registration_otp(req: RegistrationOTPRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    
    # 1. Check if email is ALREADY in the database
    cursor.execute("SELECT id FROM users WHERE email=%s", (req.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email is already registered! Please log in.")

    # 2. Generate a random 6-digit OTP
    otp = f"{secrets.randbelow(1000000):06}"
    
    # 3. Store it temporarily in memory mapped to their email
    registration_otps[req.email] = otp
    
    # 4. Send the Email
    email_body = f"Hello,\n\nYour OTP for Placify Registration is: {otp}\n\nPlease enter this code to verify your email. Do not share this code with anyone."
    send_email(req.email, "Your Placify Registration OTP", email_body)
    
    return {"message": "OTP sent to email"}

@app.post("/api/register")
def register_user(user: RegisterUser, db_cursor: tuple = Depends(get_cursor)):
    # 1. VERIFY OTP FIRST
    saved_otp = registration_otps.get(user.email)
    if not saved_otp:
        raise HTTPException(status_code=400, detail="Please request an OTP first.")
        
    if saved_otp != user.otp:
        raise HTTPException(status_code=400, detail="Invalid Authentication Code!")

    # 2. Proceed with normal validation
    cursor, db = db_cursor
    valid, msg = validate_password(user.password)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    # Secondary DB check just in case
    cursor.execute("SELECT id FROM users WHERE email=%s", (user.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="User already exists")

    # 3. Create the user
    hashed_pwd = argon2.hash(user.password)
    cursor.execute(
        "INSERT INTO users (fname, lname, email, year, field, password) VALUES (%s, %s, %s, %s, %s, %s)",
        (user.fname, user.lname, user.email, user.year, user.field, hashed_pwd)
    )
    db.commit()

    # 4. Clean up the temporary OTP so it can't be reused
    del registration_otps[user.email]

    return {"message": "User registered successfully"}

@app.post("/api/user/{user_id}/upload-pfp")
async def upload_profile_picture(user_id: int, file: UploadFile = File(...), db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join("static/profile_pics", unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    profile_picture_url = f"/static/profile_pics/{unique_filename}"
    cursor.execute("UPDATE users SET profile_picture_url = %s WHERE id = %s", (profile_picture_url, user_id))
    db.commit()

    return {"message": "Profile picture updated successfully", "profile_picture_url": profile_picture_url}

@app.post("/api/login")
def login_user(user: LoginUser, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT * FROM users WHERE email=%s", (user.email,))
    record = cursor.fetchone()
    if not record or not argon2.verify(user.password, record["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "user": record}

@app.get("/api/user/{user_id}")
def get_user_details(user_id: int, db_cursor: tuple = Depends(get_cursor), page: int = 1, limit: int = 20):
    cursor, db = db_cursor
    cursor.execute("SELECT id, fname, lname, email, year, field, profile_picture_url FROM users WHERE id=%s", (user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    offset = (page - 1) * limit
    cursor.execute(
        "SELECT id, topic, mode, score, total, created_at FROM test_attempts WHERE user_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (user_id, limit, offset)
    )
    tests = cursor.fetchall()

    cursor.execute(
        "SELECT problem_title, difficulty, is_correct, created_at FROM coding_attempts WHERE user_id=%s ORDER BY created_at DESC",
        (user_id,)
    )
    coding_attempts = cursor.fetchall()

    cursor.execute(
        """
        SELECT id, interview_type, job_role, overall_score, start_time as created_at 
        FROM interview_sessions 
        WHERE user_id=%s AND end_time IS NOT NULL 
        ORDER BY start_time DESC
        """,
        (user_id,)
    )
    interviews = cursor.fetchall()

    return {
        "user": user, 
        "tests": tests, 
        "coding": coding_attempts,
        "interviews": interviews
    }

# ---- Test Submission & Mode Unlock Routes ----
@app.post("/api/test/submit")
def submit_test(data: SubmitTest = Body(...), db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT id FROM users WHERE id=%s", (data.user_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    cursor.execute(
        "INSERT INTO test_attempts (user_id, topic, mode, score, total, time_taken) VALUES (%s,%s,%s,%s,%s,%s)",
        (data.user_id, data.topic, data.mode, data.score, data.total, data.time_taken)
    )
    db.commit()
    
    passing_score = int(data.total * 0.75)
    return {"message": "Test recorded", "passed": data.score >= passing_score}

@app.post("/api/test/mode-status")
def mode_status(req: ModeStatusRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    if req.mode == "easy":
        return {"unlocked": True}
    
    prev_mode = "easy" if req.mode == "moderate" else "moderate"
    passing_score = 15

    cursor.execute(
        "SELECT id FROM test_attempts WHERE user_id=%s AND topic=%s AND mode=%s AND score>=%s LIMIT 1",
        (req.userId, req.topic, prev_mode, passing_score)
    )
    return {"unlocked": bool(cursor.fetchone())}

@app.post("/api/test/best-score")
def get_best_score(req: BestScoreRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute(
        "SELECT MAX(score) as best_score FROM test_attempts WHERE user_id=%s AND topic=%s AND mode=%s",
        (req.userId, req.topic, req.mode)
    )
    result = cursor.fetchone()
    return {"best_score": result["best_score"] if result and result["best_score"] is not None else None}

# =========================================================================
# ---- NEW GAMIFICATION & LEADERBOARD SYSTEM (XP, LEVELS, BADGES) ----
# =========================================================================

def calculate_level(xp):
    if xp >= 1500: return 5
    if xp >= 700: return 4
    if xp >= 300: return 3
    if xp >= 100: return 2
    return 1

@app.get("/api/user/{user_id}/gamification")
def get_user_gamification(user_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        # ANTI-FARMING: Only count MAX score for each unique test, and only if score >= 15
        query = """
        SELECT 
            (
                COALESCE((
                    SELECT SUM(
                        CASE WHEN mode = 'hard' THEN 40 WHEN mode = 'moderate' THEN 20 ELSE 10 END + 
                        CASE WHEN max_total > 0 AND (max_score / max_total) >= 0.9 THEN 15 ELSE 0 END
                    ) 
                    FROM (
                        SELECT topic, mode, MAX(score) as max_score, MAX(total) as max_total 
                        FROM test_attempts 
                        WHERE user_id = %s 
                        GROUP BY topic, mode
                    ) as best_tests
                    WHERE max_score >= 15
                ), 0) 
                + 
                COALESCE((
                    SELECT SUM(CASE WHEN difficulty = 'hard' THEN 40 WHEN difficulty = 'medium' THEN 20 ELSE 10 END) 
                    FROM (
                        SELECT problem_title, difficulty 
                        FROM coding_attempts 
                        WHERE user_id = %s AND is_correct = 1 
                        GROUP BY problem_title, difficulty
                    ) as unique_coding
                ), 0) 
                +
                COALESCE((
                    SELECT SUM(50 + (overall_score * 5)) 
                    FROM interview_sessions 
                    WHERE user_id = %s AND end_time IS NOT NULL
                ), 0)
            ) as total_xp,
            (SELECT COUNT(DISTINCT DATE(created_at)) FROM test_attempts WHERE user_id = %s) as streak
        """
        cursor.execute(query, (user_id, user_id, user_id, user_id))
        res = cursor.fetchone()
        
        xp = int(res['total_xp']) if res else 0
        streak = res['streak'] if res else 0
        level = calculate_level(xp)
        next_level_xp = 100 if level == 1 else (300 if level == 2 else (700 if level == 3 else (1500 if level == 4 else 3000)))
        
        # Fetch counts for Level 4 Attempt Limits
        cursor.execute("SELECT COUNT(*) as c FROM interview_sessions WHERE user_id=%s", (user_id,))
        interviews_taken = cursor.fetchone()['c']

        cursor.execute("SELECT COUNT(*) as c FROM gd_participants WHERE user_id=%s", (user_id,))
        gds_taken = cursor.fetchone()['c']

        return { 
            "xp": xp, "level": level, "next_level_xp": next_level_xp, "streak": streak, 
            "interviews_taken": interviews_taken, "gds_taken": gds_taken 
        }
    except Exception as e:
        print(f"Gamification Error: {e}")
        return { "xp": 0, "level": 1, "next_level_xp": 100, "streak": 0, "interviews_taken": 0, "gds_taken": 0 }

@app.get("/api/leaderboard")
def get_leaderboard(db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        # ANTI-FARMING: Global Leaderboard Query Fix
        query = """
        SELECT 
            u.id, 
            u.fname, 
            u.lname, 
            u.profile_picture_url,
            
            COALESCE((
                SELECT SUM(
                    CASE WHEN mode = 'hard' THEN 40 WHEN mode = 'moderate' THEN 20 ELSE 10 END +
                    CASE WHEN max_total > 0 AND (max_score / max_total) >= 0.9 THEN 15 ELSE 0 END
                )
                FROM (
                    SELECT user_id, topic, mode, MAX(score) as max_score, MAX(total) as max_total
                    FROM test_attempts
                    GROUP BY user_id, topic, mode
                ) t
                WHERE t.user_id = u.id AND t.max_score >= 15
            ), 0) as test_xp,
            
            COALESCE((
                SELECT SUM(CASE WHEN difficulty = 'hard' THEN 40 WHEN difficulty = 'medium' THEN 20 ELSE 10 END)
                FROM (
                    SELECT user_id, problem_title, difficulty
                    FROM coding_attempts
                    WHERE is_correct = 1
                    GROUP BY user_id, problem_title, difficulty
                ) c
                WHERE c.user_id = u.id
            ), 0) as coding_xp,
            
            COALESCE((
                SELECT SUM(50 + (overall_score * 5)) 
                FROM interview_sessions 
                WHERE user_id = u.id AND end_time IS NOT NULL
            ), 0) as interview_xp,
            
            (SELECT COUNT(DISTINCT topic, mode) FROM test_attempts WHERE user_id = u.id AND score >= 15) as aptitude_tests,
            (SELECT COUNT(DISTINCT problem_title) FROM coding_attempts WHERE user_id = u.id AND is_correct = 1) as coding_solved,
            (SELECT COUNT(*) FROM interview_sessions WHERE user_id = u.id AND end_time IS NOT NULL) as interviews
            
        FROM users u
        HAVING (test_xp + coding_xp + interview_xp) > 0
        ORDER BY (test_xp + coding_xp + interview_xp) DESC
        LIMIT 50;
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        leaderboard = []
        for rank, row in enumerate(rows):
            xp = int(row['test_xp']) + int(row['coding_xp']) + int(row['interview_xp'])
            level = calculate_level(xp)
            
            badges = []
            if row['aptitude_tests'] >= 5: badges.append("🧠 Aptitude Master")
            if row['coding_solved'] >= 5: badges.append("💻 Tech Ninja")
            if row['interviews'] >= 2: badges.append("🗣️ GD Star")
            if not badges: badges.append("🌱 Rising Star")
            
            next_level_xp = 100 if level == 1 else (300 if level == 2 else (700 if level == 3 else (1500 if level == 4 else 3000)))

            leaderboard.append({
                "rank": rank + 1, "id": row['id'], "name": f"{row['fname']} {row['lname']}",
                "profile_picture_url": row['profile_picture_url'], "xp": xp, "level": level,
                "next_level_xp": next_level_xp, "badges": badges, "streak": min((row['aptitude_tests'] + row['coding_solved']), 30)
            })
            
        return leaderboard
    except Exception as e:
        print(f"❌ Leaderboard Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

@app.get("/api/leaderboard/filter")
def get_filtered_leaderboard(category: str, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        if category == "global": return get_leaderboard(db_cursor)

        query = ""
        # ANTI-FARMING: Filtered Leaderboard Fixes
        if category in ["aptitude", "technical"]:
            topics = "('C Programming', 'C++ Programming', 'Java Programming', 'Python Programming', 'Data Structures & Algorithms', 'Database Management Systems', 'Operating Systems', 'Computer Networks')" if category == "technical" else "('Percentages', 'Profit & Loss', 'Time, Speed & Distance', 'Ratio & Proportion', 'Number System', 'Simple & Compound Interest', 'Permutation & Combination', 'Geometry & Mensuration', 'Series & Patterns', 'Coding-Decoding', 'Blood Relations', 'Direction Sense', 'Grammar', 'Vocabulary', 'Reading Comprehension', 'Final Aptitude Test')"
            query = f"""
            SELECT u.id, u.fname, u.lname, u.profile_picture_url,
                   COALESCE((
                       SELECT SUM(CASE WHEN mode = 'hard' THEN 40 WHEN mode = 'moderate' THEN 20 ELSE 10 END)
                       FROM (
                           SELECT user_id, topic, mode, MAX(score) as max_score 
                           FROM test_attempts 
                           WHERE topic IN {topics}
                           GROUP BY user_id, topic, mode
                       ) t
                       WHERE t.user_id = u.id AND t.max_score >= 15
                   ), 0) as total_xp
            FROM users u 
            HAVING total_xp > 0 
            ORDER BY total_xp DESC LIMIT 50;
            """
        elif category == "coding":
            query = """
            SELECT u.id, u.fname, u.lname, u.profile_picture_url,
                   COALESCE((
                       SELECT SUM(CASE WHEN difficulty = 'hard' THEN 40 WHEN difficulty = 'medium' THEN 20 ELSE 10 END)
                       FROM (
                           SELECT user_id, problem_title, difficulty 
                           FROM coding_attempts 
                           WHERE is_correct = 1
                           GROUP BY user_id, problem_title, difficulty
                       ) c
                       WHERE c.user_id = u.id
                   ), 0) as total_xp
            FROM users u 
            HAVING total_xp > 0 
            ORDER BY total_xp DESC LIMIT 50;
            """
        elif category == "interview" or category == "gd":
            query = """
            SELECT u.id, u.fname, u.lname, u.profile_picture_url, COALESCE(SUM(50 + (overall_score * 5)), 0) as total_xp
            FROM users u JOIN interview_sessions i ON u.id = i.user_id WHERE i.end_time IS NOT NULL
            GROUP BY u.id HAVING total_xp > 0 ORDER BY total_xp DESC LIMIT 50;
            """

        cursor.execute(query)
        leaderboard = []
        for rank, row in enumerate(cursor.fetchall()):
            xp = int(row['total_xp'])
            level = calculate_level(xp)
            next_level_xp = 100 if level == 1 else (300 if level == 2 else (700 if level == 3 else (1500 if level == 4 else 3000)))
            leaderboard.append({
                "rank": rank + 1, "id": row['id'], "name": f"{row['fname']} {row['lname']}",
                "profile_picture_url": row['profile_picture_url'], "xp": xp, "level": level,
                "next_level_xp": next_level_xp, "badges": [f"{category.capitalize()} Specialist"], "streak": 0
            })
        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))