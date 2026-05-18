import io
import re
import docx
import fitz  # PyMuPDF (Install via: pip install pymupdf)
import pdfplumber
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from google import genai
from google.genai import types

# 🔥 THE FIX: Lazy Load spaCy to prevent Render deployment timeouts!
_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
    return _nlp

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Advanced Text Extraction using PyMuPDF (Fast/Accurate) with a pdfplumber fallback."""
    text = ""
    if filename.lower().endswith('.pdf'):
        try:
            # 1. Primary: PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text("text") + "\n"
        except Exception as e:
            print(f"PyMuPDF failed, falling back to pdfplumber: {e}")
            try:
                # 2. Fallback: pdfplumber
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    for page in pdf.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text += extracted + "\n"
            except Exception as e2:
                print(f"PDF extraction failed completely: {e2}")
    elif filename.lower().endswith('.docx'):
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            print(f"DOCX extraction failed: {e}")
    
    # Clean up horizontal whitespace (spaces/tabs) but PRESERVE newlines
    # Correct regex to preserve newlines
    return re.sub(r'[^\S\n]+', ' ', text).strip()

async def analyze_resume_ml(resume_text: str, jd_text: str):
    """
    Combines classic ML (TF-IDF Cosine Similarity) with Deep Semantic AI (Gemini)
    to generate a highly accurate and intelligent resume evaluation.
    """
    
    # ==========================================
    # 1. ML CONCEPT: TF-IDF Cosine Similarity
    # ==========================================
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform([jd_text.lower(), resume_text.lower()])
    cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    ml_base_score = min(100, int((cosine_sim * 2.5) * 100))

    # ==========================================
    # 2. ML CONCEPT: Heuristic Formatting Check (Regex Line-by-Line)
    # ==========================================
    def is_valid_heading(pattern: str, text: str) -> bool:
        """
        Checks for both standalone headings (e.g., "Education") 
        and inline colon-separated headings (e.g., "Certifications: AWS...").
        """
        lines = text.split('\n')
        
        # Type 1: Standalone heading (must be short, only contains the heading)
        standalone_regex = re.compile(r"^\s*(" + pattern + r")\s*:?\s*$", re.IGNORECASE)
        
        # Type 2: Inline heading (starts with the pattern, requires a colon, ignores length)
        inline_regex = re.compile(r"^\s*(" + pattern + r")\s*:.*$", re.IGNORECASE)
        
        for line in lines:
            clean_line = line.strip()
            if not clean_line:
                continue
                
            # Check standalone (with length limit to avoid matching random short sentences)
            if len(clean_line) < 40 and standalone_regex.match(clean_line):
                return True
                
            # Check inline (must have a colon acting as a separator)
            if inline_regex.match(clean_line):
                return True
                
        return False

    formatting = {
        "Projects": is_valid_heading(r'projects|portfolio|academic projects|personal projects|project', resume_text),
        "Certifications": is_valid_heading(r'certifications|certificates|courses|licenses', resume_text),
        "Experience": is_valid_heading(r'experience|work experience|professional experience|employment history|work history', resume_text),
        "Education": is_valid_heading(r'education|academic background|qualifications|academics', resume_text),
        "Skills": is_valid_heading(r'skills|technical skills|technologies|core competencies|expertise', resume_text)
    }

    # ==========================================
    # 3. DEEP SEMANTIC AI: Gemini Skill Analysis
    # ==========================================
    api_key = os.getenv("GEMINI_API_KEY_RESUME")
    if not api_key:
        return {"score": ml_base_score, "breakdown": [], "formatting": formatting, "recommendations": ["API Key Missing. Set GEMINI_API_KEY."]}
    
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) and Senior Tech Recruiter.
    Analyze the following Job Description (JD) and the candidate's Resume.
    
    JD: {jd_text[:3000]}
    Resume: {resume_text[:4000]}
    
    Perform a deep semantic match. Do NOT rely on exact keywords. Understand that "GCP" means "Google Cloud", "ReactJS" means "React", etc.
    1. Identify the core categories of skills required in the JD.
    2. For each category, list the skills required.
    3. Check if the resume has these skills or semantic equivalents.
    4. Provide a rating out of 5 for that specific category.
    5. Provide 2 to 3 short, actionable recommendations to improve this resume for this specific JD.
    
    Return STRICTLY a JSON object in this exact format:
    {{
        "ai_semantic_score": 85,
        "breakdown": [
            {{
                "skill_area": "Core Programming",
                "job_requirement": "Python, Java",
                "your_resume": "Python (Found), Java (Missing)",
                "match_rating": 2.5
            }}
        ],
        "recommendations": ["Add AWS certification", "Quantify project impacts"]
    }}
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        ai_data = json.loads(response.text)
        
        # Hybrid Scoring
        ai_score = ai_data.get("ai_semantic_score", 50)
        final_blended_score = int((ml_base_score * 0.3) + (ai_score * 0.7))
        
        return {
            "score": final_blended_score,
            "breakdown": ai_data.get("breakdown", []),
            "formatting": formatting,
            "recommendations": ai_data.get("recommendations", [])
        }
    except Exception as e:
        print("Gemini analysis failed:", e)
        return {"score": ml_base_score, "breakdown": [], "formatting": formatting, "recommendations": ["Error connecting to AI analysis."]}