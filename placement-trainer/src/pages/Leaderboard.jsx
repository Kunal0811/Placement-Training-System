import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../api";
import { useAuth } from "../context/AuthContext";
import { FiAward, FiSearch, FiCode, FiBookOpen, FiCpu, FiMic } from "react-icons/fi";

const CATEGORIES = [
  { key: "global",    label: "Overall",   icon: FiAward,    color: "#a855f7" },
  { key: "aptitude",  label: "Aptitude",  icon: FiBookOpen, color: "#f97316" },
  { key: "technical", label: "Technical", icon: FiCpu,      color: "#3b82f6" },
  { key: "coding",    label: "Coding",    icon: FiCode,     color: "#06b6d4" },
  { key: "interview", label: "Interview", icon: FiMic,      color: "#ec4899" },
];

const RANK_META = {
  1: { emoji: "🥇", color: "#facc15", bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.3)",  size: 52 },
  2: { emoji: "🥈", color: "#e2e8f0", bg: "rgba(226,232,240,0.08)", border: "rgba(226,232,240,0.2)", size: 44 },
  3: { emoji: "🥉", color: "#cd7c2f", bg: "rgba(205,124,47,0.1)",  border: "rgba(205,124,47,0.25)",  size: 40 },
};

function Avatar({ user, size = 40 }) {
  const initial = (user?.name || user?.fname || "?")[0].toUpperCase();
  if (user?.profile_picture_url) return (
    <img src={`${API_BASE}${user.profile_picture_url}`} alt="avatar"
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#a855f7,#ec4899)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.38, color: "#fff",
    }}>{initial}</div>
  );
}

function PodiumCard({ user: u, rank, isYou }) {
  const m = RANK_META[rank];
  const name = u?.name || `${u?.fname || ""} ${u?.lname || ""}`.trim();
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      order: rank === 1 ? 0 : rank === 2 ? -1 : 1,
    }}>
      <span style={{ fontSize: 28 }}>{m.emoji}</span>
      <div style={{ position: "relative" }}>
        <div style={{
          width: m.size + 8, height: m.size + 8, borderRadius: "50%", padding: 3,
          background: `linear-gradient(135deg, ${m.color}, transparent)`,
          boxShadow: `0 0 20px ${m.color}40`,
        }}>
          <Avatar user={u} size={m.size} />
        </div>
        {isYou && (
          <div style={{
            position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
            background: "#a855f7", borderRadius: 999, padding: "1px 7px",
            fontSize: 9, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", border: "2px solid #07070a",
          }}>YOU</div>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </p>
        <p style={{ fontSize: 13, fontWeight: 800, color: m.color, margin: "3px 0 0", fontFamily: "monospace" }}>
          {u?.xp?.toLocaleString() || 0} XP
        </p>
      </div>
      {/* podium block */}
      <div style={{
        width: 72, borderRadius: "8px 8px 0 0", background: m.bg, border: `1px solid ${m.border}`,
        height: rank === 1 ? 56 : rank === 2 ? 40 : 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 800, color: m.color,
      }}>#{rank}</div>
    </div>
  );
}

