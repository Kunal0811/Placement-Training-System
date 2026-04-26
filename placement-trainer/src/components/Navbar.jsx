import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Placify from "../assets/Placify1.png";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../api";
import { FiAward, FiZap, FiShield } from "react-icons/fi";

const Navbar = ({ toggleSidebar }) => {
  const { user, admin, logout, stats } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); setDropdownOpen(false); navigate("/"); };
  const progress = Math.min((stats?.xp / stats?.next_level_xp) * 100, 100) || 0;

  return (
    <div className="sticky top-4 z-50 px-4 mb-4">
      <div className="bg-[#0d0d0f]/80 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl px-6 py-3 flex justify-between items-center relative transition-all">
        
        <div className="flex items-center gap-4">
          {!admin && (
            <button onClick={toggleSidebar} className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-400 hover:text-white transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
            <img src={Placify} alt="Logo" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" />
            <span className="text-xl font-black tracking-[-0.04em] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              PLACI<span style={{ background: "linear-gradient(135deg, #2DD4BF, #A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FY</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6" ref={dropdownRef}>
          {user && !admin && (
            <div className="hidden md:flex items-center gap-5">
              <div className="flex items-center gap-2 bg-[#f97316]/10 px-3 py-1.5 rounded-full border border-[#f97316]/20 text-[#f97316] text-xs font-bold font-mono uppercase tracking-wide">
                <FiZap className="fill-current" /> <span>{stats.streak} Day Streak</span>
              </div>
              <div className="flex flex-col w-32">
                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase font-mono tracking-widest">
                  <span className="text-[#2DD4BF]">Lvl {stats.level}</span>
                  <span>{stats.xp} / {stats.next_level_xp} XP</span>
                </div>
                <div className="h-1.5 bg-white/5 border border-white/5 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full transition-all duration-1000 ease-out rounded-full" 
                       style={{ width: `${progress}%`, background: "linear-gradient(90deg, #2DD4BF, #A855F7)", boxShadow: "0 0 10px rgba(168,85,247,0.5)" }}></div>
                </div>
              </div>
            </div>
          )}

          {admin && (
            <div className="hidden md:flex items-center gap-2 bg-[#fb7185]/10 px-3 py-1.5 rounded-full border border-[#fb7185]/20 text-[#fb7185] text-xs font-bold uppercase tracking-widest font-mono">
              <FiShield className="fill-current" /> Admin Mode
            </div>
          )}

          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-3 focus:outline-none group">
              {user?.profile_picture_url ? (
                <div className="relative">
                  <img src={`${API_BASE}${user.profile_picture_url}`} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover:border-[#A855F7] transition-colors" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#4ade80] border-2 border-[#0d0d0f] rounded-full"></div>
                </div>
              ) : admin ? (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb7185] to-[#f97316] flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(251,113,133,0.3)]">
                  A
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#2DD4BF] flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  {user ? (user?.fname?.[0].toUpperCase() || 'U') : 'G'}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-4 w-56 bg-[#0d0d0f]/95 backdrop-blur-xl rounded-2xl overflow-hidden origin-top-right border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                {!user && !admin ? (
                  <div className="p-2 space-y-1">
                    <Link to="/login" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 rounded-xl hover:bg-white/5 text-sm font-medium text-gray-300 transition-colors">Student Login</Link>
                    <Link to="/register" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 rounded-xl hover:bg-white/5 text-sm font-medium text-gray-300 transition-colors">Register</Link>
                    <div className="border-t border-white/5 my-1"></div>
                    <Link to="/admin/login" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 rounded-xl hover:bg-[#fb7185]/10 text-[#fb7185] text-sm font-medium transition-colors">Admin Login</Link>
                  </div>
                ) : admin ? (
                   <div className="p-2 space-y-1">
                    <div className="px-4 py-3 border-b border-white/5 mb-2 bg-white/5 rounded-t-xl">
                       <p className="text-sm font-bold text-white font-mono">{admin.name}</p>
                       <p className="text-[10px] text-[#fb7185] uppercase tracking-widest mt-1 font-mono">Administrator</p>
                    </div>
                    <Link to="/admin/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-300 transition-colors"><FiShield /> Dashboard</Link>
                    <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-[#fb7185]/10 text-[#fb7185] text-sm transition-colors"><FiZap/> Log Out</button>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    <div className="px-4 py-3 border-b border-white/5 mb-2 bg-white/5 rounded-t-xl">
                       <p className="text-sm font-bold text-white font-mono">{user.fname} {user.lname}</p>
                    </div>
                    <Link to="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-300 transition-colors"><FiAward /> Dashboard</Link>
                    <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-[#fb7185]/10 text-[#fb7185] text-sm transition-colors">Log Out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;