// placement-trainer/src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API_BASE from "../../api";
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff,FiAlertTriangle } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Mascot & Interaction State
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("none"); // 'none', 'email', 'password'
  const [isGreeting, setIsGreeting] = useState(true);

  // Trigger greeting bubble on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGreeting(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid credentials");

      login(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message || "Server error, please try again later");
    } finally {
      setLoading(false);
    }
  };

  // --- MASCOT ANIMATION LOGIC ---
  // Default Idle
  let leftHandStyle = "bottom-[-10px] left-[-15px] rotate-12";
  let rightHandStyle = "bottom-[-10px] right-[-15px] -rotate-12";
  let leftEyeStyle = "scale-y-100 translate-y-0 translate-x-0";
  let rightEyeStyle = "scale-y-100 translate-y-0 translate-x-0";

  if (focusedField === "email") {
    // Looking down
    leftEyeStyle = "translate-y-2";
    rightEyeStyle = "translate-y-2";
  } else if (focusedField === "password" && !showPassword) {
    // Hiding eyes completely
    leftHandStyle = "bottom-[40px] left-[5px] rotate-[45deg] scale-110";
    rightHandStyle = "bottom-[40px] right-[5px] -rotate-[45deg] scale-110";
    leftEyeStyle = "scale-y-0"; // Eyes closed
    rightEyeStyle = "scale-y-0"; 
  } else if (focusedField === "password" && showPassword) {
    // Peeking (One hand drops, one eye opens)
    leftHandStyle = "bottom-[-10px] left-[-15px] rotate-12"; // Left hand drops
    rightHandStyle = "bottom-[40px] right-[15px] -rotate-[30deg] scale-110"; // Right hand stays somewhat up
    leftEyeStyle = "scale-y-100 translate-x-2"; // Left eye looks at the password
    rightEyeStyle = "scale-y-[0.2]"; // Right eye squinting
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-bg relative overflow-hidden p-4 font-sans select-none pt-24">
      
      {/* Ambient Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-neon-purple/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-fast pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-neon-blue/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>

      {/* Main Wrapper */}
      <div className="relative w-full max-w-md z-10 flex flex-col items-center">
        
        {/* --- PLACIFY ROBOT MASCOT --- */}
        <div className="relative w-32 h-32 mb-[-40px] z-20 animate-[bounce_3s_ease-in-out_infinite]">
            
            {/* Speech Bubble */}
            <div className={`absolute -top-12 -right-24 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-2xl rounded-bl-none shadow-[0_0_15px_rgba(45,212,191,0.3)] transition-all duration-500 whitespace-nowrap ${isGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                Hi! Ready to log in? <span className="animate-pulse inline-block">👋</span>
            </div>

            {/* Robot Head */}
            <div className="absolute inset-0 bg-dark-card border-2 border-white/10 rounded-[40px] shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center overflow-hidden z-10 transition-transform duration-300">
                {/* Visor Screen */}
                <div className="w-24 h-12 bg-black rounded-2xl relative flex justify-center items-center gap-4 overflow-hidden border border-white/5 shadow-inner">
                    {/* Left Eye */}
                    <div className={`w-3.5 h-3.5 rounded-full bg-neon-blue shadow-[0_0_10px_#2DD4BF] transition-all duration-300 ${leftEyeStyle}`} />
                    {/* Right Eye */}
                    <div className={`w-3.5 h-3.5 rounded-full bg-neon-blue shadow-[0_0_10px_#2DD4BF] transition-all duration-300 ${rightEyeStyle}`} />
                </div>
            </div>

            {/* Left Hand */}
            <div className={`absolute w-8 h-12 bg-dark-card border-2 border-white/10 rounded-full z-20 transition-all duration-500 shadow-lg ${leftHandStyle}`} />
            
            {/* Right Hand */}
            <div className={`absolute w-8 h-12 bg-dark-card border-2 border-white/10 rounded-full z-20 transition-all duration-500 shadow-lg ${rightHandStyle}`} />
        </div>

        {/* --- LOGIN CARD --- */}
        <div className="relative w-full p-8 md:p-10 rounded-[2rem] border border-white/10 shadow-2xl bg-black/60 backdrop-blur-2xl pt-16">
          
          {/* Animated Glowing Border Behind Card */}
          <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] pointer-events-none z-[-1]"></div>

          <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-2 tracking-tight">
                Welcome <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple animate-pulse">Back</span>
              </h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-center text-sm font-bold flex items-center justify-center gap-2">
              <FiAlertTriangle className="animate-pulse" /> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-neon-blue transition-colors duration-300 z-10">
                      <FiMail size={18} />
                  </div>
                  <input
                    type="email"
                    className="relative w-full bg-black/50 border border-white/10 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all duration-300 placeholder:text-gray-600 focus:shadow-[0_0_20px_rgba(45,212,191,0.15)] z-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField("none")}
                    placeholder="kunal@gmail.com"
                    required
                  />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                  <Link to="/forgot-password" className="text-xs font-bold text-neon-purple hover:text-neon-blue transition-colors duration-300">
                    Forgot Password?
                  </Link>
              </div>
              <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-neon-purple transition-colors duration-300 z-10">
                      <FiLock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="relative w-full bg-black/50 border border-white/10 text-white rounded-xl py-4 pl-12 pr-12 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all duration-300 placeholder:text-gray-600 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] z-0"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField("none")}
                    placeholder="••••••••"
                    required
                  />
                  {/* Toggle Password Visibility */}
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors z-10"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-4 rounded-xl overflow-hidden group shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(45,212,191,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-8 bg-gradient-to-r from-neon-purple to-neon-blue"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-white font-black uppercase tracking-widest text-sm">
                {loading ? (
                    <>
                     <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                     Logging In...
                    </>
                ) : (
                    <>
                     Login to Dashboard <FiArrowRight className="group-hover:translate-x-1.5 transition-transform duration-300" size={18} />
                    </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-gray-400 text-sm font-medium">
              Don't have an account?{" "}
              <Link to="/register" className="text-white font-bold hover:text-neon-blue transition-colors duration-300">
                Create One
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}