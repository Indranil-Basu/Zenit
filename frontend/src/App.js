import { useState, useEffect, useRef } from "react";
import "./App.css";

const MOODS = ["Low", "Medium", "High"];
const QUOTES = [
  "Small steps every day lead to big results.",
  "Discipline is choosing between what you want now and what you want most.",
  "Focus on progress, not perfection.",
  "Your future self is watching. Make them proud.",
  "One task at a time. You've got this.",
];

function parseSchedule(text) {
  const lines = text.split("\n").filter(l => l.includes("|"));
  return lines.map(line => {
    const parts = line.split("|").map(p => p.trim());
    const time = parts[0] || "";
    const task = parts[1] || "";
    const tip = (parts[2] || "").replace(/^tip:\s*/i, "");
    return { time, task, tip };
  }).filter(item => item.time && item.task);
}
function requestNotificationPermission() {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

function scheduleNotifications(scheduleItems) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  scheduleItems.forEach(item => {
    const timeStr = item.time.split("-")[0].trim();
    const [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const now = new Date();
    const taskTime = new Date();
    taskTime.setHours(hours, minutes, 0, 0);

    const diff = taskTime - now;
    if (diff > 0) {
      setTimeout(() => {
        new Notification("⚡ Zenit Reminder", {
          body: `Time to start: ${item.task}`,
          icon: "/favicon.ico",
        });
      }, diff);
    }
  });
}

function Intro({ onDone }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.6,
      dy: (Math.random() - 0.5) * 0.6,
      opacity: Math.random() * 0.7 + 0.3,
    }));

    let frame;
    let start = null;

    function draw(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 100, 255, ${p.opacity})`;
        ctx.fill();
      });

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(124, 58, 237, ${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const pulse = Math.sin(elapsed / 400) * 15;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220 + pulse);
      grad.addColorStop(0, "rgba(124, 58, 237, 0.25)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 220 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4600),
      setTimeout(() => onDone(), 6200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="intro">
      <canvas ref={canvasRef} className="intro-canvas" />
      <div className="intro-content">
        <div className={`intro-badge ${phase >= 1 ? "show" : ""}`}>AI-Powered Productivity</div>
        <div className={`intro-logo ${phase >= 2 ? "show" : ""}`}>
          <span className="intro-bolt">⚡</span>
          <span>Zenit</span>
        </div>
        <div className={`intro-sub ${phase >= 3 ? "show" : ""}`}>
          Your intelligent daily schedule assistant
        </div>
        <div className={`intro-features ${phase >= 4 ? "show" : ""}`}>
          <span>⚡ AI Scheduling</span>
          <span>🎯 Priority Tasks</span>
          <span>📊 Dashboard</span>
          <span>🕐 Timeline View</span>
        </div>
        <div className={`intro-enter ${phase >= 4 ? "show" : ""}`} onClick={onDone}>
          Enter Zenit →
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [appVisible, setAppVisible] = useState(false);
  const [tasks, setTasks] = useState("");
  const [mood, setMood] = useState("Medium");
  const [priorities, setPriorities] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [rawSchedule, setRawSchedule] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zenit_history") || "[]"); }
    catch { return []; }
  });
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem("zenit_streak") || "0"));
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [copied, setCopied] = useState(false);
  const [activeHistory, setActiveHistory] = useState(null);

  const handleIntroDone = () => {
    setShowIntro(false);
    setTimeout(() => setAppVisible(true), 100);
  };

  const generateSchedule = async () => {
    if (!tasks.trim()) return;
    setLoading(true);
    setSchedule([]);
    
    setActiveHistory(null);
    try {
        const response = await fetch("https://zenit-backend-ii36.onrender.com/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, mood, priorities }),
      });
      const data = await response.json();
      const parsed = parseSchedule(data.schedule);
      setSchedule(parsed);
      setRawSchedule(data.schedule);
      requestNotificationPermission();
      scheduleNotifications(parsed);
      const newEntry = { id: Date.now(), date: new Date().toLocaleDateString(), tasks, mood, schedule: parsed, raw: data.schedule };
      const newHistory = [newEntry, ...history].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem("zenit_history", JSON.stringify(newHistory));
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("zenit_streak", newStreak);
    } catch { setSchedule([]); }
    setLoading(false);
  };

  const copySchedule = () => {
    navigator.clipboard.writeText(rawSchedule);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSchedule = () => {
    const blob = new Blob([rawSchedule], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "zenit-schedule.txt";
    a.click();
  };

  const moodColors = { Low: "#3b82f6", Medium: "#a855f7", High: "#f59e0b" };
  const displaySchedule = activeHistory ? activeHistory.schedule : schedule;

  if (showIntro) return <Intro onDone={handleIntroDone} />;

  return (
    <div className={`app ${appVisible ? "app-visible" : ""}`}>
      <div className="bg-animation">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      <div className="content">
        <div className="hero">
          <h1 className="logo">⚡ Zenit</h1>
          <p className="tagline">Your AI-powered daily schedule assistant</p>
        </div>

        <div className="dashboard">
          <div className="dash-card">
            <div className="dash-label">Schedules generated</div>
            <div className="dash-value">{streak}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Today's quote</div>
            <div className="dash-quote">"{quote}"</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">History saved</div>
            <div className="dash-value">{history.length}</div>
          </div>
        </div>

        <div className="card">
          <label>What are your tasks for today?</label>
          <textarea value={tasks} onChange={e => setTasks(e.target.value)} placeholder="e.g. Study DSA for 2 hours, go to gym, complete assignment..." rows={3} />
          <label style={{ marginTop: "1rem" }}>High priority tasks?</label>
          <input type="text" value={priorities} onChange={e => setPriorities(e.target.value)} placeholder="e.g. Complete assignment, prepare for interview" className="text-input" />
          <label style={{ marginTop: "1rem" }}>Your energy level today</label>
          <div className="mood-row">
            {MOODS.map(m => (
              <button key={m} className={`mood-btn ${mood === m ? "mood-active" : ""}`} style={mood === m ? { borderColor: moodColors[m], color: moodColors[m] } : {}} onClick={() => setMood(m)}>
                {m === "Low" ? "😴" : m === "Medium" ? "😊" : "🔥"} {m}
              </button>
            ))}
          </div>
          <button className="gen-btn" onClick={generateSchedule} disabled={loading}>
            {loading ? "Generating..." : "⚡ Generate My Schedule"}
          </button>
        </div>

        {history.length > 0 && (
          <div className="card">
            <label>Recent schedules</label>
            <div className="history-list">
              {history.map(h => (
                <div key={h.id} className={`history-item ${activeHistory?.id === h.id ? "history-active" : ""}`} onClick={() => setActiveHistory(activeHistory?.id === h.id ? null : h)}>
                  <span>{h.date}</span>
                  <span className="history-mood" style={{ color: moodColors[h.mood] }}>{h.mood} energy</span>
                  <span className="history-tasks">{h.tasks.slice(0, 40)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {displaySchedule.length > 0 && (
          <div className="card">
            <div className="notif-banner">
  🔔 Notifications are enabled — Zenit will remind you before each task!
</div>
            <div className="result-header">
              <h2>Your Schedule</h2>
              <div className="result-actions">
                <button className="icon-btn" onClick={copySchedule}>{copied ? "✅ Copied!" : "📋 Copy"}</button>
                <button className="icon-btn" onClick={downloadSchedule}>⬇ Download</button>
              </div>
            </div>
            <div className="timeline">
              {displaySchedule.map((item, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-time">{item.time}</div>
                    <div className="timeline-task">{item.task}</div>
                    {item.tip && <div className="timeline-tip">💡 {item.tip}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}