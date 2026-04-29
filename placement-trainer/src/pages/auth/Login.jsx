// placement-trainer/src/pages/auth/Login.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API_BASE from "../../api";
import {
  FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff, FiAlertTriangle,
} from "react-icons/fi";

// ─── Floating orbs on the left panel ─────────────────────────────────────────
const ORBS = [
  { size: 320, top: "-10%", left: "-10%", color: "rgba(168,85,247,0.18)", delay: "0s",  dur: "8s"  },
  { size: 260, bottom: "-8%", right: "-8%", color: "rgba(6,182,212,0.14)",   delay: "1s",  dur: "10s" },
  { size: 180, top: "40%",  left: "30%",   color: "rgba(251,113,133,0.10)", delay: "2s",  dur: "7s"  },
];

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ emoji, value, label }) {
  return (
    <div className="lp-stat">
      <span className="lp-stat-emoji">{emoji}</span>
      <div>
        <p className="lp-stat-value">{value}</p>
        <p className="lp-stat-label">{label}</p>
      </div>
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({ label, icon, right, children, focused, color = "#a855f7" }) {
  return (
    <div className="lp-field">
      <div className="lp-field-header">
        <label className="lp-label">{label}</label>
        {right}
      </div>
      <div className="lp-input-wrap" style={{ "--fc": color, "--focused": focused ? 1 : 0 }}>
        <span className="lp-input-icon" style={{ color: focused ? color : "#6b7280" }}>{icon}</span>
        {children}
        {/* focus glow bar */}
        <div className="lp-focus-bar" style={{ backgroundColor: color, transform: focused ? "scaleX(1)" : "scaleX(0)" }} />
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState("");

  // mouse tilt on card
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 6,
      y: ((e.clientY - r.top)  / r.height - 0.5) * 6,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid credentials");
      login(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message || "Server error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root">
      <style>{STYLES}</style>

      {/* ══ LEFT PANEL ══ */}
      <div className="lp-left">
        {/* mesh blobs */}
        {ORBS.map((o, i) => (
          <div key={i} className="lp-orb" style={{
            width: o.size, height: o.size,
            top: o.top, left: o.left, bottom: o.bottom, right: o.right,
            background: o.color,
            animationDelay: o.delay, animationDuration: o.dur,
          }} />
        ))}
        <div className="lp-grid-overlay" />

        <div className="lp-left-inner">
          {/* brand */}
          <div className="lp-brand">
            <div className="lp-brand-dot" />
            <span className="lp-brand-name">Placify</span>
          </div>

          {/* headline */}
          <div className="lp-headline-block">
            <h1 className="lp-headline">
              Land your<br />
              <span className="lp-headline-accent">dream job.</span>
            </h1>
            <p className="lp-headline-sub">
              The AI-powered placement training platform built for students who mean business.
            </p>
          </div>

          
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="lp-right">
        <div
          ref={cardRef}
          className="lp-card"
          style={{ transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)` }}
          onMouseMove={onMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
          {/* card shine */}
          <div className="lp-card-shine" />

          {/* header */}
          <div className="lp-card-header">
            <h2 className="lp-card-title">Welcome back</h2>
            <p className="lp-card-sub">Sign in to continue your journey</p>
          </div>

          {/* error */}
          {error && (
            <div className="lp-error">
              <FiAlertTriangle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="lp-form">
            {/* email */}
            <Field
              label="Email Address"
              icon={<FiMail size={16} />}
              focused={focused === "email"}
              color="#06b6d4"
            >
              <input
                type="email"
                className="lp-input"
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused("")}
                required
              />
            </Field>

            {/* password */}
            <Field
              label="Password"
              icon={<FiLock size={16} />}
              focused={focused === "password"}
              color="#a855f7"
              right={
                <Link to="/forgot-password" className="lp-forgot">Forgot password?</Link>
              }
            >
              <input
                type={showPw ? "text" : "password"}
                className="lp-input lp-input-pr"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                required
              />
              <button type="button" className="lp-pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </Field>

            {/* submit */}
            <button type="submit" disabled={loading} className="lp-submit">
              <span className="lp-submit-shimmer" />
              {loading
                ? <><span className="lp-spinner" /> Signing in…</>
                : <>Sign in <FiArrowRight size={16} /></>}
            </button>
          </form>

          {/* footer */}
          <p className="lp-footer-text">
            New to Placify?{" "}
            <Link to="/register" className="lp-footer-link">Create an account →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── All styles ───────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .lp-root {
    min-height: 100vh;
    display: flex;
    font-family: 'DM Sans', sans-serif;
    background: #07070a;
    color: #e2e8f0;
    overflow: hidden;
  }

  /* ── LEFT PANEL ── */
  .lp-left {
    display: none;
    position: relative;
    overflow: hidden;
    background: #07070a;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  @media (min-width: 900px) { .lp-left { display: flex; flex: 1; } }

  .lp-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    animation: orbPulse ease-in-out infinite alternate;
    pointer-events: none;
  }
  @keyframes orbPulse {
    from { opacity: 0.6; transform: scale(1); }
    to   { opacity: 1;   transform: scale(1.08); }
  }

  .lp-grid-overlay {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
    background-size: 52px 52px;
    pointer-events: none;
  }

  .lp-left-inner {
    position: relative; z-index: 2;
    display: flex; flex-direction: column;
    justify-content: space-between;
    padding: 48px 56px;
    width: 100%;
  }

  .lp-brand {
    display: flex; align-items: center; gap: 10px;
  }
  .lp-brand-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #a855f7;
    box-shadow: 0 0 12px #a855f7;
    animation: orbPulse 2s ease-in-out infinite alternate;
  }
  .lp-brand-name {
    font-family: 'Syne', sans-serif;
    font-size: 20px; font-weight: 800;
    color: #fff; letter-spacing: -0.02em;
  }

  .lp-headline-block { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; }

  .lp-headline {
    font-family: 'Syne', sans-serif;
    font-size: clamp(44px, 5vw, 72px);
    font-weight: 800;
    line-height: 1.0;
    letter-spacing: -0.04em;
    color: #fff;
    margin: 0;
  }
  .lp-headline-accent {
    background: linear-gradient(135deg, #a855f7 0%, #ec4899 60%, #f97316 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .lp-headline-sub {
    font-size: 16px; color: #64748b; font-weight: 300;
    line-height: 1.7; max-width: 340px; margin: 0;
  }

  .lp-stats {
    display: flex; flex-direction: column; gap: 12px;
  }
  .lp-stat {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
    border-radius: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
  }
  .lp-stat-emoji { font-size: 22px; }
  .lp-stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 18px; font-weight: 800; color: #fff;
    letter-spacing: -0.02em; line-height: 1;
  }
  .lp-stat-label { font-size: 11px; color: #475569; margin-top: 2px; }

  .lp-testimonial {
    display: flex; align-items: center; gap: 12px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .lp-testimonial-avatars { display: flex; }
  .lp-t-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, #a855f7, #06b6d4);
    border: 2px solid #07070a;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700; color: #fff;
  }
  .lp-testimonial-text { font-size: 13px; color: #64748b; }
  .lp-testimonial-text strong { color: #94a3b8; }

  /* ── RIGHT PANEL ── */
  .lp-right {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 24px;
    background: #07070a;
    position: relative;
  }
  .lp-right::before {
    content: '';
    position: absolute;
    top: 30%; left: 50%;
    transform: translate(-50%, -50%);
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .lp-card {
    width: 100%; max-width: 420px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 40px 36px;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease;
  }
  @media (max-width: 500px) { .lp-card { padding: 32px 24px; } }

  .lp-card-shine {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%);
    pointer-events: none; border-radius: inherit;
  }

  .lp-card-header { margin-bottom: 28px; }
  .lp-card-title {
    font-family: 'Syne', sans-serif;
    font-size: 28px; font-weight: 800;
    color: #fff; letter-spacing: -0.03em;
    line-height: 1.1; margin: 0 0 6px;
  }
  .lp-card-sub { font-size: 14px; color: #64748b; margin: 0; }

  /* error */
  .lp-error {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; margin-bottom: 20px;
    border-radius: 12px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    color: #f87171; font-size: 13px; font-weight: 500;
  }

  /* form */
  .lp-form { display: flex; flex-direction: column; gap: 18px; }

  .lp-field { display: flex; flex-direction: column; gap: 6px; }
  .lp-field-header { display: flex; align-items: center; justify-content: space-between; }
  .lp-label {
    font-size: 11px; font-weight: 600;
    color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .lp-forgot {
    font-size: 11px; font-weight: 600; color: #a855f7;
    text-decoration: none; letter-spacing: 0.02em;
    transition: color 0.2s;
  }
  .lp-forgot:hover { color: #c084fc; }

  .lp-input-wrap {
    position: relative;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    overflow: hidden;
    transition: border-color 0.25s;
  }
  .lp-input-wrap:focus-within {
    border-color: rgba(255,255,255,0.18);
  }

  .lp-input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    pointer-events: none; transition: color 0.25s;
  }

  .lp-input {
    width: 100%;
    background: transparent;
    border: none; outline: none;
    color: #f1f5f9;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    padding: 14px 14px 14px 42px;
  }
  .lp-input::placeholder { color: #374151; }
  .lp-input-pr { padding-right: 42px; }

  .lp-focus-bar {
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 2px;
    transform-origin: left;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }

  .lp-pw-toggle {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: #6b7280; transition: color 0.2s;
    display: flex; align-items: center;
  }
  .lp-pw-toggle:hover { color: #94a3b8; }

  /* submit */
  .lp-submit {
    position: relative;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 15px 24px;
    border-radius: 14px;
    background: linear-gradient(135deg, #a855f7, #ec4899);
    border: none; cursor: pointer;
    color: #fff; font-size: 15px; font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: -0.01em;
    overflow: hidden;
    transition: all 0.25s ease;
    box-shadow: 0 0 30px rgba(168,85,247,0.3);
    margin-top: 6px;
  }
  .lp-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0 50px rgba(168,85,247,0.5);
  }
  .lp-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .lp-submit-shimmer {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }
  .lp-submit:hover .lp-submit-shimmer { transform: translateX(100%); }

  .lp-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .lp-footer-text {
    margin-top: 24px; text-align: center;
    font-size: 13px; color: #6b7280;
  }
  .lp-footer-link {
    color: #a855f7; font-weight: 600;
    text-decoration: none; transition: color 0.2s;
  }
  .lp-footer-link:hover { color: #c084fc; }
`;