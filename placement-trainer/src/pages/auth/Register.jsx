// placement-trainer/src/pages/auth/Register.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE from "../../api";
import {
  FiUser, FiMail, FiLock, FiBook, FiBriefcase,
  FiArrowRight, FiEye, FiEyeOff, FiAlertTriangle,
  FiCheckCircle, FiShield, FiArrowLeft,
} from "react-icons/fi";

// ─── Shared field component ───────────────────────────────────────────────────
function Field({ label, icon, right, focused, color = "#a855f7", children }) {
  return (
    <div className="rp-field">
      {(label || right) && (
        <div className="rp-field-header">
          {label && <label className="rp-label">{label}</label>}
          {right}
        </div>
      )}
      <div className="rp-input-wrap" style={{ "--fc": color }}>
        <span className="rp-input-icon" style={{ color: focused ? color : "#6b7280" }}>{icon}</span>
        {children}
        <div className="rp-focus-bar" style={{ backgroundColor: color, transform: focused ? "scaleX(1)" : "scaleX(0)" }} />
      </div>
    </div>
  );
}

// ─── OTP digit boxes ──────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const refs = Array.from({ length: 6 }, () => useRef(null));
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      const next = value.slice(0, Math.max(0, value.length - 1));
      onChange(next);
      if (i > 0) refs[i - 1].current?.focus();
      return;
    }
    if (/^\d$/.test(e.key)) {
      const next = (value + e.key).slice(0, 6);
      onChange(next);
      if (i < 5) refs[i + 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  };

  return (
    <div className="rp-otp-row">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          className={`rp-otp-box ${digits[i] ? "rp-otp-filled" : ""}`}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={() => refs[i].current?.select()}
        />
      ))}
    </div>
  );
}

