import React, { useState } from "react";
import axios from "axios";
import API_BASE from "../api";
import ScoreDonutChart from "../components/ScoreDonutChart";
import { FiUpload, FiFileText, FiBriefcase, FiAlertTriangle, FiCheckCircle, FiStar, FiTarget, FiZap } from "react-icons/fi";

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  return (
    <div className="flex text-yellow-400 text-sm">
      {[...Array(fullStars)].map((_, i) => <FiStar key={`f-${i}`} fill="currentColor" />)}
      {halfStar && <FiStar fill="currentColor" className="opacity-50" />}
      {[...Array(emptyStars)].map((_, i) => <FiStar key={`e-${i}`} />)}
    </div>
  );
};

export default function ResumeAnalyzer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".docx"))) {
      setSelectedFile(file);
    } else {
      alert("Only PDF or DOCX files are allowed!");
      e.target.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return alert("Please upload your resume.");
    if (!jdText.trim()) return alert("Please paste the Job Description.");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("jd", jdText);

    try {
      const res = await axios.post(`${API_BASE}/api/resume/analyze-jd`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(res.data);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "An error occurred during ML analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-game-bg p-6 md:p-12 text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto border-b border-white/10 pb-8">
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight flex items-center justify-center gap-3">
            <FiZap className="text-neon-blue" /> Smart ATS Analyzer
          </h1>
          <p className="text-gray-400 text-lg">
            Powered by TF-IDF Machine Learning & Semantic AI to bypass modern Applicant Tracking Systems.
          </p>
        </div>

        {/* Upload & Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* File Upload */}
          <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FiFileText className="text-neon-blue" /> Upload Resume
            </h2>
            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-2xl p-10 cursor-pointer hover:border-neon-blue/50 hover:bg-neon-blue/5 transition-all group">
              <FiUpload className="text-5xl text-gray-500 group-hover:text-neon-blue transition-colors mb-4" />
              <p className="text-lg font-bold text-gray-300 group-hover:text-white mb-2">
                {selectedFile ? selectedFile.name : "Click to browse or drag & drop"}
              </p>
              <p className="text-sm text-gray-500">PDF or DOCX format only</p>
              <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* JD Input */}
          <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FiBriefcase className="text-neon-purple" /> Target Job Description
            </h2>
            <textarea
              className="w-full flex-1 bg-black/60 border border-white/10 rounded-2xl p-5 text-gray-300 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all custom-scrollbar resize-none"
              placeholder="Paste the exact Job Description here to calculate semantic similarity..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="group relative inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl text-white font-black text-xl uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(45,212,191,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Processing ML Vectors...</span>
            ) : (
              <>
                <FiTarget /> Analyze Semantic Match
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mt-12 animate-fade-in-up">
            <h2 className="text-3xl font-display font-black mb-10 border-b border-white/10 pb-6 text-center">
              Deep Analysis Report
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              
              {/* Match Score */}
              <div className="col-span-1 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/10 p-8 shadow-inner">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Blended AI & TF-IDF Score</h3>
                <div className="w-48 h-48 drop-shadow-[0_0_20px_rgba(45,212,191,0.4)]">
                  <ScoreDonutChart score={result.overall_score} />
                </div>
                <p className="mt-6 text-center text-sm text-gray-400">
                  This score calculates mathematical keyword similarity and contextual AI reasoning.
                </p>
              </div>

              {/* Formatting Check */}
              <div className="col-span-2 bg-white/5 rounded-3xl border border-white/10 p-8 shadow-inner">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Resume Formatting Standards</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(result.formatting).map(([key, passed]) => (
                    <div key={key} className={`flex items-center gap-4 p-4 rounded-2xl border ${passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      {passed ? <FiCheckCircle className="text-2xl text-green-400 shrink-0" /> : <FiAlertTriangle className="text-2xl text-red-400 shrink-0" />}
                      <div>
                        <p className={`font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{key}</p>
                        <p className="text-xs text-gray-400">{passed ? "Detected" : "Missing or improperly labeled"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="mb-12 bg-gradient-to-r from-neon-purple/20 to-neon-blue/10 border border-neon-purple/30 rounded-3xl p-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FiAlertTriangle className="text-neon-purple" /> AI Recommendations
                </h3>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-300">
                      <span className="text-neon-purple mt-1">✦</span> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Semantic Breakdown Table */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">Detailed Semantic Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-gray-400 uppercase tracking-widest text-[10px]">
                      <th className="p-4 rounded-tl-xl">Skill Category</th>
                      <th className="p-4">Required by JD</th>
                      <th className="p-4">Found in Resume</th>
                      <th className="p-4 rounded-tr-xl text-right">Semantic Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {result.breakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-neon-blue">{item.skill_area}</td>
                        <td className="p-4">{item.job_requirement}</td>
                        <td className="p-4 text-gray-400">{item.your_resume}</td>
                        <td className="p-4 flex justify-end items-center"><StarRating rating={item.match_rating} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}