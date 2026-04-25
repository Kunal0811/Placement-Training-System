import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import API_BASE from "../api";
import {
  FiUpload, FiFileText, FiBriefcase, FiAlertTriangle, FiCheckCircle,
  FiStar, FiTarget, FiZap, FiX, FiRefreshCw, FiTrendingUp,
  FiShield, FiAward, FiChevronDown, FiChevronUp, FiInfo
} from "react-icons/fi";

// ─── Score color system ───────────────────────────────────────────────────────
function scoreInfo(score) {
  if (score >= 80) return { label: "Excellent", color: "#22C55E", glow: "rgba(34,197,94,0.4)",  ring: "#22C55E" };
  if (score >= 60) return { label: "Good",      color: "#84CC16", glow: "rgba(132,204,22,0.4)", ring: "#84CC16" };
  if (score >= 40) return { label: "Average",   color: "#EAB308", glow: "rgba(234,179,8,0.4)",  ring: "#EAB308" };
  if (score >= 20) return { label: "Poor",      color: "#F97316", glow: "rgba(249,115,22,0.4)", ring: "#F97316" };
  return              { label: "Critical",   color: "#EF4444", glow: "rgba(239,68,68,0.4)",  ring: "#EF4444" };
}

// ─── Animated score ring (SVG only, no recharts dep) ─────────────────────────
function ScoreRing({ score, animate }) {
  const info = scoreInfo(score);
  const r = 72, circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* outer glow pulse */}
      <div className="absolute inset-0 rounded-full opacity-20 animate-pulse"
        style={{ backgroundColor: info.color, filter: `blur(24px)` }} />
      <svg width="200" height="200" className="absolute">
        <defs>
          <filter id="ring-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={info.color} floodOpacity="0.9" />
          </filter>
        </defs>
        {/* track */}
        <circle cx="100" cy="100" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        {/* score arc */}
        <circle cx="100" cy="100" r={r} fill="none"
          stroke={info.color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animate ? circ - dash : circ}
          transform="rotate(-90 100 100)"
          filter="url(#ring-glow)"
          style={{ transition: animate ? 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}
        />
      </svg>
      {/* center text */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-5xl font-black font-mono" style={{ color: info.color, textShadow: `0 0 20px ${info.glow}` }}>
          {score}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: info.color }}>
          {info.label}
        </span>
        <span className="text-gray-600 text-xs mt-0.5">out of 100</span>
      </div>
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-0.5">
      {stars.map(s => {
        const fill = rating >= s ? 1 : rating >= s - 0.5 ? 0.5 : 0;
        return (
          <div key={s} className="relative w-4 h-4">
            <FiStar className="absolute inset-0 text-gray-700" style={{ width: 16, height: 16 }} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <FiStar style={{ width: 16, height: 16, color: '#FBBF24', fill: '#FBBF24' }} />
            </div>
          </div>
        );
      })}
      <span className="text-xs text-gray-500 ml-1 font-mono">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Animated skill bar ───────────────────────────────────────────────────────
function SkillBar({ rating, animate }) {
  const pct = (rating / 5) * 100;
  const col = pct >= 80 ? '#22C55E' : pct >= 60 ? '#84CC16' : pct >= 40 ? '#EAB308' : '#EF4444';
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: animate ? `${pct}%` : '0%', backgroundColor: col, boxShadow: `0 0 8px ${col}88` }} />
    </div>
  );
}

