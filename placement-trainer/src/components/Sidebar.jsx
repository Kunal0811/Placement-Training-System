import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome, FiFileText, FiBookOpen, FiCpu,
  FiUserCheck, FiUsers, FiLock, FiChevronRight,
  FiCalendar, FiBook, FiLogOut, FiAward,
  FiZap, FiTrendingUp, FiChevronDown, FiStar,
  FiShield, FiCode
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ── level color system ────────────────────────────────────────────────────────
const levelTheme = (level) => {
  if (level >= 10) return { color: "#F59E0B", glow: "rgba(245,158,11,0.4)", label: "Legend",   icon: "👑" };
  if (level >= 7)  return { color: "#A855F7", glow: "rgba(168,85,247,0.4)", label: "Expert",   icon: "💎" };
  if (level >= 4)  return { color: "#06B6D4", glow: "rgba(6,182,212,0.4)",  label: "Advanced", icon: "🔥" };
  return              { color: "#22C55E", glow: "rgba(34,197,94,0.4)",  label: "Rookie",  icon: "🌱" };
};

// ── nav sections ──────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    label: "Main",
    items: [
      { title: "Home",       path: "/",          icon: FiHome,      reqLevel: 1 },
      { title: "Dashboard",  path: "/dashboard", icon: FiTrendingUp,reqLevel: 1 },
      { title: "Leaderboard",path: "/leaderboard",icon: FiAward,    reqLevel: 1 },
    ],
  },
  {
    label: "Training",
    items: [
      { title: "Resume AI",       path: "/resume-analyzer", icon: FiFileText,  reqLevel: 1 },
      { title: "Aptitude Hub",    path: "/aptitude",        icon: FiBookOpen,  reqLevel: 1 },
      { title: "Technical Hub",   path: "/technical",       icon: FiCpu,       reqLevel: 1 },
      { title: "Coding Arena",    path: "/technical/coding-levels", icon: FiCode, reqLevel: 1 },
      { title: "Mock Interview",  path: "/interview",       icon: FiUserCheck, reqLevel: 1 },
      { title: "Group Discussion",path: "/gd",              icon: FiUsers,     reqLevel: 1 },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Scheduled Tests", path: "/tests",     icon: FiCalendar, reqLevel: 1 },
      { title: "Resource Library",path: "/resources", icon: FiBook,     reqLevel: 1 },
    ],
  },
];

