import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiZap, FiCode, FiMic, FiUsers, FiAward, FiTarget } from "react-icons/fi";

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

function Counter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = target / 50;
        const id = setInterval(() => {
          start += step;
          if (start >= target) { setVal(target); clearInterval(id); }
          else setVal(Math.floor(start));
        }, 30);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

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

function FloatBadge({ emoji, label, style }) {
  return (
    <div className="float-badge" style={style}>
      <span>{emoji}</span>
      <span className="float-badge-label">{label}</span>
    </div>
  );
}

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
      style={{ "--accent": accent, transform: `perspective(800px) rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)` }}
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="bento-shine" />
      {children}
    </Link>
  );
}

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

export default function Home() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const marqueeItems = ["Aptitude Arena", "Code Dojo", "AI Interviews", "Live GD Rooms", "Resume Analyzer", "Leaderboard", "Skill Radar", "Mock Placements"];

  return (
    <div className="home-root">
      <CursorGlow />
      <Noise />

      <div className="mesh-bg" aria-hidden>
        <div className="mesh-blob mesh-blob-1" style={{ transform: `translate(${mouse.x * 40 - 20}px, ${mouse.y * 40 - 20}px)` }} />
        <div className="mesh-blob mesh-blob-2" style={{ transform: `translate(${-mouse.x * 30 + 15}px, ${mouse.y * 50 - 25}px)` }} />
        <div className="mesh-blob mesh-blob-3" style={{ transform: `translate(${mouse.x * 20 - 10}px, ${-mouse.y * 30 + 15}px)` }} />
        <div className="mesh-grid" />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="hero-section">
        <FloatBadge emoji="🔥" label="12k+ users"   style={{ top: "18%", left: "8%",  animationDelay: "0s"   }} />
        <FloatBadge emoji="⚡" label="AI-powered"   style={{ top: "25%", right: "9%", animationDelay: "0.6s" }} />
        <FloatBadge emoji="🏆" label="#1 ranked"    style={{ bottom: "22%", left: "11%", animationDelay: "1.2s" }} />

        <div className="hero-pill">
          <span className="hero-pill-dot" />
          Placify is live — start your grind
        </div>

        <h1 className="hero-headline">
          <span className="hero-line-1">Your placement</span>
          <span className="hero-line-2">
            era starts <span className="hero-accent"><Typewriter words={["now.", "today.", "here."]} /></span>
          </span>
        </h1>

        <p className="hero-sub">
          The only platform built for placement domination —{" "}
          aptitude, code, AI interviews & live GDs. No cap.
        </p>

        <div className="hero-ctas">
          <Link to="/register" className="cta-primary">Get started free <FiArrowRight /></Link>
          <Link to="/leaderboard" className="cta-ghost">View leaderboard 🏆</Link>
        </div>

        <div className="hero-stats">
          {[
            { n: 12000, suf: "+", label: "Students" },
            { n: 500,   suf: "+", label: "Problems" },
            { n: 95,    suf: "%", label: "Pass Rate" },
          ].map(({ n, suf, label }, i) => (
            <div key={i} className="hero-stat">
              <span className="hero-stat-n"><Counter target={n} suffix={suf} /></span>
              <span className="hero-stat-l">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <Marquee items={marqueeItems} />

      {/* ═══ BENTO ═══ */}
      <section className="bento-section">
        <div className="section-label">What we offer</div>
        <h2 className="section-headline">Everything you need.<br /><span className="section-accent">Zero fluff.</span></h2>

        <div className="bento-grid">
          <BentoCard to="/aptitude" className="bento-lg" accent="#a855f7">
            <div className="bento-tag">Most popular</div>
            <div className="bento-icon-wrap" style={{ background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)" }}>
              <FiTarget style={{ color:"#a855f7" }} size={26} />
            </div>
            <h3 className="bento-title">Aptitude Arena</h3>
            <p className="bento-desc">Quant, Logical & Verbal with adaptive AI tests. Level up your reasoning, no cap.</p>
            <div className="bento-footer">
              <div className="bento-pills">
                <span className="bento-pill">Quantitative</span>
                <span className="bento-pill">Logical</span>
                <span className="bento-pill">Verbal</span>
              </div>
              <div className="bento-arrow"><FiArrowRight /></div>
            </div>
            <div className="bento-decor" style={{ background:"radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)" }} />
          </BentoCard>

          <BentoCard to="/technical" className="bento-sm" accent="#06b6d4">
            <div className="bento-icon-wrap" style={{ background:"rgba(6,182,212,0.15)", border:"1px solid rgba(6,182,212,0.3)" }}>
              <FiCode style={{ color:"#06b6d4" }} size={22} />
            </div>
            <h3 className="bento-title">Code Dojo</h3>
            <p className="bento-desc">DSA problems, live executor. Easy → Hard.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-code-bg">{`fn solve(n: i32) {\n  (0..n).fold(0,\n  |a,b| a+b)\n}`}</div>
          </BentoCard>

          <BentoCard to="/interview" className="bento-sm" accent="#fb7185">
            <div className="bento-icon-wrap" style={{ background:"rgba(251,113,133,0.15)", border:"1px solid rgba(251,113,133,0.3)" }}>
              <FiMic style={{ color:"#fb7185" }} size={22} />
            </div>
            <h3 className="bento-title">AI Interviews</h3>
            <p className="bento-desc">Gemini-powered mock HR & technical rounds. Real feedback.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-wave-bg">
              {[8,14,20,12,18,22,10,16,24,11].map((h, i) => (
                <div key={i} className="wave-bar" style={{ height: h * 2, animationDelay:`${i*0.12}s`, background:"rgba(251,113,133,0.5)" }} />
              ))}
            </div>
          </BentoCard>

          <BentoCard to="/gd" className="bento-sm" accent="#4ade80">
            <div className="bento-icon-wrap" style={{ background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.3)" }}>
              <FiUsers style={{ color:"#4ade80" }} size={22} />
            </div>
            <h3 className="bento-title">Live GD Rooms</h3>
            <p className="bento-desc">Join peers for real group discussions with AI feedback.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-avatars">
              {["KP","AR","SM","NY"].map((a, i) => (
                <div key={i} className="bento-avatar" style={{ animationDelay:`${i*0.2}s` }}>{a}</div>
              ))}
              <div className="bento-avatar bento-avatar-more">+8</div>
            </div>
          </BentoCard>

          <BentoCard to="/resume-analyzer" className="bento-sm" accent="#facc15">
            <div className="bento-icon-wrap" style={{ background:"rgba(250,204,21,0.15)", border:"1px solid rgba(250,204,21,0.3)" }}>
              <FiZap style={{ color:"#facc15" }} size={22} />
            </div>
            <h3 className="bento-title">Resume Analyzer</h3>
            <p className="bento-desc">ATS score, AI feedback. Beat the robots.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-score-bar">
              <div className="bento-score-track">
                <div className="bento-score-fill" style={{ width:"82%", background:"#facc15" }} />
              </div>
              <span className="bento-score-label" style={{ color:"#facc15" }}>82% match</span>
            </div>
          </BentoCard>

          <BentoCard to="/leaderboard" className="bento-sm" accent="#fb923c">
            <div className="bento-icon-wrap" style={{ background:"rgba(251,146,60,0.15)", border:"1px solid rgba(251,146,60,0.3)" }}>
              <FiAward style={{ color:"#fb923c" }} size={22} />
            </div>
            <h3 className="bento-title">Leaderboard</h3>
            <p className="bento-desc">Compete globally. Top 5% gets bragging rights fr.</p>
            <div className="bento-footer"><div className="bento-arrow"><FiArrowRight /></div></div>
            <div className="bento-ranks">
              {["🥇 AK • 9842","🥈 SM • 8711","🥉 NY • 7630"].map((r, i) => (
                <div key={i} className="bento-rank-row" style={{ animationDelay:`${i*0.15}s` }}>{r}</div>
              ))}
            </div>
          </BentoCard>
        </div>
      </section>

      {/* ═══ PROOF ═══ */}
      <section className="proof-section">
        <div className="proof-inner">
          <div className="proof-left">
            <div className="section-label">The numbers</div>
            <h2 className="proof-headline">Built different.<br /><span className="section-accent">Results too.</span></h2>
            <p className="proof-sub">Join thousands of students who went from struggling to placed. The algorithm doesn't lie.</p>
            <Link to="/register" className="cta-primary" style={{ alignSelf:"flex-start", marginTop:16 }}>
              Join for free <FiArrowRight />
            </Link>
          </div>
          <div className="proof-right">
            {[
              { n:12000, suf:"+", label:"Active students", icon:"👥", color:"#a855f7" },
              { n:95,    suf:"%", label:"Placement rate",  icon:"🎯", color:"#4ade80" },
              { n:500,   suf:"+", label:"Curated problems",icon:"💡", color:"#06b6d4" },
              { n:50,    suf:"+", label:"Companies hiring", icon:"🏢", color:"#facc15" },
            ].map(({ n, suf, label, icon, color }, i) => (
              <div key={i} className="proof-stat-card" style={{ animationDelay:`${i*0.1}s`, "--sc":color }}>
                <span className="proof-stat-icon">{icon}</span>
                <span className="proof-stat-n" style={{ color }}><Counter target={n} suffix={suf} /></span>
                <span className="proof-stat-l">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STEPS ═══ */}
      <section className="steps-section">
        <div className="section-label">How it works</div>
        <h2 className="section-headline">Three steps.<br /><span className="section-accent">Infinite W's.</span></h2>
        <div className="steps-grid">
          {[
            { num:"01", emoji:"🧠", title:"Practice daily",    desc:"Unlock modules, solve problems, grind aptitude & coding tests every single day.",             color:"#a855f7" },
            { num:"02", emoji:"🤖", title:"Get AI feedback",   desc:"Real-time analysis on your code, resume, and interview performance. No sugar-coating.",       color:"#06b6d4" },
            { num:"03", emoji:"🚀", title:"Get placed",        desc:"Land your dream role with proven skills and a leaderboard rank that speaks for itself.",       color:"#4ade80" },
          ].map(({ num, emoji, title, desc, color }, i) => (
            <div key={i} className="step-card" style={{ "--sc":color, animationDelay:`${i*0.15}s` }}>
              <div className="step-num" style={{ color, borderColor:color+"44" }}>{num}</div>
              <div className="step-emoji">{emoji}</div>
              <h3 className="step-title">{title}</h3>
              <p className="step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section className="cta-banner-section">
        <div className="cta-banner-inner">
          <div className="cta-banner-glow" />
          <div className="section-label" style={{ color:"#fff", borderColor:"rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.12)" }}>
            Don't sleep on this
          </div>
          <h2 className="cta-banner-headline">
            Your next offer<br />
            <span style={{ fontStyle:"italic", opacity:0.85 }}>is one grind away.</span>
          </h2>
          <p className="cta-banner-sub">Free to start. No credit card. Just results.</p>
          <div className="hero-ctas" style={{ justifyContent:"center" }}>
            <Link to="/register" className="cta-primary cta-primary-white">Start grinding now <FiArrowRight /></Link>
            <Link to="/login"    className="cta-ghost cta-ghost-white">Already have an account →</Link>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .home-root {
          min-height: 100vh;
          background: #07070a;
          color: #e2e8f0;
          font-family: 'DM Sans', 'Outfit', sans-serif;
          overflow-x: hidden;
          position: relative;
        }
        .cursor-glow {
          position: fixed;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
          transform: translate(-50%,-50%);
          transition: left 0.12s ease-out, top 0.12s ease-out;
        }
        .noise-overlay {
          position: fixed; inset: 0;
          width: 100%; height: 100%;
          pointer-events: none; z-index: 1;
        }
        .mesh-bg {
          position: fixed; inset: 0;
          pointer-events: none; z-index: 0; overflow: hidden;
        }
        .mesh-blob {
          position: absolute; border-radius: 50%;
          filter: blur(100px);
          transition: transform 0.4s ease-out;
        }
        .mesh-blob-1 {
          width: 60vw; height: 60vw; top: -20%; left: -10%;
          background: radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%);
        }
        .mesh-blob-2 {
          width: 50vw; height: 50vw; bottom: -15%; right: -10%;
          background: radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%);
        }
        .mesh-blob-3 {
          width: 40vw; height: 40vw; top: 40%; left: 40%;
          background: radial-gradient(circle, rgba(251,113,133,0.09) 0%, transparent 70%);
        }
        .mesh-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* HERO */
        .hero-section {
          position: relative; z-index: 2;
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          padding: 80px 24px 40px; gap: 20px;
        }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 12px; font-weight: 500; letter-spacing:0.04em;
          color: #94a3b8; backdrop-filter: blur(12px);
          animation: fadeUp 0.6s ease both;
        }
        .hero-pill-dot {
          width:8px; height:8px; border-radius:50%;
          background:#4ade80; box-shadow:0 0 8px #4ade80;
          animation: glowPulse 2s infinite;
        }
        .hero-headline {
          display: flex; flex-direction: column;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(44px,8vw,96px);
          line-height: 1.0; letter-spacing: -0.03em;
          color: #fff;
          animation: fadeUp 0.7s 0.1s ease both;
        }
        .hero-line-1 { color: rgba(255,255,255,0.45); font-size:0.55em; font-weight:700; }
        .hero-accent {
          background: linear-gradient(135deg,#a855f7 0%,#ec4899 50%,#f97316 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .typewriter-cursor {
          display:inline-block; animation: blink 0.8s infinite;
          color:#a855f7; font-weight:300; margin-left:2px;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .hero-sub {
          font-size: clamp(15px,2vw,19px); color:#64748b;
          font-weight:300; line-height:1.7; max-width:540px;
          animation: fadeUp 0.7s 0.2s ease both;
        }
        .hero-ctas {
          display:flex; flex-wrap:wrap; gap:12px;
          justify-content:center;
          animation: fadeUp 0.7s 0.3s ease both;
        }
        .cta-primary {
          display:inline-flex; align-items:center; gap:8px;
          padding: 14px 28px; border-radius:14px;
          background: linear-gradient(135deg,#a855f7,#ec4899);
          color:#fff; font-weight:700; font-size:15px;
          letter-spacing:-0.01em; text-decoration:none;
          transition: all 0.25s ease;
          box-shadow: 0 0 30px rgba(168,85,247,0.35);
          border:none; cursor:pointer;
        }
        .cta-primary:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 0 50px rgba(168,85,247,0.55); }
        .cta-primary-white { background:#fff; color:#09090b; box-shadow:0 0 30px rgba(255,255,255,0.2); }
        .cta-primary-white:hover { box-shadow:0 0 50px rgba(255,255,255,0.35); }
        .cta-ghost {
          display:inline-flex; align-items:center; gap:8px;
          padding:14px 28px; border-radius:14px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1);
          color:#94a3b8; font-weight:600; font-size:15px;
          text-decoration:none; transition:all 0.25s ease;
          backdrop-filter:blur(8px);
        }
        .cta-ghost:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.2); color:#fff; transform:translateY(-2px); }
        .cta-ghost-white { border-color:rgba(255,255,255,0.25); color:rgba(255,255,255,0.7); }
        .cta-ghost-white:hover { color:#fff; border-color:rgba(255,255,255,0.5); background:rgba(255,255,255,0.1); }
        .hero-stats {
          display:flex; gap:32px; margin-top:8px;
          animation: fadeUp 0.7s 0.4s ease both;
        }
        .hero-stat { display:flex; flex-direction:column; align-items:center; }
        .hero-stat-n { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; color:#fff; letter-spacing:-0.02em; }
        .hero-stat-l { font-size:11px; color:#475569; text-transform:uppercase; letter-spacing:0.08em; }
        .float-badge {
          position:absolute; display:flex; align-items:center; gap:8px;
          padding:8px 14px; border-radius:999px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          backdrop-filter:blur(12px); font-size:14px; font-weight:500; color:#cbd5e1;
          animation: floatBadge 4s ease-in-out infinite; z-index:3;
        }
        @media(max-width:768px){.float-badge{display:none;}}
        .float-badge-label { color:#94a3b8; font-size:12px; }
        @keyframes floatBadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }

        /* MARQUEE */
        .marquee-wrap {
          position:relative; z-index:2; overflow:hidden;
          border-top:1px solid rgba(255,255,255,0.05);
          border-bottom:1px solid rgba(255,255,255,0.05);
          background:rgba(255,255,255,0.02); padding:14px 0;
        }
        .marquee-track {
          display:flex; white-space:nowrap;
          animation:marqueeScroll 25s linear infinite;
        }
        .marquee-item {
          display:inline-flex; align-items:center; gap:10px;
          font-size:12px; font-weight:500; color:#475569;
          padding:0 28px; letter-spacing:0.06em; text-transform:uppercase;
        }
        .marquee-dot { color:#a855f7; font-size:9px; }
        @keyframes marqueeScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        /* BENTO */
        .bento-section {
          position:relative; z-index:2;
          padding:80px 24px; max-width:1100px; margin:0 auto;
        }
        .section-label {
          display:inline-flex; align-items:center;
          font-size:11px; font-weight:600; letter-spacing:0.1em;
          text-transform:uppercase; color:#a855f7;
          border:1px solid rgba(168,85,247,0.3);
          background:rgba(168,85,247,0.08);
          padding:4px 12px; border-radius:999px; margin-bottom:20px;
        }
        .section-headline {
          font-family:'Syne',sans-serif;
          font-size:clamp(32px,5vw,58px); font-weight:800;
          letter-spacing:-0.03em; color:#fff; line-height:1.1; margin-bottom:48px;
        }
        .section-accent {
          background:linear-gradient(135deg,#a855f7,#ec4899);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .bento-grid {
          display:grid; grid-template-columns:repeat(3,1fr);
          grid-template-rows:auto auto; gap:14px;
        }
        @media(max-width:900px){.bento-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:600px){.bento-grid{grid-template-columns:1fr;}}
        .bento-card {
          position:relative; display:flex; flex-direction:column; gap:12px;
          padding:24px; border-radius:20px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          text-decoration:none; overflow:hidden;
          transition:transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          cursor:pointer; transform-style:preserve-3d;
        }
        .bento-card:hover {
          border-color:rgba(255,255,255,0.14);
          box-shadow:0 20px 60px rgba(0,0,0,0.4);
        }
        .bento-lg { grid-column:span 2; grid-row:span 2; min-height:340px; }
        @media(max-width:900px){.bento-lg{grid-column:span 2;grid-row:span 1;}}
        @media(max-width:600px){.bento-lg{grid-column:span 1;}}
        .bento-sm { min-height:160px; }
        .bento-shine {
          position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 50%);
          pointer-events:none; border-radius:inherit;
        }
        .bento-tag {
          position:absolute; top:16px; right:16px;
          font-size:10px; font-weight:700; letter-spacing:0.08em;
          text-transform:uppercase; padding:4px 10px; border-radius:999px;
          background:rgba(168,85,247,0.2); border:1px solid rgba(168,85,247,0.4); color:#c084fc;
        }
        .bento-icon-wrap {
          width:44px; height:44px; border-radius:12px;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .bento-title {
          font-family:'Syne',sans-serif; font-size:22px;
          font-weight:800; color:#fff; letter-spacing:-0.02em; margin:0;
        }
        .bento-sm .bento-title { font-size:17px; }
        .bento-desc { font-size:14px; color:#64748b; line-height:1.6; flex:1; margin:0; }
        .bento-footer { display:flex; align-items:center; justify-content:space-between; margin-top:auto; }
        .bento-pills { display:flex; flex-wrap:wrap; gap:6px; }
        .bento-pill {
          font-size:11px; padding:4px 10px; border-radius:999px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:#94a3b8;
        }
        .bento-arrow {
          width:36px; height:36px; border-radius:10px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          display:flex; align-items:center; justify-content:center;
          color:#94a3b8; flex-shrink:0; transition:all 0.25s;
        }
        .bento-card:hover .bento-arrow {
          background:var(--accent); border-color:var(--accent); color:#fff; transform:rotate(-45deg);
        }
        .bento-decor {
          position:absolute; bottom:-40%; right:-20%;
          width:70%; height:70%; border-radius:50%;
          pointer-events:none; filter:blur(60px);
        }
        .bento-code-bg {
          position:absolute; bottom:12px; right:14px;
          font-size:11px; font-family:'Fira Code',monospace;
          color:rgba(6,182,212,0.22); line-height:1.7; white-space:pre; pointer-events:none;
          transition:color 0.3s;
        }
        .bento-card:hover .bento-code-bg { color:rgba(6,182,212,0.42); }
        .bento-wave-bg {
          position:absolute; bottom:14px; right:14px;
          display:flex; align-items:flex-end; gap:3px; height:48px; pointer-events:none;
        }
        .wave-bar {
          width:4px; border-radius:2px;
          animation:wavePulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes wavePulse { from{transform:scaleY(0.3);opacity:0.4} to{transform:scaleY(1);opacity:0.9} }
        .bento-avatars { display:flex; margin-top:4px; }
        .bento-avatar {
          width:28px; height:28px; border-radius:50%;
          background:linear-gradient(135deg,#a855f7,#06b6d4);
          border:2px solid #07070a; display:flex; align-items:center;
          justify-content:center; font-size:9px; font-weight:700; color:#fff;
          margin-left:-8px; animation:popIn 0.4s ease both;
        }
        .bento-avatar:first-child { margin-left:0; }
        .bento-avatar-more { background:rgba(255,255,255,0.1); color:#94a3b8; font-size:8px; }
        @keyframes popIn { from{transform:scale(0)} to{transform:scale(1)} }
        .bento-score-bar { margin-top:auto; }
        .bento-score-track { width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden; margin-bottom:6px; }
        .bento-score-fill { height:100%; border-radius:999px; box-shadow:0 0 8px currentColor; }
        .bento-score-label { font-size:12px; font-weight:700; }
        .bento-ranks { display:flex; flex-direction:column; gap:4px; margin-top:4px; }
        .bento-rank-row { font-size:11px; color:#475569; animation:slideInR 0.4s ease both; }
        @keyframes slideInR { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:none} }

        /* PROOF */
        .proof-section { position:relative; z-index:2; padding:80px 24px; max-width:1100px; margin:0 auto; }
        .proof-inner { display:flex; gap:64px; align-items:flex-start; flex-wrap:wrap; }
        .proof-left { flex:1; min-width:280px; display:flex; flex-direction:column; gap:16px; }
        .proof-headline { font-family:'Syne',sans-serif; font-size:clamp(30px,4vw,50px); font-weight:800; letter-spacing:-0.03em; color:#fff; line-height:1.1; margin:0; }
        .proof-sub { font-size:15px; color:#64748b; line-height:1.7; }
        .proof-right { flex:1; min-width:280px; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .proof-stat-card {
          padding:22px; border-radius:18px;
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          display:flex; flex-direction:column; gap:4px;
          transition:border-color 0.3s,transform 0.3s;
          animation:fadeUp 0.5s ease both;
        }
        .proof-stat-card:hover { border-color:color-mix(in srgb,var(--sc) 40%,transparent); transform:translateY(-3px); }
        .proof-stat-icon { font-size:22px; margin-bottom:4px; }
        .proof-stat-n { font-family:'Syne',sans-serif; font-size:34px; font-weight:800; letter-spacing:-0.03em; }
        .proof-stat-l { font-size:13px; color:#475569; }

        /* STEPS */
        .steps-section { position:relative; z-index:2; padding:80px 24px; max-width:1100px; margin:0 auto; text-align:center; }
        .steps-grid { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; margin-top:48px; }
        .step-card {
          flex:1; min-width:240px; max-width:320px;
          padding:32px 28px; border-radius:20px;
          background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);
          text-align:left; position:relative;
          animation:fadeUp 0.5s ease both;
          transition:border-color 0.3s,transform 0.3s,box-shadow 0.3s;
        }
        .step-card:hover {
          border-color:color-mix(in srgb,var(--sc) 40%,transparent);
          transform:translateY(-4px);
          box-shadow:0 20px 50px color-mix(in srgb,var(--sc) 10%,transparent);
        }
        .step-num {
          font-family:'Syne',sans-serif; font-size:12px; font-weight:800;
          letter-spacing:0.08em; border:1px solid; border-radius:8px;
          display:inline-block; padding:3px 10px; margin-bottom:16px;
        }
        .step-emoji { font-size:32px; margin-bottom:12px; }
        .step-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#fff; letter-spacing:-0.02em; margin:0 0 8px; }
        .step-desc { font-size:14px; color:#64748b; line-height:1.6; margin:0; }

        /* CTA BANNER */
        .cta-banner-section { position:relative; z-index:2; padding:80px 24px; }
        .cta-banner-inner {
          position:relative; max-width:860px; margin:0 auto;
          padding:64px 48px; border-radius:28px;
          background:linear-gradient(135deg,#a855f7 0%,#ec4899 50%,#f97316 100%);
          text-align:center; overflow:hidden;
          display:flex; flex-direction:column; align-items:center; gap:20px;
        }
        .cta-banner-glow {
          position:absolute; inset:-2px; border-radius:30px;
          background:linear-gradient(135deg,#a855f7,#ec4899,#f97316);
          filter:blur(30px); opacity:0.4; z-index:-1;
        }
        .cta-banner-headline {
          font-family:'Syne',sans-serif;
          font-size:clamp(32px,6vw,62px); font-weight:800;
          letter-spacing:-0.03em; color:#fff; line-height:1.1; margin:0;
        }
        .cta-banner-sub { font-size:16px; color:rgba(255,255,255,0.7); margin:0; }

        /* KEYFRAMES */
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px #4ade80} 50%{box-shadow:0 0 18px #4ade80} }
      `}</style>
    </div>
  );
}