// ─── Drag & drop upload zone ──────────────────────────────────────────────────
function UploadZone({ file, onFile, onClear }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handle = useCallback((f) => {
    if (!f) return;
    if (f.type === "application/pdf" || f.name.endsWith(".docx")) {
      onFile(f);
    } else {
      alert("Only PDF or DOCX allowed.");
    }
  }, [onFile]);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handle(e.dataTransfer.files[0]);
  };

  return (
    <div
      className="relative flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer min-h-48 group overflow-hidden"
      style={{
        borderColor: dragging ? '#06B6D4' : file ? '#22C55E55' : '#ffffff18',
        backgroundColor: dragging ? 'rgba(6,182,212,0.05)' : file ? 'rgba(34,197,94,0.04)' : 'transparent',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !file && inputRef.current?.click()}
    >
      {/* animated bg grid */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(#ffffff11 1px,transparent 1px),linear-gradient(90deg,#ffffff11 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

      <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden"
        onChange={(e) => handle(e.target.files[0])} />

      {file ? (
        <div className="relative z-10 flex flex-col items-center gap-3 p-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <FiFileText className="text-2xl text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-sm max-w-xs truncate">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB · Ready to analyze</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-all">
            <FiX className="text-xs" /> Remove
          </button>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-3 p-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-all duration-300">
            <FiUpload className="text-2xl text-gray-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-300 group-hover:text-white transition-colors">
              Drop your resume here
            </p>
            <p className="text-xs text-gray-600 mt-1">or click to browse · PDF / DOCX</p>
          </div>
          {dragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 rounded-2xl">
              <span className="text-cyan-400 font-bold text-sm">Release to upload</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formatting check card ────────────────────────────────────────────────────
function FormatCard({ label, passed }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      passed ? 'bg-green-500/8 border-green-500/25' : 'bg-red-500/8 border-red-500/25'
    }`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        passed ? 'bg-green-500/20' : 'bg-red-500/20'
      }`}>
        {passed
          ? <FiCheckCircle className="text-sm text-green-400" />
          : <FiX className="text-sm text-red-400" />}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{label}</p>
        <p className="text-xs text-gray-600">{passed ? 'Section detected ✓' : 'Missing or unlabeled'}</p>
      </div>
    </div>
  );
}

// ─── Breakdown row (expandable) ───────────────────────────────────────────────
function BreakdownRow({ item, index, animate }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/6 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/12"
      style={{ animationDelay: `${index * 80}ms` }}>
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors text-left"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-white/5 text-xs font-bold text-gray-500 font-mono">
            {index + 1}
          </div>
          <span className="font-bold text-white text-sm truncate">{item.skill_area}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-3">
          <StarRating rating={item.match_rating} />
          {open ? <FiChevronUp className="text-gray-500 text-xs" /> : <FiChevronDown className="text-gray-500 text-xs" />}
        </div>
      </button>

      {/* skill bar always visible */}
      <div className="px-4 pb-2">
        <SkillBar rating={item.match_rating} animate={animate} />
      </div>

      {/* expanded details */}
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <div className="bg-black/30 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <FiBriefcase className="text-xs" /> JD Requires
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">{item.job_requirement}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <FiFileText className="text-xs" /> Your Resume
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">{item.your_resume}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tip pill ─────────────────────────────────────────────────────────────────
function TipPill({ text, index }) {
  const icons = ['🎯', '✨', '📌', '💡', '🔧'];
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
      <span className="text-lg shrink-0 mt-0.5">{icons[index % icons.length]}</span>
      <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ResumeAnalyzer() {
  const [file, setFile]       = useState(null);
  const [jd, setJd]           = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult]   = useState(null);
  const [animated, setAnimated] = useState(false);
  const [activeTab, setActiveTab] = useState("breakdown");
  const resultsRef = useRef(null);

  const handleAnalyze = async () => {
    if (!file)       return alert("Please upload your resume.");
    if (!jd.trim())  return alert("Please paste the Job Description.");
    setLoading(true);
    setResult(null);
    setAnimated(false);
    setProgress(0);

    // fake progress pulses
    const ticker = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 18, 88));
    }, 600);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("jd", jd);

    try {
      const res = await axios.post(`${API_BASE}/api/resume/analyze-jd`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      clearInterval(ticker);
      setProgress(100);
      setTimeout(() => {
        setResult(res.data);
        setLoading(false);
        setAnimated(true);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }, 400);
    } catch (err) {
      clearInterval(ticker);
      setLoading(false);
      alert(err.response?.data?.detail || "Analysis failed. Please try again.");
    }
  };

  const handleReset = () => { setResult(null); setFile(null); setJd(""); setProgress(0); };

  const info = result ? scoreInfo(result.overall_score) : null;
  const formatPassed = result ? Object.values(result.formatting).filter(Boolean).length : 0;
  const formatTotal  = result ? Object.keys(result.formatting).length : 0;

  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-sans">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-10">

        {/* ══ HEADER ══ */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/25 rounded-full px-4 py-1.5 text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
            <FiShield className="text-xs" /> AI-Powered ATS Scanner
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Resume <span style={{ color: '#06B6D4', textShadow: '0 0 30px rgba(6,182,212,0.5)' }}>Analyzer</span>
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto leading-relaxed">
            TF-IDF + Gemini AI semantic matching to measure your resume's real ATS compatibility
          </p>
        </div>

        {/* ══ INPUT SECTION ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Resume upload card */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                <FiFileText className="text-cyan-400 text-sm" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Your Resume</h2>
                <p className="text-xs text-gray-600">PDF or DOCX format</p>
              </div>
            </div>
            <UploadZone file={file} onFile={setFile} onClear={() => setFile(null)} />
          </div>

          {/* JD card */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                  <FiBriefcase className="text-purple-400 text-sm" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Job Description</h2>
                  <p className="text-xs text-gray-600">Paste the full JD</p>
                </div>
              </div>
              {jd && (
                <span className="text-xs text-gray-600 font-mono">{jd.length} chars</span>
              )}
            </div>
            <textarea
              className="flex-1 min-h-44 w-full bg-black/40 border border-white/8 rounded-xl p-4 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 resize-none transition-all leading-relaxed"
              placeholder="Paste the job description here…&#10;&#10;The more detailed, the better the match accuracy."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              style={{ scrollbarWidth: 'thin' }}
            />
          </div>
        </div>

        {/* ══ ACTION BUTTON ══ */}
        <div className="flex flex-col items-center gap-4">
          <button onClick={handleAnalyze} disabled={loading || !file || !jd.trim()}
            className="relative group flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            style={{
              backgroundColor: loading ? '#0e1a2a' : '#06B6D422',
              border: `1px solid ${loading ? '#06B6D444' : '#06B6D466'}`,
              color: '#06B6D4',
              boxShadow: loading ? 'none' : '0 0 30px rgba(6,182,212,0.2)',
            }}>

            {/* shimmer on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />

            {loading ? (
              <><FiRefreshCw className="animate-spin" /> Analyzing...</>
            ) : (
              <><FiTarget /> Analyze Match</>
            )}
          </button>

          {/* Progress bar */}
          {loading && (
            <div className="w-80 space-y-1.5">
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, boxShadow: '0 0 10px #06B6D4' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-600 font-mono">
                <span className="animate-pulse">
                  {progress < 30 ? 'Extracting text...' : progress < 60 ? 'Running TF-IDF...' : progress < 85 ? 'AI semantic analysis...' : 'Finalizing report...'}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* ══ RESULTS ══ */}
        {result && (
          <div ref={resultsRef} className="space-y-6">

            {/* ── Score summary row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Score ring */}
              <div className="md:col-span-1 bg-[#0d1117] border border-white/8 rounded-2xl p-6 flex flex-col items-center gap-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">ATS Match Score</p>
                <ScoreRing score={result.overall_score} animate={animated} />
                <p className="text-xs text-gray-600 text-center leading-relaxed max-w-[180px]">
                  Blended TF-IDF (30%) + Gemini AI (70%)
                </p>
              </div>

              {/* Stat cards */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">

                {/* Formatting score */}
                <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-3">
                    <FiShield className="text-purple-400 text-sm" />
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Format Check</span>
                  </div>
                  <div>
                    <div className="text-3xl font-black font-mono mb-1"
                      style={{ color: formatPassed === formatTotal ? '#22C55E' : formatPassed >= 3 ? '#EAB308' : '#EF4444' }}>
                      {formatPassed}<span className="text-gray-700 text-xl">/{formatTotal}</span>
                    </div>
                    <p className="text-xs text-gray-600">sections detected</p>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: animated ? `${(formatPassed / formatTotal) * 100}%` : '0%',
                          backgroundColor: formatPassed === formatTotal ? '#22C55E' : '#EAB308',
                          boxShadow: '0 0 8px currentColor'
                        }} />
                    </div>
                  </div>
                </div>

                {/* Skill coverage */}
                <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-3">
                    <FiTrendingUp className="text-cyan-400 text-sm" />
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Skill Areas</span>
                  </div>
                  <div>
                    <div className="text-3xl font-black font-mono mb-1 text-cyan-400">
                      {result.breakdown.length}
                    </div>
                    <p className="text-xs text-gray-600">areas analyzed</p>
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {result.breakdown.map((item, i) => {
                        const col = item.match_rating >= 4 ? '#22C55E' : item.match_rating >= 2.5 ? '#EAB308' : '#EF4444';
                        return (
                          <div key={i} className="w-2.5 h-2.5 rounded-sm transition-all duration-700"
                            style={{
                              backgroundColor: animated ? col : '#1e293b',
                              transitionDelay: `${i * 100}ms`,
                              boxShadow: animated ? `0 0 6px ${col}88` : 'none'
                            }} />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recommendations count */}
                <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-3">
                    <FiZap className="text-yellow-400 text-sm" />
                    <span className="text-xs text-gray-500 uppercase tracking-widest">AI Tips</span>
                  </div>
                  <div>
                    <div className="text-3xl font-black font-mono mb-1 text-yellow-400">
                      {result.recommendations?.length || 0}
                    </div>
                    <p className="text-xs text-gray-600">actionable improvements</p>
                  </div>
                </div>

                {/* Quick verdict */}
                <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col justify-between"
                  style={{ borderColor: `${info.color}33` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <FiAward className="text-sm" style={{ color: info.color }} />
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Verdict</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black mb-1" style={{ color: info.color }}>
                      {info.label}
                    </div>
                    <p className="text-xs text-gray-600">
                      {result.overall_score >= 60 ? 'Likely to pass ATS' : 'Needs improvement'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
              {/* tab bar */}
              <div className="flex border-b border-white/8">
                {[
                  { id: 'breakdown', label: 'Skill Breakdown', icon: <FiTarget className="text-xs" /> },
                  { id: 'format',    label: 'Format Check',    icon: <FiShield className="text-xs" /> },
                  { id: 'tips',      label: 'AI Suggestions',  icon: <FiZap className="text-xs" /> },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className="flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-b-2"
                    style={{
                      color: activeTab === t.id ? '#06B6D4' : '#6B7280',
                      borderColor: activeTab === t.id ? '#06B6D4' : 'transparent',
                      backgroundColor: activeTab === t.id ? 'rgba(6,182,212,0.05)' : 'transparent',
                    }}>
                    {t.icon} {t.label}
                    {t.id === 'tips' && result.recommendations?.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400 ml-1">
                        {result.recommendations.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* tab content */}
              <div className="p-5">

                {/* Breakdown tab */}
                {activeTab === 'breakdown' && (
                  <div className="space-y-2">
                    {result.breakdown.length === 0 ? (
                      <p className="text-gray-600 text-sm text-center py-8">No skill breakdown available.</p>
                    ) : (
                      result.breakdown.map((item, i) => (
                        <BreakdownRow key={i} item={item} index={i} animate={animated} />
                      ))
                    )}
                  </div>
                )}

                {/* Format tab */}
                {activeTab === 'format' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
                      <FiInfo className="text-xs" />
                      ATS systems scan for standard section headings. Missing sections reduce visibility.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(result.formatting).map(([key, passed]) => (
                        <FormatCard key={key} label={key} passed={passed} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips tab */}
                {activeTab === 'tips' && (
                  <div className="space-y-3">
                    {(!result.recommendations || result.recommendations.length === 0) ? (
                      <p className="text-gray-600 text-sm text-center py-8">No recommendations generated.</p>
                    ) : (
                      result.recommendations.map((rec, i) => (
                        <TipPill key={i} text={rec} index={i} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Reset ── */}
            <div className="flex justify-center">
              <button onClick={handleReset}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-white bg-white/3 hover:bg-white/8 border border-white/8 hover:border-white/15 px-5 py-2.5 rounded-xl transition-all duration-200">
                <FiRefreshCw className="text-xs" /> Analyze another resume
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}