// ─── Left panel features list ─────────────────────────────────────────────────
const FEATURES = [
  { icon: "🧠", label: "AI-powered aptitude tests" },
  { icon: "💻", label: "Live coding arena with executor" },
  { icon: "🎙️", label: "Mock AI interviews & GD rooms" },
  { icon: "📄", label: "ATS resume analyzer" },
  { icon: "🏆", label: "Global leaderboard & rankings" },
];

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fname: "", lname: "", email: "", year: "", field: "", password: "",
  });
  const [confirmPw, setConfirmPw] = useState("");
  const [otp, setOtp]             = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [showCPw, setShowCPw]     = useState(false);
  const [focused, setFocused]     = useState("");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

  // card tilt
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 5, y: ((e.clientY - r.top) / r.height - 0.5) * 5 });
  };

  const change = (e) => setFormData(f => ({ ...f, [e.target.name]: e.target.value }));

  // ── Step 1: send OTP ──
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== confirmPw) return setError("Passwords do not match.");
    if (formData.password.length < 8)   return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/send-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to send OTP."); }
      setStep(2);
    } catch (err) {
      setError(err.message || "Server error. Could not send OTP.");
    } finally { setLoading(false); }
  };

  // ── Step 2: verify & register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return setError("Please enter the 6-digit code.");
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, year: parseInt(formData.year) || 0, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid OTP. Try again.");
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Server error");
    } finally { setLoading(false); }
  };

  // password strength
  const pwStrength = (() => {
    const p = formData.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const pwColors = ["#ef4444","#f97316","#eab308","#22c55e"];
  const pwLabels = ["Weak","Fair","Good","Strong"];

  return (
    <div className="rp-root">
      <style>{STYLES}</style>

      {/* ══ LEFT PANEL ══ */}
      <div className="rp-left">
        <div className="rp-orb rp-orb-1" />
        <div className="rp-orb rp-orb-2" />
        <div className="rp-grid" />

        <div className="rp-left-inner">
          {/* brand */}
          <div className="rp-brand">
            <div className="rp-brand-dot" />
            <span className="rp-brand-name">Placify</span>
          </div>

          <div className="rp-headline-block">
            <p className="rp-eyebrow">Everything you need</p>
            <h1 className="rp-headline">
              One platform.<br />
              <span className="rp-accent">Infinite W's.</span>
            </h1>
          </div>

          {/* feature list */}
          <div className="rp-features">
            {FEATURES.map(({ icon, label }, i) => (
              <div key={i} className="rp-feature" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="rp-feature-icon">{icon}</span>
                <span className="rp-feature-label">{label}</span>
              </div>
            ))}
          </div>

          <p className="rp-fine-print">
            Free to start · No credit card required
          </p>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="rp-right">
        <div
          ref={cardRef}
          className="rp-card"
          style={{ transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg)` }}
          onMouseMove={onMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
          <div className="rp-card-shine" />

          {/* ── success state ── */}
          {success ? (
            <div className="rp-success-state">
              <div className="rp-success-icon">
                <FiCheckCircle size={36} />
              </div>
              <h2 className="rp-success-title">You're in! 🎉</h2>
              <p className="rp-success-sub">Account created. Redirecting to login…</p>
            </div>
          ) : (
            <>
              {/* ── step indicator ── */}
              <div className="rp-steps">
                {[1, 2].map(s => (
                  <div key={s} className="rp-step-item">
                    <div className={`rp-step-dot ${step >= s ? "rp-step-active" : ""} ${step > s ? "rp-step-done" : ""}`}>
                      {step > s ? <FiCheckCircle size={12} /> : s}
                    </div>
                    <span className={`rp-step-label ${step === s ? "rp-step-label-active" : ""}`}>
                      {s === 1 ? "Your details" : "Verify email"}
                    </span>
                    {s < 2 && <div className={`rp-step-line ${step > 1 ? "rp-step-line-done" : ""}`} />}
                  </div>
                ))}
              </div>

              {/* card header */}
              <div className="rp-card-header">
                <h2 className="rp-card-title">
                  {step === 1 ? "Create account" : "Check your inbox"}
                </h2>
                <p className="rp-card-sub">
                  {step === 1
                    ? ""
                    : `We sent a 6-digit code to ${formData.email}`}
                </p>
              </div>

              {/* error */}
              {error && (
                <div className="rp-error">
                  <FiAlertTriangle size={13} /> {error}
                </div>
              )}

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <form onSubmit={handleSendOTP} className="rp-form">
                  <div className="rp-row">
                    <Field label="First name" icon={<FiUser size={15}/>} focused={focused==="fname"} color="#06b6d4">
                      <input name="fname" type="text" required placeholder="John" value={formData.fname}
                        className="rp-input" onChange={change}
                        onFocus={()=>setFocused("fname")} onBlur={()=>setFocused("")} />
                    </Field>
                    <Field label="Last name" icon={<FiUser size={15}/>} focused={focused==="lname"} color="#06b6d4">
                      <input name="lname" type="text" required placeholder="Doe" value={formData.lname}
                        className="rp-input" onChange={change}
                        onFocus={()=>setFocused("lname")} onBlur={()=>setFocused("")} />
                    </Field>
                  </div>

                  <Field label="College email" icon={<FiMail size={15}/>} focused={focused==="email"} color="#a855f7">
                    <input name="email" type="email" required placeholder="you@college.edu" value={formData.email}
                      className="rp-input" onChange={change}
                      onFocus={()=>setFocused("email")} onBlur={()=>setFocused("")} />
                  </Field>

                  <div className="rp-row">
                    <Field label="Year" icon={<FiBook size={15}/>} focused={focused==="year"} color="#4ade80">
                      <input name="year" type="number" min="1" max="4" required placeholder="1–4" value={formData.year}
                        className="rp-input" onChange={change}
                        onFocus={()=>setFocused("year")} onBlur={()=>setFocused("")} />
                    </Field>
                    <Field label="Branch" icon={<FiBriefcase size={15}/>} focused={focused==="field"} color="#4ade80">
                      <input name="field" type="text" required placeholder="CS / IT / ECE" value={formData.field}
                        className="rp-input" onChange={change}
                        onFocus={()=>setFocused("field")} onBlur={()=>setFocused("")} />
                    </Field>
                  </div>

                  <Field label="Password" icon={<FiLock size={15}/>} focused={focused==="password"} color="#fb7185">
                    <input name="password" type={showPw?"text":"password"} required placeholder="Min 8 characters"
                      value={formData.password} className="rp-input rp-input-pr" onChange={change}
                      onFocus={()=>setFocused("password")} onBlur={()=>setFocused("")} />
                    <button type="button" className="rp-pw-btn" onClick={()=>setShowPw(s=>!s)}>
                      {showPw ? <FiEyeOff size={14}/> : <FiEye size={14}/>}
                    </button>
                  </Field>

                  {/* strength bar */}
                  {formData.password && (
                    <div className="rp-strength">
                      <div className="rp-strength-bars">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="rp-strength-bar"
                            style={{ backgroundColor: i <= pwStrength ? pwColors[pwStrength-1] : "rgba(255,255,255,0.08)" }} />
                        ))}
                      </div>
                      <span className="rp-strength-label" style={{ color: pwColors[pwStrength-1] || "#475569" }}>
                        {pwStrength > 0 ? pwLabels[pwStrength-1] : ""}
                      </span>
                    </div>
                  )}

                  <Field label="Confirm password" icon={<FiLock size={15}/>} focused={focused==="cpw"} color="#fb7185">
                    <input type={showCPw?"text":"password"} required placeholder="Re-enter password"
                      value={confirmPw} className="rp-input rp-input-pr"
                      onChange={e=>setConfirmPw(e.target.value)}
                      onFocus={()=>setFocused("cpw")} onBlur={()=>setFocused("")} />
                    <button type="button" className="rp-pw-btn" onClick={()=>setShowCPw(s=>!s)}>
                      {showCPw ? <FiEyeOff size={14}/> : <FiEye size={14}/>}
                    </button>
                  </Field>

                  <button type="submit" disabled={loading} className="rp-submit">
                    <span className="rp-submit-shimmer" />
                    {loading
                      ? <><span className="rp-spinner"/> Sending code…</>
                      : <>Continue <FiArrowRight size={16}/></>}
                  </button>

                  <p className="rp-footer-text">
                    Already have an account?{" "}
                    <Link to="/login" className="rp-footer-link">Sign in →</Link>
                  </p>
                </form>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <form onSubmit={handleRegister} className="rp-form">
                  <div className="rp-otp-info">
                    <FiShield size={18} className="rp-otp-shield" />
                    <p>Enter the 6-digit verification code below</p>
                  </div>

                  <OtpInput value={otp} onChange={setOtp} />

                  <button type="submit" disabled={loading || otp.length < 6} className="rp-submit">
                    <span className="rp-submit-shimmer" />
                    {loading
                      ? <><span className="rp-spinner"/> Verifying…</>
                      : <><FiCheckCircle size={16}/> Create account</>}
                  </button>

                  <button type="button" className="rp-back-btn" onClick={() => { setStep(1); setOtp(""); setError(""); }}>
                    <FiArrowLeft size={14}/> Back to details
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .rp-root {
    min-height: 100vh; display: flex;
    font-family: 'DM Sans', sans-serif;
    background: #07070a; color: #e2e8f0;
    overflow-x: hidden;
  }

  /* ── LEFT ── */
  .rp-left {
    display: none; position: relative; overflow: hidden;
    background: #07070a;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  @media (min-width: 960px) { .rp-left { display: flex; flex: 1; } }

  .rp-orb {
    position: absolute; border-radius: 50%;
    filter: blur(90px); pointer-events: none;
    animation: rpPulse 8s ease-in-out infinite alternate;
  }
  .rp-orb-1 { width: 50vw; height: 50vw; top:-15%; left:-15%; background: rgba(168,85,247,0.16); }
  .rp-orb-2 { width: 40vw; height: 40vw; bottom:-12%; right:-10%; background: rgba(6,182,212,0.12); animation-delay:1.5s; animation-duration:10s; }
  @keyframes rpPulse { from{opacity:0.7;transform:scale(1)} to{opacity:1;transform:scale(1.07)} }

  .rp-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px);
    background-size: 52px 52px;
  }

  .rp-left-inner {
    position: relative; z-index: 2;
    display: flex; flex-direction: column;
    padding: 48px 56px; width: 100%;
    gap: 40px;
  }

  .rp-brand { display: flex; align-items: center; gap: 10px; }
  .rp-brand-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #a855f7; box-shadow: 0 0 12px #a855f7;
    animation: rpPulse 2s ease-in-out infinite alternate;
  }
  .rp-brand-name {
    font-family: 'Syne',sans-serif; font-size: 20px; font-weight: 800;
    color: #fff; letter-spacing: -0.02em;
  }

  .rp-headline-block { flex: 1; display: flex; flex-direction: column; gap: 12px; justify-content: center; }
  .rp-eyebrow { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
  .rp-headline {
    font-family: 'Syne',sans-serif;
    font-size: clamp(38px,4.5vw,64px); font-weight: 800;
    letter-spacing: -0.04em; line-height: 1.0; color: #fff; margin: 0;
  }
  .rp-accent {
    background: linear-gradient(135deg,#a855f7 0%,#ec4899 60%,#f97316 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }

  .rp-features { display: flex; flex-direction: column; gap: 10px; }
  .rp-feature {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 16px; border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    animation: featureIn 0.4s ease both;
  }
  @keyframes featureIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
  .rp-feature-icon { font-size: 18px; width: 24px; text-align: center; }
  .rp-feature-label { font-size: 13px; color: #94a3b8; font-weight: 400; }

  .rp-fine-print { font-size: 12px; color: #374151; margin: 0; }

  /* ── RIGHT ── */
  .rp-right {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 40px 24px; background: #07070a;
    overflow-y: auto;
  }

  .rp-card {
    width: 100%; max-width: 440px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 36px 32px;
    position: relative; overflow: hidden;
    transition: transform 0.25s ease;
  }
  @media (max-width: 500px) { .rp-card { padding: 28px 20px; } }

  .rp-card-shine {
    position: absolute; inset: 0;
    background: linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 50%);
    pointer-events: none; border-radius: inherit;
  }

  /* steps */
  .rp-steps {
    display: flex; align-items: center; gap: 0;
    margin-bottom: 24px;
  }
  .rp-step-item { display: flex; align-items: center; gap: 8px; }
  .rp-step-dot {
    width: 26px; height: 26px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #6b7280;
    background: transparent; flex-shrink: 0;
    transition: all 0.3s;
  }
  .rp-step-active { border-color: #a855f7; color: #a855f7; background: rgba(168,85,247,0.12); box-shadow: 0 0 10px rgba(168,85,247,0.3); }
  .rp-step-done   { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.1); }
  .rp-step-label  { font-size: 12px; color: #6b7280; white-space: nowrap; }
  .rp-step-label-active { color: #e2e8f0; font-weight: 600; }
  .rp-step-line {
    width: 40px; height: 1px;
    background: rgba(255,255,255,0.1);
    margin: 0 8px; transition: background 0.4s;
  }
  .rp-step-line-done { background: rgba(34,197,94,0.4); }

  /* card header */
  .rp-card-header { margin-bottom: 20px; }
  .rp-card-title {
    font-family: 'Syne',sans-serif;
    font-size: 24px; font-weight: 800;
    color: #fff; letter-spacing: -0.03em;
    line-height: 1.1; margin: 0 0 5px;
  }
  .rp-card-sub { font-size: 13px; color: #64748b; margin: 0; }

  /* error */
  .rp-error {
    display: flex; align-items: center; gap: 7px;
    padding: 11px 14px; margin-bottom: 16px;
    border-radius: 11px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    color: #f87171; font-size: 13px;
  }

  /* form */
  .rp-form { display: flex; flex-direction: column; gap: 14px; }
  .rp-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 420px) { .rp-row { grid-template-columns: 1fr; } }

  .rp-field { display: flex; flex-direction: column; gap: 5px; }
  .rp-field-header { display: flex; align-items: center; justify-content: space-between; }
  .rp-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }

  .rp-input-wrap {
    position: relative; border-radius: 13px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    overflow: hidden;
    transition: border-color 0.25s;
  }
  .rp-input-wrap:focus-within { border-color: rgba(255,255,255,0.18); }

  .rp-input-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    pointer-events: none; transition: color 0.25s;
  }
  .rp-input {
    width: 100%; background: transparent; border: none; outline: none;
    color: #f1f5f9; font-size: 14px; font-family: 'DM Sans',sans-serif;
    padding: 12px 12px 12px 38px;
  }
  .rp-input::placeholder { color: #374151; }
  .rp-input-pr { padding-right: 38px; }

  .rp-focus-bar {
    position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
    transform-origin: left;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }

  .rp-pw-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: #6b7280; display: flex; align-items: center;
    transition: color 0.2s;
  }
  .rp-pw-btn:hover { color: #94a3b8; }

  /* strength */
  .rp-strength { display: flex; align-items: center; gap: 8px; }
  .rp-strength-bars { display: flex; gap: 4px; flex: 1; }
  .rp-strength-bar { flex: 1; height: 3px; border-radius: 99px; transition: background-color 0.35s; }
  .rp-strength-label { font-size: 11px; font-weight: 600; min-width: 44px; text-align: right; }

  /* submit */
  .rp-submit {
    position: relative; display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 14px 24px; margin-top: 4px;
    border-radius: 13px;
    background: linear-gradient(135deg,#a855f7,#ec4899);
    border: none; cursor: pointer;
    color: #fff; font-size: 15px; font-weight: 700;
    font-family: 'DM Sans',sans-serif;
    overflow: hidden;
    transition: all 0.25s ease;
    box-shadow: 0 0 28px rgba(168,85,247,0.28);
  }
  .rp-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 0 48px rgba(168,85,247,0.48); }
  .rp-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .rp-submit-shimmer {
    position: absolute; inset: 0;
    background: linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);
    transform: translateX(-100%); transition: transform 0.6s ease;
  }
  .rp-submit:hover .rp-submit-shimmer { transform: translateX(100%); }

  .rp-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to{transform:rotate(360deg)} }

  .rp-back-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: transparent; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 11px;
    color: #6b7280; font-size: 13px; font-weight: 600;
    font-family: 'DM Sans',sans-serif;
    cursor: pointer; transition: all 0.2s;
  }
  .rp-back-btn:hover { color: #94a3b8; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.04); }

  .rp-footer-text { text-align: center; font-size: 13px; color: #6b7280; }
  .rp-footer-link { color: #a855f7; font-weight: 600; text-decoration: none; transition: color 0.2s; }
  .rp-footer-link:hover { color: #c084fc; }

  /* ── OTP ── */
  .rp-otp-info {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 12px;
    background: rgba(6,182,212,0.07);
    border: 1px solid rgba(6,182,212,0.2);
    font-size: 13px; color: #94a3b8;
  }
  .rp-otp-shield { color: #06b6d4; flex-shrink: 0; }

  .rp-otp-row { display: flex; gap: 8px; justify-content: center; }
  .rp-otp-box {
    width: 48px; height: 56px;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.1);
    color: #fff; font-size: 22px; font-weight: 800;
    font-family: 'Syne',sans-serif;
    text-align: center; outline: none;
    transition: all 0.2s;
    caret-color: transparent;
  }
  .rp-otp-box:focus {
    border-color: #a855f7;
    background: rgba(168,85,247,0.08);
    box-shadow: 0 0 14px rgba(168,85,247,0.25);
  }
  .rp-otp-filled { border-color: rgba(168,85,247,0.5); color: #c084fc; }

  /* ── success ── */
  .rp-success-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 14px; padding: 40px 0; text-align: center;
  }
  .rp-success-icon {
    width: 72px; height: 72px; border-radius: 50%;
    background: rgba(34,197,94,0.12);
    border: 1.5px solid rgba(34,197,94,0.35);
    display: flex; align-items: center; justify-content: center;
    color: #22c55e;
    animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 0 0 30px rgba(34,197,94,0.25);
  }
  @keyframes popIn { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
  .rp-success-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:#fff; margin:0; }
  .rp-success-sub { font-size:14px; color:#64748b; margin:0; }
`;