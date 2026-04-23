import os, json, asyncio, re
from google import genai
from dotenv import load_dotenv

load_dotenv()
DATASET_PATH = "quant_dataset.json"
MODULE_NAME = "Quantitative Aptitude"

# 🚀 SPEED UP TWEAKS:
BATCH_SIZE = 30  # Number of questions to generate per API call
SLEEP_TIME = 60  # Wait time between calls to prevent rate limits

TARGET_TOPICS = [
    "Number System",
]

def generate_prompt(topic: str, difficulty: str) -> str:
    return f"""
    Generate exactly {BATCH_SIZE} unique, highly challenging multiple choice questions for the topic: {topic}.
    Difficulty: {difficulty}. Ensure these are placement-exam standard questions.
    
    CRITICAL INSTRUCTIONS:
    1. Return ONLY a valid JSON array.
    2. 'options' must be exactly 4 strings.
    3. 'answer' must EXACTLY MATCH one of the options.
    4. NO LATEX OR BACKSLASHES. Write math as standard text (e.g. pi, x^2).
    5. ONLY USE SINGLE QUOTES (') inside your text. NEVER use double quotes (").
    6. 'explanation' MUST be formatted with exact headers "*Standard method*:" and "*SHORTCUT Trick*:". 
    7. In the 'explanation', you MUST insert a newline character (\\n) after EACH full stop (.) so every sentence/step is on a new line.
    
    Format:
    [
      {{
        "module": "{MODULE_NAME}",
        "topic": "{topic}",
        "difficulty": "{difficulty}",
        "question": "...",
        "options": ["A. Opt1", "B. Opt2", "C. Opt3", "D. Opt4"],
        "answer": "A. Opt1",
        "explanation": "*Standard method*:\\nThe formula for circumference is C = 2 * pi * r.\\nGiven r = 7 cm, C = 2 * (22/7) * 7.\\nThe 7 cancels out.\\nC = 44 cm.\\n\\n*SHORTCUT Trick*:\\nMemorize base values for r=7.\\nCircumference is 44 cm.\\nArea is 154 sq cm.\\n"
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
    print(f"📘 QUANT DB Updated! Added: {unique_added} | Total: {len(existing)}")

async def main():
    api_key = os.getenv("GEMINI_API_KEY_QUANT") or os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    runs = ["hard"]
    
    print(f"🚀 Starting {MODULE_NAME} Miner (Batch Size: {BATCH_SIZE})...")
    while True:
        for topic in TARGET_TOPICS:
            for diff in runs:
                print(f"Mining {BATCH_SIZE} {diff} Qs for '{topic}'...")
                try:
                    # Upgrade to 2.5-flash and FORCE JSON response
                    res = await client.aio.models.generate_content(
                        model="gemini-2.5-flash-lite", 
                        contents=generate_prompt(topic, diff),
                        config={"response_mime_type": "application/json"} # <-- THIS FIXES EVERYTHING
                    )
                    
                    # Because of the config above, res.text is guaranteed to be a clean JSON string!
                    data = json.loads(res.text)
                    
                    valid_qs = [q for q in data if isinstance(q, dict) and len(q.get("options", [])) == 4]
                    
                    if valid_qs: 
                        print(f"✅ Successfully parsed {len(valid_qs)} questions!")
                        save_to_dataset(valid_qs)
                    else:
                        print("⚠️ AI generated JSON, but no valid questions matched your format rules.")
                        
                except json.JSONDecodeError:
                    print("⚠️ Failed to parse JSON response from Gemini.")
                except Exception as e: 
                    print(f"⚠️ API Error: {e}")
                
                await asyncio.sleep(SLEEP_TIME)

if __name__ == "__main__": 
    asyncio.run(main())