import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API_BASE from "../../api";
import { FiX, FiChevronRight, FiChevronLeft, FiCheckCircle, FiGrid, FiShield, FiAlertTriangle, FiClock, FiBookmark, FiRefreshCcw, FiDownload, FiHome, FiXCircle, FiFileText, FiAlertCircle } from "react-icons/fi";
import html2pdf from "html2pdf.js";

const normalizeExplanation = (rawExplanation = "") => {
  if (!rawExplanation) return "";

  let text = String(rawExplanation)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .trim();

  text = text
    .replace(/\*?Standard\s*method\*?\s*:/i, "*Standard method*:")
    .replace(/⚡?\s*\*?SHORTCUT\s*Trick\*?\s*:/i, "*SHORTCUT Trick*:");

  if (!text.includes("\n")) {
    text = text.replace(/\.\s+/g, ".\n");
  }

  return text;
};

const renderExplanationLines = (text, className = "") => {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) return <p className={className}>No explanation provided.</p>;

  return (
    <ul className="space-y-2 list-disc pl-5">
      {lines.map((line, idx) => (
        <li key={idx} className={className}>{line}</li>
      ))}
    </ul>
  );
};

const ExplanationDisplay = ({ explanation }) => {
  const [showShortcut, setShowShortcut] = useState(false);
  const normalizedExplanation = normalizeExplanation(explanation);
  if (!normalizedExplanation) return <p>No explanation provided.</p>;

  const splitRegex = /(?:\n|^)\s*(?:⚡\s*SHORTCUT:|\*SHORTCUT Trick\*:|\*?SHORTCUT\*?:)/i;
  const parts = normalizedExplanation.split(splitRegex);

  if (parts.length >= 2) {
    const standard = parts[0].replace(/\*Standard method\*:/i, '').replace(/Standard Method:/i, '').trim();
    const shortcut = parts.slice(1).join('\n').trim();

    return (
      <div className="space-y-4">
        <div>
          <strong className="text-neon-blue font-bold block mb-2 text-base">📚 Standard Method:</strong>
          {renderExplanationLines(standard, "leading-relaxed") }
        </div>
        <button onClick={() => setShowShortcut(!showShortcut)} className="px-4 py-2 bg-neon-purple/20 text-neon-purple border border-neon-purple/50 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-neon-purple/30 transition-colors">
          {showShortcut ? "Hide ⚡ Shortcut Trick" : "Show ⚡ Shortcut Trick"}
        </button>
        {showShortcut && (
          <div className="shortcut-box bg-neon-purple/10 p-4 rounded-xl border border-neon-purple/50 animate-fade-in mt-2">
            <strong className="text-neon-purple font-bold block mb-2 text-base">⚡ Shortcut Trick:</strong>
            {renderExplanationLines(shortcut, "leading-relaxed") }
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <span className="font-bold text-neon-blue block mb-2 text-base">Explanation:</span>
      {renderExplanationLines(normalizedExplanation, "leading-relaxed") }
    </div>
  );
};

const PDFExplanationDisplay = ({ explanation }) => {
  const normalizedExplanation = normalizeExplanation(explanation);
  if (!normalizedExplanation) return <p>No explanation provided.</p>;
  const splitRegex = /(?:\n|^)\s*(?:⚡\s*SHORTCUT:|\*SHORTCUT Trick\*:|\*?SHORTCUT\*?:)/i;
  const parts = normalizedExplanation.split(splitRegex);

  if (parts.length >= 2) {
    const standard = parts[0].replace(/\*Standard method\*:/i, '').replace(/Standard Method:/i, '').trim();
    const shortcut = parts.slice(1).join('\n').trim();
    return (
      <div className="space-y-4">
        <div>
          <strong className="text-blue-700 block mb-1 uppercase text-xs tracking-widest">📚 Standard Method:</strong>
          {renderExplanationLines(standard, "text-sm text-gray-800") }
        </div>
        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
          <strong className="text-purple-700 block mb-1 uppercase text-xs tracking-widest">⚡ Shortcut Trick:</strong>
          {renderExplanationLines(shortcut, "text-sm text-gray-800") }
        </div>
      </div>
    );
  }
  return (
    <div>
      <strong className="text-blue-700 block mb-1 uppercase text-xs tracking-widest">Explanation:</strong>
      {renderExplanationLines(normalizedExplanation, "text-sm text-gray-800") }
    </div>
  );
};


export default function TestPage() {
  const { topic, mode, testId } = useParams(); 
  const decodedTopic = topic ? decodeURIComponent(topic) : "Scheduled Assessment";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, fetchStats } = useAuth();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeSectionId, setActiveSectionId] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const [userAnswers, setUserAnswers] = useState({});
  const [visited, setVisited] = useState({});
  const [marked, setMarked] = useState({});
  
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  
  const [hasStarted, setHasStarted] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); 

  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  const [isDownloading, setIsDownloading] = useState(false);

  const [reportPageIndex, setReportPageIndex] = useState(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        if (testId) {
            // ==========================================
            // MODE: ADMIN SCHEDULED TEST
            // ==========================================
            const res = await axios.get(`${API_BASE}/api/tests/${testId}/start`);
            const mappedQs = res.data.questions.map(aiQ => ({
                id: aiQ.id, 
                question: aiQ.q,
                options: aiQ.options,
            }));
            
            setSections([{ id: 0, title: res.data.title, qs: mappedQs }]);
            setTotalQuestions(mappedQs.length);
            setTimeLeft(res.data.duration * 60);

        } else {
            // ==========================================
            // MODE: STANDARD PRACTICE TEST
            // ==========================================
            const isTechnical = location.pathname.includes('/technical');
            const endpoint = isTechnical ? '/api/technical/mcqs/test' : '/api/aptitude/mcqs/test';
            const count = decodedTopic === "Final Aptitude Test" ? 60 : 20;

            const res = await axios.post(`${API_BASE}${endpoint}`, {
                topic: decodedTopic,
                difficulty: mode,
                count: count,
                user_id: user?.id 
            });

            let processedSections = [];
            if (decodedTopic === "Final Aptitude Test") {
                const quant = res.data.filter(q => q.module === 'Quantitative Aptitude' || q.topic === 'Quantitative Aptitude');
                const logical = res.data.filter(q => q.module === 'Logical Reasoning' || q.topic === 'Logical Reasoning');
                const verbal = res.data.filter(q => q.module === 'Verbal Ability' || q.topic === 'Verbal Ability');
                
                if (quant.length) processedSections.push({ id: 0, title: "Quantitative Aptitude", qs: quant });
                if (logical.length) processedSections.push({ id: 1, title: "Logical Reasoning", qs: logical });
                if (verbal.length) processedSections.push({ id: 2, title: "Verbal Ability", qs: verbal });
            } else {
                processedSections.push({ id: 0, title: decodedTopic, qs: res.data });
            }

            setSections(processedSections);
            
            let total = 0;
            processedSections.forEach(s => total += s.qs.length);
            setTotalQuestions(total);
            setTimeLeft(decodedTopic === "Final Aptitude Test" ? 3600 : 1800);
        }

      } catch (err) {
        console.error(err);
        alert(err.response?.data?.detail || "Failed to load test. It may be closed.");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) {
        fetchQuestions();
    }
  }, [testId, decodedTopic, mode, location.pathname, navigate, user?.id]);

  useEffect(() => {
      if (sections.length > 0 && hasStarted && !isFinished) {
          setVisited(prev => ({ ...prev, [`${activeSectionId}-${currentIdx}`]: true }));
      }
  }, [activeSectionId, currentIdx, sections, hasStarted, isFinished]);

  useEffect(() => {
    if (!hasStarted || isFinished) return;
    const handleViolationTrigger = () => setViolations(prev => prev + 1);
    const handleVisibilityChange = () => { if (document.hidden) handleViolationTrigger(); };
    const handleFullscreenChange = () => { if (!document.fullscreenElement) handleViolationTrigger(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [hasStarted, isFinished]);

  useEffect(() => {
    if (!hasStarted || isFinished || submitting) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); finishTest(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isFinished, submitting]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (violations === 1) setShowWarning(true);
    else if (violations >= 2 && !isFinished && !submitting) {
      alert("Security Violation. Test Auto-Submitted.");
      finishTest(true); 
    }
  }, [violations]);

  const startExam = async () => {
    try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } 
    catch (e) { console.log(e); }
    setHasStarted(true);
  };

  const returnToFullscreen = async () => {
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } 
    catch (e) { console.log(e); }
    setShowWarning(false);
  };

  const currentKey = `${activeSectionId}-${currentIdx}`;
  const handleSelectOption = (opt) => setUserAnswers(prev => ({ ...prev, [currentKey]: opt }));
  const handleClearResponse = () => setUserAnswers(prev => { const next = {...prev}; delete next[currentKey]; return next; });
  const handleMarkForReview = () => setMarked(prev => ({ ...prev, [currentKey]: !prev[currentKey] }));

  const currentSection = sections[activeSectionId];
  const isLastQuestionInSection = currentSection?.qs && currentIdx === currentSection.qs.length - 1;
  const isFinalSection = activeSectionId === sections.length - 1;

  const handleNext = () => { 
      if (!isLastQuestionInSection) {
          setCurrentIdx(curr => curr + 1); 
      } else if (!isFinalSection) {
          setActiveSectionId(curr => curr + 1);
          setCurrentIdx(0);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const handlePrev = () => { 
      if (currentIdx > 0) { 
          setCurrentIdx(curr => curr - 1); 
      } else if (activeSectionId > 0) {
          const prevSection = sections[activeSectionId - 1];
          setActiveSectionId(activeSectionId - 1);
          setCurrentIdx(prevSection.qs.length - 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleManualSubmit = () => finishTest(false);

  const finishTest = async (isForced = false) => {
    if (submitting) return;
    if (!isForced && !window.confirm("Are you sure you want to submit the test early?")) return;
    
    setSubmitting(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(err => console.log(err));
    
    try {
        if (testId) {
            let answersPayload = {};
            sections[0].qs.forEach((q, qId) => {
                const key = `0-${qId}`;
                if (userAnswers[key]) answersPayload[qId] = userAnswers[key];
            });

            await axios.post(`${API_BASE}/api/tests/${testId}/submit`, {
                user_id: user.id,
                user_name: user.fname,
                answers: answersPayload
            });

            alert("Assessment Submitted Successfully! Your answers have been securely recorded.");
            navigate('/tests');

        } else {
            let calculatedScore = 0;
            const trackingPayload = []; 
            
            sections.forEach((sec, sId) => {
                sec.qs.forEach((q, qId) => {
                    const isCorrect = userAnswers[`${sId}-${qId}`] === q.answer;
                    if (isCorrect) calculatedScore += 1;
                    
                    if (q.id) {
                        trackingPayload.push({
                            id: q.id,
                            is_correct: isCorrect
                        });
                    }
                });
            });
            setFinalScore(calculatedScore);

            await axios.post(`${API_BASE}/api/test/submit`, {
                user_id: user.id, topic: decodedTopic, mode: mode, score: calculatedScore, total: totalQuestions,
            });
            
            if (trackingPayload.length > 0) {
                try {
                    await axios.post(`${API_BASE}/api/aptitude/mcqs/track`, {
                        user_id: user.id,
                        results: trackingPayload
                    });
                } catch (trackErr) {
                    console.error("Failed to track question UUIDs (non-fatal):", trackErr);
                }
            }

            await fetchStats(); 
            setIsFinished(true); 
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    } catch (err) {
      alert("Error submitting score.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    const element = document.getElementById("clean-pdf-report");
    const safeName = `${user?.fname || 'Student'}_${user?.lname || ''}`.trim().replace(/\s+/g, '_');
    const safeTopic = decodedTopic.replace(/\s+/g, '_');
    const filename = `${safeName}_${safeTopic}.pdf`;

    const opt = {
        margin:       0, 
        filename:     filename,
        image:        { type: 'jpeg', quality: 1 }, 
        html2canvas:  { scale: 2, useCORS: true, logging: false }, 
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => setIsDownloading(false));
  };

  const flatReport = useMemo(() => {
      const arr = [];
      sections.forEach((sec, sId) => {
          sec.qs.forEach((q, qId) => {
              const ansKey = `${sId}-${qId}`;
              arr.push({
                  ...q,
                  sectionTitle: sec.title,
                  user_ans: userAnswers[ansKey] || "Not Answered",
                  is_correct: userAnswers[ansKey] === q.answer,
                  correct_ans: q.answer,
                  qNum: arr.length + 1
              });
          });
      });
      return arr;
  }, [sections, userAnswers]);

  if (loading || !sections.length) {
    return (
      <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold font-display animate-pulse text-neon-blue">Connecting to Server...</h2>
      </div>
    );
  }

  if (!hasStarted && !isFinished) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-game-bg text-white">
            <FiShield className="text-7xl text-neon-blue mb-6 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
            <h1 className="text-4xl font-black mb-4 font-display">{testId ? "Scheduled Assessment" : "Proctored Exam"}</h1>
            <div className="bg-black/40 border border-white/10 p-6 md:p-8 rounded-3xl max-w-xl text-left space-y-4 text-gray-300 shadow-2xl mt-4">
                <p className="text-red-400 font-bold flex items-center gap-2 mb-2"><FiAlertTriangle/> Strict Exam Rules:</p>
                <ul className="list-disc pl-5 space-y-3 marker:text-neon-blue">
                    <li>This exam is strictly timed. Time limit is strictly enforced.</li>
                    <li><strong>Tab switching is disabled.</strong> Exiting full-screen triggers a warning.</li>
                    <li>A <strong>Second Violation</strong> will immediately auto-submit your exam to the server.</li>
                    {testId && <li>Answers and detailed explanations will only be available on the Dashboard after submission if permitted by the Admin.</li>}
                </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <button onClick={() => navigate(-1)} className="px-8 py-4 bg-gray-800 rounded-xl font-bold hover:bg-gray-700">Cancel</button>
                <button onClick={startExam} className="px-8 py-4 bg-neon-blue text-black font-black rounded-xl hover:scale-105 shadow-[0_0_20px_rgba(45,212,191,0.3)]">Accept Rules & Start</button>
            </div>
        </div>
    );
  }

  // --- RESULT SCREEN (SPLIT SCREEN PAGINATION) ---
  if (isFinished && !testId) {
      const accuracy = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;
      const passed = accuracy >= 75;
      const currentReportItem = flatReport[reportPageIndex];

      return (
        <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 font-sans flex flex-col">
          
          {/* Action Bar & Summary */}
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-6 border-b border-white/10 shrink-0">
             <div className="flex items-center gap-4">
                 <div className="text-4xl">{passed ? '🏆' : '🎯'}</div>
                 <div>
                     <h1 className={`text-3xl font-black font-display ${passed ? 'text-yellow-400' : 'text-neon-blue'}`}>{passed ? 'Test Passed!' : 'Keep Practicing!'}</h1>
                     <p className="text-gray-400 font-mono text-sm mt-1">Score: <span className="text-white font-bold">{finalScore}/{totalQuestions}</span> • Accuracy: <span className="text-white font-bold">{accuracy}%</span></p>
                 </div>
             </div>
             <div className="flex gap-4">
                 <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                     <FiHome/> Dashboard
                 </button>
                 <button onClick={handleDownloadPDF} disabled={isDownloading} className="px-6 py-2.5 bg-neon-purple text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:hover:scale-100">
                     <FiDownload /> {isDownloading ? "Generating PDF..." : "Download Report"}
                 </button>
             </div>
          </div>

          {/* SPLIT SCREEN MCQ REPORT */}
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 bg-[#1E293B] rounded-3xl border border-gray-700 shadow-2xl overflow-hidden animate-fade-in">
             
              {/* Pagination Header */}
              <div className="flex flex-col md:flex-row items-center justify-between bg-black/40 p-4 border-b border-gray-700 shrink-0 gap-4">
                  <button 
                      onClick={() => setReportPageIndex(prev => prev - 1)} 
                      disabled={reportPageIndex === 0}
                      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-xl font-bold text-sm transition-colors w-full md:w-auto justify-center"
                  >
                      <FiChevronLeft /> Previous
                  </button>
                  
                  <div className="flex items-center gap-4">
                      <span className="font-mono text-gray-400 font-bold hidden md:inline">
                          <span className="text-blue-400 mr-2">{currentReportItem.sectionTitle}</span>| Question {reportPageIndex + 1} of {totalQuestions}
                      </span>
                      <div className="flex items-center gap-2 bg-[#0F172A] px-3 py-1.5 rounded-lg border border-gray-700">
                          {currentReportItem.is_correct ? <FiCheckCircle className="text-green-500" /> : <FiXCircle className="text-red-500" />}
                          <span className={`text-sm font-bold ${currentReportItem.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                              {currentReportItem.is_correct ? '+1 Marks' : '0 Marks'}
                          </span>
                      </div>
                  </div>

                  <button 
                      onClick={() => setReportPageIndex(prev => prev + 1)} 
                      disabled={reportPageIndex === totalQuestions - 1}
                      className="flex items-center gap-2 bg-neon-blue text-black hover:bg-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-xl font-bold text-sm transition-colors w-full md:w-auto justify-center"
                  >
                      Next <FiChevronRight />
                  </button>
              </div>

              {/* Split Screen Content */}
              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                 
                  {/* LEFT PANEL: Question & Options */}
                  <div className="w-full lg:w-1/2 p-6 lg:p-8 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-gray-700">
                      <p className="md:hidden text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">{currentReportItem.sectionTitle}</p>
                      
                      <h2 className="text-xl lg:text-2xl font-bold leading-relaxed mb-8 text-white whitespace-pre-wrap">
                          <span className="text-gray-500 mr-2">{reportPageIndex + 1}.</span> 
                          {currentReportItem.question}
                      </h2>
                      
                      <div className="space-y-4">
                          {currentReportItem.options && currentReportItem.options.map((opt, idx) => {
                              const isUserSelected = opt === currentReportItem.user_ans;
                              const isCorrectAnswer = opt === currentReportItem.correct_ans;
                              
                              let boxStyle = "bg-[#0F172A] border-gray-700 text-gray-300"; 
                              
                              if (isCorrectAnswer) {
                                  boxStyle = "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                              } else if (isUserSelected && !isCorrectAnswer) {
                                  boxStyle = "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                              }

                              return (
                                  <div key={idx} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${boxStyle}`}>
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isCorrectAnswer ? 'border-green-500 bg-green-500/30' : isUserSelected ? 'border-red-500 bg-red-500/30' : 'border-gray-600'}`}>
                                          {isCorrectAnswer && <FiCheckCircle className="text-green-400 text-sm" />}
                                          {isUserSelected && !isCorrectAnswer && <FiXCircle className="text-red-400 text-sm" />}
                                      </div>
                                      <span className="font-medium text-base whitespace-pre-wrap">{opt}</span>
                                  </div>
                              );
                          })}
                          
                          {currentReportItem.user_ans === "Not Answered" && (
                              <div className="mt-6 p-4 rounded-2xl border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-400 flex items-center gap-3">
                                  <FiAlertCircle className="text-xl shrink-0" />
                                  <span className="font-bold">You did not attempt this question.</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* RIGHT PANEL: Explanation */}
                  <div className="w-full lg:w-1/2 bg-[#0d1117] p-6 lg:p-8 overflow-y-auto custom-scrollbar">
                      <div className="sticky top-0 bg-[#0d1117] pb-4 mb-4 border-b border-gray-800 z-10">
                          <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                              <FiFileText className="text-lg" /> Detailed Explanation
                          </h3>
                      </div>
                      
                      {currentReportItem.explanation ? (
                          <div className="text-gray-300 text-base leading-relaxed font-serif">
                              <ExplanationDisplay explanation={currentReportItem.explanation} />
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-48 text-gray-500 opacity-50">
                              <FiAlertCircle className="text-4xl mb-3" />
                              <p>No detailed explanation provided for this question.</p>
                          </div>
                      )}
                  </div>
                  
              </div>
          </div>
          
          {/* Hidden PDF Div for html2pdf */}
          <div className="absolute top-0 left-0 w-full h-0 overflow-hidden opacity-0 pointer-events-none z-[-999]">
              <div id="clean-pdf-report" className="w-[794px] bg-white text-black px-12 py-10 font-sans mx-auto break-words">
                 <h1 className="text-3xl font-black text-blue-600 mb-2">{decodedTopic} - Report</h1>
                 <p className="text-gray-500 mb-8 font-bold border-b border-gray-300 pb-4">Student: {user?.fname} {user?.lname} | Score: {finalScore}/{totalQuestions}</p>
                 
                 {flatReport.map((q, idx) => (
                    <div key={idx} className="mb-8 pb-8 border-b border-gray-200" style={{ pageBreakInside: 'avoid' }}>
                       <div className="flex gap-3 mb-3">
                          <span className={`flex-shrink-0 font-bold ${q.is_correct ? 'text-green-600' : (q.user_ans === "Not Answered" ? 'text-gray-500' : 'text-red-600')}`}>
                             Q{idx + 1}.
                          </span>
                          <h3 className="font-bold text-gray-800 whitespace-pre-wrap">{q.question}</h3>
                       </div>
                       
                       <div className="pl-8 mb-4 space-y-1">
                          {q.options.map((opt, oIdx) => {
                             let mark = "[ ]";
                             let style = "text-gray-600";
                             if (opt === q.correct_ans) { mark = "[✓]"; style = "text-green-600 font-bold"; }
                             else if (opt === q.user_ans) { mark = "[✗]"; style = "text-red-600 font-bold line-through"; }
                             return <div key={oIdx} className={`text-sm ${style}`}>{mark} {opt}</div>;
                          })}
                       </div>

                       <div className="pl-8 bg-gray-50 p-4 rounded-lg">
                          <PDFExplanationDisplay explanation={q.explanation} />
                       </div>
                    </div>
                 ))}
              </div>
          </div>
        </div>
      );
  }

  // --- EXAM SCREEN RENDERS BELOW ---
  const activeQuestion = currentSection?.qs[currentIdx];

  const renderQuestionPalette = () => (
    <div className="grid grid-cols-5 gap-2 mt-4">
      {currentSection?.qs.map((_, i) => {
        const key = `${activeSectionId}-${i}`;
        const isAttempted = !!userAnswers[key];
        const isMarked = !!marked[key];
        const isVisited = !!visited[key];
        const isCurrent = i === currentIdx;
        
        let btnStyle = "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"; 
        
        if (isMarked && isAttempted) {
            btnStyle = "bg-purple-600 text-white font-bold border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.5)]";
        } else if (isMarked && !isAttempted) {
            btnStyle = "bg-purple-600 text-white font-bold border-purple-400";
        } else if (!isMarked && isAttempted) {
            btnStyle = "bg-green-500 text-white font-bold border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]";
        } else if (!isMarked && !isAttempted && isVisited) {
            btnStyle = "bg-red-500 text-white font-bold border-red-400";
        }

        if (isCurrent) btnStyle += " ring-2 ring-white scale-110 z-10";

        return (
          <button key={i} onClick={() => { setCurrentIdx(i); setShowMobilePalette(false); }} className={`w-10 h-10 rounded-lg text-sm transition-all flex items-center justify-center relative ${btnStyle}`}>
            {i + 1}
            {isMarked && isAttempted && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-black"></div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[5000] w-screen h-screen overflow-y-auto bg-game-bg text-white flex flex-col pb-24 select-none">
      
      {showWarning && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-6">
            <FiAlertTriangle className="text-red-500 text-8xl mb-6 animate-pulse" />
            <h2 className="text-4xl font-black text-white mb-4">Security Violation</h2>
            <button onClick={returnToFullscreen} className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl mt-4">Return to Test</button>
        </div>
      )}

      {/* STICKY TOP NAVIGATION */}
      <div className="sticky top-0 z-40 w-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 md:p-6 bg-black/90 backdrop-blur-2xl border-b border-white/5">
            <button onClick={() => { if(window.confirm("Exit test? All progress will be lost.")) navigate(-1); }} className="text-gray-500 hover:text-white bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors"><FiX /> Quit</button>
            <div className={`text-2xl font-mono font-black flex items-center gap-2 tracking-widest ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-neon-blue'}`}>
                <FiClock /> {formatTime(timeLeft)}
            </div>
            <button onClick={handleManualSubmit} disabled={submitting} className="hidden lg:flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-sm transition-all">
                {submitting ? "Submitting..." : "Submit Test"}
            </button>
            <button onClick={() => setShowMobilePalette(!showMobilePalette)} className="lg:hidden text-gray-400 bg-white/5 p-2 rounded-xl"><FiGrid size={24}/></button>
          </div>

          {sections.length > 1 && (
              <div className="w-full bg-black/80 backdrop-blur-2xl border-b border-white/10 overflow-x-auto custom-scrollbar">
                  <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-2 py-3">
                      {sections.map(sec => (
                          <button key={sec.id} onClick={() => { setActiveSectionId(sec.id); setCurrentIdx(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${activeSectionId === sec.id ? 'bg-neon-blue text-black shadow-[0_0_15px_rgba(45,212,191,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                              {sec.title}
                          </button>
                      ))}
                  </div>
              </div>
          )}
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex gap-8">
        <div className="flex-1 animate-fade-in-up pb-10">
          <div className="flex justify-between items-end mb-6">
            <span className="text-neon-purple text-sm font-bold bg-neon-purple/10 px-3 py-1 rounded-md border border-neon-purple/20 uppercase tracking-widest">
              Q {currentIdx + 1} / {currentSection?.qs.length}
            </span>
          </div>
          
          <h2 className="text-xl md:text-2xl font-medium mb-10 leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/10 whitespace-pre-wrap select-none">
            {activeQuestion?.question}
          </h2>
          
          <div className="space-y-4">
            {activeQuestion?.options.map((opt, i) => {
                const isSelected = userAnswers[currentKey] === opt;
                const style = isSelected ? "bg-neon-blue/10 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(45,212,191,0.2)] scale-[1.01]" : "bg-black/40 border-white/10 text-gray-300 hover:bg-white/5";
                return (
                    <button key={i} onClick={() => handleSelectOption(opt)} className={`w-full p-5 rounded-2xl border text-left text-lg font-medium flex items-center gap-4 transition-all ${style}`}>
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm ${isSelected ? 'border-neon-blue text-neon-blue' : 'border-gray-600'}`}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                );
            })}
          </div>
        </div>

        <div className="hidden lg:block w-96 flex-shrink-0">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/40 sticky top-48">
            <h3 className="font-bold text-white mb-4 border-b border-white/10 pb-4 flex items-center gap-2"><FiGrid className="text-neon-blue"/> {currentSection?.title || "Assessment"} Map</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500"></div> Answered</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500"></div> Not Answered</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white/10 border border-white/20"></div> Not Visited</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-600"></div> Marked</span>
                <span className="flex items-center gap-2 col-span-2 relative"><div className="w-3 h-3 rounded bg-purple-600"></div><div className="absolute left-[7px] -top-1 w-2 h-2 bg-green-400 rounded-full border border-black"></div> Answered & Marked</span>
            </div>
            {renderQuestionPalette()}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-2 gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <button onClick={handleMarkForReview} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm border transition-all ${marked[currentKey] ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                    <FiBookmark /> <span className="hidden sm:inline">{marked[currentKey] ? 'Unmark Review' : 'Mark for Review'}</span><span className="sm:hidden">Mark</span>
                </button>
                <button onClick={handleClearResponse} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                    <FiRefreshCcw /> <span className="hidden sm:inline">Clear Response</span><span className="sm:hidden">Clear</span>
                </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <button onClick={handlePrev} disabled={activeSectionId === 0 && currentIdx === 0} className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm ${activeSectionId === 0 && currentIdx === 0 ? 'opacity-50 cursor-not-allowed bg-white/5' : 'bg-white/10 hover:bg-white/20 text-white transition-all'}`}>
                    <FiChevronLeft/> Prev
                </button>
                {(!isLastQuestionInSection || !isFinalSection) ? (
                    <button onClick={handleNext} className="flex items-center gap-1 sm:gap-2 px-6 sm:px-8 py-3 rounded-xl font-black bg-white text-black hover:bg-gray-200 uppercase tracking-widest text-xs sm:text-sm transition-all shadow-lg">
                        Next <FiChevronRight/>
                    </button>
                ) : (
                    <button onClick={handleManualSubmit} disabled={submitting} className="flex items-center gap-1 sm:gap-2 px-6 sm:px-8 py-3 rounded-xl font-black bg-neon-blue text-black hover:scale-105 uppercase tracking-widest text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)]">
                        Submit <FiChevronRight/>
                    </button>
                )}
            </div>
            <button onClick={handleManualSubmit} disabled={submitting} className="lg:hidden ml-auto flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex-shrink-0">
                Submit Test
            </button>
        </div>
      </div>
    </div>
  );
}