import json
import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from database import get_cursor
from google import genai
from coding_routes import create_session_evaluation_prompt

router = APIRouter(prefix="/api/tests", tags=["Scheduled Tests"])

class SubmitTestReq(BaseModel):
    user_id: int
    user_name: str
    answers: Dict[str, Any]
    time_taken: int = 0  # Added Time Tracking!

@router.get("/available")
def get_available_tests(user_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    # 🔥 UPDATED: Now fetches the user_score and total_score to show on the dashboard!
    cursor.execute("""
        SELECT t.id, t.title, t.test_category, t.scheduled_time, t.duration_minutes,
               (SELECT COUNT(*) FROM test_results WHERE test_id = t.id AND user_id = %s) as is_attempted,
               (SELECT score FROM test_results WHERE test_id = t.id AND user_id = %s LIMIT 1) as user_score,
               (SELECT total FROM test_results WHERE test_id = t.id AND user_id = %s LIMIT 1) as total_score
        FROM scheduled_tests t
        ORDER BY t.scheduled_time DESC
    """, (user_id, user_id, user_id))
    return cursor.fetchall()

@router.get("/{test_id}/start")
def start_test(test_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT * FROM scheduled_tests WHERE id = %s", (test_id,))
    test = cursor.fetchone()
    if not test: raise HTTPException(status_code=404, detail="Test not found")

    questions = json.loads(test['questions'])
    safe_questions = []

    if test['test_category'].lower() == 'coding':
        safe_questions = questions
    else:
        for q in questions:
            q_text = q.get("q", q.get("question", "Question text missing"))
            options = q.get("options", [])
            diff = q.get("diff", q.get("difficulty", "Medium"))
            safe_questions.append({"q": q_text, "options": options, "diff": diff})

    return {
        "title": test['title'],
        "duration": test['duration_minutes'],
        "questions": safe_questions
    }

@router.post("/{test_id}/submit")
def submit_test(test_id: int, req: SubmitTestReq, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT questions, test_category FROM scheduled_tests WHERE id = %s", (test_id,))
    test = cursor.fetchone()
    
    questions = json.loads(test['questions'])
    total = len(questions)

    if test['test_category'].lower() == 'coding':
        # 1. Format for AI Evaluation
        subs_data = []
        for idx_str, sub in req.answers.items():
            idx = int(idx_str)
            subs_data.append({
                "problem_title": questions[idx].get("title", f"Problem {idx+1}"),
                "code": sub.get("code", ""),
                "language": sub.get("language", "python")
            })
        
        # 2. Trigger AI Grading Engine
        api_key = os.getenv("GEMINI_API_KEY_TECHNICAL") or os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        prompt = create_session_evaluation_prompt(subs_data, "Hard")
        
        try:
            response = client.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
            cleaned = response.text.replace("```json", "").replace("```", "").strip()
            start_idx, end_idx = cleaned.find('['), cleaned.rfind(']')
            evaluations = json.loads(cleaned[start_idx:end_idx+1]) if start_idx != -1 else []
        except Exception as e:
            print("Evaluation Error:", e)
            evaluations = []

        # 3. Calculate Score based on AI truth
        score = sum([1 for e in evaluations if e.get("is_correct")])

        final_answers = {
            "raw_submissions": req.answers,
            "evaluations": evaluations,
            "time_taken": req.time_taken
        }
        
        cursor.execute(
            "INSERT INTO test_results (test_id, user_id, user_name, score, total, answers) VALUES (%s, %s, %s, %s, %s, %s)",
            (test_id, req.user_id, req.user_name, score, total, json.dumps(final_answers))
        )
        db.commit()
        return {"message": "Coding Test submitted!", "score": score, "total": total}
    else:
        # Standard MCQ Evaluation
        req.answers["__time_taken"] = req.time_taken
        score = 0
        for idx_str, user_ans in req.answers.items():
            if idx_str == "__time_taken": continue
            idx = int(idx_str)
            if questions[idx].get('ans') == user_ans:
                score += 1

        cursor.execute(
            "INSERT INTO test_results (test_id, user_id, user_name, score, total, answers) VALUES (%s, %s, %s, %s, %s, %s)",
            (test_id, req.user_id, req.user_name, score, total, json.dumps(req.answers))
        )
        db.commit()
        return {"message": "Test submitted!", "score": score, "total": total}


@router.get("/{test_id}/report")
def get_test_report(test_id: int, user_id: int, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    cursor.execute("SELECT user_id, user_name, score, total, answers FROM test_results WHERE test_id = %s", (test_id,))
    all_results = cursor.fetchall()
    
    cursor.execute("SELECT questions, test_category FROM scheduled_tests WHERE id = %s", (test_id,))
    test_data = cursor.fetchone()
    
    if not test_data:
        return {"leaderboard": [], "report": []}
        
    questions = json.loads(test_data['questions'])
    is_coding = test_data['test_category'].lower() == 'coding'

    # Build High-Tech Leaderboard (Including Time Taken!)
    leaderboard = []
    for r in all_results:
        ans = json.loads(r['answers'])
        time_taken = ans.get("time_taken", 0) if is_coding else ans.get("__time_taken", 0)
        leaderboard.append({
            "user_name": r['user_name'],
            "score": r['score'],
            "total": r['total'],
            "time_taken": time_taken
        })
        
    # Sort Leaderboard: Highest Score first, then Fastest Time!
    leaderboard.sort(key=lambda x: (-x['score'], x['time_taken']))

    # Build Deep Report for the active user
    user_result = next((r for r in all_results if r['user_id'] == user_id), None)
    report = []
    time_taken_user = 0
    
    if user_result:
        user_answers = json.loads(user_result['answers'])
        time_taken_user = user_answers.get("time_taken", 0) if is_coding else user_answers.get("__time_taken", 0)
        
        if is_coding:
            evals = user_answers.get("evaluations", [])
            raw = user_answers.get("raw_submissions", {})
            for i, q in enumerate(questions):
                evaluation = evals[i] if i < len(evals) else {}
                sub = raw.get(str(i), {})
                report.append({
                    "question": q.get("title", f"Problem {i+1}"),
                    "description": q.get("description", ""),
                    "user_code": sub.get("code", "Not Attempted"),
                    "language": sub.get("language", "python"),
                    "is_correct": evaluation.get("is_correct", False),
                    "feedback": evaluation.get("feedback", "No AI feedback generated."),
                    "ideal_solution_snippets": evaluation.get("ideal_solution_snippets", None)
                })
        else:
            for i, q in enumerate(questions):
                u_ans = str(user_answers.get(str(i), "Not Answered"))
                correct_answer = q.get("ans", "")
                report.append({
                    "question": q.get("q", q.get("question", "Question text missing")),
                    "options": q.get("options", []),
                    "correct_ans": correct_answer,
                    "user_ans": u_ans,
                    "is_correct": u_ans == correct_answer,
                    "explanation": q.get("exp", "")
                })

    return {
        "leaderboard": leaderboard, 
        "report": report, 
        "is_coding": is_coding,
        "time_taken": time_taken_user
    }