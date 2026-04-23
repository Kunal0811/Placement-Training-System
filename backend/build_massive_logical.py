# backend/build_massive_logical.py
import os, json, asyncio, re, ast
from google import genai
from dotenv import load_dotenv

load_dotenv()
DATASET_PATH = "logical_dataset.json"
MODULE_NAME = "Logical Reasoning"

# 🚀 SPEED UP TWEAKS:
BATCH_SIZE = 30  # Sweet spot for generating valid JSON without errors
SLEEP_TIME = 60  # Wait time between calls to prevent rate limits

# Logical topics (Make sure these perfectly match what your frontend requests!)
TARGET_TOPICS = [
    "Series & Patterns"
]

def generate_prompt(topic: str, difficulty: str) -> str:
    return f"""
    Generate exactly {BATCH_SIZE} unique, highly challenging multiple choice questions for the topic: {topic}.
    Difficulty: {difficulty}. Ensure these are placement-exam standard logical reasoning questions.
    
    CRITICAL INSTRUCTIONS:
    1. Return ONLY a valid JSON array.
    2. 'options' must be exactly 4 strings.
    3. 'answer' must EXACTLY MATCH one of the options.
    4. NO LATEX OR BACKSLASHES. Use standard text.
    5. DIALOGUE RULE: If a person is speaking (very common in Blood Relations), YOU MUST USE SINGLE QUOTES (' '). 
       ABSOLUTELY NO DOUBLE QUOTES (") ALLOWED INSIDE THE TEXT. Double quotes will break the JSON!
       Example of Good format: 'He is my brother's son.'
       Example of Bad format: "He is my brother's son."
    6. 'explanation' MUST be formatted with exact headers "*Standard method*:" and "*SHORTCUT Trick*:". 
    7. In the 'explanation', you MUST insert a newline character (\\n) after EACH full stop (.) so every sentence/step is on a new line.
    
    Format:
    [
      {{
        "module": "{MODULE_NAME}",
        "topic": "{topic}",
        "difficulty": "{difficulty}",
        "question": "Pointing to a photograph, a man said, 'I have no brother or sister but that man's father is my father's son.' Whose photograph was it?",
        "options": ["A. His own", "B. His son's", "C. His father's", "D. His nephew's"],
        "answer": "B. His son's",
        "explanation": "*Standard method*:\\nSince the narrator has no brother or sister, 'my father's son' refers to the narrator himself.\\nTherefore, the man in the photograph has the narrator as his father.\\nSo, the photograph is of his son.\\n\\n*SHORTCUT Trick*:\\nBreak it down backwards.\\n'My father's son' = Me (since no siblings).\\n'That man's father' = Me.\\nTherefore, 'That man' = My son.\\n"
      }}
    ]
    """

def save_to_dataset(new_qs):
    existing = []
    if os.path.exists(DATASET_PATH):
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            try: existing = json.load(f)
            except: pass
    
    max_id = max([q.get("id", 0) for q in existing] + [0])
    existing_texts = {re.sub(r'[^a-z0-9]', '', q.get("question", "").lower()) for q in existing}
    unique_added = 0
    
    for q in new_qs:
        q_norm = re.sub(r'[^a-z0-9]', '', q.get("question", "").lower())
        if q_norm and q_norm not in existing_texts:
            max_id += 1 
            q["id"] = max_id
            q["module"] = MODULE_NAME
            existing.append(q)
            existing_texts.add(q_norm) 
            unique_added += 1
            
    with open(DATASET_PATH, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)
    print(f"📘 LOGICAL DB Updated! Added: {unique_added} | Total: {len(existing)}")

async def main():
    api_key = os.getenv("GEMINI_API_KEY_Logical") or os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    runs = ["hard"]
    
    print(f"🚀 Starting {MODULE_NAME} Miner (Batch Size: {BATCH_SIZE})...")
    while True:
        for topic in TARGET_TOPICS:
            for diff in runs:
                print(f"Mining {BATCH_SIZE} {diff} Qs for '{topic}'...")
                try:
                    res = await client.aio.models.generate_content(model="gemini-2.5-flash-lite", contents=generate_prompt(topic, diff))
                    match = re.search(r'\[\s*\{.*?\}\s*\]', res.text or "", re.DOTALL)
                    if match:
                        clean_json = match.group(0)
                        data = []
                        try: data = json.loads(clean_json, strict=False)
                        except:
                            try:
                                flat_json = clean_json.replace('\n', ' ').replace('\r', '')
                                data = json.loads(flat_json)
                            except:
                                try: data = ast.literal_eval(clean_json.replace("true", "True").replace("false", "False"))
                                except: pass
                        
                        valid_qs = [q for q in data if isinstance(q, dict) and len(q.get("options", [])) == 4]
                        if valid_qs: 
                            print(f"✅ Successfully parsed {len(valid_qs)} questions!")
                            save_to_dataset(valid_qs)
                        else:
                            print("⚠️ AI generated response, but no valid questions were found.")
                except Exception as e: 
                    print(f"⚠️ Error: {e}")
                
                await asyncio.sleep(SLEEP_TIME)

if __name__ == "__main__": asyncio.run(main())