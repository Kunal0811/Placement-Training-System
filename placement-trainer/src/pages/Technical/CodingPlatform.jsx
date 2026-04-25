import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import API_BASE from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiPlay, FiClock, FiCheckCircle, FiXCircle, FiCode, FiList,
  FiArrowLeft, FiChevronRight, FiChevronLeft, FiDownload,
  FiTerminal, FiZap, FiAward, FiCpu, FiAlertCircle,
  FiMaximize, FiMinimize // 🔥 NEW IMPORTS
} from 'react-icons/fi';

// ─── tiny helpers ────────────────────────────────────────────────────────────
const formatTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const LANG_META = {
  python: { label: 'Python', color: '#3B82F6', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  java:   { label: 'Java',   color: '#F97316', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  cpp:    { label: 'C++',    color: '#A855F7', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

const DIFF_META = {
  easy:   { color: '#22C55E', glow: 'rgba(34,197,94,0.35)',   label: 'Easy',   icon: '🌱' },
  medium: { color: '#06B6D4', glow: 'rgba(6,182,212,0.35)',   label: 'Medium', icon: '🔥' },
  hard:   { color: '#EF4444', glow: 'rgba(239,68,68,0.35)',   label: 'Hard',   icon: '💎' },
};

// ─── Particle rain behind editor ─────────────────────────────────────────────
function MatrixRain({ color }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cols = Math.floor(canvas.width / 18);
    const drops = Array(cols).fill(1);
    const chars = '01アイウエオカキクケコ{}[]()<>=+-*/;:.,!?';
    let raf;
    const draw = () => {
      ctx.fillStyle = 'rgba(13,17,23,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color + '55';
      ctx.font = '13px monospace';
      drops.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * 18, y * 18);
        if (y * 18 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" />;
}

// ─── Circular timer ring ──────────────────────────────────────────────────────
function TimerRing({ elapsed, limit = 3600, color }) {
  const r = 20, circ = 2 * Math.PI * r;
  const pct = Math.min(elapsed / limit, 1);
  const dash = circ * (1 - pct);
  return (
    <svg width="56" height="56" className="rotate-[-90deg]">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  );
}

// ─── Animated score pill ──────────────────────────────────────────────────────
function ScorePill({ passed, total }) {
  const pct = total > 0 ? passed / total : 0;
  const col = pct === 1 ? '#22C55E' : pct >= 0.5 ? '#EAB308' : '#EF4444';
  return (
    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-1.5">
      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, backgroundColor: col, boxShadow: `0 0 8px ${col}` }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color: col }}>{passed}/{total}</span>
    </div>
  );
}

// ─── Problem status dot ───────────────────────────────────────────────────────
function StatusDot({ results }) {
  if (!results || results.length === 0) return <div className="w-2 h-2 rounded-full bg-gray-700" />;
  const all = results.every(r => r.passed);
  const some = results.some(r => r.passed);
  const col = all ? '#22C55E' : some ? '#EAB308' : '#EF4444';
  return (
    <div className="w-2 h-2 rounded-full animate-pulse"
      style={{ backgroundColor: col, boxShadow: `0 0 6px ${col}` }} />
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ name, diffColor }) {
  const [step, setStep] = useState(0);
  const steps = ['Connecting to AI engine...', 'Generating unique problems...', 'Compiling test cases...', 'Preparing your arena...'];
  useEffect(() => {
    const id = setInterval(() => setStep(p => Math.min(p + 1, steps.length - 1)), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center gap-8 relative overflow-hidden">
      <MatrixRain color={diffColor} />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-t-2 animate-spin"
            style={{ borderColor: diffColor, filter: `drop-shadow(0 0 12px ${diffColor})` }} />
          <div className="absolute inset-3 rounded-full border-b-2 animate-spin"
            style={{ borderColor: diffColor + '88', animationDirection: 'reverse', animationDuration: '1.5s' }} />
          <FiCpu className="text-4xl" style={{ color: diffColor }} />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-bold font-mono text-white mb-2">
            Preparing <span style={{ color: diffColor }}>{name}</span> Arena
          </h2>
          <p className="text-gray-500 text-sm font-mono animate-pulse">{steps[step]}</p>
        </div>
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all duration-500"
              style={{ backgroundColor: i <= step ? diffColor : '#1e293b', boxShadow: i <= step ? `0 0 8px ${diffColor}` : 'none' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Evaluating screen ────────────────────────────────────────────────────────
function EvaluatingScreen({ diffColor }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length < 3 ? d + '.' : ''), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <MatrixRain color={diffColor} />
      <div className="relative z-10 flex flex-col items-center gap-6 bg-black/60 border border-white/10 rounded-3xl p-12 backdrop-blur-sm">
        <FiZap className="text-6xl animate-bounce" style={{ color: diffColor, filter: `drop-shadow(0 0 16px ${diffColor})` }} />
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white font-mono mb-2">AI Analysis Running{dots}</h2>
          <p className="text-gray-400 text-sm">Reviewing logic, complexity & finding improvements</p>
        </div>
        <div className="w-64 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full animate-loading-bar"
            style={{ backgroundColor: diffColor, boxShadow: `0 0 12px ${diffColor}` }} />
        </div>
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-loading-bar { animation: loading-bar 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── Report Phase ─────────────────────────────────────────────────────────────
function ReportPhase({ report, problems, submissions, difficultyName, diffMeta, navigate, formatTime }) {
  const [page, setPage] = useState(0);
  const [showIdeal, setShowIdeal] = useState(false);
  const ev = report.evaluations[page];
  const prob = problems[page];
  const sub = submissions[page];
  const passRate = report.total_correct / report.total_problems;
  const scoreColor = passRate === 1 ? '#22C55E' : passRate >= 0.5 ? '#EAB308' : '#EF4444';

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col print:bg-white print:text-black">

      {/* ── Top summary banner ── */}
      <div className="print:hidden bg-gradient-to-b from-black/80 to-transparent border-b border-white/10 px-6 py-5 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: diffMeta.color + '22', border: `1px solid ${diffMeta.color}55` }}>
              {diffMeta.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono">
                Session <span style={{ color: scoreColor, textShadow: `0 0 12px ${scoreColor}` }}>Complete</span>
              </h1>
              <p className="text-gray-500 text-sm">{difficultyName} · {formatTime(report.time_taken)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Big score */}
            <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-2xl px-5 py-3">
              <FiAward className="text-xl" style={{ color: scoreColor }} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Score</p>
                <p className="text-xl font-bold font-mono" style={{ color: scoreColor }}>
                  {report.total_correct} / {report.total_problems}
                </p>
              </div>
            </div>

            {/* Mini problem dots */}
            <div className="flex gap-1.5 bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
              {report.evaluations.map((e, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className="w-8 h-8 rounded-xl text-xs font-bold font-mono transition-all duration-200 border"
                  style={{
                    backgroundColor: i === page ? (e.is_correct ? '#22C55E22' : '#EF444422') : 'transparent',
                    borderColor: i === page ? (e.is_correct ? '#22C55E' : '#EF4444') : '#ffffff22',
                    color: e.is_correct ? '#22C55E' : '#EF4444',
                    boxShadow: i === page ? `0 0 10px ${e.is_correct ? '#22C55E55' : '#EF444455'}` : 'none'
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>

            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded-2xl font-bold text-sm transition-colors">
              <FiDownload /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Main report content ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-4 print:hidden overflow-hidden">

        {/* Nav bar */}
        <div className="flex items-center justify-between shrink-0">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 px-4 py-2 rounded-xl text-sm font-mono transition-all">
            <FiChevronLeft /> Prev
          </button>
          <span className="text-gray-500 text-sm font-mono">Problem {page + 1} of {report.total_problems}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === report.total_problems - 1}
            className="flex items-center gap-2 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 px-4 py-2 rounded-xl text-sm font-mono transition-all"
            style={{ backgroundColor: diffMeta.color + '22', borderColor: diffMeta.color + '55', color: diffMeta.color }}>
            Next <FiChevronRight />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">

          {/* Left: problem + your code */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {/* Problem card */}
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono shrink-0"
                  style={{ backgroundColor: diffMeta.color + '22', color: diffMeta.color, border: `1px solid ${diffMeta.color}44` }}>
                  {page + 1}
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">{prob?.title || ev?.problem_title}</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap mb-5">{prob?.description}</p>
              {prob?.examples?.map((ex, i) => (
                <div key={i} className="mb-3 bg-black/40 rounded-xl border border-white/5 p-3 font-mono text-xs">
                  <div className="text-gray-500 mb-1">Example {i + 1}</div>
                  <div><span className="text-green-400">Input: </span><span className="text-gray-300">{ex.input}</span></div>
                  <div><span className="text-cyan-400">Output: </span><span className="text-gray-300">{ex.output}</span></div>
                </div>
              ))}
            </div>

            {/* Your code */}
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-white/8">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Your Code</span>
                <span className={`text-xs px-2 py-1 rounded-md border font-mono ${LANG_META[sub?.language]?.badge}`}>
                  {LANG_META[sub?.language]?.label}
                </span>
              </div>
              <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed max-h-60"
                style={{ scrollbarWidth: 'thin' }}>
                <code>{sub?.codes?.[sub.language] || ''}</code>
              </pre>
            </div>
          </div>

          {/* Right: AI feedback */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            <div className={`rounded-2xl border p-5 ${ev?.is_correct
              ? 'bg-green-950/20 border-green-500/30'
              : 'bg-red-950/20 border-red-500/30'}`}>

              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev?.is_correct ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {ev?.is_correct
                    ? <FiCheckCircle className="text-xl text-green-400" />
                    : <FiXCircle className="text-xl text-red-400" />}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${ev?.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                    {ev?.is_correct ? 'Correct ✓' : 'Needs Work'}
                  </h3>
                  <p className="text-xs text-gray-500">AI Code Review</p>
                </div>
              </div>

              <p className="text-gray-200 text-sm leading-relaxed mb-6">{ev?.feedback}</p>

              {/* Toggle ideal solutions */}
              {ev?.ideal_solution_snippets && (
                <div>
                  <button onClick={() => setShowIdeal(s => !s)}
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-colors mb-4">
                    <FiCode /> {showIdeal ? 'Hide' : 'Show'} Ideal Solutions
                    <FiChevronRight className={`transition-transform ${showIdeal ? 'rotate-90' : ''}`} />
                  </button>

                  {showIdeal && (
                    <div className="space-y-4">
                      {['python', 'java', 'cpp'].map(lang => (
                        ev.ideal_solution_snippets[lang] && (
                          <div key={lang} className="rounded-xl overflow-hidden border border-white/8">
                            <div className="px-3 py-2 flex items-center gap-2"
                              style={{ backgroundColor: LANG_META[lang].color + '18' }}>
                              <span className="text-xs font-bold font-mono uppercase"
                                style={{ color: LANG_META[lang].color }}>
                                {LANG_META[lang].label}
                              </span>
                            </div>
                            <pre className="bg-[#0d1117] p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-52"
                              style={{ scrollbarWidth: 'thin' }}>
                              <code>{ev.ideal_solution_snippets[lang]}</code>
                            </pre>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center shrink-0 pt-2">
          <button onClick={() => navigate('/dashboard')}
            className="px-10 py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-105"
            style={{ backgroundColor: diffMeta.color, boxShadow: `0 0 20px ${diffMeta.glow}` }}>
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* ── Print view ── */}
      <div className="hidden print:block text-black bg-white w-full p-8">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold">Placify AI Coding Report</h1>
          <p className="text-lg">Difficulty: {difficultyName} | Score: {report.total_correct}/{report.total_problems} | Time: {formatTime(report.time_taken)}</p>
        </div>
        {report.evaluations.map((e, i) => {
          const p = problems[i]; const s = submissions[i];
          return (
            <div key={i} className="mb-10 border-b border-gray-300 pb-8" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold mb-2">Q{i + 1}: {e.problem_title}</h2>
              <p className="text-sm mb-4">{p?.description}</p>
              <h3 className="font-bold text-xs uppercase mb-1">Your Code ({s?.language}):</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs border border-gray-300 whitespace-pre-wrap mb-3">
                <code>{s?.codes?.[s.language]}</code>
              </pre>
              <h3 className="font-bold text-xs uppercase mb-1">AI Verdict: {e.is_correct ? '✅ Passed' : '❌ Failed'}</h3>
              <p className="text-sm">{e.feedback}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Platform ────────────────────────────────────────────────────────────
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
  const [runFlash, setRunFlash] = useState(false);

  const [report, setReport] = useState(null);
  const [panelTab, setPanelTab] = useState('cases'); // 'cases' | 'console'
  const [consoleLog, setConsoleLog] = useState([]);
  
  // 🔥 Fullscreen state (entire page, not just editor layout)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef(null);

  const rawLevel = level || window.location.pathname.split('/').pop() || 'easy';
  const safeLevel = rawLevel.toLowerCase();
  const difficultyName = safeLevel.charAt(0).toUpperCase() + safeLevel.slice(1);
  const diffMeta = DIFF_META[safeLevel] || DIFF_META.easy;

  // ── Fullscreen sync + keyboard shortcut (F) ───────────────────────────────
  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleKeyDown = (e) => {
      // YouTube-style shortcut: press "f" to toggle fullscreen
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const el = pageRef.current || document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
      setConsoleLog(prev => [...prev, `✗ Fullscreen failed: ${err.message}`]);
    }
  };

  // ── fetch problems ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchProblems = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/coding/generate-level`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty: difficultyName, user_id: user.id, count: 5 }),
        });
        if (!res.ok) throw new Error('Failed to fetch problems');
        const data = await res.json();
        setProblems(data.problems);
        setSubmissions(data.problems.map((p, idx) => ({
          problem_title: p.title || p.Title || p.problem_title || `Problem ${idx + 1}`,
          language: 'python',
          codes: {
            python: p.starter_code?.python || p.starter_code?.Python || '# Write your solution here\n',
            java:   p.starter_code?.java   || p.starter_code?.Java   || '// Write your solution here\n',
            cpp:    p.starter_code?.cpp    || p.starter_code?.Cpp    || '// Write your solution here\n',
          },
        })));
        startTimer();
      } catch (err) {
        console.error(err);
        alert('Failed to load session.');
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
    return () => stopTimer();
  }, [level, user]);

  const startTimer = () => { timerRef.current = setInterval(() => setTimeElapsed(p => p + 1), 1000); };
  const stopTimer  = () => { if (timerRef.current) clearInterval(timerRef.current); };

  const updateSub = (key, value) => {
    setSubmissions(prev => {
      const next = [...prev];
      if (key === 'language') {
        next[currentIndex] = { ...next[currentIndex], language: value };
        setTestResultsMap(m => ({ ...m, [currentIndex]: [] }));
      } else if (key === 'code') {
        const lang = next[currentIndex].language;
        next[currentIndex] = { ...next[currentIndex], codes: { ...next[currentIndex].codes, [lang]: value } };
      }
      return next;
    });
  };

  // ── run code ──────────────────────────────────────────────────────────────
  const handleRun = async () => {
    const sub  = submissions[currentIndex];
    const code = sub.codes[sub.language];
    const prob = problems[currentIndex];
    if (!code.trim()) return;

    const examples = prob?.examples || [];
    setIsRunning(true);
    setRunFlash(true);
    setPanelTab('cases');
    setTestResultsMap(m => ({ ...m, [currentIndex]: [] }));
    setConsoleLog(prev => [...prev, `> Running ${sub.language} code for "${prob?.title}"...`]);
    setTimeout(() => setRunFlash(false), 600);

    try {
      const res = await fetch(`${API_BASE}/api/coding/execute-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: sub.language,
          code,
          driver_code: prob?.driver_code?.[sub.language] || '',
          test_cases: examples.map(ex => ({ input: ex.input, expected_output: ex.output })),
        }),
      });
      const data = await res.json();
      const enriched = (data.results || []).map((r, i) => ({
        ...r, label: `Case ${i + 1}`, input: examples[i]?.input,
      }));
      setTestResultsMap(m => ({ ...m, [currentIndex]: enriched }));
      const p = enriched.filter(r => r.passed).length;
      setConsoleLog(prev => [...prev, `✓ Executed: ${p}/${enriched.length} passed`]);
    } catch (err) {
      setTestResultsMap(m => ({ ...m, [currentIndex]: [{ label: 'Error', passed: false, actual_output: err.message, expected_output: '' }] }));
      setConsoleLog(prev => [...prev, `✗ Error: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  // ── end session ───────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (!window.confirm('Submit all problems for AI evaluation?')) return;
    stopTimer();
    setPhase('evaluating');
    try {
      const res = await fetch(`${API_BASE}/api/coding/evaluate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(user.id),
          difficulty: difficultyName,
          time_taken: Number(timeElapsed),
          submissions: submissions.map(s => ({
            problem_title: String(s.problem_title || 'Unknown'),
            code: String(s.codes[s.language] || ' '),
            language: String(s.language || 'python'),
          })),
        }),
      });
      if (!res.ok) throw new Error('Evaluation failed');
      setReport(await res.json());
      setPhase('report');
    } catch (err) {
      alert('Failed to generate report.');
      setPhase('coding');
      startTimer();
    }
  };

  // ── render gates ──────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen name={difficultyName} diffColor={diffMeta.color} />;
  if (phase === 'evaluating') return <EvaluatingScreen diffColor={diffMeta.color} />;
  if (phase === 'report' && report)
    return <ReportPhase report={report} problems={problems} submissions={submissions}
      difficultyName={difficultyName} diffMeta={diffMeta} navigate={navigate} formatTime={formatTime} />;

  const currentProb = problems[currentIndex];
  const currentSub  = submissions[currentIndex];
  const testResults = testResultsMap[currentIndex] || [];
  const passedCount = testResults.filter(r => r.passed).length;
  const langColor   = LANG_META[currentSub?.language]?.color || '#06B6D4';

  // ── coding UI ─────────────────────────────────────────────────────────────
  return (
    <div ref={pageRef} className="h-screen bg-[#0D1117] text-white flex flex-col font-mono overflow-hidden print:hidden"
      style={{ '--diff-color': diffMeta.color, '--diff-glow': diffMeta.glow }}>

      {/* ════════ TOP HEADER ════════ */}
      <header className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 border-b border-white/8"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(13,17,23,0.95) 100%)' }}>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/technical/levels')}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <FiArrowLeft className="text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: diffMeta.color }}>{diffMeta.icon}</span>
            <span className="text-white font-bold text-sm">{difficultyName}</span>
            <span className="text-gray-600 text-sm">Session</span>
          </div>

          {/* problem pills */}
          <div className="hidden md:flex gap-1 ml-2">
            {problems.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className="w-7 h-7 rounded-lg text-xs font-bold transition-all duration-200 border"
                style={{
                  backgroundColor: i === currentIndex ? diffMeta.color + '22' : 'transparent',
                  borderColor: i === currentIndex ? diffMeta.color : '#ffffff18',
                  color: i === currentIndex ? diffMeta.color : (testResultsMap[i]?.length > 0 ? (testResultsMap[i].every(r => r.passed) ? '#22C55E' : '#EF4444') : '#4B5563'),
                }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Animated timer ring */}
          <div className="relative flex items-center justify-center w-14 h-14 cursor-default group">
            <TimerRing elapsed={timeElapsed} color={diffMeta.color} />
            <span className="absolute text-xs font-bold font-mono" style={{ color: diffMeta.color }}>
              {formatTime(timeElapsed)}
            </span>
          </div>

          {/* overall pass score */}
          {Object.values(testResultsMap).some(r => r.length > 0) && (
            <ScorePill
              passed={Object.values(testResultsMap).reduce((a, r) => a + r.filter(x => x.passed).length, 0)}
              total={Object.values(testResultsMap).reduce((a, r) => a + r.length, 0)}
            />
          )}

          {/* 🔥 UX POLISH: Changed "Submit All" from Red to Emerald/Primary Color to reduce user anxiety */}
          <button onClick={handleEnd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 border"
            style={{
              backgroundColor: '#10B98122', borderColor: '#10B98155', color: '#10B981',
              boxShadow: '0 0 20px rgba(16,185,129,0.15)'
            }}>
            <FiCheckCircle className="text-base" /> Finish Session
          </button>
        </div>
      </header>

      {/* ════════ BODY ════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar: problem list ── */}
          <div className="hidden lg:flex w-52 flex-col bg-[#090d13] border-r border-white/8 shrink-0 transition-all duration-300">
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
              <FiList className="text-gray-500 text-xs" />
              <span className="text-xs text-gray-500 uppercase tracking-widest">Problems</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {problems.map((p, i) => (
                <button key={i} onClick={() => setCurrentIndex(i)}
                  className="w-full text-left px-3 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group"
                  style={{
                    backgroundColor: i === currentIndex ? diffMeta.color + '18' : 'transparent',
                    border: `1px solid ${i === currentIndex ? diffMeta.color + '44' : 'transparent'}`,
                  }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs shrink-0 font-bold" style={{ color: i === currentIndex ? diffMeta.color : '#6B7280' }}>{i + 1}.</span>
                    <span className="text-xs truncate" style={{ color: i === currentIndex ? '#F9FAFB' : '#6B7280' }}>{p.title}</span>
                  </div>
                  <StatusDot results={testResultsMap[i]} />
                </button>
              ))}
            </div>
          </div>

        {/* ── Problem panel ── */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-white/8 bg-[#0D1117] shrink-0 overflow-hidden transition-all duration-300">
            {/* mobile problem tabs */}
            <div className="flex gap-1 p-2 border-b border-white/8 md:hidden overflow-x-auto">
              {problems.map((_, i) => (
                <button key={i} onClick={() => setCurrentIndex(i)}
                  className="shrink-0 w-8 h-8 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    backgroundColor: i === currentIndex ? diffMeta.color + '22' : 'transparent',
                    borderColor: i === currentIndex ? diffMeta.color : '#ffffff18',
                    color: i === currentIndex ? diffMeta.color : '#6B7280',
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin' }}>
              {/* Difficulty badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs px-2 py-1 rounded-full font-bold border"
                  style={{ color: diffMeta.color, backgroundColor: diffMeta.color + '18', borderColor: diffMeta.color + '44' }}>
                  {diffMeta.icon} {difficultyName}
                </span>
                <span className="text-xs text-gray-600 font-mono">#{currentIndex + 1}/{problems.length}</span>
              </div>

              <h2 className="text-lg font-bold text-white mb-4 leading-tight">{currentProb?.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap mb-6">{currentProb?.description}</p>

              {currentProb?.examples?.map((ex, i) => (
                <div key={i} className="mb-3">
                  <div className="text-xs text-gray-600 uppercase tracking-widest mb-1.5">Example {i + 1}</div>
                  <div className="bg-black/40 border border-white/8 rounded-xl p-3 text-xs font-mono space-y-1">
                    <div><span className="text-green-400">Input: </span><span className="text-gray-300">{ex.input}</span></div>
                    <div><span className="text-cyan-400">Output: </span><span className="text-gray-300">{ex.output}</span></div>
                  </div>
                </div>
              ))}

              {currentProb?.constraints && (
                <div className="mt-5 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-2">
                    <FiAlertCircle className="text-sm" /> Constraints
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{currentProb.constraints}</p>
                </div>
              )}
            </div>
          </div>

        {/* ── Editor + Results ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117] overflow-hidden transition-all duration-300">

          {/* Editor toolbar */}
          <div className="h-11 bg-[#161b22] border-b border-white/8 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-1">
              {['python', 'java', 'cpp'].map(lang => (
                <button key={lang} onClick={() => updateSub('language', lang)}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 border"
                  style={{
                    backgroundColor: currentSub?.language === lang ? LANG_META[lang].color + '22' : 'transparent',
                    borderColor: currentSub?.language === lang ? LANG_META[lang].color + '55' : 'transparent',
                    color: currentSub?.language === lang ? LANG_META[lang].color : '#6B7280',
                  }}>
                  {LANG_META[lang].label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Fullscreen toggle for entire coding page */}
              <button 
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors hidden md:block"
                title={isFullscreen ? "Exit Fullscreen (Esc / F)" : "Enter Fullscreen (F)"}
              >
                {isFullscreen ? <FiMinimize className="text-lg" /> : <FiMaximize className="text-lg" />}
              </button>

              <button onClick={handleRun} disabled={isRunning}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border"
                style={{
                  backgroundColor: runFlash ? langColor + '44' : langColor + '22',
                  borderColor: langColor + '55',
                  color: langColor,
                  boxShadow: isRunning || runFlash ? `0 0 15px ${langColor}44` : 'none',
                  transform: runFlash ? 'scale(0.97)' : 'scale(1)',
                }}>
                {isRunning
                  ? <><FiClock className="animate-spin text-sm" /> Running...</>
                  : <><FiPlay className="text-sm" /> Run Code</>}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden relative">
            <Editor
              height="100%"
              theme="vs-dark"
              language={currentSub?.language || 'python'}
              value={currentSub?.codes?.[currentSub?.language] || ''}
              onChange={val => updateSub('code', val || '')}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontLigatures: true,
                cursorBlinking: 'expand',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                renderLineHighlight: 'gutter',
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
              }}
              loading={
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                  Loading editor...
                </div>
              }
            />
          </div>

          {/* ── Bottom panel: test results / console ── */}
          <div className="h-64 flex flex-col border-t border-white/8 bg-[#090d13] shrink-0 transition-all duration-300">

            {/* Panel tabs */}
            <div className="flex items-center border-b border-white/8 px-4 h-9 gap-4 shrink-0">
              {[
                { id: 'cases',   label: 'Test Cases', icon: <FiCheckCircle className="text-xs" /> },
                { id: 'console', label: 'Console',    icon: <FiTerminal    className="text-xs" /> },
              ].map(t => (
                <button key={t.id} onClick={() => setPanelTab(t.id)}
                  className="flex items-center gap-1.5 text-xs font-bold pb-0.5 transition-all duration-200 border-b-2"
                  style={{
                    color: panelTab === t.id ? langColor : '#4B5563',
                    borderColor: panelTab === t.id ? langColor : 'transparent',
                  }}>
                  {t.icon} {t.label}
                  {t.id === 'cases' && testResults.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{ backgroundColor: langColor + '22', color: langColor }}>
                      {passedCount}/{testResults.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>

              {panelTab === 'cases' && (
                <>
                  {isRunning ? (
                    <div className="flex items-center gap-3 text-gray-500 text-xs p-2 animate-pulse">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ backgroundColor: langColor, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      Executing against test cases...
                    </div>
                  ) : testResults.length === 0 ? (
                    <div className="flex items-center gap-2 text-gray-700 text-xs p-2">
                      <FiPlay className="text-gray-700" /> Run your code to see test results
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {testResults.map((r, i) => (
                        <div key={i} className="rounded-xl border p-3 text-xs transition-all"
                          style={{
                            backgroundColor: r.passed ? '#22C55E08' : '#EF444408',
                            borderColor: r.passed ? '#22C55E33' : '#EF444433',
                          }}>
                          <div className="flex items-center gap-2 mb-2">
                            {r.passed
                              ? <FiCheckCircle className="text-green-400 shrink-0" />
                              : <FiXCircle     className="text-red-400 shrink-0" />}
                            <span className="font-bold" style={{ color: r.passed ? '#22C55E' : '#EF4444' }}>
                              {r.label} — {r.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          {r.input !== undefined && (
                            <div className="text-gray-500 mb-1">
                              <span className="text-gray-400">Input: </span>{r.input}
                            </div>
                          )}
                          <div className="text-gray-300">
                            <span className="text-gray-400">Got: </span>{r.actual_output}
                          </div>
                          {!r.passed && (
                            <div className="text-gray-300 mt-1">
                              <span className="text-gray-400">Expected: </span>{r.expected_output}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {panelTab === 'console' && (
                <div className="space-y-1 font-mono text-xs p-2">
                  {consoleLog.length === 0
                    ? <span className="text-gray-700 flex items-center gap-1">Waiting for execution<span className="animate-pulse">_</span></span>
                    : consoleLog.map((line, i) => (
                        <div key={i} className={line.startsWith('✓') ? 'text-green-400' : line.startsWith('✗') ? 'text-red-400' : 'text-gray-400'}>
                          {line}
                        </div>
                      ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        @media print {
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
