import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Placify from "../assets/Placify1.png";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../api";
import {
  FiMenu, FiSearch, FiBell, FiShield, FiAward,
  FiLogOut, FiX, FiChevronRight, FiUser,
  FiMoon, FiSun, FiCommand
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// ── breadcrumb map ────────────────────────────────────────────────────────────
const CRUMB_MAP = {
  "":                   "Home",
  "dashboard":          "Dashboard",
  "leaderboard":        "Leaderboard",
  "resume-analyzer":    "Resume AI",
  "aptitude":           "Aptitude Hub",
  "technical":          "Technical Hub",
  "interview":          "Mock Interview",
  "gd":                 "Group Discussion",
  "tests":              "Scheduled Tests",
  "resources":          "Resource Library",
  "coding-levels":      "Coding Arena",
  "coding-test":        "Coding Platform",
  "quantitative":       "Quantitative",
  "logical":            "Logical",
  "verbal":             "Verbal",
  "cnotes":             "C Programming",
  "cpp":                "C++",
  "java":               "Java",
  "python":             "Python",
  "dsa":                "DSA",
  "dbms":               "DBMS",
  "os":                 "Operating Systems",
  "cn":                 "Computer Networks",
};

function useBreadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.map((part, i) => ({
    label: CRUMB_MAP[part] || part.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    path:  "/" + parts.slice(0, i + 1).join("/"),
    isLast: i === parts.length - 1,
  }));
}

// ── quick-search data ─────────────────────────────────────────────────────────
const SEARCH_LINKS = [
  { label: "Dashboard",        path: "/dashboard",              tag: "page" },
  { label: "Resume Analyzer",  path: "/resume-analyzer",        tag: "tool" },
  { label: "Aptitude Hub",     path: "/aptitude",               tag: "page" },
  { label: "Technical Hub",    path: "/technical",              tag: "page" },
  { label: "Coding Arena",     path: "/technical/coding-levels",tag: "page" },
  { label: "Mock Interview",   path: "/interview",              tag: "page" },
  { label: "Group Discussion", path: "/gd",                     tag: "page" },
  { label: "Scheduled Tests",  path: "/tests",                  tag: "page" },
  { label: "Resource Library", path: "/resources",              tag: "page" },
  { label: "Leaderboard",      path: "/leaderboard",            tag: "page" },
  { label: "C Programming",    path: "/technical/cnotes",       tag: "note" },
  { label: "C++ Notes",        path: "/technical/cpp",          tag: "note" },
  { label: "Java Notes",       path: "/technical/java",         tag: "note" },
  { label: "Python Notes",     path: "/technical/python",       tag: "note" },
  { label: "DSA Notes",        path: "/technical/dsa",          tag: "note" },
  { label: "DBMS Notes",       path: "/technical/dbms",         tag: "note" },
  { label: "OS Notes",         path: "/technical/os",           tag: "note" },
  { label: "CN Notes",         path: "/technical/cn",           tag: "note" },
];

const TAG_COLOR = {
  page: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
  tool: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/20" },
  note: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
};

// ── notification mock (you can wire to backend later) ─────────────────────────
function useNotifications() {
  const { stats } = useAuth();
  const notes = [];
  if (stats?.streak >= 3) notes.push({ id: 1, icon: "🔥", text: `${stats.streak}-day streak! Keep it up.`, time: "now", read: false });
  if (stats?.level > 1)   notes.push({ id: 2, icon: "⬆️", text: `You reached Level ${stats.level}!`,      time: "today", read: true });
  notes.push({ id: 3, icon: "📅", text: "New scheduled test available.", time: "1h ago", read: false });
  return notes;
}

