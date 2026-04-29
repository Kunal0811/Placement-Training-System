import React, { useEffect, useState, useMemo } from "react";
import { getUserDetails } from "../api";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../api";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  FiBookOpen, FiCode, FiCpu, FiMic, FiUsers, FiFileText,
  FiCamera, FiUpload, FiArrowRight, FiCheckCircle, FiXCircle,
  FiTrendingUp, FiZap, FiAward, FiTarget, FiCalendar,
} from "react-icons/fi";

const APTITUDE_TOPICS = [
  "Percentages","Profit & Loss","Time, Speed & Distance","Ratio & Proportion",
  "Number System","Simple & Compound Interest","Permutation & Combination",
  "Geometry & Mensuration","Series & Patterns","Coding-Decoding","Blood Relations",
  "Direction Sense","Grammar","Vocabulary","Reading Comprehension","Final Aptitude Test",
];
const TECHNICAL_TOPICS = [
  "C Programming","C++ Programming","Java Programming","Python Programming",
  "Data Structures & Algorithms","Database Management Systems","Operating Systems","Computer Networks",
];

const MODULE_COLORS = {
  aptitude:  { color: "#a855f7", glow: "rgba(168,85,247,0.2)",  label: "Aptitude",   icon: FiBookOpen },
  technical: { color: "#3b82f6", glow: "rgba(59,130,246,0.2)",  label: "Technical",  icon: FiCpu },
  coding:    { color: "#06b6d4", glow: "rgba(6,182,212,0.2)",   label: "Coding",     icon: FiCode },
  interview: { color: "#ec4899", glow: "rgba(236,72,153,0.2)",  label: "Interview",  icon: FiMic },
  gd:        { color: "#22c55e", glow: "rgba(34,197,94,0.2)",   label: "GD",         icon: FiUsers },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,8,13,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px" }}>
      <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
          <span style={{ color: "#e5e7eb", fontSize: 12 }}>{p.name}: <strong style={{ color: p.color }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

// ── mini stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="stat-card" style={{ "--card-color": color, "--card-glow": color + "20" }}>
      <div className="stat-card-top">
        <div className="stat-icon" style={{ background: color + "18", border: `1px solid ${color}35` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="stat-value" style={{ color }}>{value}</span>
      </div>
      <p className="stat-label">{label}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

// ── section header ────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, color, action, onAction }) {
  return (
    <div className="section-title-row">
      <div className="section-title-left">
        <div className="section-icon" style={{ background: color + "18", border: `1px solid ${color}30` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <h2 className="section-title-text">{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} className="section-action" style={{ color }}>
          {action} <FiArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

// ── module activity card ──────────────────────────────────────────────────────
function ModuleCard({ module, count, score, cta, onCta, isEmpty }) {
  const m = MODULE_COLORS[module];
  const Icon = m.icon;
  return (
    <div className="module-card" style={{ "--mc": m.color, "--mc-glow": m.glow }}>
      <div className="module-card-header">
        <div className="module-icon-wrap" style={{ background: m.color + "18", border: `1px solid ${m.color}30` }}>
          <Icon size={18} style={{ color: m.color }} />
        </div>
        <span className="module-label">{m.label}</span>
      </div>
      {isEmpty ? (
        <div className="module-empty">
          <p>No activity yet</p>
          <button onClick={onCta} className="module-cta" style={{ color: m.color, borderColor: m.color + "40" }}>
            {cta} <FiArrowRight size={11} />
          </button>
        </div>
      ) : (
        <div className="module-stats">
          {count !== undefined && (
            <div className="module-stat">
              <span className="module-stat-val" style={{ color: m.color }}>{count}</span>
              <span className="module-stat-key">sessions</span>
            </div>
          )}
          {score !== undefined && (
            <div className="module-stat">
              <span className="module-stat-val">{score}</span>
              <span className="module-stat-key">avg score</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user: authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(authUser);
  const [tests, setTests] = useState([]);
  const [codingAttempts, setCodingAttempts] = useState([]);
  const [interviewAttempts, setInterviewAttempts] = useState([]);
  const [gdAttempts, setGdAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("aptitude");
  const [graphTopic, setGraphTopic] = useState(APTITUDE_TOPICS[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authUser?.id) { setLoading(false); return; }
    const controller = new AbortController();
    (async () => {
      try {
        const data = await getUserDetails(authUser.id, 1, 10000000, controller.signal);
        if (data.user) { setUser(data.user); updateUser(data.user); }
        setTests((data.tests || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        setCodingAttempts((data.coding || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        try {
          const g = await axios.get(`${API_BASE}/api/gd/user/${authUser.id}/history`, { signal: controller.signal });
          setGdAttempts(g.data || []);
        } catch (_) {}
        try {
          const iv = await axios.get(`${API_BASE}/api/interview/history/${authUser.id}`, { signal: controller.signal });
          setInterviewAttempts(iv.data.history || []);
        } catch (_) {}
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [authUser?.id]);

  useEffect(() => {
    if (!selectedFile) { setPreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleUpload = async () => {
    if (!selectedFile || !authUser?.id) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    try {
      const res = await axios.post(`${API_BASE}/api/user/${authUser.id}/upload-pfp`, fd);
      const u2 = { ...user, profile_picture_url: res.data.profile_picture_url };
      setUser(u2); updateUser(u2); setSelectedFile(null);
    } catch { alert("Upload failed."); } finally { setUploading(false); }
  };

  // ── derived data ──────────────────────────────────────────────────────────
  const aptTests = useMemo(() => tests.filter(t => APTITUDE_TOPICS.includes(t.topic)), [tests]);
  const techTests = useMemo(() => tests.filter(t => TECHNICAL_TOPICS.includes(t.topic)), [tests]);
  const codingSolved = useMemo(() => codingAttempts.filter(c => c.is_correct).length, [codingAttempts]);

  const avgScore = (arr) => arr.length === 0 ? "—" :
    (arr.reduce((s, t) => s + (t.score || 0), 0) / arr.length).toFixed(1);

  // topic list for current apt/tech tab
  const currentTopics = activeTab === "technical" ? TECHNICAL_TOPICS : APTITUDE_TOPICS;

  // 3-line topic trend: Easy / Moderate / Hard scores over attempts for selected topic
  const topicTrendData = useMemo(() => {
    if (activeTab !== "aptitude" && activeTab !== "technical") return [];
    const src = activeTab === "aptitude" ? aptTests : techTests;
    const topicTests = src.filter(t => t.topic === graphTopic && t.mode);
    const easy     = topicTests.filter(t => t.mode.toLowerCase() === "easy");
    const moderate = topicTests.filter(t => t.mode.toLowerCase() === "moderate");
    const hard     = topicTests.filter(t => t.mode.toLowerCase() === "hard");
    const maxLen = Math.max(easy.length, moderate.length, hard.length);
    if (maxLen === 0) return [];
    return Array.from({ length: maxLen }, (_, i) => ({
      attempt: `#${i + 1}`,
      Easy:     easy[i]     ? easy[i].score     : null,
      Moderate: moderate[i] ? moderate[i].score : null,
      Hard:     hard[i]     ? hard[i].score     : null,
    }));
  }, [activeTab, aptTests, techTests, graphTopic]);

  // chart data for coding / interview / gd tabs
  const chartData = useMemo(() => {
    if (activeTab === "coding") {
      return [
        { name: "Easy",   solved: codingAttempts.filter(c => c.is_correct && c.difficulty === "easy").length,   fill: "#22c55e" },
        { name: "Medium", solved: codingAttempts.filter(c => c.is_correct && c.difficulty === "medium").length, fill: "#06b6d4" },
        { name: "Hard",   solved: codingAttempts.filter(c => c.is_correct && c.difficulty === "hard").length,   fill: "#ec4899" },
      ];
    }
    if (activeTab === "interview") {
      return [...interviewAttempts].reverse().map((iv, i) => ({ n: i + 1, score: iv.score || 0 }));
    }
    if (activeTab === "gd") {
      return gdAttempts.map((g, i) => ({ n: i + 1, score: g.overall_score || 0 }));
    }
    return [];
  }, [activeTab, codingAttempts, interviewAttempts, gdAttempts]);

  // recent activity for tab
  const recentItems = useMemo(() => {
    if (activeTab === "aptitude") return [...aptTests].reverse().slice(0, 8);
    if (activeTab === "technical") return [...techTests].reverse().slice(0, 8);
    if (activeTab === "coding") return [...codingAttempts].reverse().slice(0, 8);
    if (activeTab === "interview") return [...interviewAttempts].slice(0, 6);
    if (activeTab === "gd") return [...gdAttempts].slice(0, 6);
    return [];
  }, [activeTab, aptTests, techTests, codingAttempts, interviewAttempts, gdAttempts]);

  if (loading) return (
    <div className="db-loading">
      <div className="db-spinner" />
      <p>Loading your dashboard...</p>
    </div>
  );

  const tabColor = MODULE_COLORS[activeTab].color;

  return (
    <div className="db-root">

      {/* ══ HEADER ══ */}
      <div className="db-header">
        <div>
          <h1 className="db-title">
            Hey, <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{user?.fname}</span> 👋
          </h1>
          <p className="db-sub">Here's your placement prep at a glance.</p>
        </div>
        <button onClick={() => navigate("/leaderboard")} className="db-lb-btn">
          <FiAward size={14} /> Leaderboard
        </button>
      </div>

      {/* ══ OVERVIEW STATS ══ */}
      <div className="db-stats-grid">
        <StatCard label="Aptitude Tests" value={aptTests.length} sub={`Avg ${avgScore(aptTests)}/20`} color="#a855f7" icon={FiBookOpen} />
        <StatCard label="Technical Tests" value={techTests.length} sub={`Avg ${avgScore(techTests)}/20`} color="#3b82f6" icon={FiCpu} />
        <StatCard label="Problems Solved" value={codingSolved} sub={`${codingAttempts.length} total attempts`} color="#06b6d4" icon={FiCode} />
        <StatCard label="Mock Interviews" value={interviewAttempts.length} color="#ec4899" icon={FiMic} />
        <StatCard label="GD Sessions" value={gdAttempts.length} color="#22c55e" icon={FiUsers} />
      </div>

      {/* ══ TWO-COLUMN LAYOUT ══ */}
      <div className="db-main-grid">

        {/* LEFT: profile card */}
        <div className="db-profile-card">
          <div className="db-avatar-wrap">
            <div className="db-avatar-ring" />
            <div className="db-avatar">
              {preview
                ? <img src={preview} className="db-avatar-img" alt="Preview" />
                : user?.profile_picture_url
                  ? <img src={`${API_BASE}${user.profile_picture_url}`} className="db-avatar-img" alt="Profile" />
                  : <span className="db-avatar-initial">{user?.fname?.[0]}</span>
              }
            </div>
            <label htmlFor="pfp" className="db-avatar-cam"><FiCamera size={14} /></label>
            <input type="file" id="pfp" className="hidden" onChange={e => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }} />
          </div>

          {selectedFile && (
            <button onClick={handleUpload} className="db-upload-btn" disabled={uploading}>
              <FiUpload size={12} /> {uploading ? "Saving..." : "Save Photo"}
            </button>
          )}

          <h2 className="db-name">{user?.fname} {user?.lname}</h2>
          <p className="db-email">{user?.email}</p>

          <div className="db-user-meta">
            <div className="db-meta-item"><span className="db-meta-label">Year</span><span className="db-meta-val">{user?.year || "—"}</span></div>
            <div className="db-meta-item"><span className="db-meta-label">Field</span><span className="db-meta-val" title={user?.field}>{user?.field || "—"}</span></div>
          </div>

          {/* quick module links */}
          <div className="db-quick-links">
            <p className="db-quick-title">Quick Access</p>
            {[
              { label: "Aptitude Hub",  path: "/aptitude",               color: "#a855f7" },
              { label: "Technical Hub", path: "/technical",              color: "#3b82f6" },
              { label: "Coding Arena",  path: "/technical/coding-levels",color: "#06b6d4" },
              { label: "Mock Interview",path: "/interview",              color: "#ec4899" },
              { label: "Resume AI",     path: "/resume-analyzer",        color: "#f97316" },
            ].map((l, i) => (
              <button key={i} onClick={() => navigate(l.path)} className="db-quick-link" style={{ "--ql": l.color }}>
                <span style={{ color: l.color }}>{l.label}</span>
                <FiArrowRight size={11} style={{ color: l.color }} />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: module activity */}
        <div className="db-right-col">

          {/* module tab bar */}
          <div className="db-tab-bar">
            {Object.entries(MODULE_COLORS).map(([key, m]) => {
              const Icon = m.icon;
              return (
                <button key={key} onClick={() => {
                    setActiveTab(key);
                    if (key === "aptitude") setGraphTopic(APTITUDE_TOPICS[0]);
                    else if (key === "technical") setGraphTopic(TECHNICAL_TOPICS[0]);
                  }}
                  className={`db-tab ${activeTab === key ? "db-tab-active" : ""}`}
                  style={activeTab === key ? { color: m.color, borderColor: m.color, background: m.color + "15" } : {}}>
                  <Icon size={13} />
                  <span className="db-tab-label">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* chart */}
          <div className="db-chart-card" style={{ "--tc": tabColor }}>

            {/* header row: title + topic dropdown for apt/tech */}
            <div className="db-chart-header">
              <p className="db-chart-title">
                {activeTab === "coding" ? "Problems solved by difficulty"
                  : activeTab === "interview" ? "Interview score over time"
                  : activeTab === "gd" ? "GD score over time"
                  : `Score trend — ${graphTopic}`}
              </p>

              {(activeTab === "aptitude" || activeTab === "technical") && (
                <div className="db-topic-select-wrap">
                  <select
                    value={graphTopic}
                    onChange={e => setGraphTopic(e.target.value)}
                    className="db-topic-select"
                    style={{ borderColor: tabColor + "40", color: tabColor }}
                  >
                    {currentTopics.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 3-line chart for aptitude / technical */}
            {(activeTab === "aptitude" || activeTab === "technical") ? (
              topicTrendData.length === 0 ? (
                <div className="db-chart-empty">
                  <p>No attempts recorded for <strong style={{ color: tabColor }}>{graphTopic}</strong> yet.</p>
                  <button onClick={() => navigate(activeTab === "technical" ? "/technical" : "/aptitude")}
                    className="db-chart-cta" style={{ color: tabColor, borderColor: tabColor + "50" }}>
                    Go practice <FiArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <>
                  {/* legend */}
                  <div className="db-legend">
                    {[
                      { key: "Easy",     color: "#22c55e" },
                      { key: "Moderate", color: "#06b6d4" },
                      { key: "Hard",     color: "#ec4899" },
                    ].map(l => (
                      <div key={l.key} className="db-legend-item">
                        <div className="db-legend-dot" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                        <span>{l.key}</span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={topicTrendData} margin={{ left: -10, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                      <XAxis dataKey="attempt" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 20]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="Easy"     stroke="#22c55e" strokeWidth={2.5}
                        dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
                      <Line type="monotone" dataKey="Moderate" stroke="#06b6d4" strokeWidth={2.5}
                        dot={{ r: 3, fill: "#06b6d4", strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
                      <Line type="monotone" dataKey="Hard"     stroke="#ec4899" strokeWidth={2.5}
                        dot={{ r: 3, fill: "#ec4899", strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )
            ) : chartData.length === 0 ? (
              <div className="db-chart-empty">
                <p>No data yet — complete some {MODULE_COLORS[activeTab].label} sessions to see your progress here.</p>
                <button onClick={() => navigate(
                  activeTab === "coding" ? "/technical/coding-levels"
                  : activeTab === "interview" ? "/interview"
                  : "/gd"
                )} className="db-chart-cta" style={{ color: tabColor, borderColor: tabColor + "50" }}>
                  Go to {MODULE_COLORS[activeTab].label} <FiArrowRight size={12} />
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                {activeTab === "coding" ? (
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={52} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="solved" radius={[0, 8, 8, 0]} barSize={22}>
                      {chartData.map((e, i) => <cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart data={chartData} margin={{ left: -10 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tabColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={tabColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="n" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={activeTab === "gd" ? [0, 50] : [0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="score" stroke={tabColor} strokeWidth={2.5} fill="url(#areaGrad)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* recent activity */}
          <div className="db-activity-card">
            <p className="db-activity-title">Recent Activity</p>
            {recentItems.length === 0 ? (
              <p className="db-activity-empty">Nothing yet. Start a session to see your history here.</p>
            ) : (
              <div className="db-activity-list">
                {recentItems.map((item, i) => {
                  if (activeTab === "coding") return (
                    <div key={i} className="db-activity-row">
                      <div className="db-activity-main">
                        {item.is_correct
                          ? <FiCheckCircle size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
                          : <FiXCircle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />}
                        <span className="db-activity-name">{item.problem_title}</span>
                      </div>
                      <div className="db-activity-meta">
                        <span className="db-diff-badge" style={{
                          color: item.difficulty === "easy" ? "#22c55e" : item.difficulty === "medium" ? "#06b6d4" : "#ec4899",
                          borderColor: item.difficulty === "easy" ? "#22c55e40" : item.difficulty === "medium" ? "#06b6d440" : "#ec489940",
                        }}>{item.difficulty}</span>
                        <span className="db-activity-date">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  );
                  if (activeTab === "interview") return (
                    <div key={i} className="db-activity-row">
                      <div className="db-activity-main">
                        <FiMic size={13} style={{ color: "#ec4899", flexShrink: 0 }} />
                        <span className="db-activity-name">{item.role || "Mock Interview"}</span>
                      </div>
                      <div className="db-activity-meta">
                        <span className="db-score-badge" style={{
                          color: item.score >= 75 ? "#22c55e" : item.score >= 50 ? "#eab308" : "#ef4444"
                        }}>{item.score}/100</span>
                        <span className="db-activity-date">{item.timestamp || ""}</span>
                      </div>
                    </div>
                  );
                  if (activeTab === "gd") return (
                    <div key={i} className="db-activity-row">
                      <div className="db-activity-main">
                        <FiUsers size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
                        <span className="db-activity-name">{item.topic || "Group Discussion"}</span>
                      </div>
                      <div className="db-activity-meta">
                        <span className="db-score-badge" style={{ color: "#22c55e" }}>{item.overall_score}/50</span>
                        <span className="db-activity-date">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  );
                  return (
                    <div key={i} className="db-activity-row">
                      <div className="db-activity-main">
                        <FiTarget size={13} style={{ color: tabColor, flexShrink: 0 }} />
                        <span className="db-activity-name">{item.topic}</span>
                      </div>
                      <div className="db-activity-meta">
                        <span className="db-score-badge" style={{ color: tabColor }}>{item.score}/{item.total}</span>
                        <span className="db-activity-tag">{item.mode || "standard"}</span>
                        <span className="db-activity-date">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;700&display=swap');

        .db-root { min-height: 100vh; padding: 24px 24px 80px; max-width: 1200px; margin: 0 auto; font-family: 'DM Sans', sans-serif; color: #e2e8f0; }

        /* LOADING */
        .db-loading { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #6b7280; font-size: 14px; }
        .db-spinner { width: 36px; height: 36px; border: 3px solid rgba(168,85,247,0.2); border-top-color: #a855f7; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* HEADER */
        .db-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .db-title { font-family: 'Syne', sans-serif; font-size: clamp(26px, 4vw, 36px); font-weight: 800; color: #fff; letter-spacing: -0.03em; margin: 0; }
        .db-sub { color: #4b5563; font-size: 14px; margin: 4px 0 0; }
        .db-lb-btn {
          display: flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 12px;
          font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
          background: rgba(250,204,21,0.08); border: 1px solid rgba(250,204,21,0.25); color: #fbbf24;
          transition: all 0.2s;
        }
        .db-lb-btn:hover { background: rgba(250,204,21,0.15); transform: translateY(-1px); }

        /* STATS GRID */
        .db-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
        @media(max-width:900px) { .db-stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media(max-width:600px) { .db-stats-grid { grid-template-columns: repeat(2, 1fr); } }

        .stat-card {
          padding: 16px; border-radius: 16px; cursor: default;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          transition: border-color 0.2s, transform 0.2s;
        }
        .stat-card:hover { border-color: color-mix(in srgb, var(--card-color) 30%, transparent); transform: translateY(-2px); }
        .stat-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .stat-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .stat-value { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }
        .stat-label { font-size: 12px; color: #4b5563; font-weight: 600; }
        .stat-sub { font-size: 11px; color: #374151; margin-top: 2px; }

        /* MAIN GRID */
        .db-main-grid { display: grid; grid-template-columns: 240px 1fr; gap: 20px; }
        @media(max-width:900px) { .db-main-grid { grid-template-columns: 1fr; } }

        /* PROFILE CARD */
        .db-profile-card {
          border-radius: 20px; padding: 24px; display: flex; flex-direction: column; align-items: center;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
          height: fit-content; position: sticky; top: 80px;
        }
        .db-avatar-wrap { position: relative; width: 90px; height: 90px; margin-bottom: 16px; }
        .db-avatar-ring {
          position: absolute; inset: -4px; border-radius: 50%;
          border: 2px dashed rgba(168,85,247,0.3);
          animation: slowSpin 12s linear infinite;
        }
        @keyframes slowSpin { to { transform: rotate(360deg); } }
        .db-avatar { width: 90px; height: 90px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
        .db-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .db-avatar-initial { font-size: 32px; font-weight: 800; color: #374151; }
        .db-avatar-cam {
          position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg,#a855f7,#ec4899); display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #fff; border: 2px solid #07070a;
        }
        .db-upload-btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px;
          font-size: 12px; font-weight: 700; cursor: pointer; margin-bottom: 12px;
          background: linear-gradient(135deg,#a855f7,#ec4899); color: #fff; border: none;
        }
        .db-name { font-size: 16px; font-weight: 800; color: #fff; text-align: center; margin: 0 0 4px; }
        .db-email { font-size: 11px; color: #4b5563; text-align: center; margin: 0 0 16px; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .db-user-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; margin-bottom: 20px; }
        .db-meta-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px; }
        .db-meta-label { display: block; font-size: 10px; color: #4b5563; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
        .db-meta-val { font-size: 14px; font-weight: 800; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }

        .db-quick-links { width: 100%; display: flex; flex-direction: column; gap: 4px; }
        .db-quick-title { font-size: 10px; color: #374151; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 8px; }
        .db-quick-link {
          display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-radius: 10px;
          font-size: 12px; font-weight: 600; cursor: pointer; width: 100%;
          background: transparent; border: 1px solid transparent; transition: all 0.15s;
        }
        .db-quick-link:hover { background: color-mix(in srgb, var(--ql) 8%, transparent); border-color: color-mix(in srgb, var(--ql) 25%, transparent); }

        /* RIGHT COLUMN */
        .db-right-col { display: flex; flex-direction: column; gap: 16px; }

        /* TABS */
        .db-tab-bar { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
        .db-tab-bar::-webkit-scrollbar { display: none; }
        .db-tab {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px;
          font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0;
          color: #4b5563; background: transparent; border: 1px solid transparent; transition: all 0.15s;
        }
        .db-tab:hover { background: rgba(255,255,255,0.04); color: #9ca3af; }
        .db-tab-active { font-weight: 800; }
        .db-tab-label { }

        /* CHART CARD */
        .db-chart-card {
          border-radius: 18px; padding: 20px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
          border-top: 2px solid color-mix(in srgb, var(--tc) 50%, transparent);
        }
        .db-chart-title { font-size: 12px; color: #4b5563; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.06em; }
        .db-chart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 160px; text-align: center; }
        .db-chart-empty p { font-size: 13px; color: #374151; max-width: 300px; line-height: 1.5; }
        .db-chart-cta { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; background: transparent; border: 1px solid; }

        /* ACTIVITY CARD */
        .db-activity-card { border-radius: 18px; padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); }
        .db-activity-title { font-size: 12px; color: #4b5563; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .db-activity-empty { font-size: 13px; color: #374151; }
        .db-activity-list { display: flex; flex-direction: column; gap: 2px; }
        .db-activity-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 10px; border-radius: 10px; transition: background 0.15s; }
        .db-activity-row:hover { background: rgba(255,255,255,0.03); }
        .db-activity-main { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
        .db-activity-name { font-size: 13px; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .db-activity-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .db-activity-date { font-size: 10px; color: #374151; font-family: monospace; }
        .db-activity-tag { font-size: 10px; color: #4b5563; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; text-transform: capitalize; }
        .db-score-badge { font-size: 12px; font-weight: 800; font-family: monospace; }
        .db-diff-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 6px; border: 1px solid; }
      `}</style>
    </div>
  );
}