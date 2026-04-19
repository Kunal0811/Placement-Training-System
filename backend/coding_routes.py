import os
import re
import json
import uuid
import shutil
from typing import List, Dict
from fastapi import APIRouter, HTTPException, Depends
from google import genai 
from pydantic import BaseModel
import docker
from database import get_cursor

router = APIRouter(prefix="/api/coding", tags=["Coding"])

# --- Pydantic Models ---
class LevelStatusRequest(BaseModel):
    user_id: int
    difficulty: str

class LevelProblemRequest(BaseModel):
    difficulty: str
    user_id: int
    count: int = 5 

class RunCodeRequest(BaseModel):
    language: str
    code: str
    input: str = ""
    driver_code: str = ""

class ProblemSubmission(BaseModel):
    problem_title: str
    code: str
    language: str

class SessionEvaluationRequest(BaseModel):
    user_id: int
    difficulty: str
    time_taken: int 
    submissions: List[ProblemSubmission]

class TestCaseItem(BaseModel):
    input: str
    expected_output: str

class BulkRunRequest(BaseModel):
    language: str
    code: str
    test_cases: List[TestCaseItem]
    driver_code: str = ""

# --- 1. AI Generation Prompts ---

def create_batch_problem_prompt(difficulty: str, solved_titles: List[str], count: int) -> str:
    avoid_str = ""
    if solved_titles:
        avoid_str = f"DO NOT GENERATE ANY OF THESE PROBLEMS: {', '.join(solved_titles)}. "

    return f"""
    You are an expert technical interviewer. Generate exactly {count} distinct Data Structures and Algorithms (DSA) coding problems at the '{difficulty}' level.
    {avoid_str}

    Ensure the problems require actual algorithmic thinking.

    Return STRICTLY a valid JSON array of objects. DO NOT wrap in markdown formatting.
    [
        {{
            "title": "Problem Name",
            "description": "Detailed problem statement...",
            "examples": [
                {{"input": "2 3", "output": "5", "explanation": "Brief explanation"}}
            ],
            "starter_code": {{
                "python": "def solve(a, b):\\n    # Write your code here\\n    pass",
                "java": "class Solution {{\\n    public int solve(int a, int b) {{\\n        // Write your code here\\n        return 0;\\n    }}\\n}}",
                "cpp": "class Solution {{\\npublic:\\n    int solve(int a, int b) {{\\n        // Write your code here\\n        return 0;\\n    }}\\n}};"
            }},
            "driver_code": {{
                "python": "\\nimport sys\\nif __name__ == '__main__':\\n    input_data = sys.stdin.read().split()\\n    if input_data:\\n        print(solve(int(input_data[0]), int(input_data[1])))",
                "java": "\\nimport java.util.*;\\npublic class MyClass {{\\n    public static void main(String[] args) {{\\n        Scanner sc = new Scanner(System.in);\\n        if(sc.hasNextInt()) {{\\n            int a = sc.nextInt();\\n            int b = sc.nextInt();\\n            Solution sol = new Solution();\\n            System.out.println(sol.solve(a, b));\\n        }}\\n    }}\\n}}",
                "cpp": "\\n#include <iostream>\\nusing namespace std;\\nint main() {{\\n    int a, b;\\n    if(cin >> a >> b) {{\\n        Solution sol;\\n        cout << sol.solve(a, b) << endl;\\n    }}\\n    return 0;\\n}}"
            }}
        }}
    ]
    IMPORTANT RULES FOR DRIVER CODE: 
    1. The user's starter code will be pasted EXACTLY ABOVE your driver code in the final execution file.
    2. The driver code MUST parse standard input, call the user's function/class, and print the result.
    3. In Java, DO NOT make the user's class 'public'. ONLY the driver code should have 'public class MyClass'.
    """

def create_session_evaluation_prompt(submissions: List[Dict[str, str]], difficulty: str) -> str:
    subs_text = ""
    for i, sub in enumerate(submissions):
        subs_text += f"\n--- Problem {i+1}: {sub['problem_title']} ---\nLanguage: {sub['language']}\nCode:\n```\n{sub['code']}\n```\n"

    return f"""
    You are an expert code reviewer evaluating a candidate's coding session.
    The candidate submitted solutions for a batch of {difficulty} level DSA problems.

    Here are their submissions:
    {subs_text}

    Evaluate each submission. Determine if it is logically correct and solves the intended problem.
    Provide constructive feedback, highlighting mistakes or suggesting improvements.

    CRITICAL RULE: For the 'ideal_solution_snippets', you MUST provide the correct code snippet in Python, Java, AND C++.

    Return strictly a JSON array of objects. Do not use markdown blocks.
    
    [
      {{
        "problem_title": "Title from the input",
        "is_correct": true/false,
        "feedback": "1-2 short sentences of feedback.",
        "ideal_solution_snippets": {{
            "python": "Ideal python code here",
            "java": "Ideal java code here",
            "cpp": "Ideal C++ code here"
        }}
      }}
    ]
    """

