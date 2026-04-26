import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiArrowRight, FiZap, FiCode, FiMic, FiUsers,
  FiAward, FiTarget, FiCalendar, FiBook, FiTrendingUp,
  FiCheckCircle, FiCpu
} from "react-icons/fi";

// ── ambient cursor glow ───────────────────────────────────────────────────────
function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    const move = (e) => {
      if (ref.current) {
        ref.current.style.left = e.clientX + "px";
        ref.current.style.top  = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return <div ref={ref} className="cursor-glow" aria-hidden />;
}

// ── film grain overlay ────────────────────────────────────────────────────────
function Noise() {
  return (
    <svg className="noise-overlay" xmlns="http://www.w3.org/2000/svg">
      <filter id="noise-filter">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise-filter)" opacity="0.04" />
    </svg>
  );
}

// ── scrolling marquee ─────────────────────────────────────────────────────────
function Marquee({ items }) {
  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-dot">✦</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 3D tilt bento card ────────────────────────────────────────────────────────
function BentoCard({ to, children, className = "", accent = "#a855f7" }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const handleMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 12;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 12;
    setTilt({ x, y });
  }, []);
  return (
    <Link
      ref={cardRef}
      to={to}
      className={`bento-card ${className}`}
      style={{
        "--accent": accent,
        transform: `perspective(800px) rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)`
      }}
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="bento-shine" />
      {children}
    </Link>
  );
}

// ── typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ words }) {
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const word = words[idx];
    if (!del && sub === word.length) {
      const t = setTimeout(() => setDel(true), 1800);
      return () => clearTimeout(t);
    }
    if (del && sub === 0) {
      setDel(false);
      setIdx(i => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(() => setSub(s => s + (del ? -1 : 1)), del ? 45 : 80);
    return () => clearTimeout(t);
  }, [sub, del, idx, words]);
  return (
    <span className="typewriter-word">
      {words[idx].slice(0, sub)}<span className="typewriter-cursor">|</span>
    </span>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => setMouse({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight
    });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const marqueeItems = [
    "Aptitude Arena", "AI Coding Challenges", "Mock Interviews",
    "Live GD Rooms", "Resume Analyzer", "Leaderboard",
    "Technical Hub", "Scheduled Tests", "Resource Library"
  ];

  return (
    <div className="home-root">
      <CursorGlow />
      <Noise />

      {/* mesh background */}
      <div className="mesh-bg" aria-hidden>
        <div className="mesh-blob mesh-blob-1" style={{ transform: `translate(${mouse.x * 40 - 20}px, ${mouse.y * 40 - 20}px)` }} />
        <div className="mesh-blob mesh-blob-2" style={{ transform: `translate(${-mouse.x * 30 + 15}px, ${mouse.y * 50 - 25}px)` }} />
        <div className="mesh-blob mesh-blob-3" style={{ transform: `translate(${mouse.x * 20 - 10}px, ${-mouse.y * 30 + 15}px)` }} />
        <div className="mesh-grid" />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="hero-section">
        <div className="hero-pill">
          <span className="hero-pill-dot" />
          Built for campus placement prep
        </div>

        <h1 className="hero-headline">
          <span className="hero-line-1">Your placement</span>
          <span className="hero-line-2">
            prep starts{" "}
            <span className="hero-accent">
              <Typewriter words={["here.", "today.", "now."]} />
            </span>
          </span>
        </h1>

        <p className="hero-sub">
          Placify brings aptitude practice, technical MCQs, AI coding challenges,
          mock interviews, live GD rooms, and resume analysis — all in one place.
        </p>

        <div className="hero-ctas">
          {user ? (
            <Link to="/dashboard" className="cta-primary">
              Go to Dashboard <FiArrowRight />
            </Link>
          ) : (
            <>
              <Link to="/register" className="cta-primary">
                Get started free <FiArrowRight />
              </Link>
              <Link to="/login" className="cta-ghost">
                Sign in →
              </Link>
            </>
          )}
        </div>

        {/* honest module count pills instead of fake stats */}
        <div className="hero-pills-row">
          {[
            { icon: "📚", label: "8 training modules" },
            { icon: "🤖", label: "AI-powered feedback" },
            { icon: "⚡", label: "Live code execution" },
            { icon: "👥", label: "Real-time GD rooms" },
          ].map((p, i) => (
            <div key={i} className="hero-feature-pill">
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      <Marquee items={marqueeItems} />

      {/* ═══ BENTO: WHAT'S INSIDE ═══ */}
      <section className="bento-section">
        <div className="section-label">What's inside</div>
        <h2 className="section-headline">
          8 modules.<br />
          <span className="section-accent">One platform.</span>
        </h2>

        <div className="bento-grid">

          {/* LARGE — Aptitude */}
          <BentoCard to="/aptitude" className="bento-lg" accent="#a855f7">
            <div className="bento-icon-wrap" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
              <FiTarget style={{ color: "#a855f7" }} size={26} />
            </div>
            <h3 className="bento-title">Aptitude Arena</h3>
            <p className="bento-desc">
              Topic-wise practice across Quantitative, Logical, and Verbal sections.
              Each topic has dedicated timed test sets with score tracking.
            </p>
            <div className="bento-footer">
              <div className="bento-pills">
                <span className="bento-pill">Quantitative</span>
                <span className="bento-pill">Logical</span>
                <span className="bento-pill">Verbal</span>
              </div>
              <div className="bento-arrow"><FiArrowRight /></div>
            </div>
            <div className="bento-decor" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)" }} />
          </BentoCard>

          {/* Technical Hub */}
          <BentoCard to="/technical" className="bento-sm" accent="#06b6d4">
            <div className="bento-icon-wrap" style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
              <FiCpu style={{ color: "#06b6d4" }} size={22} />
            </div>
            <h3 className="bento-title">Technical Hub</h3>
            <p className="bento-desc">Notes + MCQ tests for C, C++, Java, Python, DSA, DBMS, OS, and CN.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-code-bg">{`// 8 CS subjects\n// Notes + Tests\n// All in one`}</div>
          </BentoCard>

          {/* AI Coding */}
          <BentoCard to="/technical/coding-levels" className="bento-sm" accent="#3b82f6">
            <div className="bento-icon-wrap" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <FiCode style={{ color: "#3b82f6" }} size={22} />
            </div>
            <h3 className="bento-title">AI Coding Arena</h3>
            <p className="bento-desc">AI generates unique problems per session. Write, run & get graded automatically.</p>
            <div className="bento-footer">
              <div className="bento-pills">
                <span className="bento-pill" style={{ borderColor: "#22c55e44", color: "#22c55e" }}>Easy</span>
                <span className="bento-pill" style={{ borderColor: "#06b6d444", color: "#06b6d4" }}>Medium</span>
                <span className="bento-pill" style={{ borderColor: "#ef444444", color: "#ef4444" }}>Hard</span>
              </div>
              <div className="bento-arrow"><FiArrowRight /></div>
            </div>
          </BentoCard>

          {/* Resume Analyzer */}
          <BentoCard to="/resume-analyzer" className="bento-sm" accent="#facc15">
            <div className="bento-icon-wrap" style={{ background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)" }}>
              <FiZap style={{ color: "#facc15" }} size={22} />
            </div>
            <h3 className="bento-title">Resume Analyzer</h3>
            <p className="bento-desc">Upload PDF or DOCX. AI parses with NLP and gives section-by-section feedback.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-tag-sm" style={{ color: "#facc15", borderColor: "rgba(250,204,21,0.3)", background: "rgba(250,204,21,0.08)" }}>AI-Powered</div>
          </BentoCard>

          {/* Mock Interview */}
          <BentoCard to="/interview" className="bento-sm" accent="#fb7185">
            <div className="bento-icon-wrap" style={{ background: "rgba(251,113,133,0.15)", border: "1px solid rgba(251,113,133,0.3)" }}>
              <FiMic style={{ color: "#fb7185" }} size={22} />
            </div>
            <h3 className="bento-title">Mock Interview</h3>
            <p className="bento-desc">AI asks HR & technical questions, you respond, and get structured feedback.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-wave-bg">
              {[8, 14, 20, 12, 18, 22, 10, 16, 24, 11].map((h, i) => (
                <div key={i} className="wave-bar"
                  style={{ height: h * 2, animationDelay: `${i * 0.12}s`, background: "rgba(251,113,133,0.5)" }} />
              ))}
            </div>
          </BentoCard>

          {/* Live GD */}
          <BentoCard to="/gd" className="bento-sm" accent="#4ade80">
            <div className="bento-icon-wrap" style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)" }}>
              <FiUsers style={{ color: "#4ade80" }} size={22} />
            </div>
            <h3 className="bento-title">Live GD Rooms</h3>
            <p className="bento-desc">Join live group discussions with real users. AI analyses participation post-session.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-avatars">
              {["KP", "AR", "SM", "NY"].map((a, i) => (
                <div key={i} className="bento-avatar" style={{ animationDelay: `${i * 0.2}s` }}>{a}</div>
              ))}
              <div className="bento-avatar bento-avatar-more">+</div>
            </div>
          </BentoCard>

          {/* Scheduled Tests */}
          <BentoCard to="/tests" className="bento-sm" accent="#f97316">
            <div className="bento-icon-wrap" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}>
              <FiCalendar style={{ color: "#f97316" }} size={22} />
            </div>
            <h3 className="bento-title">Scheduled Tests</h3>
            <p className="bento-desc">Admin-assigned coding tests with custom problems, time limits, and auto-grading.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-tag-sm" style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>Exam Mode</div>
          </BentoCard>

          {/* Leaderboard */}
          <BentoCard to="/leaderboard" className="bento-sm" accent="#fb923c">
            <div className="bento-icon-wrap" style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)" }}>
              <FiAward style={{ color: "#fb923c" }} size={22} />
            </div>
            <h3 className="bento-title">Leaderboard</h3>
            <p className="bento-desc">XP-ranked across all students. See where you stand and track your climb in real time.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-ranks">
              {["🥇 Rank #1", "🥈 Rank #2", "🥉 Rank #3"].map((r, i) => (
                <div key={i} className="bento-rank-row" style={{ animationDelay: `${i * 0.15}s` }}>{r}</div>
              ))}
            </div>
          </BentoCard>

          {/* Resource Library */}
          <BentoCard to="/resources" className="bento-sm" accent="#14b8a6">
            <div className="bento-icon-wrap" style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)" }}>
              <FiBook style={{ color: "#14b8a6" }} size={22} />
            </div>
            <h3 className="bento-title">Resource Library</h3>
            <p className="bento-desc">Interview guides, do's & don'ts, body language tips, and communication references.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-tag-sm" style={{ color: "#14b8a6", borderColor: "rgba(20,184,166,0.3)", background: "rgba(20,184,166,0.08)" }}>Reference</div>
          </BentoCard>
        </div>
      </section>

      {/* ═══ PROGRESSION SYSTEM ═══ */}
      <section className="proof-section">
        <div className="proof-inner">
          <div className="proof-left">
            <div className="section-label">Progression system</div>
            <h2 className="proof-headline">
              Practice tracks<br />
              <span className="section-accent">your growth.</span>
            </h2>
            <p className="proof-sub">
              Every module you use contributes to your XP and rank.
              The system tracks streaks, scores, and history so your
              progress is always visible — no fake numbers, just yours.
            </p>
            {!user && (
              <Link to="/register" className="cta-primary" style={{ alignSelf: "flex-start", marginTop: 16 }}>
                Create free account <FiArrowRight />
              </Link>
            )}
          </div>
          <div className="proof-right">
            {[
              { icon: "⚡", label: "XP & Levels",        desc: "Earn XP from every activity",           color: "#a855f7" },
              { icon: "🔥", label: "Daily Streaks",       desc: "Log in daily to keep your streak",       color: "#f97316" },
              { icon: "🏆", label: "Leaderboard Rank",   desc: "Ranked by XP across all students",       color: "#facc15" },
              { icon: "📊", label: "Progress Dashboard", desc: "Score history per subject & module",      color: "#06b6d4" },
            ].map(({ icon, label, desc, color }, i) => (
              <div key={i} className="proof-stat-card" style={{ animationDelay: `${i * 0.1}s`, "--sc": color }}>
                <span className="proof-stat-icon">{icon}</span>
                <span className="proof-stat-n" style={{ color, fontSize: 16, fontWeight: 700 }}>{label}</span>
                <span className="proof-stat-l">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="steps-section">
        <div className="section-label">How it works</div>
        <h2 className="section-headline">
          Three steps.<br />
          <span className="section-accent">Full prep coverage.</span>
        </h2>
        <div className="steps-grid">
          {[
            {
              num: "01", emoji: "🧠", title: "Pick a module",
              desc: "Start with aptitude, technical MCQs, or jump into the AI coding arena. Every module is independent — practice whatever you need.",
              color: "#a855f7"
            },
            {
              num: "02", emoji: "🤖", title: "Get AI feedback",
              desc: "The AI evaluates your code sessions, analyses your resume with NLP, reviews your interview answers, and scores your GD participation.",
              color: "#06b6d4"
            },
            {
              num: "03", emoji: "📈", title: "Track your progress",
              desc: "XP, streaks, and leaderboard rank update with every session. Your dashboard shows score history so you can see improvement over time.",
              color: "#4ade80"
            },
          ].map(({ num, emoji, title, desc, color }, i) => (
            <div key={i} className="step-card" style={{ "--sc": color, animationDelay: `${i * 0.15}s` }}>
              <div className="step-num" style={{ color, borderColor: color + "44" }}>{num}</div>
              <div className="step-emoji">{emoji}</div>
              <h3 className="step-title">{title}</h3>
              <p className="step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ WHO IS THIS FOR ═══ */}
      

      {/* ── styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .home-root {
          min-height: 100vh;
          background: #07070a;
          color: #e2e8f0;
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
          position: relative;
        }
        .cursor-glow {
          position: fixed; width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
          transform: translate(-50%,-50%);
          transition: left 0.12s ease-out, top 0.12s ease-out;
        }
        .noise-overlay {
          position: fixed; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 1;
        }
        .mesh-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .mesh-blob { position: absolute; border-radius: 50%; filter: blur(100px); transition: transform 0.4s ease-out; }
        .mesh-blob-1 { width: 60vw; height: 60vw; top: -20%; left: -10%; background: radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%); }
        .mesh-blob-2 { width: 50vw; height: 50vw; bottom: -15%; right: -10%; background: radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%); }
        .mesh-blob-3 { width: 40vw; height: 40vw; top: 40%; left: 40%; background: radial-gradient(circle, rgba(251,113,133,0.09) 0%, transparent 70%); }
        .mesh-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* HERO */
        .hero-section {
          position: relative; z-index: 2;
          min-height: 92vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 80px 24px 48px; gap: 22px;
        }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 999px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
          font-size: 12px; font-weight: 500; letter-spacing: 0.04em;
          color: #94a3b8; backdrop-filter: blur(12px);
          animation: fadeUp 0.6s ease both;
        }
        .hero-pill-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #4ade80; box-shadow: 0 0 8px #4ade80;
          animation: glowPulse 2s infinite;
        }
        .hero-headline {
          display: flex; flex-direction: column;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(44px,8vw,96px); line-height: 1.0; letter-spacing: -0.03em;
          color: #fff; animation: fadeUp 0.7s 0.1s ease both;
        }
        .hero-line-1 { color: rgba(255,255,255,0.4); font-size: 0.55em; font-weight: 700; }
        .hero-accent {
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .typewriter-cursor {
          display: inline-block; animation: blink 0.8s infinite;
          color: #a855f7; font-weight: 300; margin-left: 2px;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .hero-sub {
          font-size: clamp(15px,2vw,18px); color: #64748b; font-weight: 300;
          line-height: 1.7; max-width: 560px; animation: fadeUp 0.7s 0.2s ease both;
        }
        .hero-ctas {
          display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
          animation: fadeUp 0.7s 0.3s ease both;
        }
        .hero-pills-row {
          display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
          animation: fadeUp 0.7s 0.4s ease both; margin-top: 4px;
        }
        .hero-feature-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          font-size: 12px; color: #64748b; font-weight: 500;
        }

        /* CTAs */
        .cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 14px;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: #fff; font-weight: 700; font-size: 15px;
          letter-spacing: -0.01em; text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 0 30px rgba(168,85,247,0.35); border: none; cursor: pointer;
        }
        .cta-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 0 50px rgba(168,85,247,0.55); }
        .cta-primary-white { background: #fff; color: #09090b; box-shadow: 0 0 30px rgba(255,255,255,0.2); }
        .cta-primary-white:hover { box-shadow: 0 0 50px rgba(255,255,255,0.35); }
        .cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 14px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8; font-weight: 600; font-size: 15px;
          text-decoration: none; transition: all 0.25s ease; backdrop-filter: blur(8px);
        }
        .cta-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); color: #fff; transform: translateY(-2px); }
        .cta-ghost-white { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.7); }
        .cta-ghost-white:hover { color: #fff; border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.1); }

        /* MARQUEE */
        .marquee-wrap {
          position: relative; z-index: 2; overflow: hidden;
          border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02); padding: 14px 0;
        }
        .marquee-track { display: flex; white-space: nowrap; animation: marqueeScroll 30s linear infinite; }
        .marquee-item {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 12px; font-weight: 500; color: #475569;
          padding: 0 28px; letter-spacing: 0.06em; text-transform: uppercase;
        }
        .marquee-dot { color: #a855f7; font-size: 9px; }
        @keyframes marqueeScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        /* BENTO */
        .bento-section { position: relative; z-index: 2; padding: 80px 24px; max-width: 1100px; margin: 0 auto; }
        .section-label {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          color: #a855f7; border: 1px solid rgba(168,85,247,0.3); background: rgba(168,85,247,0.08);
          padding: 4px 12px; border-radius: 999px; margin-bottom: 20px;
        }
        .section-headline {
          font-family: 'Syne', sans-serif; font-size: clamp(32px,5vw,58px); font-weight: 800;
          letter-spacing: -0.03em; color: #fff; line-height: 1.1; margin-bottom: 48px;
        }
        .section-accent {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .bento-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          grid-auto-rows: auto; gap: 14px;
        }
        @media(max-width:900px){ .bento-grid{grid-template-columns:1fr 1fr;} }
        @media(max-width:600px){ .bento-grid{grid-template-columns:1fr;} }
        .bento-card {
          position: relative; display: flex; flex-direction: column; gap: 12px;
          padding: 24px; border-radius: 20px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          text-decoration: none; overflow: hidden;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer; transform-style: preserve-3d;
        }
        .bento-card:hover { border-color: rgba(255,255,255,0.14); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .bento-lg { grid-column: span 2; min-height: 300px; }
        @media(max-width:900px){ .bento-lg{grid-column:span 2;} }
        @media(max-width:600px){ .bento-lg{grid-column:span 1;} }
        .bento-sm { min-height: 180px; }
        .bento-shine {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%);
          pointer-events: none; border-radius: inherit;
        }
        .bento-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bento-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0; }
        .bento-sm .bento-title { font-size: 16px; }
        .bento-desc { font-size: 13px; color: #64748b; line-height: 1.6; flex: 1; margin: 0; }
        .bento-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
        .bento-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .bento-pill {
          font-size: 11px; padding: 4px 10px; border-radius: 999px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;
        }
        .bento-arrow {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          color: #94a3b8; flex-shrink: 0; transition: all 0.25s;
        }
        .bento-card:hover .bento-arrow { background: var(--accent); border-color: var(--accent); color: #fff; transform: rotate(-45deg); }
        .bento-decor { position: absolute; bottom: -40%; right: -20%; width: 70%; height: 70%; border-radius: 50%; pointer-events: none; filter: blur(60px); }
        .bento-code-bg {
          position: absolute; bottom: 14px; right: 14px;
          font-size: 11px; font-family: 'Fira Code', monospace;
          color: rgba(6,182,212,0.22); line-height: 1.7; white-space: pre; pointer-events: none;
          transition: color 0.3s;
        }
        .bento-card:hover .bento-code-bg { color: rgba(6,182,212,0.42); }
        .bento-wave-bg { position: absolute; bottom: 14px; right: 14px; display: flex; align-items: flex-end; gap: 3px; height: 48px; pointer-events: none; }
        .wave-bar { width: 4px; border-radius: 2px; animation: wavePulse 1.2s ease-in-out infinite alternate; }
        @keyframes wavePulse { from{transform:scaleY(0.3);opacity:0.4} to{transform:scaleY(1);opacity:0.9} }
        .bento-avatars { display: flex; margin-top: 4px; }
        .bento-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #06b6d4);
          border: 2px solid #07070a; display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: #fff;
          margin-left: -8px; animation: popIn 0.4s ease both;
        }
        .bento-avatar:first-child { margin-left: 0; }
        .bento-avatar-more { background: rgba(255,255,255,0.1); color: #94a3b8; font-size: 10px; }
        @keyframes popIn { from{transform:scale(0)} to{transform:scale(1)} }
        .bento-tag-sm {
          position: absolute; top: 14px; right: 14px;
          font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 3px 8px; border-radius: 999px; border: 1px solid;
        }
        .bento-ranks { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
        .bento-rank-row { font-size: 11px; color: #475569; animation: slideInR 0.4s ease both; }
        @keyframes slideInR { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:none} }

        /* PROGRESSION */
        .proof-section { position: relative; z-index: 2; padding: 80px 24px; max-width: 1100px; margin: 0 auto; }
        .proof-inner { display: flex; gap: 64px; align-items: flex-start; flex-wrap: wrap; }
        .proof-left { flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 16px; }
        .proof-headline { font-family: 'Syne', sans-serif; font-size: clamp(30px,4vw,50px); font-weight: 800; letter-spacing: -0.03em; color: #fff; line-height: 1.1; margin: 0; }
        .proof-sub { font-size: 15px; color: #64748b; line-height: 1.7; }
        .proof-right { flex: 1; min-width: 280px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .proof-stat-card {
          padding: 20px; border-radius: 18px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; gap: 4px;
          transition: border-color 0.3s, transform 0.3s;
          animation: fadeUp 0.5s ease both;
        }
        .proof-stat-card:hover { border-color: color-mix(in srgb, var(--sc) 40%, transparent); transform: translateY(-3px); }
        .proof-stat-icon { font-size: 22px; margin-bottom: 4px; }
        .proof-stat-l { font-size: 12px; color: #475569; }

        /* STEPS */
        .steps-section { position: relative; z-index: 2; padding: 80px 24px; max-width: 1100px; margin: 0 auto; text-align: center; }
        .steps-grid { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-top: 48px; }
        .step-card {
          flex: 1; min-width: 240px; max-width: 320px; padding: 32px 28px; border-radius: 20px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          text-align: left; position: relative; animation: fadeUp 0.5s ease both;
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
        }
        .step-card:hover {
          border-color: color-mix(in srgb, var(--sc) 40%, transparent);
          transform: translateY(-4px);
          box-shadow: 0 20px 50px color-mix(in srgb, var(--sc) 10%, transparent);
        }
        .step-num {
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 800;
          letter-spacing: 0.08em; border: 1px solid; border-radius: 8px;
          display: inline-block; padding: 3px 10px; margin-bottom: 16px;
        }
        .step-emoji { font-size: 32px; margin-bottom: 12px; }
        .step-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0 0 8px; }
        .step-desc { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0; }

        /* ABOUT / WHO IT'S FOR */
        .about-section { position: relative; z-index: 2; padding: 60px 24px 100px; }
        .about-inner {
          position: relative; max-width: 860px; margin: 0 auto;
          padding: 64px 48px; border-radius: 28px;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%);
          overflow: hidden; display: flex; flex-direction: column;
          align-items: center; gap: 20px; text-align: center;
        }
        @media(max-width:600px){ .about-inner{padding:40px 24px;} }
        .about-glow {
          position: absolute; inset: -2px; border-radius: 30px;
          background: linear-gradient(135deg, #a855f7, #ec4899, #f97316);
          filter: blur(30px); opacity: 0.4; z-index: -1;
        }
        .about-headline {
          font-family: 'Syne', sans-serif; font-size: clamp(28px,5vw,52px); font-weight: 800;
          letter-spacing: -0.03em; color: #fff; line-height: 1.1; margin: 0;
        }
        .about-body {
          display: flex; flex-direction: column; gap: 12px; max-width: 600px;
          font-size: 15px; color: rgba(255,255,255,0.72); line-height: 1.7; text-align: left;
        }
        .about-checks {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          max-width: 580px; width: 100%;
        }
        @media(max-width:600px){ .about-checks{grid-template-columns:1fr;} }
        .about-check {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5;
          background: rgba(0,0,0,0.15); border-radius: 10px; padding: 10px 12px;
          border: 1px solid rgba(255,255,255,0.15); text-align: left;
        }

        /* KEYFRAMES */
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px #4ade80} 50%{box-shadow:0 0 18px #4ade80} }
      `}</style>
    </div>
  );
}