// ── Search overlay ─────────────────────────────────────────────────────────────
function SearchOverlay({ onClose }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const results = query.trim().length > 0
    ? SEARCH_LINKS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()))
    : SEARCH_LINKS.slice(0, 6);

  const go = (path) => { navigate(path); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.97 }}
        animate={{ y: 0,   opacity: 1, scale: 1 }}
        exit={{ y: -20, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* search input */}
        <div className="flex items-center gap-3 bg-[#0d1117] border border-white/15 rounded-2xl px-4 py-3.5 shadow-2xl mb-2">
          <FiSearch className="text-gray-500 text-lg shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, tools, notes..."
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none font-mono"
          />
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 border border-white/10 text-gray-500">ESC</kbd>
          </button>
        </div>

        {/* results */}
        <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {results.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-600 text-sm">No results for "{query}"</div>
          ) : (
            results.map((r, i) => {
              const tc = TAG_COLOR[r.tag];
              return (
                <button key={i} onClick={() => go(r.path)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group">
                  <div className="flex items-center gap-3">
                    <FiSearch className="text-gray-700 text-xs shrink-0" />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{r.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${tc.bg} ${tc.text} ${tc.border}`}>{r.tag}</span>
                    <FiChevronRight className="text-gray-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })
          )}
          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-gray-700">
            <FiCommand className="text-xs" /> K to open · ESC to close
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Notification panel ────────────────────────────────────────────────────────
function NotifPanel({ notes, onClose }) {
  const unread = notes.filter(n => !n.read).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute right-0 top-full mt-3 w-72 bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Notifications</span>
          {unread > 0 && (
            <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">{unread}</span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
          <FiX className="text-sm" />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {notes.map(n => (
          <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${n.read ? "opacity-50" : ""}`}>
            <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 leading-relaxed">{n.text}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{n.time}</p>
            </div>
            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Profile dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ user, admin, onLogout, onClose }) {
  const navigate = useNavigate();
  const go = (path) => { navigate(path); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute right-0 top-full mt-3 w-56 bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
    >
      {/* identity header */}
      <div className="px-4 py-3 border-b border-white/8">
        {admin ? (
          <>
            <p className="text-sm font-bold text-white">{admin.name}</p>
            <p className="text-[10px] text-red-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
              <FiShield className="text-[10px]" /> Administrator
            </p>
          </>
        ) : user ? (
          <>
            <p className="text-sm font-bold text-white">{user.fname} {user.lname}</p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{user.email}</p>
          </>
        ) : null}
      </div>

      {/* actions */}
      <div className="p-1.5 space-y-0.5">
        {!user && !admin ? (
          <>
            <button onClick={() => go("/login")}    className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2.5"><FiUser className="text-xs" /> Student Login</button>
            <button onClick={() => go("/register")} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2.5"><FiUser className="text-xs" /> Register</button>
            <div className="my-1 border-t border-white/8" />
            <button onClick={() => go("/admin/login")} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2.5"><FiShield className="text-xs" /> Admin Login</button>
          </>
        ) : admin ? (
          <>
            <button onClick={() => go("/admin/dashboard")} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2.5"><FiShield className="text-xs" /> Admin Dashboard</button>
            <div className="my-1 border-t border-white/8" />
            <button onClick={onLogout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2.5"><FiLogOut className="text-xs" /> Sign Out</button>
          </>
        ) : (
          <>
            <button onClick={() => go("/dashboard")} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2.5"><FiAward className="text-xs" /> Dashboard</button>
            <div className="my-1 border-t border-white/8" />
            <button onClick={onLogout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2.5"><FiLogOut className="text-xs" /> Sign Out</button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, admin }) {
  if (user?.profile_picture_url) {
    return (
      <div className="relative">
        <img
          src={`${API_BASE}${user.profile_picture_url}`}
          alt="Profile"
          className="w-9 h-9 rounded-xl object-cover border border-white/10"
        />
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0d1117] rounded-full" />
      </div>
    );
  }
  if (admin) {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
        A
      </div>
    );
  }
  if (user) {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
        {user?.fname?.[0]?.toUpperCase() || "U"}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-gray-400">
      <FiUser className="text-sm" />
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────────
const Navbar = ({ toggleSidebar }) => {
  const { user, admin, logout } = useAuth();
  const navigate = useNavigate();
  const crumbs = useBreadcrumbs();
  const notifications = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+K to open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate("/login");
  };

  return (
    <>
      {/* Search overlay (portal-like, full screen) */}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      <div className="sticky top-3 z-50 px-3 mb-4">
        <div
          className="rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 relative"
          style={{
            background: "rgba(9, 13, 19, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* top shimmer line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

          {/* ── LEFT: hamburger + logo + breadcrumb ── */}
          <div className="flex items-center gap-3 min-w-0">
            {!admin && (
              <button
                onClick={toggleSidebar}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-gray-400 hover:text-white transition-all shrink-0"
              >
                <FiMenu className="text-sm" />
              </button>
            )}

            {/* logo */}
            <div
              className="flex items-center gap-2 cursor-pointer group shrink-0"
              onClick={() => navigate("/")}
            >
              <img src={Placify} alt="Logo" className="w-8 h-8 transition-transform duration-300 group-hover:rotate-12" />
              <span className="text-lg font-black tracking-tighter text-white hidden sm:block">
                PLACI<span className="text-blue-400">FY</span>
              </span>
            </div>

            {/* divider */}
            <div className="hidden md:block w-px h-5 bg-white/10" />

            {/* breadcrumb */}
            {crumbs.length > 0 && (
              <nav className="hidden md:flex items-center gap-1 min-w-0">
                {crumbs.map((c, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <FiChevronRight className="text-gray-700 text-xs shrink-0" />}
                    {c.isLast ? (
                      <span className="text-xs font-semibold text-gray-300 truncate max-w-[140px]">{c.label}</span>
                    ) : (
                      <Link to={c.path} className="text-xs text-gray-600 hover:text-gray-400 transition-colors truncate max-w-[100px]">
                        {c.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>

          {/* ── RIGHT: search + notifs + admin badge + avatar ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-gray-500 hover:text-gray-300 transition-all group"
            >
              <FiSearch className="text-sm" />
              <span className="hidden sm:block text-xs">Search</span>
              <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] text-gray-700 bg-white/5 border border-white/8 px-1 rounded">
                <span>⌘</span><span>K</span>
              </kbd>
            </button>

            {/* admin badge */}
            {admin && (
              <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                <FiShield className="text-[10px]" /> Admin
              </div>
            )}

            {/* notifications (only for students) */}
            {user && !admin && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                  className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-gray-400 hover:text-white transition-all"
                >
                  <FiBell className="text-sm" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[9px] font-black text-white flex items-center justify-center leading-none">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <NotifPanel notes={notifications} onClose={() => setNotifOpen(false)} />
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/8 transition-all"
              >
                <Avatar user={user} admin={admin} />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <ProfileDropdown
                    user={user}
                    admin={admin}
                    onLogout={handleLogout}
                    onClose={() => setProfileOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;