function RankRow({ u, rank, isYou, catColor }) {
  const name = u?.name || `${u?.fname || ""} ${u?.lname || ""}`.trim();
  const m = RANK_META[rank];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "11px 16px",
      borderRadius: 14, transition: "background 0.15s",
      background: isYou ? `${catColor}10` : "transparent",
      border: `1px solid ${isYou ? catColor + "35" : "transparent"}`,
      boxShadow: isYou ? `0 0 20px ${catColor}12` : "none",
    }}
    onMouseEnter={e => { if (!isYou) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
    onMouseLeave={e => { if (!isYou) e.currentTarget.style.background = "transparent"; }}
    >
      {/* rank */}
      <div style={{
        width: 28, textAlign: "center", flexShrink: 0,
        fontFamily: "monospace", fontWeight: 800,
        fontSize: m ? 18 : 13,
        color: m ? m.color : "#4b5563",
        textShadow: m ? `0 0 12px ${m.color}80` : "none",
      }}>
        {m ? m.emoji : rank}
      </div>

      {/* avatar */}
      <Avatar user={u} size={36} />

      {/* name + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: isYou ? "#fff" : "#d1d5db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
            {name}
          </span>
          {isYou && (
            <span style={{ fontSize: 9, fontWeight: 800, background: catColor, color: "#fff", padding: "2px 6px", borderRadius: 999 }}>YOU</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          {u.badges?.slice(0, 2).map((b, i) => (
            <span key={i} style={{ fontSize: 10, color: "#4b5563", background: "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* level */}
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>Level</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: catColor }}>{u.level}</div>
      </div>

      {/* xp */}
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 70 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: isYou ? "#fff" : "#9ca3af", fontFamily: "monospace" }}>
          {u.xp?.toLocaleString()}
        </span>
        <span style={{ fontSize: 10, color: "#374151", marginLeft: 3 }}>XP</span>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user, stats } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("global");
  const [search, setSearch] = useState("");

  const catMeta = CATEGORIES.find(c => c.key === category);
  const catColor = catMeta?.color || "#a855f7";

  useEffect(() => {
    setLoading(true);
    const endpoint = category === "global"
      ? `${API_BASE}/api/leaderboard`
      : `${API_BASE}/api/leaderboard/filter?category=${category}`;
    axios.get(endpoint)
      .then(r => setUsers(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = users.filter(u => {
    const name = u.name || `${u.fname || ""} ${u.lname || ""}`;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const myRow = filtered.find(u => u.id === user?.id);
  const myRank = filtered.findIndex(u => u.id === user?.id) + 1;
  const myNotInView = myRank > 3 && !rest.find(u => u.id === user?.id);

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 80px", maxWidth: 680, margin: "0 auto", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" }}>

      {/* header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px,5vw,40px)", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.03em" }}>
          Leaderboard
        </h1>
        <p style={{ color: "#4b5563", fontSize: 14, margin: "6px 0 0" }}>
          Ranked by XP earned across all modules.
        </p>
      </div>

      {/* your rank banner — only if logged in and on leaderboard */}
      {user && myRank > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "14px 18px", borderRadius: 16, marginBottom: 20,
          background: `${catColor}10`, border: `1px solid ${catColor}30`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar user={{ profile_picture_url: user.profile_picture_url, fname: user.fname }} size={36} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>{user.fname} {user.lname}</p>
              <p style={{ fontSize: 11, color: "#4b5563", margin: 0 }}>Your current position</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: catColor, margin: 0, fontFamily: "monospace" }}>#{myRank}</p>
            <p style={{ fontSize: 11, color: "#4b5563", margin: 0 }}>{myRow?.xp?.toLocaleString() || stats?.xp || 0} XP</p>
          </div>
        </div>
      )}

      {/* category tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 24, paddingBottom: 4 }}>
        {CATEGORIES.map(cat => {
          const active = category === cat.key;
          const Icon = cat.icon;
          return (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12,
                fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: active ? cat.color + "18" : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? cat.color + "40" : "rgba(255,255,255,0.07)"}`,
                color: active ? cat.color : "#4b5563",
                transition: "all 0.15s",
              }}>
              <Icon size={13} /> {cat.label}
            </button>
          );
        })}
      </div>

      {/* search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, marginBottom: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <FiSearch style={{ color: "#4b5563", flexShrink: 0 }} size={14} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${catColor}30`, borderTopColor: catColor, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#374151" }}>
          <p style={{ fontSize: 16 }}>No results found.</p>
        </div>
      ) : (
        <>
          {/* PODIUM — top 3 */}
          {top3.length >= 1 && !search && (
            <div style={{
              display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16,
              padding: "28px 16px 0", marginBottom: 32,
              background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {top3.map((u, i) => (
                <PodiumCard key={u.id} user={u} rank={i + 1} isYou={u.id === user?.id} />
              ))}
            </div>
          )}

          {/* rank list — 4th onwards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
            {(search ? filtered : rest).map((u, i) => {
              const rank = search ? (filtered.findIndex(x => x.id === u.id) + 1) : i + 4;
              return (
                <RankRow key={u.id || i} u={u} rank={rank} isYou={u.id === user?.id} catColor={catColor} />
              );
            })}
          </div>

          {/* pinned "you" row if not visible */}
          {user && myRow && myRank > 3 + rest.length && !search && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 8px" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em" }}>Your position</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>
              <RankRow u={myRow} rank={myRank} isYou catColor={catColor} />
            </>
          )}

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#374151" }}>
              <p>No one on the board yet for this category. Be the first! 🚀</p>
            </div>
          )}
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM Sans:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #374151; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}