import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react'; // 🔥 NEW: Monaco Editor
import API_BASE from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPlay, FiClock, FiCheckCircle, FiXCircle, FiCode, FiList, FiArrowLeft, FiChevronRight, FiChevronLeft, FiDownload } from 'react-icons/fi';

export default function CodingPlatform() {
    const { level } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [problems, setProblems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState('coding'); 
    
    const [timeElapsed, setTimeElapsed] = useState(0);
    const timerRef = useRef(null);

    const [submissions, setSubmissions] = useState([]);
    const [testResultsMap, setTestResultsMap] = useState({});
    const [isRunning, setIsRunning] = useState(false);
    
    // Report States
    const [report, setReport] = useState(null);
    const [reportPageIndex, setReportPageIndex] = useState(0);

    const rawLevel = level || window.location.pathname.split('/').pop() || "easy";
    const safeLevel = rawLevel.toLowerCase();
    const difficultyName = safeLevel.charAt(0).toUpperCase() + safeLevel.slice(1);

    useEffect(() => {
        const fetchProblems = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/coding/generate-level`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ difficulty: difficultyName, user_id: user.id, count: 5 })
                });
                if (!res.ok) throw new Error("Failed to fetch problems");
                const data = await res.json();
                
                setProblems(data.problems);
                
                const initialSubs = data.problems.map((p, idx) => ({
                    problem_title: p.title || p.Title || p.problem_title || `Problem ${idx + 1}`,
                    language: 'python',
                    codes: {
                        python: p.starter_code?.python || p.starter_code?.Python || "# Write your python code here",
                        java: p.starter_code?.java || p.starter_code?.Java || "// Write your java code here",
                        cpp: p.starter_code?.cpp || p.starter_code?.Cpp || "// Write your C++ code here"
                    }
                }));
                setSubmissions(initialSubs);
                
                startTimer();
            } catch (err) {
                console.error(err);
                alert("Failed to load session.");
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchProblems();
        
        return () => stopTimer();
    }, [level, user, difficultyName]);

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);
    };
    
    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
    
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const updateCurrentSubmission = (key, value) => {
        const newSubs = [...submissions];
        if (key === 'language') {
            newSubs[currentIndex].language = value;
            setTestResultsMap(prev => ({ ...prev, [currentIndex]: [] }));
        } else if (key === 'code') {
            const activeLang = newSubs[currentIndex].language;
            newSubs[currentIndex].codes[activeLang] = value;
        }
        setSubmissions(newSubs);
    };

    const handleRunLocal = async () => {
        const currentSub = submissions[currentIndex];
        const activeCode = currentSub.codes[currentSub.language];
        const currentProb = problems[currentIndex];

        if (!activeCode.trim()) return;

        const examples = currentProb?.examples || [];
        if (examples.length === 0) {
            setTestResults([{ label: "No test cases", passed: null, actual_output: "No example test cases available for this problem.", expected_output: "" }]);
            return;
        }

        setIsRunning(true);
        setTestResultsMap(prev => ({ ...prev, [currentIndex]: [] }));

        try {
            const hiddenDriverCode = currentProb?.driver_code?.[currentSub.language] || "";
            const testCases = examples.map(ex => ({
                input: ex.input,
                expected_output: ex.output
            }));

            const res = await fetch(`${API_BASE}/api/coding/execute-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: currentSub.language,
                    code: activeCode,
                    driver_code: hiddenDriverCode,
                    test_cases: testCases
                })
            });
            const data = await res.json();
            const enriched = (data.results || []).map((r, i) => ({
                ...r,
                label: `Test Case ${i + 1}`,
                input: examples[i]?.input
            }));
            setTestResultsMap(prev => ({ ...prev, [currentIndex]: enriched }));
        } catch (err) {
            setTestResultsMap(prev => ({ ...prev, [currentIndex]: [{ label: "Error", passed: false, actual_output: err.message, expected_output: "" }] }));
        } finally {
            setIsRunning(false);
        }
    };

    const handleEndSession = async () => {
        const confirmEnd = window.confirm("Are you sure you want to end the session? All your code will be submitted for evaluation.");
        if (!confirmEnd) return;

        stopTimer();
        setPhase('evaluating');
        
        const payload = {
            user_id: Number(user.id),
            difficulty: difficultyName,
            time_taken: Number(timeElapsed),
            submissions: submissions.map(sub => ({
                problem_title: String(sub.problem_title || "Unknown Problem"),
                code: String(sub.codes[sub.language] || " "), 
                language: String(sub.language || "python")
            }))
        };
        
        try {
            const res = await fetch(`${API_BASE}/api/coding/evaluate-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error("Evaluation failed due to schema mismatch.");

            const data = await res.json();
            setReport(data);
            setPhase('report');
        } catch (err) {
            console.error(err);
            alert("Failed to generate report. Check console for details.");
            setPhase('coding'); 
            startTimer();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white">
                <FiCode className="text-6xl text-neon-blue animate-pulse mb-6" />
                <h2 className="text-2xl font-bold font-display">Preparing your {difficultyName} Session...</h2>
                <p className="text-gray-400 mt-2">Generating 5 unique problems</p>
            </div>
        );
    }

    if (phase === 'evaluating') {
        return (
            <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white">
                <FiClock className="text-6xl text-neon-orange animate-spin mb-6" />
                <h2 className="text-3xl font-bold font-display">AI is Reviewing Your Code</h2>
                <p className="text-gray-400 mt-2">Checking logic, syntax, and finding improvements...</p>
            </div>
        );
    }

    // --- REPORT PHASE UI ---
    if (phase === 'report' && report) {
        const currentEval = report.evaluations[reportPageIndex];
        const originalProb = problems[reportPageIndex];
        const originalSub = submissions[reportPageIndex];

        return (
            <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 flex flex-col">
                
                {/* Header Area */}
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-start md:items-center justify-between mb-6 pb-6 border-b border-white/10 shrink-0 print:hidden">
                    <div>
                        <h1 className="text-4xl font-display font-bold">Session <span className="text-neon-green">Complete</span></h1>
                        <p className="text-gray-400 mt-2">Difficulty: {difficultyName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
                        <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/10 text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time</p>
                            <p className="text-xl font-mono text-neon-blue">{formatTime(report.time_taken)}</p>
                        </div>
                        <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/10 text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Score</p>
                            <p className="text-xl font-bold text-neon-green">{report.total_correct} / {report.total_problems}</p>
                        </div>
                        <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-2xl font-bold transition-colors"
                        >
                            <FiDownload /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Paginated Report View */}
                <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 print:hidden">
                    
                    <div className="flex items-center justify-between bg-black/40 p-4 rounded-t-2xl border border-white/10 border-b-0 shrink-0">
                        <button 
                            onClick={() => setReportPageIndex(prev => prev - 1)} 
                            disabled={reportPageIndex === 0}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl font-bold text-sm"
                        >
                            <FiChevronLeft /> Previous
                        </button>
                        <span className="font-mono text-gray-400 font-bold">
                            Problem {reportPageIndex + 1} of {report.total_problems}
                        </span>
                        <button 
                            onClick={() => setReportPageIndex(prev => prev + 1)} 
                            disabled={reportPageIndex === report.total_problems - 1}
                            className="flex items-center gap-2 bg-neon-blue text-black hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl font-bold text-sm"
                        >
                            Next <FiChevronRight />
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 bg-black/20 p-6 rounded-b-2xl border border-white/10 flex-1 overflow-hidden">
                        
                        {/* LEFT COLUMN: Problem & Code */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-4">{originalProb?.title || currentEval?.problem_title}</h2>
                                <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">{originalProb?.description}</p>
                                
                                {originalProb?.examples?.map((ex, i) => (
                                    <div key={i} className="mb-4">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Example {i + 1}:</h3>
                                        <pre className="bg-black/50 p-3 rounded-xl text-xs whitespace-pre-wrap font-mono border border-white/5 text-gray-300">
                                            <span className="text-neon-green">Input:</span> {ex.input}<br />
                                            <span className="text-neon-blue">Output:</span> {ex.output}
                                        </pre>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Your Submitted Code</h3>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-300 uppercase bg-gray-800 px-3 py-1 rounded-t-lg w-fit border border-b-0 border-gray-700">
                                        {originalSub?.language}
                                    </span>
                                    <pre className="bg-[#0d1117] p-4 rounded-xl rounded-tl-none border border-gray-700 text-sm overflow-x-auto text-gray-300 font-mono">
                                        <code>{originalSub?.codes?.[originalSub.language] || ""}</code>
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Feedback */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-4">
                            {currentEval && (
                                <div className={`p-6 rounded-2xl border bg-black/40 ${currentEval.is_correct ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}`}>
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                                        {currentEval.is_correct ? <FiCheckCircle className="text-3xl text-green-500"/> : <FiXCircle className="text-3xl text-red-500"/>}
                                        <h3 className={`text-2xl font-bold ${currentEval.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                                            {currentEval.is_correct ? 'Correct Solution' : 'Needs Improvement'}
                                        </h3>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">AI Code Review</h4>
                                        <p className="text-white text-lg leading-relaxed">
                                            {currentEval.feedback}
                                        </p>
                                    </div>

                                    {currentEval.ideal_solution_snippets && (
                                        <div className="mt-8">
                                            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-4">Ideal Approaches</h4>
                                            <div className="flex flex-col gap-6">
                                                {currentEval.ideal_solution_snippets.python && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-blue-400 uppercase bg-blue-500/10 px-3 py-1 rounded-t-lg w-fit border border-b-0 border-blue-500/20">Python</span>
                                                        <pre className="bg-[#0d1117] p-4 rounded-xl rounded-tl-none border border-gray-700 text-xs overflow-x-auto text-gray-300 custom-scrollbar">
                                                            <code>{currentEval.ideal_solution_snippets.python}</code>
                                                        </pre>
                                                    </div>
                                                )}
                                                {currentEval.ideal_solution_snippets.java && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-orange-400 uppercase bg-orange-500/10 px-3 py-1 rounded-t-lg w-fit border border-b-0 border-orange-500/20">Java</span>
                                                        <pre className="bg-[#0d1117] p-4 rounded-xl rounded-tl-none border border-gray-700 text-xs overflow-x-auto text-gray-300 custom-scrollbar">
                                                            <code>{currentEval.ideal_solution_snippets.java}</code>
                                                        </pre>
                                                    </div>
                                                )}
                                                {currentEval.ideal_solution_snippets.cpp && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-purple-400 uppercase bg-purple-500/10 px-3 py-1 rounded-t-lg w-fit border border-b-0 border-purple-500/20">C++</span>
                                                        <pre className="bg-[#0d1117] p-4 rounded-xl rounded-tl-none border border-gray-700 text-xs overflow-x-auto text-gray-300 custom-scrollbar">
                                                            <code>{currentEval.ideal_solution_snippets.cpp}</code>
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center shrink-0 print:hidden">
                    <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                        Return to Dashboard
                    </button>
                </div>

                {/* --- PRINT ONLY VIEW --- */}
                <div className="hidden print:block text-black bg-white w-full">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-3xl font-bold">Placify AI Coding Report</h1>
                        <p className="text-lg">Difficulty: {difficultyName} | Score: {report.total_correct}/{report.total_problems} | Time: {formatTime(report.time_taken)}</p>
                    </div>

                    {report.evaluations.map((ev, i) => {
                        const prob = problems.find(p => p.title === ev.problem_title) || problems[i];
                        const sub = submissions.find(s => s.problem_title === ev.problem_title) || submissions[i];
                        return (
                            <div key={i} className="mb-12 border-b border-gray-300 pb-8 page-break-inside-avoid">
                                <h2 className="text-2xl font-bold mb-2">Q{i+1}: {ev.problem_title}</h2>
                                <p className="mb-4 text-sm">{prob?.description}</p>
                                
                                <h3 className="font-bold mt-4 text-sm uppercase">Your Code ({sub?.language}):</h3>
                                <pre className="bg-gray-100 p-3 rounded text-xs overflow-hidden mb-4 border border-gray-300 whitespace-pre-wrap">
                                    <code>{sub?.codes?.[sub.language]}</code>
                                </pre>

                                <h3 className="font-bold text-sm uppercase mt-4">AI Evaluation: {ev.is_correct ? '✅ Passed' : '❌ Failed'}</h3>
                                <p className="mb-4 text-sm font-semibold">{ev.feedback}</p>

                                {ev.ideal_solution_snippets && (
                                    <>
                                        <h3 className="font-bold text-sm uppercase mt-4">Ideal Solutions:</h3>
                                        {ev.ideal_solution_snippets.python && (
                                            <div className="mt-2">
                                                <span className="font-bold text-xs underline">Python:</span>
                                                <pre className="bg-gray-100 p-3 rounded text-xs border border-gray-300 whitespace-pre-wrap">
                                                    <code>{ev.ideal_solution_snippets.python}</code>
                                                </pre>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>
        );
    }

    // --- ACTIVE CODING PHASE UI ---
    const currentProb = problems[currentIndex];
    const currentSub = submissions[currentIndex];

    return (
        <div className="h-screen bg-[#0F172A] text-white flex flex-col font-sans overflow-hidden print:hidden">
            <header className="h-16 flex items-center justify-between px-6 bg-black/50 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/technical/levels')} className="text-gray-400 hover:text-white transition-colors">
                        <FiArrowLeft className="text-xl" />
                    </button>
                    <h1 className="text-xl font-bold font-display">{difficultyName} Session</h1>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-gray-900 px-4 py-1.5 rounded-full border border-gray-700">
                        <FiClock className="text-neon-orange" />
                        <span className="font-mono text-lg font-bold">{formatTime(timeElapsed)}</span>
                    </div>
                    <button 
                        onClick={handleEndSession}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-red-500/20"
                    >
                        <FiCheckCircle /> Finish Session
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-64 bg-black/30 border-r border-white/10 flex-col overflow-y-auto hidden md:flex shrink-0">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FiList/> Problems</h2>
                    </div>
                    <div className="p-2 space-y-1">
                        {problems.map((p, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setCurrentIndex(idx); }}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center justify-between ${currentIndex === idx ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span className="truncate pr-2">{idx + 1}. {p.title}</span>
                                <span className="flex items-center gap-1 shrink-0">
                                    {testResultsMap[idx]?.length > 0 && (
                                        <span className={`w-2 h-2 rounded-full ${testResultsMap[idx].every(r => r.passed) ? 'bg-green-400' : testResultsMap[idx].some(r => r.passed) ? 'bg-yellow-400' : 'bg-red-400'}`} />
                                    )}
                                    {currentIndex === idx && <FiChevronRight/>}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-1/3 p-6 overflow-y-auto border-r border-white/10 custom-scrollbar shrink-0">
                    <div className="flex gap-2 mb-4 md:hidden overflow-x-auto pb-2">
                         {problems.map((_, idx) => (
                            <button key={idx} onClick={() => { setCurrentIndex(idx); }} className={`px-4 py-1 rounded-full text-sm whitespace-nowrap ${currentIndex === idx ? 'bg-neon-blue text-black font-bold' : 'bg-gray-800 text-gray-400'}`}>
                                Prob {idx + 1}
                            </button>
                         ))}
                    </div>

                    <h2 className="text-2xl font-bold mb-4 text-white">{currentProb?.title}</h2>
                    <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">{currentProb?.description}</p>

                    <div className="space-y-4">
                        {currentProb?.examples?.map((ex, i) => (
                            <div key={i}>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-1">Example {i + 1}:</h3>
                                <pre className="bg-black/50 p-4 rounded-xl text-sm whitespace-pre-wrap font-mono border border-white/5 text-gray-300">
                                    <span className="text-neon-green">Input:</span> {ex.input}<br />
                                    <span className="text-neon-blue">Output:</span> {ex.output}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-auto flex-1 flex flex-col min-w-0 bg-[#0d1117]">
                    <div className="h-12 bg-[#161b22] border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
                        <select 
                            className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-neon-blue cursor-pointer"
                            value={currentSub?.language}
                            onChange={(e) => updateCurrentSubmission('language', e.target.value)}
                        >
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                        
                        <button 
                            onClick={handleRunLocal} 
                            disabled={isRunning}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            {isRunning ? <FiClock className="animate-spin" /> : <FiPlay className="text-green-400" />}
                            Run Code
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden bg-[#1e1e1e] relative">
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={currentSub?.language || "python"}
                            value={currentSub?.codes?.[currentSub?.language] || ""}
                            onChange={(val) => updateCurrentSubmission('code', val || "")}
                            options={{
                                fontSize: 15,
                                minimap: { enabled: false }, // Hides the tiny side-map to save space
                                scrollBeyondLastLine: false,
                                wordWrap: "on",
                                padding: { top: 16 },
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                            }}
                            loading={
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    Loading Monaco Editor...
                                </div>
                            }
                        />
                    </div>

                    <div className="h-64 bg-[#161b22] border-t border-gray-800 flex flex-col shrink-0">
                        <div className="flex items-center justify-between px-4 border-b border-gray-800 bg-[#0d1117] h-10 shrink-0">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Test Results</span>
                            {(testResultsMap[currentIndex]?.length > 0) && (
                                <span className="text-xs font-bold">
                                    <span className="text-green-400">{testResultsMap[currentIndex].filter(r => r.passed).length} passed</span>
                                    <span className="text-gray-600 mx-1">/</span>
                                    <span className="text-gray-400">{testResultsMap[currentIndex].length} total</span>
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {isRunning ? (
                                <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse p-2">
                                    <FiClock className="animate-spin" /> Running against test cases...
                                </div>
                            ) : !testResultsMap[currentIndex] || testResultsMap[currentIndex].length === 0 ? (
                                <p className="text-gray-600 text-sm p-2">Click "Run Code" to test against the example cases.</p>
                            ) : (
                                testResultsMap[currentIndex].map((r, i) => (
                                    <div key={i} className={`rounded-lg border p-3 text-xs font-mono ${r.passed ? 'border-green-500/40 bg-green-500/5' : r.passed === null ? 'border-gray-600 bg-gray-800/40' : 'border-red-500/40 bg-red-500/5'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {r.passed === null ? (
                                                <span className="text-gray-400 font-bold">{r.label}</span>
                                            ) : r.passed ? (
                                                <FiCheckCircle className="text-green-400 text-sm shrink-0" />
                                            ) : (
                                                <FiXCircle className="text-red-400 text-sm shrink-0" />
                                            )}
                                            <span className={`font-bold ${r.passed ? 'text-green-400' : r.passed === null ? 'text-gray-400' : 'text-red-400'}`}>
                                                {r.label} {r.passed === true ? '— Passed' : r.passed === false ? '— Failed' : ''}
                                            </span>
                                        </div>
                                        {r.input !== undefined && (
                                            <div className="text-gray-500 mb-1"><span className="text-gray-400">Input:</span> {r.input}</div>
                                        )}
                                        <div className="text-gray-300"><span className="text-gray-400">Got:</span> {r.actual_output}</div>
                                        {r.passed === false && (
                                            <div className="text-gray-300 mt-1"><span className="text-gray-400">Expected:</span> {r.expected_output}</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
                @media print {
                    @page { margin: 1cm; }
                    .page-break-inside-avoid { page-break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}