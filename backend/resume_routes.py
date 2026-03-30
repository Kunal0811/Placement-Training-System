from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import resume_analyzer

router = APIRouter()

# 🔥 FIX: Removed the extra "/resume" from the path here!
@router.post("/resume/analyze-jd")
async def analyze_jd(file: UploadFile = File(...), jd: str = Form(...)):
    # 1. Validation
    if not file.filename.endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload PDF or DOCX.")
    if not jd or len(jd.strip()) < 20:
        raise HTTPException(status_code=400, detail="Please provide a valid, detailed Job Description.")

    try:
        # 2. Extract Text via PyMuPDF
        file_bytes = await file.read()
        resume_text = resume_analyzer.extract_text_from_file(file_bytes, file.filename)
        
        if len(resume_text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Could not extract sufficient text. Ensure the PDF is not an image.")

        # 3. Pass through the ML + AI Pipeline
        analysis_result = await resume_analyzer.analyze_resume_ml(resume_text, jd)

        return {
            "overall_score": analysis_result["score"],
            "breakdown": analysis_result["breakdown"],
            "formatting": analysis_result["formatting"],
            "recommendations": analysis_result["recommendations"]
        }
    except Exception as e:
        print(f"Error in /analyze-jd: {e}")
        raise HTTPException(status_code=500, detail=str(e))