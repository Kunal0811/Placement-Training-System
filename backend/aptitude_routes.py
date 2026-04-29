import os
import asyncio
import random
import re
import json
import ast
from fastapi import APIRouter, HTTPException, Depends
from google import genai
from pydantic import BaseModel
from database import get_cursor 

router = APIRouter(prefix="/api/aptitude", tags=["Aptitude"])

# --- REQUEST MODELS ---
class MCQRequest(BaseModel):
    topic: str
    count: int = 20
    difficulty: str | None = None
    user_id: int | None = None 

class TrackQuestionsReq(BaseModel):
    user_id: int
    results: list[dict] 

# --- 1. LOCAL DATASET LOGIC ---
def load_specific_db(filename):
    """Loads a specific JSON dataset file."""
    path = os.path.join(os.path.dirname(__file__), filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f: 
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Error reading {filename}: {e}")
            return []
    return []

def get_balanced_sample(module_qs, count=20):
    easy_qs = [q for q in module_qs if q.get('difficulty') == 'easy']
    med_qs = [q for q in module_qs if q.get('difficulty') in ['medium', 'moderate']]
    hard_qs = [q for q in module_qs if q.get('difficulty') == 'hard']
    
    e_count = int(count * 0.20)
    m_count = int(count * 0.30)
    h_count = int(count * 0.50)
    
    test_qs = []
    if easy_qs: test_qs.extend(random.choices(easy_qs, k=e_count))
    if med_qs: test_qs.extend(random.choices(med_qs, k=m_count))
    if hard_qs: test_qs.extend(random.choices(hard_qs, k=h_count))
    
    while len(test_qs) < count and module_qs:
        test_qs.append(random.choice(module_qs))
        
    return test_qs

def normalize_string_for_match(s: str) -> str:
    if not s: return ""
    s = s.lower()
    s = re.sub(r'[^a-z0-9]', ' ', s)
    s = s.replace(" and ", " ")
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def get_local_topic_questions(topic: str, count: int, difficulty: str | None = None):
    quant_qs = load_specific_db("quant_dataset.json")
    logic_qs = load_specific_db("logical_dataset.json")
    verb_qs = load_specific_db("verbal_dataset.json")
    
    all_qs = quant_qs + logic_qs + verb_qs
    if not all_qs: return []
        
    search_topic = normalize_string_for_match(topic)
    filtered_qs = []
    
    for q in all_qs:
        q_topic = normalize_string_for_match(q.get("topic", ""))
        if not search_topic or not q_topic: continue
            
        if search_topic in q_topic or q_topic in search_topic:
            if difficulty and difficulty.lower() not in ["mixed", "all", "none"]:
                q_diff = q.get("difficulty", "").strip().lower()
                req_diff = difficulty.strip().lower()
                
                if req_diff == "moderate": req_diff = "medium"
                if q_diff == "moderate": q_diff = "medium"
                
                if q_diff == req_diff:
                    filtered_qs.append(q)
            else:
                filtered_qs.append(q)

    if len(filtered_qs) >= count:
        return random.sample(filtered_qs, count)
    return filtered_qs 

# --- 2. LIVE AI LOGIC ---
def generate_prompt(topic: str, count: int, difficulty: str | None = None) -> str:
    difficulty_line = f"Difficulty: {difficulty}." if difficulty and difficulty.lower() != "mixed" else "Ensure a mix of difficulty levels."
    return f"""
    Generate exactly {count} multiple choice questions (MCQs) on the topic: {topic}.
    {difficulty_line}
    
    CRITICAL INSTRUCTIONS:
    1. Return STRICT JSON array.
    2. 'options' must be exactly 4 strings.
    3. 'answer' must be the EXACT text from the 'options' list.
    4. NO LATEX OR BACKSLASHES. Use standard text.
    5. 'explanation' MUST be formatted with exact headers "*Standard method*:" and "*SHORTCUT Trick*:".
    6. Use real line breaks for steps. Do NOT return escaped sequences like \\n or \\t inside explanation text.
    
    Format:
    [
      {{
        "module": "General",
        "topic": "{topic}",
        "difficulty": "{difficulty or 'medium'}",
        "question": "...",
        "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
        "answer": "A. Option 1",
        "explanation": "..."
      }}
    ]
    """

def clean_and_parse_json(text: str):
    text = re.sub(r'```json\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'```', '', text)
    try: return json.loads(text)
    except:
        try: return ast.literal_eval(text)
        except: return []

def normalize_explanation_text(explanation) -> str:
    if not explanation:
        return "No explanation provided."

    text = str(explanation).strip()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\\\\n", "\n").replace("\\n", "\n").replace("\\t", " ")
    text = re.sub(r'\n{3,}', '\n\n', text)

    text = re.sub(r'(?i)\*?standard\s*method\*?\s*:', '*Standard method*:', text)
    text = re.sub(r'(?i)⚡?\s*\*?shortcut\s*trick\*?\s*:', '*SHORTCUT Trick*:', text)

    if '\n' not in text:
        text = re.sub(r'\.\s+', '.\n', text)

    return text.strip()

def validate_mcqs(data, count):
    if not isinstance(data, list): return []
    cleaned = []
    for q in data:
        if not isinstance(q, dict): continue
        q = {k.lower(): v for k, v in q.items()}
        question = q.get("question")
        options = q.get("options")
        answer = q.get("answer")
        explanation = q.get("explanation", "No explanation provided.")

        if question and isinstance(options, list) and len(options) >= 2 and answer is not None:
            ans_str = str(answer).strip()
            opts_str = [str(opt).strip() for opt in options]
            matched_ans = None

            if ans_str in opts_str: matched_ans = ans_str
            else:
                clean_ans = ans_str.replace('.', '').strip().lower()
                letter_map = {'a': 0, 'b': 1, 'c': 2, 'd': 3, '0': 0, '1': 1, '2': 2, '3': 3}
                if clean_ans in letter_map and letter_map[clean_ans] < len(opts_str):
                    matched_ans = opts_str[letter_map[clean_ans]]
                else:
                    for opt in opts_str:
                        if ans_str.lower() in opt.lower() or opt.lower() in ans_str.lower():
                            matched_ans = opt
                            break
            if matched_ans:
                cleaned.append({
                    "question": str(question), "options": opts_str, 
                    "answer": matched_ans, "explanation": normalize_explanation_text(explanation),
                    "topic": q.get("topic", "General"),
                    "difficulty": q.get("difficulty", "medium")
                })
    return cleaned[:count]

async def generate_single_topic(topic: str, count: int, difficulty: str, api_key: str = None):
    if not api_key or count <= 0: return []
    client = genai.Client(api_key=api_key)
    prompt = generate_prompt(topic, count, difficulty)
    
    models_to_try = ["gemini-2.5-flash-lite"] 
    for model_name in models_to_try:
        try:
            response = await client.aio.models.generate_content(model=model_name, contents=prompt)
            data = clean_and_parse_json(response.text or "")
            valid_mcqs = validate_mcqs(data, count)
            if len(valid_mcqs) >= (count // 2): return valid_mcqs
        except Exception as e:
            print(f"⚠️ API Error: {e}")
            pass 
    return []

# --- 3. THE MAIN ROUTES ---

@router.post("/mcqs/test")
async def generate_aptitude_test(req: MCQRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor

    # ==========================================
    # 🔥 1. FINAL TEST LOGIC (Curated Split with DB Tracking & Fallbacks)
    # ==========================================
    if req.topic == "Final Aptitude Test":
        data = load_specific_db("final_aptitude_dataset.json")
        if not data:
            raise HTTPException(status_code=404, detail="Final Aptitude database is empty. Run build_final_aptitude.py first.")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_question_tracking (
                user_id INT,
                question_id VARCHAR(100),
                is_correct BOOLEAN,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, question_id)
            )
        """)
        db.commit()

        seen_ids = set()
        if req.user_id:
            cursor.execute("SELECT question_id FROM user_question_tracking WHERE user_id = %s", (req.user_id,))
            seen_ids = {str(row['question_id']) for row in cursor.fetchall()} 

        final_test = []
        categories = ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"]

        def get_smart_sample(pool, needed_count):
            unseen = [q for q in pool if str(q.get("id")) not in seen_ids]
            seen = [q for q in pool if str(q.get("id")) in seen_ids]
            
            if len(unseen) >= needed_count:
                return random.sample(unseen, needed_count)
            else:
                remainder = needed_count - len(unseen)
                return unseen + random.sample(seen, min(remainder, len(seen)))

        for cat in categories:
            cat_med = [q for q in data if q.get('category') == cat and q.get('diff') == "Medium"]
            cat_hard = [q for q in data if q.get('category') == cat and q.get('diff') == "Hard"]
            
            # 🔥 THE FIX: Fallback borrowing to guarantee 20 questions
            selected_hard = get_smart_sample(cat_hard, 12)
            
            # If we don't have 12 Hard, borrow extra from Medium
            med_quota = 8 + (12 - len(selected_hard))
            selected_med = get_smart_sample(cat_med, med_quota)
            
            # If we don't have enough Medium, borrow extra from Hard
            if len(selected_med) < med_quota:
                hard_quota = 12 + (med_quota - len(selected_med))
                selected_hard = get_smart_sample(cat_hard, hard_quota)
            
            section_questions = selected_med + selected_hard
            random.shuffle(section_questions) 
            
            for q in section_questions:
                final_test.append({
                    "id": q.get("id"),
                    "question": q["q"],
                    "options": q["options"],
                    "answer": q["ans"],
                    "explanation": normalize_explanation_text(q.get("exp", "No explanation available.")),
                    "module": cat, 
                    "topic": cat,
                    "difficulty": q["diff"]
                })
        
        return final_test

    local_qs = get_local_topic_questions(req.topic, req.count, req.difficulty)
    if len(local_qs) == req.count:
        random.shuffle(local_qs)
        return local_qs

    needed_count = req.count - len(local_qs)
    print(f"⚠️ Found {len(local_qs)}/{req.count} local Qs. Asking AI for {needed_count} more...")
    
    api_key = os.getenv("GEMINI_API_KEY_APTITUDE")
    ai_qs = await generate_single_topic(req.topic, needed_count, req.difficulty, api_key)
    
    final_qs = local_qs + ai_qs
    if not final_qs:
        raise HTTPException(status_code=500, detail="Failed to generate AI questions. Rate limit may be exceeded.")
    
    random.shuffle(final_qs)
    return final_qs


@router.post("/mcqs/track")
def track_user_questions(req: TrackQuestionsReq, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_question_tracking (
            user_id INT,
            question_id VARCHAR(100),
            is_correct BOOLEAN,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, question_id)
        )
    """)
    
    insert_query = """
        INSERT INTO user_question_tracking (user_id, question_id, is_correct) 
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE is_correct = VALUES(is_correct), timestamp = CURRENT_TIMESTAMP
    """
    
    data_to_insert = [
        (req.user_id, str(r.get("id")), r.get("is_correct", False)) 
        for r in req.results if r.get("id") is not None
    ]
    
    if data_to_insert:
        cursor.executemany(insert_query, data_to_insert)
        db.commit()
    
    return {"message": f"Successfully tracked {len(data_to_insert)} questions.", "tracked_count": len(data_to_insert)}