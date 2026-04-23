import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiTarget, FiCpu, FiUsers, FiMic } from "react-icons/fi";

function Home() {
  // Hero Parallax State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const cards = [
    {
      title: "Aptitude Arena",
      subtitle: "Master Reasoning",
      desc: "Practice Quant, Logical & Verbal with adaptive tests.",
      icon: <FiTarget size={28} />,
      link: "/aptitude",
      color: "from-purple-500 to-fuchsia-500",
      glowColor: "rgba(168,85,247,0.4)",
      bgImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "Code Dojo",
      subtitle: "Code Like a Pro",
      desc: "DSA, System Design, and competitive coding challenges.",
      icon: <FiCpu size={28} />,
      link: "/technical",
      color: "from-blue-500 to-cyan-400",
      glowColor: "rgba(59,130,246,0.4)",
      bgImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "AI Interviews",
      subtitle: "AI Simulator",
      desc: "Real-time speech analysis and mock HR rounds.",
      icon: <FiMic size={28} />,
      link: "/interview",
      color: "from-pink-500 to-rose-400",
      glowColor: "rgba(236,72,153,0.4)",
      bgImage: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "Live GD Rooms",
      subtitle: "Speak Up",
      desc: "Group discussion topics and AI communication feedback.",
      icon: <FiUsers size={28} />,
      link: "/gd",
      color: "from-emerald-500 to-teal-400",
      glowColor: "rgba(16,185,129,0.4)",
      bgImage: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800&auto=format&fit=crop"
    }
  ];

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 30, 
        y: (e.clientY / window.innerHeight - 0.5) * 30
      });
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 relative overflow-hidden font-sans selection:bg-purple-500/30">
      
      {/* Real-time Animated Ambient Background (Tied to Parallax) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/20 mix-blend-screen blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" 
          style={{ transform: `translate3d(${mousePos.x * -1.5}px, ${mousePos.y * -1.5}px, 0)` }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 mix-blend-screen blur-[120px] animate-[pulse_10s_ease-in-out_infinite_reverse]" 
          style={{ transform: `translate3d(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px, 0)` }}
        />
      </div>

      <div className="max-w-7xl mx-auto space-y-32 pb-20 relative z-10">
        
        {/* 1. HERO SECTION */}
        <section className="relative pt-32 pb-16 text-center flex flex-col items-center" style={{ perspective: '1000px' }}>
          
          {/* Live Status Badge */}
          <div 
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-8 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
            style={{ transform: 'translateZ(20px)' }}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-slate-300 font-medium tracking-wide">Placify Ecosystem Live</span>
          </div>
          
          <h1 
            className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 text-white leading-tight drop-shadow-2xl"
            style={{ transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 50px)` }}
          >
            Hack Your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-500 to-blue-500">
              Placement Journey
            </span>
          </h1>
          
          <p 
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
            style={{ transform: `translate3d(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px, 20px)` }}
          >
            The ultimate gamified training ecosystem. Master aptitude, crush coding rounds, and conquer AI interviews.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-5 relative z-20">
            <Link to="/aptitude" className="px-8 py-4 rounded-xl bg-white text-black font-bold hover:scale-105 hover:bg-slate-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300 flex items-center gap-2">
              Start Grinding <FiArrowRight />
            </Link>
            <Link to="/leaderboard" className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-2">
              View Leaderboard <span className="text-xl">🏆</span>
            </Link>
          </div>
        </section>

        {/* 2. ADVANCED CSS GRID ARENA */}
        <section className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
            {cards.map((card, index) => {
              return (
                <Link 
                  key={index} 
                  to={card.link}
                  className="group relative overflow-hidden rounded-[24px] bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 transition-all duration-500 ease-out hover:-translate-y-2 flex flex-col justify-between p-8 hover:border-white/20"
                  style={{ boxShadow: `0 0 0 ${card.glowColor} inset` }}
                >
                  {/* Outer glowing aura that appears only on hover */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${card.color} opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-700 -z-10`} />
                  
                  {/* ADVANCED BACKGROUND IMAGE SYSTEM */}
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700 ease-out grayscale group-hover:grayscale-0"
                      style={{ backgroundImage: `url(${card.bgImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent opacity-100 group-hover:opacity-80 transition-opacity duration-500" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-5 group-hover:opacity-20 mix-blend-color transition-opacity duration-500`} />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-16">
                      <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 backdrop-blur-md transition-all duration-500 group-hover:shadow-[0_0_20px_${card.glowColor}]`}>
                        <div className="text-white">{card.icon}</div>
                      </div>
                      <div className="p-3 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-500 -rotate-45 group-hover:rotate-0 group-hover:translate-x-1 border border-white/5">
                        <FiArrowRight className="text-white opacity-50 group-hover:opacity-100 transition-opacity duration-300" size={20} />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <h3 className="font-bold text-white text-3xl mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all duration-500">
                        {card.title}
                      </h3>
                      <div className="transform transition-all duration-500 group-hover:-translate-y-1">
                         <p className="text-slate-400 text-sm leading-relaxed max-w-sm group-hover:text-slate-300 transition-colors duration-300">
                           {card.desc}
                         </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        
        {/* 3. ISOMETRIC 3D DASHBOARD PREVIEW */}
        <section className="px-6 pb-20">
          <div className="bg-[#0a0a0c]/60 backdrop-blur-2xl rounded-[32px] p-8 md:p-16 border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-16" style={{ perspective: '1500px' }}>
              
              {/* Left Content */}
              <div className="flex-1 z-10" style={{ transform: 'translateZ(30px)' }}>
                  <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                    Track Your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
                      Evolution
                    </span>
                  </h2> 
                  <ul className="space-y-8 mt-10">
                      {[
                          { title: "Daily Streaks", desc: "Keep the fire alive to earn exclusive badges.", color: "bg-orange-500", shadow: "shadow-[0_0_15px_rgba(249,115,22,0.5)]" },
                          { title: "Skill Radar", desc: "Visualize your weak & strong zones instantly.", color: "bg-blue-500", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]" },
                          { title: "Global Ranks", desc: "Compete with peers for top leaderboard spots.", color: "bg-yellow-400", shadow: "shadow-[0_0_15px_rgba(250,204,21,0.5)]" },
                      ].map((item, i) => (
                          <li key={i} className="flex items-start gap-5 group">
                              <div className={`w-3 h-3 mt-2 rounded-full ${item.color} ${item.shadow} group-hover:scale-150 transition-transform duration-300`} />
                              <div>
                                  <h4 className="text-white font-bold text-xl mb-1">{item.title}</h4>
                                  <p className="text-slate-400 font-light">{item.desc}</p>
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>
              
              {/* Right: 3D Isometric Mock UI */}
              <div className="flex-1 w-full flex justify-center perspective-1000 relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-blue-600/20 rounded-[3rem] blur-[80px]" />
                  
                  <div 
                    className="relative w-full max-w-md bg-[#111113]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl transition-transform duration-700 hover:scale-[1.02]"
                    style={{ 
                      transform: 'rotateX(15deg) rotateY(-20deg) rotateZ(5deg)',
                      transformStyle: 'preserve-3d'
                    }}
                  >
                      <div className="flex justify-between items-center mb-10" style={{ transform: 'translateZ(20px)' }}>
                          <span className="text-slate-400 font-medium tracking-wider uppercase text-xs">Your Progress</span>
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg font-bold text-xs">Top 5%</span>
                      </div>
                      
                      <div className="space-y-8" style={{ transformStyle: 'preserve-3d' }}>
                          <div className="relative group" style={{ transform: 'translateZ(30px)' }}>
                              <div className="flex justify-between text-sm text-slate-300 mb-3 font-medium"><span>Algorithms</span> <span>85%</span></div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full w-[85%] bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.5)] relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[pulse_2s_infinite]" />
                                  </div>
                              </div>
                          </div>
                          
                          <div className="relative group" style={{ transform: 'translateZ(45px)' }}>
                              <div className="flex justify-between text-sm text-slate-300 mb-3 font-medium"><span>System Design</span> <span>65%</span></div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full w-[65%] bg-gradient-to-r from-purple-500 to-fuchsia-400 shadow-[0_0_10px_rgba(192,38,211,0.5)]" />
                              </div>
                          </div>
                          
                          <div className="relative group" style={{ transform: 'translateZ(60px)' }}>
                              <div className="flex justify-between text-sm text-slate-300 mb-3 font-medium"><span>Aptitude</span> <span>92%</span></div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full w-[92%] bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                              </div>
                          </div>
                      </div>
                      
                      <div className="mt-12 flex justify-between gap-4" style={{ transform: 'translateZ(80px)' }}>
                          <div className="flex-1 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-xl hover:-translate-y-2 transition-transform duration-300">🔥</div>
                          <div className="flex-1 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-xl hover:-translate-y-2 transition-transform duration-300">🏆</div>
                          <div className="flex-1 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-xl hover:-translate-y-2 transition-transform duration-300">💎</div>
                      </div>
                  </div>
              </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default Home;