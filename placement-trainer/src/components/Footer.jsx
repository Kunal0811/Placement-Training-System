import React from 'react';
import { Link } from 'react-router-dom';
import Placify from "../assets/Placify1.png"; 

const Footer = () => {
  return (
    <footer className="bg-[#07070a] text-gray-400 py-8 px-6 mt-auto border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="flex items-center gap-2 group cursor-pointer">
          <img src={Placify} alt="Placify Logo" className="w-6 h-6 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
          <span className="text-sm font-black tracking-[-0.04em] text-white/70 group-hover:text-white transition-colors" style={{ fontFamily: "'Syne', sans-serif" }}>
            PLACI<span style={{ background: "linear-gradient(135deg, #2DD4BF, #A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FY</span>
          </span>
        </div>

        <div className="flex items-center gap-6 text-[10px] font-mono uppercase tracking-[0.15em] text-gray-500">
          <Link to="/resources" className="hover:text-[#2DD4BF] transition-colors">Resources</Link>
          <Link to="/leaderboard" className="hover:text-[#A855F7] transition-colors">Leaderboard</Link>
          <Link to="/register" className="hover:text-white transition-colors">Join Platform</Link>
        </div>

        <div className="text-[10px] font-mono uppercase tracking-widest text-gray-600">
          &copy; {new Date().getFullYear()} Placify OS. System Online.
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;