# --- 2. Routes ---

@router.post("/level-status")
def get_level_status(req: LevelStatusRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    try:
        cursor.execute(
            "SELECT COUNT(DISTINCT problem_title) as solved_count FROM coding_attempts WHERE user_id = %s AND LOWER(difficulty) = %s AND is_correct = 1",
            (req.user_id, req.difficulty.lower())
        )
        result = cursor.fetchone()
        count = result['solved_count'] if result else 0
        return {"solved_count": count}
    except Exception as e:
        print(f"Error fetching level status: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch level status")

@router.post("/generate-level")
def get_level_problems(req: LevelProblemRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    api_key = os.getenv("GEMINI_API_KEY_TECHNICAL")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing API Key for Technical/Coding.")
    
    client = genai.Client(api_key=api_key)

    cursor.execute(
        "SELECT DISTINCT problem_title FROM coding_attempts WHERE user_id = %s AND LOWER(difficulty) = %s AND is_correct = 1",
        (req.user_id, req.difficulty.lower())
    )
    solved_problems = cursor.fetchall()
    solved_titles = [item['problem_title'] for item in solved_problems]

    prompt = create_batch_problem_prompt(req.difficulty, solved_titles, req.count)

    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
            )
            cleaned = response.text.replace("```json", "").replace("```", "").strip()
            
            start_idx = cleaned.find('[')
            end_idx = cleaned.rfind(']')
            if start_idx != -1 and end_idx != -1:
                cleaned = cleaned[start_idx:end_idx+1]
                
            problems_list = json.loads(cleaned)
            
            if len(problems_list) > 0:
                 return {"problems": problems_list}
            else:
                 raise ValueError("AI returned empty list")

        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed generation on last attempt: {e}")
                return {"problems": [{
                    "title": "Reverse String (Fallback)",
                    "description": "Write a function that reverses a string.",
                    "examples": [{"input": "hello", "output": "olleh"}],
                    "starter_code": {
                        "python": "def reverse_string(s):\n    # Write your code here\n    pass",
                        "java": "class Solution {\n    public String reverseString(String s) {\n        // Write your code here\n        return \"\";\n    }\n}",
                        "cpp": "class Solution {\npublic:\n    string reverseString(string s) {\n        // Write your code here\n        return \"\";\n    }\n};"
                    },
                    "driver_code": {
                        "python": "\nimport sys\nif __name__ == '__main__':\n    input_data = sys.stdin.read().strip()\n    if input_data:\n        print(reverse_string(input_data))",
                        "java": "\nimport java.util.Scanner;\npublic class MyClass {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if(sc.hasNextLine()) {\n            String s = sc.nextLine();\n            Solution sol = new Solution();\n            System.out.println(sol.reverseString(s));\n        }\n    }\n}",
                        "cpp": "\n#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string s;\n    if(getline(cin, s)) {\n        Solution sol;\n        cout << sol.reverseString(s) << endl;\n    }\n    return 0;\n}"
                    }
                }]}

@router.post("/run-code")
def run_code(req: RunCodeRequest):
    try:
        # 🔥 FIX 1: Safely handle null/None values if the frontend sends them
        safe_code = req.code if req.code else ""
        safe_driver = req.driver_code if req.driver_code else ""
        safe_input = req.input if req.input else ""

        # GLUE THE CODE TOGETHER: User Code + Hidden Driver Code
        full_execution_code = safe_code + "\n" + safe_driver
        
        # Pass the COMBINED code to the Docker sandbox
        output = run_in_sandbox(req.language, full_execution_code, safe_input)
        return {"output": output}
    except Exception as e:
        print(f"🔥 CRITICAL ERROR in /run-code: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-session")
def evaluate_session(req: SessionEvaluationRequest, db_cursor: tuple = Depends(get_cursor)):
    cursor, db = db_cursor
    api_key = os.getenv("GEMINI_API_KEY_TECHNICAL") 
    client = genai.Client(api_key=api_key)

    subs_data = [{"problem_title": s.problem_title, "code": s.code, "language": s.language} for s in req.submissions]
    prompt = create_session_evaluation_prompt(subs_data, req.difficulty)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        cleaned = response.text.replace("```json", "").replace("```", "").strip()
        start_idx = cleaned.find('[')
        end_idx = cleaned.rfind(']')
        if start_idx != -1 and end_idx != -1:
            cleaned = cleaned[start_idx:end_idx+1]
            
        evaluation_results = json.loads(cleaned)

        total_correct = 0
        for res in evaluation_results:
            is_correct = 1 if res.get('is_correct') else 0
            if is_correct:
                total_correct += 1
            
            cursor.execute("""
                INSERT INTO coding_attempts (user_id, problem_title, difficulty, is_correct)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE is_correct = GREATEST(is_correct, VALUES(is_correct))
            """, (req.user_id, res.get('problem_title', 'Unknown'), req.difficulty.lower(), is_correct))
        
        db.commit()

        return {
            "evaluations": evaluation_results,
            "total_correct": total_correct,
            "total_problems": len(req.submissions),
            "time_taken": req.time_taken
        }

    except Exception as e:
        db.rollback()
        print(f"Evaluation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to evaluate session.")

# --- Sandbox Execution ---
# --- Sandbox Execution ---
def run_in_sandbox(language: str, code: str, stdin: str) -> str:
    temp_dir = f"../temp_code/{uuid.uuid4()}"
    try:
        os.makedirs(temp_dir, exist_ok=True)
    except Exception as e:
        return f"System Error: Failed to create temp directory. {e}"

    file_map = {
        "python": "script.py",
        "java": "MyClass.java",
        "cpp": "script.cpp"
    }
    command_map = {
        "python": "python script.py",
        "java": "javac MyClass.java && java MyClass",
        "cpp": "g++ script.cpp -o script && ./script"
    }

    file_name = file_map.get(language, "script.py")
    command = command_map.get(language, "python script.py")

    if language == 'java':
        if 'public class' in code and 'public class MyClass' not in code:
            code = re.sub(r'public class \w+', 'public class MyClass', code, count=1)

    file_path = os.path.join(temp_dir, file_name)
    # 🔥 THE FIX: Forced UTF-8 encoding so arrows and emojis don't crash Windows!
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)

    input_path = os.path.join(temp_dir, "input.txt")
    # 🔥 THE FIX: Forced UTF-8 here as well
    with open(input_path, "w", encoding="utf-8") as f:
        f.write(stdin)

    abs_temp_dir = os.path.abspath(temp_dir)
    image_name = f"placify-{language}-runner"

    try:
        client = docker.from_env()
        
        container = client.containers.run(
            image_name,
            command=f"sh -c '{command} < input.txt'",
            volumes={abs_temp_dir: {'bind': '/app', 'mode': 'rw'}},
            working_dir='/app',
            detach=True,
            mem_limit='256m',
            nano_cpus=int(1e9),
            network_disabled=True,
        )
        try:
            result = container.wait(timeout=10)
            logs = container.logs().decode('utf-8')
            if result['StatusCode'] != 0:
                return f"Runtime Error:\n{logs}"
            return logs
        except Exception as e:
            container.kill()
            return "Execution Timed Out (10 seconds limit)."
            
    except docker.errors.DockerException as de:
        return f"Sandbox Error: Docker daemon is not running or accessible. Please open Docker Desktop and try again."
    except Exception as e:
        return str(e)
    finally:
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass
        
@router.post("/execute-bulk")
def execute_bulk_code(req: BulkRunRequest):
    results = []
    
    # 🔥 Safely concatenate to prevent NoneType errors
    safe_code = req.code if req.code else ""
    safe_driver = req.driver_code if req.driver_code else ""
    full_execution_code = safe_code + "\n" + safe_driver

    for tc in req.test_cases:
        safe_input = tc.input if tc.input else ""
        actual_output = run_in_sandbox(req.language, full_execution_code, safe_input).strip()
        expected = tc.expected_output.strip()
        
        passed = (actual_output == expected)
        
        results.append({
            "passed": passed,
            "actual_output": actual_output,
            "expected_output": expected
        })
    return {"results": results}