# backend/build_massive_verbal.py
import os, json, asyncio, re, ast
from google import genai
from dotenv import load_dotenv

load_dotenv()
DATASET_PATH = "verbal_dataset.json"
MODULE_NAME = "Verbal Ability"

# 🚀 SPEED UP TWEAKS:
BATCH_SIZE = 30  # Number of questions to generate per API call
SLEEP_TIME = 60  # Wait time between calls (lower if your API tier allows)

TARGET_TOPICS = [
    "Grammer"
]

def generate_prompt(topic: str, difficulty: str) -> str:
    return f"""
    Generate exactly {BATCH_SIZE} unique, highly challenging multiple choice questions for the topic: {topic}.
    Difficulty: {difficulty}. Ensure these are placement-exam standard questions.
    
    CRITICAL INSTRUCTIONS:
    1. Return ONLY a valid JSON array.
    2. 'options' must be exactly 4 strings.
    3. 'answer' must EXACTLY MATCH one of the options.
    4. NO LATEX OR BACKSLASHES. Use standard text.
    5. ONLY USE SINGLE QUOTES (') inside your text. NEVER use double quotes (") inside strings.
    6. 'explanation' MUST be formatted with exact headers "*Standard method*:" and "*SHORTCUT Trick*:". 
    7. In the 'explanation', you MUST insert a newline character (\\n) after EACH full stop (.) so every sentence/step is on a new line.
    8. SPECIFIC TOPIC RULE: If the topic is 'Reading Comprehension', you MUST provide a paragraph (6-8 sentences) followed by a question based on it. Format it all inside the "question" field like this: "Passage: [text] \\n\\n Question: [text]". For Grammar and Vocabulary, just provide the standalone question.
    9. In 'Reading Comprehension' topic don't only generate passage genearte some reading comprehension related normal question also
    
    Format:
    [
      {{
        "module": "{MODULE_NAME}",
        "topic": "{topic}",
        "difficulty": "{difficulty}",
        "question": "Passage: The quick brown fox... \\n\\n What does the passage imply?",
        "options": ["A. Opt1", "B. Opt2", "C. Opt3", "D. Opt4"],
        "answer": "A. Opt1",
        "explanation": "*Standard method*:\\nThe passage directly states the fox is quick.\\nTherefore, option A is correct.\\n\\n*SHORTCUT Trick*:\\nScan for keywords 'quick' and 'fox' to eliminate B, C, and D instantly.\\n"
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
    print(f"📗 VERBAL DB Updated! Added: {unique_added} | Total: {len(existing)}")

async def main():
    api_key = os.getenv("GEMINI_API_KEY_VERBAL") or os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    # You can adjust this array to dictate the mix of difficulties per topic loop
    runs = ["medium"]
    
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
                        try: 
                            data = json.loads(clean_json, strict=False)
                        except:
                            try:
                                flat_json = clean_json.replace('\n', ' ').replace('\r', '')
                                data = json.loads(flat_json)
                            except:
                                try: 
                                    data = ast.literal_eval(clean_json.replace("true", "True").replace("false", "False"))
                                except: pass
                        
                        valid_qs = [q for q in data if isinstance(q, dict) and len(q.get("options", [])) == 4]
                        if valid_qs: 
                            print(f"✅ Successfully parsed {len(valid_qs)} questions!")
                            save_to_dataset(valid_qs)
                        else:
                            print("⚠️ AI generated response, but no valid questions were found.")
                except Exception as e: 
                    print(f"⚠️ Error: {e}")
                
                # Sleep briefly to avoid hitting Gemini rate limits
                await asyncio.sleep(SLEEP_TIME)

if __name__ == "__main__": asyncio.run(main())