import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import API_BASE from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiPlay, FiClock, FiCheckCircle, FiXCircle, FiCode, FiList,
  FiArrowLeft, FiChevronRight, FiChevronLeft, FiDownload,
  FiTerminal, FiZap, FiAward, FiCpu, FiAlertCircle,
  FiMaximize2, FiMinimize2, FiRefreshCw, FiMinus, FiPlus,
  FiEye, FiEyeOff, FiCommand
} from 'react-icons/fi';

// ─── helpers ──────────────────────────────────────────────────────────────────
const formatTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const LANG_META = {
  python: { label: 'Python', color: '#3B82F6', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', mono: 'py' },
  java:   { label: 'Java',   color: '#F97316', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', mono: 'java' },
  cpp:    { label: 'C++',    color: '#A855F7', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', mono: 'cpp' },
};

const DIFF_META = {
  easy:   { color: '#22C55E', glow: 'rgba(34,197,94,0.35)',   label: 'Easy',   icon: '🌱' },
  medium: { color: '#06B6D4', glow: 'rgba(6,182,212,0.35)',   label: 'Medium', icon: '🔥' },
  hard:   { color: '#EF4444', glow: 'rgba(239,68,68,0.35)',   label: 'Hard',   icon: '💎' },
};

// ─── Matrix Rain ──────────────────────────────────────────────────────────────
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
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 18, y * 18);
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

// ─── Timer Ring ───────────────────────────────────────────────────────────────
function TimerRing({ elapsed, limit = 3600, color }) {
  const r = 20, circ = 2 * Math.PI * r;
  const pct = Math.min(elapsed / limit, 1);
  const urgency = elapsed > limit * 0.8;
  const ringColor = urgency ? '#EF4444' : color;
  return (
    <svg width="56" height="56" className="rotate-[-90deg]">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={ringColor} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${ringColor})` }} />
    </svg>
  );
}

// ─── Score Pill ───────────────────────────────────────────────────────────────
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

// ─── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot({ results }) {
  if (!results || results.length === 0) return <div className="w-2 h-2 rounded-full bg-gray-700" />;
  const all = results.every(r => r.passed);
  const some = results.some(r => r.passed);
  const col = all ? '#22C55E' : some ? '#EAB308' : '#EF4444';
  return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col, boxShadow: `0 0 6px ${col}` }} />;
}

// ─── Keyboard Shortcut Badge ──────────────────────────────────────────────────
function KbdBadge({ keys }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((k, i) => (
        <kbd key={i} className="text-[9px] px-1 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-gray-400 leading-none">{k}</kbd>
      ))}
    </span>
  );
}

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────
function ShortcutsModal({ onClose, diffColor }) {
  const shortcuts = [
    { keys: ['Ctrl', 'Enter'], action: 'Run Code' },
    { keys: ['Ctrl', '↑'], action: 'Next Problem' },
    { keys: ['Ctrl', '↓'], action: 'Previous Problem' },
    { keys: ['Ctrl', 'Shift', 'Z'], action: 'Toggle Zen Mode' },
    { keys: ['Ctrl', 'Shift', 'F'], action: 'Fullscreen Editor' },
    { keys: ['Escape'], action: 'Exit Fullscreen / Close' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-[#0d1117] border border-white/15 rounded-2xl p-6 w-80 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: `0 0 60px ${diffColor}22` }}>
        <div className="flex items-center gap-2 mb-5">
          <FiCommand style={{ color: diffColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Keyboard Shortcuts</h3>
        </div>
        <div className="space-y-3">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">{s.action}</span>
              <KbdBadge keys={s.keys} />
            </div>
          ))}
        </div>
        <button onClick={onClose}
          className="mt-6 w-full py-2 rounded-xl text-xs font-bold border border-white/10 text-gray-400 hover:bg-white/5 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
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

// ─── Evaluating Screen ────────────────────────────────────────────────────────
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
        @keyframes loading-bar { 0%{width:0%;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:0%;margin-left:100%} }
        .animate-loading-bar { animation: loading-bar 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── Report Phase ─────────────────────────────────────────────────────────────
function ReportPhase({ report, problems, submissions, difficultyName, diffMeta, navigate }) {
  const [page, setPage] = useState(0);
  const [showIdeal, setShowIdeal] = useState(false);
  const ev = report.evaluations[page];
  const prob = problems[page];
  const sub = submissions[page];
  const passRate = report.total_correct / report.total_problems;
  const scoreColor = passRate === 1 ? '#22C55E' : passRate >= 0.5 ? '#EAB308' : '#EF4444';

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col print:bg-white print:text-black">
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
            <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-2xl px-5 py-3">
              <FiAward className="text-xl" style={{ color: scoreColor }} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Score</p>
                <p className="text-xl font-bold font-mono" style={{ color: scoreColor }}>
                  {report.total_correct} / {report.total_problems}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
              {report.evaluations.map((e, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className="w-8 h-8 rounded-xl text-xs font-bold font-mono transition-all duration-200 border"
                  style={{
                    backgroundColor: i === page ? (e.is_correct ? '#22C55E22' : '#EF444422') : 'transparent',
                    borderColor: i === page ? (e.is_correct ? '#22C55E' : '#EF4444') : '#ffffff22',
                    color: e.is_correct ? '#22C55E' : '#EF4444',
                    boxShadow: i === page ? `0 0 10px ${e.is_correct ? '#22C55E55' : '#EF444455'}` : 'none'
                  }}>{i + 1}</button>
              ))}
            </div>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded-2xl font-bold text-sm transition-colors">
              <FiDownload /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-4 print:hidden overflow-hidden">
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
          <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
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
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-white/8">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Your Code</span>
                <span className={`text-xs px-2 py-1 rounded-md border font-mono ${LANG_META[sub?.language]?.badge}`}>
                  {LANG_META[sub?.language]?.label}
                </span>
              </div>
              <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed max-h-60" style={{ scrollbarWidth: 'thin' }}>
                <code>{sub?.codes?.[sub.language] || ''}</code>
              </pre>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            <div className={`rounded-2xl border p-5 ${ev?.is_correct ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev?.is_correct ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {ev?.is_correct ? <FiCheckCircle className="text-xl text-green-400" /> : <FiXCircle className="text-xl text-red-400" />}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${ev?.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                    {ev?.is_correct ? 'Correct ✓' : 'Needs Work'}
                  </h3>
                  <p className="text-xs text-gray-500">AI Code Review</p>
                </div>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed mb-6">{ev?.feedback}</p>
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
                            <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: LANG_META[lang].color + '18' }}>
                              <span className="text-xs font-bold font-mono uppercase" style={{ color: LANG_META[lang].color }}>{LANG_META[lang].label}</span>
                            </div>
                            <pre className="bg-[#0d1117] p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-52" style={{ scrollbarWidth: 'thin' }}>
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

        <div className="text-center shrink-0 pt-2">
          <button onClick={() => navigate('/dashboard')}
            className="px-10 py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-105"
            style={{ backgroundColor: diffMeta.color, boxShadow: `0 0 20px ${diffMeta.glow}` }}>
            Return to Dashboard
          </button>
        </div>
      </div>

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
              <pre className="bg-gray-100 p-3 rounded text-xs border border-gray-300 whitespace-pre-wrap mb-3"><code>{s?.codes?.[s.language]}</code></pre>
              <h3 className="font-bold text-xs uppercase mb-1">AI Verdict: {e.is_correct ? '✅ Passed' : '❌ Failed'}</h3>
              <p className="text-sm">{e.feedback}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Draggable Divider ────────────────────────────────────────────────────────
function DragDivider({ onDrag, color }) {
  const dragging = useRef(false);
  const onMouseDown = (e) => {
    dragging.current = true;
    e.preventDefault();
  };
  useEffect(() => {
    const move = (e) => { if (dragging.current) onDrag(e.clientX); };
    const up   = () => { dragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 flex flex-col items-center justify-center shrink-0 cursor-col-resize group relative"
      style={{ background: 'transparent' }}>
      <div className="absolute inset-y-0 w-px bg-white/8 group-hover:bg-white/20 transition-colors" />
      <div className="relative z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {[0,1,2].map(i => (
          <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Platform ────────────────────────────────────────────────────────────
export default function CodingPlatform() {
  const { level } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [problems, setProblems]       = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [phase, setPhase]             = useState('coding');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef(null);

  const [submissions, setSubmissions]       = useState([]);
  const [testResultsMap, setTestResultsMap] = useState({});
  const [isRunning, setIsRunning]           = useState(false);
  const [runFlash, setRunFlash]             = useState(false);
  const [report, setReport]                 = useState(null);
  const [panelTab, setPanelTab]             = useState('cases');
  const [consoleLog, setConsoleLog]         = useState([]);

  // ── UI modes ──
  const [zenMode, setZenMode]         = useState(false);   // hide problem panel
  const [editorFull, setEditorFull]   = useState(false);   // hide bottom panel
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [fontSize, setFontSize]       = useState(14);
  const [problemWidth, setProblemWidth] = useState(384);   // px, draggable
  const containerRef = useRef(null);

  const rawLevel     = level || window.location.pathname.split('/').pop() || 'easy';
  const safeLevel    = rawLevel.toLowerCase();
  const difficultyName = safeLevel.charAt(0).toUpperCase() + safeLevel.slice(1);
  const diffMeta     = DIFF_META[safeLevel] || DIFF_META.easy;
  const currentProb  = problems[currentIndex];
  const currentSub   = submissions[currentIndex];
  const testResults  = testResultsMap[currentIndex] || [];
  const passedCount  = testResults.filter(r => r.passed).length;
  const langColor    = LANG_META[currentSub?.language]?.color || '#06B6D4';

  // ── fetch problems ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const go = async () => {
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
          problem_title: p.title || `Problem ${idx + 1}`,
          language: 'python',
          codes: {
            python: p.starter_code?.python || '# Write your solution here\n',
            java:   p.starter_code?.java   || '// Write your solution here\n',
            cpp:    p.starter_code?.cpp    || '// Write your solution here\n',
          },
          originalCode: {
            python: p.starter_code?.python || '# Write your solution here\n',
            java:   p.starter_code?.java   || '// Write your solution here\n',
            cpp:    p.starter_code?.cpp    || '// Write your solution here\n',
          },
        })));
        timerRef.current = setInterval(() => setTimeElapsed(p => p + 1), 1000);
      } catch (err) {
        console.error(err);
        alert('Failed to load session.');
      } finally {
        setLoading(false);
      }
    };
    go();
    return () => clearInterval(timerRef.current);
  }, [level, user]);

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleRun(); }
      if (e.ctrlKey && e.key === 'ArrowUp')   { e.preventDefault(); setCurrentIndex(i => Math.max(0, i - 1)); }
      if (e.ctrlKey && e.key === 'ArrowDown') { e.preventDefault(); setCurrentIndex(i => Math.min(problems.length - 1, i + 1)); }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') { e.preventDefault(); setZenMode(z => !z); }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); setEditorFull(f => !f); }
      if (e.key === 'Escape') { setZenMode(false); setEditorFull(false); setShowShortcuts(false); }
      if (e.key === '?' && !e.ctrlKey) { /* ignore in editor */ }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [problems.length]);

  // ── drag divider ──────────────────────────────────────────────────────────
  const handleDividerDrag = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // subtract sidebar width ~208px
    const offset = clientX - rect.left - 208;
    setProblemWidth(Math.max(260, Math.min(560, offset)));
  }, []);

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

  const resetCode = () => {
    if (!window.confirm('Reset to starter code?')) return;
    setSubmissions(prev => {
      const next = [...prev];
      const lang = next[currentIndex].language;
      next[currentIndex] = {
        ...next[currentIndex],
        codes: { ...next[currentIndex].codes, [lang]: next[currentIndex].originalCode[lang] }
      };
      return next;
    });
    setTestResultsMap(m => ({ ...m, [currentIndex]: [] }));
  };

  // ── run code ──────────────────────────────────────────────────────────────
  const handleRun = async () => {
    const sub  = submissions[currentIndex];
    const code = sub?.codes?.[sub.language];
    const prob = problems[currentIndex];
    if (!code?.trim()) return;

    const examples = prob?.examples || [];
    setIsRunning(true);
    setRunFlash(true);
    setPanelTab('cases');
    setTestResultsMap(m => ({ ...m, [currentIndex]: [] }));
    const ts = new Date().toLocaleTimeString();
    setConsoleLog(prev => [...prev, { type: 'info', text: `[${ts}] Running ${sub.language} · "${prob?.title}"`, ts }]);
    setTimeout(() => setRunFlash(false), 600);

    try {
      const res = await fetch(`${API_BASE}/api/coding/execute-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: sub.language, code,
          driver_code: prob?.driver_code?.[sub.language] || '',
          test_cases: examples.map(ex => ({ input: ex.input, expected_output: ex.output })),
        }),
      });
      const data = await res.json();
      const enriched = (data.results || []).map((r, i) => ({ ...r, label: `Case ${i + 1}`, input: examples[i]?.input }));
      setTestResultsMap(m => ({ ...m, [currentIndex]: enriched }));
      const p = enriched.filter(r => r.passed).length;
      const ts2 = new Date().toLocaleTimeString();
      setConsoleLog(prev => [...prev,
        { type: p === enriched.length ? 'success' : 'warn', text: `[${ts2}] ${p}/${enriched.length} test cases passed`, ts: ts2 }
      ]);
    } catch (err) {
      const ts3 = new Date().toLocaleTimeString();
      setTestResultsMap(m => ({ ...m, [currentIndex]: [{ label: 'Error', passed: false, actual_output: err.message, expected_output: '' }] }));
      setConsoleLog(prev => [...prev, { type: 'error', text: `[${ts3}] Error: ${err.message}`, ts: ts3 }]);
    } finally {
      setIsRunning(false);
    }
  };

  // ── end session ───────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (!window.confirm('Submit all problems for AI evaluation?')) return;
    clearInterval(timerRef.current);
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
      timerRef.current = setInterval(() => setTimeElapsed(p => p + 1), 1000);
    }
  };

  // ── render gates ──────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen name={difficultyName} diffColor={diffMeta.color} />;
  if (phase === 'evaluating') return <EvaluatingScreen diffColor={diffMeta.color} />;
  if (phase === 'report' && report)
    return <ReportPhase report={report} problems={problems} submissions={submissions}
      difficultyName={difficultyName} diffMeta={diffMeta} navigate={navigate} />;

  const totalPassed = Object.values(testResultsMap).reduce((a, r) => a + r.filter(x => x.passed).length, 0);
  const totalRan    = Object.values(testResultsMap).reduce((a, r) => a + r.length, 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#0D1117] text-white flex flex-col font-mono overflow-hidden print:hidden">

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} diffColor={diffMeta.color} />}

      {/* ════════ HEADER ════════ */}
      <header className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 border-b border-white/8 relative"
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

          {/* header problem pills */}
          <div className="hidden md:flex gap-1 ml-2">
            {problems.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className="w-7 h-7 rounded-lg text-xs font-bold transition-all duration-200 border"
                style={{
                  backgroundColor: i === currentIndex ? diffMeta.color + '22' : 'transparent',
                  borderColor: i === currentIndex ? diffMeta.color : '#ffffff18',
                  color: i === currentIndex ? diffMeta.color
                    : (testResultsMap[i]?.length > 0
                      ? (testResultsMap[i].every(r => r.passed) ? '#22C55E' : '#EF4444')
                      : '#4B5563'),
                  boxShadow: testResultsMap[i]?.length > 0 && i !== currentIndex
                    ? `0 0 6px ${testResultsMap[i].every(r => r.passed) ? '#22C55E44' : '#EF444444'}`
                    : 'none'
                }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* center: keyboard hint */}
        <button onClick={() => setShowShortcuts(true)}
          className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1.5 text-gray-700 hover:text-gray-500 text-xs transition-colors">
          <FiCommand className="text-xs" />
          <span>Shortcuts</span>
        </button>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Zen mode toggle */}
          <button onClick={() => setZenMode(z => !z)}
            title={zenMode ? 'Show Problem Panel' : 'Zen Mode (hide problem)'}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
            style={{
              backgroundColor: zenMode ? diffMeta.color + '22' : 'transparent',
              borderColor: zenMode ? diffMeta.color + '55' : '#ffffff18',
              color: zenMode ? diffMeta.color : '#4B5563'
            }}>
            {zenMode ? <FiEye className="text-sm" /> : <FiEyeOff className="text-sm" />}
          </button>

          {/* Fullscreen editor toggle */}
          <button onClick={() => setEditorFull(f => !f)}
            title={editorFull ? 'Restore Panel' : 'Maximize Editor'}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:bg-white/5"
            style={{ borderColor: '#ffffff18', color: editorFull ? langColor : '#4B5563' }}>
            {editorFull ? <FiMinimize2 className="text-sm" /> : <FiMaximize2 className="text-sm" />}
          </button>

          {/* Timer ring */}
          <div className="relative flex items-center justify-center w-14 h-14 cursor-default">
            <TimerRing elapsed={timeElapsed} color={diffMeta.color} />
            <span className="absolute text-[10px] font-bold font-mono" style={{ color: diffMeta.color }}>
              {formatTime(timeElapsed)}
            </span>
          </div>

          {/* overall score pill */}
          {totalRan > 0 && <ScorePill passed={totalPassed} total={totalRan} />}

          <button onClick={handleEnd}
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all hover:scale-105 border"
            style={{
              backgroundColor: '#EF444422', borderColor: '#EF444455', color: '#EF4444',
              boxShadow: '0 0 20px rgba(239,68,68,0.15)'
            }}>
            <FiCheckCircle className="text-base" />
            <span className="hidden sm:inline">Submit All</span>
          </button>
        </div>
      </header>

      {/* ════════ BODY ════════ */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="hidden lg:flex w-52 flex-col bg-[#090d13] border-r border-white/8 shrink-0">
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
            <FiList className="text-gray-500 text-xs" />
            <span className="text-xs text-gray-500 uppercase tracking-widest">Problems</span>
          </div>

          {/* progress bar */}
          <div className="px-4 py-2 border-b border-white/5">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Object.values(testResultsMap).filter(r => r.length > 0 && r.every(x => x.passed)).length}/{problems.length}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(Object.values(testResultsMap).filter(r => r.length > 0 && r.every(x => x.passed)).length / Math.max(problems.length, 1)) * 100}%`,
                  backgroundColor: diffMeta.color,
                  boxShadow: `0 0 8px ${diffMeta.color}`
                }} />
            </div>
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

        {/* ── Problem panel (collapsible in zen mode) ── */}
        {!zenMode && (
          <>
            <div className="hidden md:flex flex-col border-r border-white/8 bg-[#0D1117] shrink-0 overflow-hidden transition-all duration-300"
              style={{ width: problemWidth }}>
              {/* mobile problem tabs */}
              <div className="flex gap-1 p-2 border-b border-white/8 md:hidden overflow-x-auto">
                {problems.map((_, i) => (
                  <button key={i} onClick={() => setCurrentIndex(i)}
                    className="shrink-0 w-8 h-8 rounded-lg text-xs font-bold border transition-all"
                    style={{
                      backgroundColor: i === currentIndex ? diffMeta.color + '22' : 'transparent',
                      borderColor: i === currentIndex ? diffMeta.color : '#ffffff18',
                      color: i === currentIndex ? diffMeta.color : '#6B7280',
                    }}>{i + 1}</button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin' }}>
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

              {/* prev/next problem nav at bottom */}
              <div className="flex border-t border-white/8 shrink-0">
                <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 hover:text-gray-400 disabled:opacity-30 transition-colors border-r border-white/8">
                  <FiChevronLeft className="text-xs" /> Prev
                </button>
                <button onClick={() => setCurrentIndex(i => Math.min(problems.length - 1, i + 1))} disabled={currentIndex === problems.length - 1}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs hover:text-gray-300 disabled:opacity-30 transition-colors"
                  style={{ color: diffMeta.color }}>
                  Next <FiChevronRight className="text-xs" />
                </button>
              </div>
            </div>

            {/* Drag handle */}
            <DragDivider onDrag={handleDividerDrag} color={diffMeta.color} />
          </>
        )}

        {/* ── Editor + Results ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117] overflow-hidden">

          {/* Editor toolbar */}
          <div className="h-11 bg-[#161b22] border-b border-white/8 flex items-center justify-between px-3 shrink-0 gap-2">

            {/* Left: language tabs */}
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

            {/* Right: controls */}
            <div className="flex items-center gap-1.5">
              {/* Font size */}
              <div className="hidden sm:flex items-center gap-1 bg-black/40 border border-white/8 rounded-lg px-2 py-1">
                <button onClick={() => setFontSize(s => Math.max(10, s - 1))}
                  className="text-gray-500 hover:text-gray-300 transition-colors w-4 h-4 flex items-center justify-center">
                  <FiMinus className="text-[10px]" />
                </button>
                <span className="text-[10px] text-gray-500 font-mono w-5 text-center">{fontSize}</span>
                <button onClick={() => setFontSize(s => Math.min(22, s + 1))}
                  className="text-gray-500 hover:text-gray-300 transition-colors w-4 h-4 flex items-center justify-center">
                  <FiPlus className="text-[10px]" />
                </button>
              </div>

              {/* Reset code */}
              <button onClick={resetCode} title="Reset to starter code"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-gray-500 hover:text-gray-300">
                <FiRefreshCw className="text-xs" />
              </button>

              {/* Maximize/minimize bottom panel */}
              <button onClick={() => setEditorFull(f => !f)} title={editorFull ? 'Show test panel' : 'Maximize editor'}
                className="w-7 h-7 flex items-center justify-center rounded-lg border transition-all"
                style={{
                  backgroundColor: editorFull ? langColor + '22' : 'transparent',
                  borderColor: editorFull ? langColor + '55' : '#ffffff18',
                  color: editorFull ? langColor : '#6B7280'
                }}>
                {editorFull ? <FiMinimize2 className="text-xs" /> : <FiMaximize2 className="text-xs" />}
              </button>

              {/* Run button */}
              <button onClick={handleRun} disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ml-1"
                style={{
                  backgroundColor: runFlash ? langColor + '44' : langColor + '22',
                  borderColor: langColor + '55',
                  color: langColor,
                  boxShadow: isRunning || runFlash ? `0 0 15px ${langColor}44` : 'none',
                  transform: runFlash ? 'scale(0.97)' : 'scale(1)',
                }}>
                {isRunning
                  ? <><FiClock className="animate-spin text-sm" /> Running...</>
                  : <><FiPlay className="text-sm" /> Run <span className="hidden sm:inline">Code</span></>}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="overflow-hidden relative" style={{ flex: editorFull ? '1 1 100%' : '1 1 auto', minHeight: 0 }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={currentSub?.language || 'python'}
              value={currentSub?.codes?.[currentSub?.language] || ''}
              onChange={val => updateSub('code', val || '')}
              options={{
                fontSize,
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
                suggest: { showStatusBar: true },
                lineNumbers: 'on',
              }}
              loading={
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                  Loading editor...
                </div>
              }
            />

            {/* Ctrl+Enter hint overlay */}
            {!isRunning && testResults.length === 0 && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-30 pointer-events-none">
                <KbdBadge keys={['Ctrl', 'Enter']} />
                <span className="text-[10px] text-gray-500">to run</span>
              </div>
            )}
          </div>

          {/* ── Bottom panel ── */}
          {!editorFull && (
            <div className="flex flex-col border-t border-white/8 bg-[#090d13] shrink-0" style={{ height: 240 }}>

              {/* Panel tabs */}
              <div className="flex items-center border-b border-white/8 px-4 h-9 gap-4 shrink-0">
                {[
                  { id: 'cases',   label: 'Test Cases', icon: <FiCheckCircle className="text-xs" /> },
                  { id: 'console', label: 'Console',    icon: <FiTerminal    className="text-xs" /> },
                ].map(t => (
                  <button key={t.id} onClick={() => setPanelTab(t.id)}
                    className="flex items-center gap-1.5 text-xs font-bold pb-0.5 transition-all duration-200 border-b-2 h-full"
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
                    {t.id === 'console' && consoleLog.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-400">
                        {consoleLog.length}
                      </span>
                    )}
                  </button>
                ))}

                {/* clear console */}
                {panelTab === 'console' && consoleLog.length > 0 && (
                  <button onClick={() => setConsoleLog([])}
                    className="ml-auto text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
                    Clear
                  </button>
                )}
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
                        <span className="ml-1 opacity-50"><KbdBadge keys={['Ctrl','Enter']} /></span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {testResults.map((r, i) => (
                          <div key={i}
                            className="rounded-xl border p-3 text-xs transition-all"
                            style={{
                              backgroundColor: r.passed ? '#22C55E08' : '#EF444408',
                              borderColor: r.passed ? '#22C55E33' : '#EF444433',
                              animation: `fadeSlideIn 0.2s ease forwards`,
                              animationDelay: `${i * 0.06}s`,
                              opacity: 0,
                            }}>
                            <div className="flex items-center gap-2 mb-2">
                              {r.passed
                                ? <FiCheckCircle className="text-green-400 shrink-0" />
                                : <FiXCircle    className="text-red-400 shrink-0" />}
                              <span className="font-bold" style={{ color: r.passed ? '#22C55E' : '#EF4444' }}>
                                {r.label} — {r.passed ? 'Passed ✓' : 'Failed'}
                              </span>
                            </div>
                            {r.input !== undefined && (
                              <div className="text-gray-500 mb-1 font-mono">
                                <span className="text-gray-400">Input: </span>{r.input}
                              </div>
                            )}
                            <div className="text-gray-300 font-mono">
                              <span className="text-gray-400">Got: </span>{r.actual_output}
                            </div>
                            {!r.passed && (
                              <div className="text-gray-300 mt-1 font-mono">
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
                  <div className="space-y-1 font-mono text-xs">
                    {consoleLog.length === 0
                      ? <span className="text-gray-700">Console is empty. Run your code.</span>
                      : consoleLog.map((line, i) => (
                          <div key={i} className="flex items-start gap-2"
                            style={{
                              color: line.type === 'success' ? '#22C55E' : line.type === 'error' ? '#EF4444' : line.type === 'warn' ? '#EAB308' : '#6B7280',
                              animation: `fadeSlideIn 0.15s ease forwards`,
                            }}>
                            <span className="shrink-0 select-none opacity-40">
                              {line.type === 'success' ? '✓' : line.type === 'error' ? '✗' : line.type === 'warn' ? '⚠' : '›'}
                            </span>
                            <span>{line.text}</span>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media print { @page { margin: 1cm; } }
      `}</style>
    </div>
  );
}