// ── XP ring ───────────────────────────────────────────────────────────────────
function XPRing({ xp, nextLevelXp, color, glow, level }) {
  const pct = Math.min((xp / nextLevelXp) * 100, 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
      <svg width="64" height="64" className="rotate-[-90deg] absolute">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={circ - dash}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 5px ${glow})` }} />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">LVL</span>
        <span className="text-lg font-black" style={{ color }}>{level}</span>
      </div>
    </div>
  );
}

// ── streak badge ──────────────────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (!streak || streak < 1) return null;
  return (
    <div className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/30 rounded-full px-2.5 py-1">
      <span className="text-xs">🔥</span>
      <span className="text-xs font-black text-orange-400">{streak}</span>
      <span className="text-[9px] text-orange-500/70 font-bold">day streak</span>
    </div>
  );
}

// ── section toggle ────────────────────────────────────────────────────────────
function SectionGroup({ section, level, theme, isOpen: defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-1 group"
      >
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 group-hover:text-gray-500 transition-colors">
          {section.label}
        </span>
        <FiChevronDown
          className="text-gray-700 text-xs transition-transform duration-300"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 px-1">
              {section.items.map((item, i) => {
                const isLocked = level < item.reqLevel;
                const Icon = item.icon;

                return (
                  <NavLink
                    key={i}
                    to={isLocked ? "#" : item.path}
                    end={item.path === "/"}
                    onClick={e => isLocked && e.preventDefault()}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer select-none
                      ${isLocked
                        ? "opacity-35 cursor-not-allowed"
                        : isActive
                          ? "text-white"
                          : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* active bg pill */}
                        {isActive && !isLocked && (
                          <motion.div
                            layoutId="activeSidebarPill"
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: `linear-gradient(135deg, ${theme.color}22 0%, ${theme.color}10 100%)`,
                              border: `1px solid ${theme.color}35`,
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                          />
                        )}

                        {/* left glow bar */}
                        {isActive && !isLocked && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                            style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}` }}
                          />
                        )}

                        {/* icon */}
                        <div className="relative z-10 shrink-0">
                          {isLocked
                            ? <FiLock className="text-gray-600 text-sm" />
                            : <Icon
                                className="text-sm transition-all duration-200 group-hover:scale-110"
                                style={{ color: isActive ? theme.color : undefined }}
                              />
                          }
                        </div>

                        {/* label */}
                        <span
                          className="relative z-10 text-xs font-semibold tracking-wide flex-1 truncate"
                          style={{ color: isActive && !isLocked ? theme.color : undefined }}
                        >
                          {item.title}
                        </span>

                        {/* locked badge */}
                        {isLocked && (
                          <div className="relative z-10 shrink-0 flex items-center gap-1 bg-black/40 border border-white/8 rounded-md px-1.5 py-0.5">
                            <FiShield className="text-[9px] text-gray-600" />
                            <span className="text-[9px] text-gray-600 font-bold">L{item.reqLevel}</span>
                          </div>
                        )}

                        {/* chevron on hover */}
                        {!isLocked && !isActive && (
                          <FiChevronRight className="relative z-10 text-[10px] text-gray-700 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
const Sidebar = ({ isOpen }) => {
  const { user, stats, logout } = useAuth();
  const navigate = useNavigate();

  const level   = stats?.level        || 1;
  const xp      = stats?.xp           || 0;
  const nextXp  = stats?.next_level_xp|| 100;
  const streak  = stats?.streak       || 0;
  const theme   = levelTheme(level);
  const xpPct   = Math.min(Math.round((xp / nextXp) * 100), 100);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`h-[calc(100vh-1rem)] fixed left-2 top-2 transition-all duration-500 z-40
        ${isOpen ? "w-64 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}
    >
      <div className="h-full rounded-2xl flex flex-col shadow-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #0a0e17 0%, #070b13 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6), 0 0 60px ${theme.glow}18`,
        }}
      >
        {/* subtle top gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${theme.color}60, transparent)` }}
        />

        {/* ── User card ── */}
        <div className="px-4 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <XPRing xp={xp} nextLevelXp={nextXp} color={theme.color} glow={theme.glow} level={level} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-white font-bold text-sm truncate">
                  {user?.name || user?.email?.split("@")[0] || "Student"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                  style={{
                    color: theme.color,
                    backgroundColor: theme.color + "18",
                    borderColor: theme.color + "40",
                  }}
                >
                  {theme.icon} {theme.label}
                </span>
              </div>
              <StreakBadge streak={streak} />
            </div>
          </div>

          {/* XP bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1">
                <FiZap className="text-[10px]" style={{ color: theme.color }} />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">XP</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600">
                {xp.toLocaleString()} / {nextXp.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                style={{
                  background: `linear-gradient(90deg, ${theme.color}99, ${theme.color})`,
                  boxShadow: `0 0 10px ${theme.color}88`,
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[9px] text-gray-700">Level {level}</span>
              <span className="text-[9px] text-gray-700">{xpPct}% to Level {level + 1}</span>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <div
          className="flex-1 overflow-y-auto py-3 px-1"
          style={{ scrollbarWidth: "none" }}
        >
          <style>{`
            .sidebar-scroll::-webkit-scrollbar { display: none; }
          `}</style>

          {SECTIONS.map((section, i) => (
            <SectionGroup
              key={i}
              section={section}
              level={level}
              theme={theme}
              isOpen={true}
            />
          ))}
        </div>

        {/* ── Footer: user actions ── */}
        <div className="shrink-0 border-t border-white/5 p-3 space-y-1">
          {/* overall session stat pills */}
          <div className="flex gap-2 px-1 mb-3">
            <div className="flex-1 bg-white/4 rounded-xl p-2 text-center border border-white/5">
              <div className="text-xs font-black text-white">{stats?.interviews_taken ?? 0}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wide">Interviews</div>
            </div>
            <div className="flex-1 bg-white/4 rounded-xl p-2 text-center border border-white/5">
              <div className="text-xs font-black text-white">{stats?.gds_taken ?? 0}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wide">GDs</div>
            </div>
            <div className="flex-1 bg-white/4 rounded-xl p-2 text-center border border-white/5">
              <div className="text-xs font-black" style={{ color: theme.color }}>{streak}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wide">Streak</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/20 transition-all duration-200 group"
          >
            <FiLogOut className="text-sm group-hover:scale-110 transition-transform duration-200" />
            <span className="text-xs font-semibold">Sign Out</span>
          </button>
        </div>

        {/* bottom glow reflection */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${theme.color}40, transparent)` }}
        />
      </div>
    </div>
  );
};

export default Sidebar;