import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
export default API_BASE;

// ---- Auth ----
export async function registerUser(userData) {
  // userData = { fname, lname, email, year, field, password }
  const res = await axios.post(`${API_BASE}/api/register`, userData);
  return res.data;
}

export async function getUserDetails(userId, page = 1, limit = 20, signal) {
  const res = await axios.get(`${API_BASE}/api/user/${userId}`, {
    params: { page, limit },
    signal: signal
  });
  return res.data;
}

export async function loginUser(credentials) {
  // credentials = { email, password }
  const res = await axios.post(`${API_BASE}/api/login`, credentials);
  return res.data;
}

// ---- Questions ----
export async function generateQuestions(module, topic, difficulty, count) {
  const res = await axios.post(`${API_BASE}/api/mcqs/test`, {
    module,
    topic,
    difficulty,
    count,
  });
  return res.data;
}

export async function listQuestions(module, topic, limit = 20) {
  const res = await axios.get(`${API_BASE}/api/questions`, {
    params: { module, topic, limit },
  });
  return res.data;
}

// ---- Tests ----
export async function createTest(module, topic, difficulty, questionIds) {
  const res = await axios.post(`${API_BASE}/api/tests`, {
    module,
    topic,
    difficulty,
    question_ids: questionIds,
  });
  return res.data;
}

export async function getTest(testId) {
  const res = await axios.get(`${API_BASE}/api/tests/${testId}`);
  return res.data;
}

// ---- Attempts ----
export async function submitAttempt(testId, userId, responses) {
  const res = await axios.post(`${API_BASE}/api/attempts`, {
    test_id: testId,
    user_id: userId,
    responses,
  });
  return res.data;
}

// --- NEW RESUME FUNCTIONS (Corrected) ---

/**
 * Feature 1: Analyzes resume for best role match.
 * (Uses API_BASE now)
 */
export const analyzeResumeForRole = (resumeFile, token) => {
  const formData = new FormData();
  formData.append("resume", resumeFile);

  return axios.post(`${API_BASE}/api/resume/analyze-role`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Feature 2: Analyzes resume against a job description.
 * (MODIFIED to accept jobRole)
 */
export const analyzeResumeForJD = (resumeFile, jobDescription, jobRole, token) => {
  const formData = new FormData();
  formData.append("resume", resumeFile);
  formData.append("job_description", jobDescription);
  formData.append("job_role", jobRole); // <-- ADDED THIS LINE

  return axios.post(`${API_BASE}/api/resume/analyze-jd`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });
};

export const processInterviewChat = async (history, userInput, image, type, topic) => {
  // Parse the JSON response from backend since we forced JSON format
  const res = await axios.post(`${API_BASE}/api/interview/chat`, {
    history,
    user_input: userInput,
    image, // Pass base64 image
    interview_type: type,
    topic
  });
  
  // Try to parse the backend string response into an object
  try {
    return typeof res.data.response === 'string' 
      ? JSON.parse(res.data.response) 
      : res.data.response;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return {
      feedback: "",
      expression_analysis: "Could not analyze.",
      next_question: res.data.response, // Fallback to raw text
      score: 0
    };
  }
};

// placement-trainer/src/api.js
// ... (keep existing imports and functions)

// Add this new function at the bottom
export async function saveInterviewResult(data) {
  // data = { user_id, interview_type, job_role, overall_score, feedback }
  const res = await axios.post(`${API_BASE}/api/interview/save-attempt`, data);
  return res.data;
}