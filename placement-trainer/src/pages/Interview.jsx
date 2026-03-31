import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../api';
import { FiMic, FiSquare, FiUser, FiCpu, FiCheckCircle, FiAlertCircle, FiSettings, FiArrowRight, FiFileText, FiVideo, FiVideoOff, FiActivity } from 'react-icons/fi';

export default function Interview() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State Phases: 'setup' -> 'loading' -> 'interviewing' -> 'evaluating' -> 'report'
    const [phase, setPhase] = useState('setup');
    
    // Setup State
    const [role, setRole] = useState('Software Engineer');
    const [questionCount, setQuestionCount] = useState(5);
    
    // Interview State
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [currentAnswer, setCurrentAnswer] = useState("");
    
    // Voice & Video State
    const [isRecording, setIsRecording] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const recognitionRef = useRef(null);
    const videoRef = useRef(null);

    // Live NLP State (Tracking Filler Words)
    const [fillerCount, setFillerCount] = useState(0);

    // Report State
    const [report, setReport] = useState(null);

    // --- 1. INIT SPEECH RECOGNITION & LIVE NLP ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const text = event.results[i][0].transcript;
                        finalTranscript += text + ' ';
                        
                        // LIVE NLP: Detect Filler Words instantly
                        const fillers = (text.match(/\b(um|uh|like|you know|basically|literally)\b/gi) || []).length;
                        if (fillers > 0) setFillerCount(prev => prev + fillers);
                    }
                }
                if (finalTranscript) {
                    setCurrentAnswer(prev => prev + finalTranscript);
                }
            };

            recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
            recognitionRef.current = recognition;
        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }
    }, []);

    // --- 2. CAMERA PERMISSIONS ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraActive(true);
        } catch (err) {
            console.error("Camera access denied or unavailable.", err);
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
    };

    useEffect(() => {
        if (phase === 'interviewing') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera(); 
    }, [phase]);

    // --- 3. AI TEXT TO SPEECH ---
    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const msg = new SpeechSynthesisUtterance(text);
            msg.rate = 1.0;
            msg.pitch = 1.0;
            
            msg.onstart = () => setIsAiSpeaking(true);
            msg.onend = () => setIsAiSpeaking(false);
            
            window.speechSynthesis.speak(msg);
        }
    };

    const handleStartInterview = async () => {
        if (!role.trim()) return alert("Please enter a role.");
        setPhase('loading');

        try {
            const res = await fetch(`${API_BASE}/api/interview/generate-questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, count: parseInt(questionCount) })
            });
            const data = await res.json();
            
            if (data.questions && data.questions.length > 0) {
                setQuestions(data.questions);
                setPhase('interviewing');
                speakText(data.questions[0]); 
            } else {
                throw new Error("No questions generated.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to start interview. Check connection.");
            setPhase('setup');
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    const handleNextQuestion = async () => {
        if (!currentAnswer.trim()) return alert("Please provide an answer before continuing.");
        
        if (isRecording) toggleRecording();
        window.speechSynthesis.cancel();

        const newAnswers = [...answers, currentAnswer];
        setAnswers(newAnswers);
        setCurrentAnswer("");
        setFillerCount(0); 

        if (currentIndex < questions.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            speakText(questions[nextIdx]);
        } else {
            setPhase('evaluating');
            stopCamera();
            try {
                const qaPairs = questions.map((q, i) => ({
                    question: q,
                    candidate_answer: newAnswers[i]
                }));

                const res = await fetch(`${API_BASE}/api/interview/evaluate-batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        user_id: user.id, 
                        role: role, 
                        qa_pairs: qaPairs 
                    })
                });
                
                const data = await res.json();
                setReport(data.report);
                setPhase('report');
            } catch (err) {
                console.error(err);
                alert("Failed to evaluate interview.");
                setPhase('setup'); 
            }
        }
    };

    // ==========================================
    // RENDER LOGIC
    // ==========================================

    if (phase === 'setup') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-sans relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none"></div>

                <div className="max-w-md w-full bg-white/5 border border-white/10 p-10 rounded-[2rem] shadow-2xl backdrop-blur-2xl relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                        <FiSettings className="text-3xl text-white" />
                    </div>
                    <h1 className="text-3xl font-display font-black mb-2 tracking-tight">System Config</h1>
                    <p className="text-gray-400 mb-8 text-sm">Initialize AI interview parameters and grant hardware access for NLP analysis.</p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Target Role</label>
                            <input 
                                type="text" 
                                value={role} 
                                onChange={e => setRole(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-gray-600 shadow-inner"
                                placeholder="e.g. Full Stack Developer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Session Length</label>
                            <div className="relative">
                                <select 
                                    value={questionCount} 
                                    onChange={e => setQuestionCount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer appearance-none shadow-inner"
                                >
                                    <option value="5">5 Questions (Quick Practice)</option>
                                    <option value="10">10 Questions (Standard)</option>
                                    <option value="15">15 Questions (Deep Dive)</option>
                                </select>
                                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>
                        <button 
                            onClick={handleStartInterview}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg py-4 rounded-2xl hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)] mt-4 flex items-center justify-center gap-3"
                        >
                            <FiVideo className="text-xl" /> Initialize Interview
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'loading' || phase === 'evaluating') {
        const isEval = phase === 'evaluating';
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className={`absolute w-[500px] h-[500px] rounded-full blur-[150px] opacity-30 ${isEval ? 'bg-fuchsia-600' : 'bg-cyan-600'}`}></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                        <div className={`absolute inset-0 rounded-full border-t-2 border-l-2 animate-spin ${isEval ? 'border-fuchsia-400' : 'border-cyan-400'}`}></div>
                        <div className={`absolute inset-4 rounded-full border-b-2 border-r-2 animate-[spin_2s_linear_reverse] ${isEval ? 'border-purple-500' : 'border-blue-500'}`}></div>
                        {isEval ? <FiFileText className="text-4xl text-fuchsia-400" /> : <FiCpu className="text-4xl text-cyan-400" />}
                    </div>
                    
                    <h2 className="text-3xl font-black font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        {isEval ? "Analyzing Performance" : "Compiling Simulation"}
                    </h2>
                    <p className="text-gray-400 mt-3 tracking-wide">
                        {isEval ? "Running deep NLP analysis on transcript..." : `Synthesizing ${questionCount} tailored scenarios for ${role}...`}
                    </p>
                </div>
            </div>
        );
    }

    if (phase === 'interviewing') {
        return (
            <div className="h-screen bg-[#050505] text-white flex flex-col font-sans overflow-hidden relative">
                {/* Subtle Background Mesh */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 z-0 pointer-events-none"></div>

                {/* Header */}
                <header className="px-6 py-5 border-b border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center shrink-0 z-10 h-20">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/50 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                            <FiActivity className="text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">{role} Simulation</h2>
                            <p className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Question {currentIndex + 1} / {questions.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="gap-2 hidden md:flex">
                            {questions.map((_, i) => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i < currentIndex ? 'w-8 bg-cyan-500' : i === currentIndex ? 'w-12 bg-white shadow-[0_0_10px_white]' : 'w-4 bg-gray-800'}`}></div>
                            ))}
                        </div>
                        <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${cameraActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            {cameraActive ? <FiVideo /> : <FiVideoOff />} {cameraActive ? 'Live' : 'No Feed'}
                        </div>
                    </div>
                </header>

                <div className="flex-1 w-full p-4 md:p-6 flex flex-col lg:flex-row gap-6 overflow-hidden z-10 min-h-0">
                    
                    {/* LEFT SIDE: AI & VIDEO HUD */}
                    {/* 🔥 FIX: Added 'overflow-y-auto' so the left side scrolls instead of squishing elements */}
                    <div className="w-full lg:w-[35%] flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
                        
                        {/* Video Feed HUD */}
                        {/* 🔥 FIX: Changed to 'aspect-[4/3]' so video scales properly based on width */}
                        <div className="bg-black/60 border border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl w-full aspect-[4/3] shrink-0 group">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-90 transition-opacity group-hover:opacity-100" 
                            />
                            
                            <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                            
                            <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_10px_red] animate-pulse' : 'bg-gray-500'}`}></span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">REC</span>
                            </div>

                            <div className="absolute bottom-5 left-5 flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                    <FiUser className="text-white text-xs" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white shadow-black drop-shadow-md">{user?.fname || "Candidate"}</p>
                                    <p className="text-[10px] text-cyan-400 uppercase tracking-widest">Subject</p>
                                </div>
                            </div>
                            
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/20"></div>
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/20"></div>
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/20"></div>
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/20"></div>
                        </div>

                        {/* AI State Panel */}
                        {/* 🔥 FIX: 'min-h-[300px] shrink-0' guarantees this box never gets squished */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col relative shrink-0 min-h-[300px]">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                            
                            <div className="flex-1 flex flex-col justify-center items-center text-center relative z-10 py-6">
                                <div className="relative mb-6">
                                    {isAiSpeaking && <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>}
                                    <div className={`w-20 h-20 rounded-full border border-white/10 flex items-center justify-center bg-black/40 backdrop-blur-md relative z-10 transition-all duration-300 ${isAiSpeaking ? 'shadow-[0_0_30px_rgba(34,211,238,0.3)] border-cyan-500/50 scale-105' : ''}`}>
                                        <FiCpu className={`text-3xl ${isAiSpeaking ? 'text-cyan-400' : 'text-gray-500'}`} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Placify AI</h3>
                                <p className={`text-xs uppercase tracking-widest font-bold mt-2 ${isAiSpeaking ? 'text-cyan-400' : 'text-gray-500'}`}>
                                    {isAiSpeaking ? 'Broadcasting...' : 'Awaiting Input...'}
                                </p>
                            </div>
                            
                            <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 relative z-10 mt-auto">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">NLP Buffer</p>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-3 bg-cyan-500/50 rounded-full animate-pulse delay-75"></div>
                                        <div className="w-1 h-3 bg-cyan-500/50 rounded-full animate-pulse delay-150"></div>
                                        <div className="w-1 h-3 bg-cyan-500/50 rounded-full animate-pulse delay-300"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-gray-400">Filler Words</span>
                                    <span className={`text-2xl font-black ${fillerCount > 3 ? 'text-red-400' : fillerCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {fillerCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE: Q&A AREA */}
                    {/* 🔥 FIX: Added 'overflow-y-auto' to right side so textarea doesn't vanish off screen */}
                    <div className="w-full lg:w-[65%] flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
                        
                        {/* Question Card */}
                        {/* 🔥 FIX: 'shrink-0 min-h-[160px]' prevents it from shrinking */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl shrink-0 min-h-[160px] flex flex-col justify-center relative">
                            {isAiSpeaking && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[pulse_2s_ease-in-out_infinite]"></div>}
                            <p className="text-xs text-cyan-400 uppercase tracking-widest font-bold mb-3">Current Objective</p>
                            <h3 className="text-xl md:text-2xl font-display font-medium leading-relaxed text-white drop-shadow-md">
                                "{questions[currentIndex]}"
                            </h3>
                            <button onClick={() => speakText(questions[currentIndex])} className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors w-fit">
                                <FiActivity /> Replay Audio
                            </button>
                        </div>

                        {/* Live Transcription Box */}
                        {/* 🔥 FIX: 'min-h-[350px] flex-1' ensures text area is always perfectly usable */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl flex flex-col shrink-0 min-h-[350px] flex-1">
                            <div className="flex flex-wrap items-center justify-between mb-6 shrink-0 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_10px_red] animate-pulse' : 'bg-gray-600'}`}></div>
                                    <span className="font-bold text-gray-300 uppercase tracking-widest text-xs">Live Transcript</span>
                                </div>
                                
                                <button 
                                    onClick={toggleRecording}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white' : 'bg-white text-black hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
                                >
                                    {isRecording ? <><FiSquare /> Stop</> : <><FiMic /> Record</>}
                                </button>
                            </div>

                            <textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder="Awaiting voice input... Begin speaking to populate transcript."
                                className="w-full flex-1 bg-black/40 text-gray-200 text-lg md:text-xl leading-relaxed resize-none focus:outline-none p-6 rounded-2xl border border-white/5 placeholder:text-gray-700 custom-scrollbar shadow-inner min-h-[150px]"
                            ></textarea>
                            
                            <div className="mt-6 flex justify-end shrink-0">
                                <button 
                                    onClick={handleNextQuestion}
                                    className="flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-transform hover:scale-105 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                                >
                                    {currentIndex === questions.length - 1 ? "Finalize Output" : "Proceed"} <FiArrowRight className="text-lg" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Embedded scrollbar styles to ensure the custom scrollbars look clean */}
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
                `}</style>
            </div>
        );
    }

    if (phase === 'report' && report) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none"></div>
                
                <div className="max-w-7xl mx-auto relative z-10">
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 border-b border-white/10 pb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">Session Complete</div>
                                <span className="text-sm font-mono text-gray-500">{new Date().toLocaleDateString()}</span>
                            </div>
                            <h1 className="text-5xl font-display font-black tracking-tight mb-2">Evaluation Report</h1>
                            <p className="text-xl text-gray-400">Profile: <span className="text-cyan-400 font-bold">{role}</span></p>
                        </div>
                        <button onClick={() => navigate('/dashboard')} className="mt-6 md:mt-0 px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                            Return to Hub
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
                        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-8 rounded-[2rem] text-center shadow-2xl relative overflow-hidden group">
                            <div className={`absolute top-0 left-0 w-full h-2 ${report.overall.score >= 75 ? 'bg-green-400' : report.overall.score >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">Total Score</p>
                            <p className={`text-6xl font-black drop-shadow-lg ${report.overall.score >= 75 ? 'text-green-400' : report.overall.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {report.overall.score}
                            </p>
                        </div>
                        {[
                            { label: "Technical", val: report.overall.technical, color: "text-cyan-400" },
                            { label: "Communication", val: report.overall.communication, color: "text-violet-400" },
                            { label: "Problem Solving", val: report.overall.problem_solving, color: "text-fuchsia-400" },
                            { label: "Confidence", val: report.overall.confidence, color: "text-blue-400" },
                        ].map((metric, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] flex flex-col items-center justify-center backdrop-blur-md hover:bg-white/10 transition-colors">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4 text-center">{metric.label}</p>
                                <p className={`text-4xl font-black ${metric.color}`}>{metric.val}<span className="text-gray-600 text-xl font-medium">/10</span></p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 border border-violet-500/30 p-8 rounded-[2rem] mb-16 backdrop-blur-xl shadow-2xl">
                        <h3 className="text-violet-300 font-black uppercase tracking-widest mb-4 flex items-center gap-3 text-sm">
                            <FiAlertCircle className="text-xl"/> Executive Summary
                        </h3>
                        <p className="text-gray-200 text-lg leading-relaxed font-medium">{report.overall.suggestions}</p>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/10 flex-1"></div>
                        <h2 className="text-2xl font-bold font-display uppercase tracking-widest">Transcript Analysis</h2>
                        <div className="h-px bg-white/10 flex-1"></div>
                    </div>

                    <div className="space-y-10">
                        {report.per_question_analysis.map((item, index) => (
                            <div key={index} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl">
                                <div className="p-8 bg-black/40 border-b border-white/5 flex gap-6 items-start">
                                    <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center font-black text-gray-300 shadow-inner border border-white/10">
                                        Q{index + 1}
                                    </div>
                                    <h3 className="text-xl font-medium leading-relaxed pt-1 text-white">{item.question}</h3>
                                </div>
                                
                                <div className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
                                    <div className="col-span-2 space-y-8">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <FiUser/> Your Output
                                            </h4>
                                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/40 p-6 rounded-2xl border border-white/5 text-sm shadow-inner">{item.candidate_answer}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <FiCpu/> Ideal Synthesis
                                            </h4>
                                            <p className="text-cyan-100 whitespace-pre-wrap leading-relaxed text-sm bg-cyan-900/20 p-6 rounded-2xl border border-cyan-500/20 shadow-inner">{item.ideal_answer}</p>
                                        </div>
                                    </div>

                                    <div className="col-span-1 border-t xl:border-t-0 xl:border-l border-white/10 pt-8 xl:pt-0 xl:pl-8">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Sub-Metrics</h4>
                                        <div className="space-y-5 bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                            {Object.entries(item.metrics).map(([key, value]) => (
                                                <div key={key}>
                                                    <div className="flex justify-between text-[10px] font-bold mb-2">
                                                        <span className="text-gray-400 uppercase tracking-wider">{key.replace('_', ' ')}</span>
                                                        <span className="text-white">{value}/10</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${(value / 10) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        );
    }

    return null;
}