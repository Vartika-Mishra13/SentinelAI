import React, { useEffect, useState } from "react";
import API from "../services/api";
import RequestChart from "../components/RequestChart";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState(
    JSON.parse(localStorage.getItem("chartData") || "[]")
  );
  const [history, setHistory] = useState(
    JSON.parse(localStorage.getItem("history") || "[]")
  );
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "");
  const [threatLevel, setThreatLevel] = useState("🟢 Normal");
  const [requestTimes, setRequestTimes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [requestsLimit] = useState(5);
  const [showKey, setShowKey] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  // 🖥 Admin stats
  const [adminStats, setAdminStats] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) window.location.href = "/login";
    if (!apiKey) generateApiKey();
    else {
      fetchData();
      fetchAdminStats();
    }
  }, [token]);

  // ========================== THREAT & AI LOGIC ==========================
  const calculateThreat = (used, limit) => {
    if (used >= limit) return "🔴 Attack Detected";
    if (used >= Math.ceil(limit * 0.6)) return "🟡 Suspicious Activity";
    return "🟢 Normal";
  };

  const detectAnomaly = (times) => {
    const now = Date.now();
    const last2Sec = times.filter((t) => now - t <= 2000);
    const last10Sec = times.filter((t) => now - t <= 10000);

    let alert = null;

    if (last2Sec.length >= 3) alert = "⚡ Burst Activity Detected";
    else if (last10Sec.length >= 5) alert = "📈 Traffic Spike Detected";
    else if (times.length >= requestsLimit - 1) alert = "🔥 Continuous High Usage";

    return alert;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRequestTimes((prev) => {
        const now = Date.now();
        const recent = prev.filter((t) => now - t <= 60000);
        if (recent.length !== prev.length) {
          setThreatLevel(calculateThreat(recent.length, requestsLimit));
        }
        return recent;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [requestsLimit]);

const recordRequest = (endpoint) => {
  const now = Date.now();

  // Only keep requests from last 60 seconds
  const recent = [...requestTimes, now].filter((t) => now - t <= 60000);
  setRequestTimes(recent);

  const used = recent.length;

  // Update threat level based on sliding window
  const threat = calculateThreat(used, requestsLimit);
  setThreatLevel(threat);

  // Detect anomalies for AI alerts
  const anomaly = detectAnomaly(recent);
  if (anomaly) {
    toast.error(anomaly);
    setAlerts((prev) => [
      { time: new Date().toLocaleTimeString(), message: anomaly },
      ...prev.slice(0, 5),
    ]);
  }

  // Update chart and history
  setChartData((prev) => [
    ...prev,
    { time: new Date().toLocaleTimeString(), requests: used },
  ]);

  setHistory((prev) => [
    {
      time: new Date().toLocaleTimeString(),
      threat,
      endpoint,
      requests: used,
    },
    ...prev.slice(0, 9),
  ]);

  // Toast for attack/suspicious activity
  if (threat === "🔴 Attack Detected")
    toast.error(`🚨 Attack! (${used}/${requestsLimit})`);
  else if (threat === "🟡 Suspicious Activity")
    toast.warning(`⚠️ Suspicious (${used}/${requestsLimit})`);
};
  // ========================== API CALLS ==========================
const fetchData = async () => {
  if (!apiKey) return toast.warning("Generate API key first");
  try {
    setLoading(true);

    // 1️⃣ Fetch user data
    const res = await API.get("/user/data", { headers: { "x-api-key": apiKey } });
    setData(res.data);
    fetchAdminStats();
    recordRequest("/user/data");

    // 2️⃣ Fetch updated admin stats immediately
  } catch (err) {
    if (err.response?.status === 429) {
      toast.error("Rate limit exceeded");
      setThreatLevel("🔴 Attack Detected");
    }
  } finally {
    setLoading(false);
  }
};

  const generateApiKey = async () => {
    try {
      const res = await API.post(
        "/user/generate-api-key",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApiKey(res.data.apiKey);
      localStorage.setItem("apiKey", res.data.apiKey);
      toast.success("API Key Generated");
    } catch {
      toast.error("Error generating key");
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await API.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      setAdminStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ========================== UI STYLING ==========================
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newTheme = !prev;
      localStorage.setItem("theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  const threatColor = threatLevel.includes("🔴")
    ? "#f44336"
    : threatLevel.includes("🟡")
    ? "#ff9800"
    : "#4caf50";

  const threatGlow =
    threatLevel.includes("🔴")
      ? "0 0 15px rgba(244,67,54,0.7)"
      : threatLevel.includes("🟡")
      ? "0 0 15px rgba(255,152,0,0.7)"
      : "0 0 10px rgba(76,175,80,0.5)";

  const buttonStyle = {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    background: darkMode ? "#333" : "#e0e0e0",
    color: darkMode ? "#fff" : "#000",
    transition: "all 0.2s ease",
  };

  const cardBase = {
    flex: "1 1 300px",
    padding: "15px",
    borderRadius: "8px",
    background: darkMode ? "#1e1e1e" : "#f9f9f9",
    color: darkMode ? "#fff" : "#000",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    transition: "all 0.3s ease",
    cursor: "pointer",
  };

  // ========================== RENDER ==========================
  return (
    <div
      style={{
        background: darkMode ? "#121212" : "#fff",
        color: darkMode ? "#fff" : "#000",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>🚀 SentinelAI Dashboard</h1>
        <button style={buttonStyle} onClick={toggleTheme}>
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* =================== ADMIN STATS =================== */}
      {adminStats && (
        <div style={{ marginTop: "20px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={cardBase}>
            <h3>Total Requests</h3>
            <p>{adminStats.totalRequests}</p>
          </div>
          <div style={cardBase}>
            <h3>Normal</h3>
            <p>{adminStats.normalRequests}</p>
          </div>
          <div style={cardBase}>
            <h3>Suspicious</h3>
            <p>{adminStats.suspiciousRequests}</p>
          </div>
          <div style={cardBase}>
            <h3>Blocked</h3>
            <p>{adminStats.blockedRequests}</p>
          </div>
        </div>
      )}

      {/* =================== EXISTING DASHBOARD =================== */}
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginTop: "20px" }}>
        {/* Threat */}
        <div
          style={{
            ...cardBase,
            borderLeft: `5px solid ${threatColor}`,
            boxShadow: `${threatGlow}, 0 2px 8px rgba(0,0,0,0.1)`,
          }}
        >
          <h2 style={{ color: threatColor }}>{threatLevel}</h2>
          <p>Requests: {requestTimes.length}/{requestsLimit}</p>
        </div>

        {/* API Key */}
        <div style={cardBase}>
          <h3>🔑 API Key</h3>
          <p>{showKey ? apiKey : apiKey.slice(0, 6) + "••••••••"}</p>
          <button style={buttonStyle} onClick={() => navigator.clipboard.writeText(apiKey)}>Copy</button>
          <button style={{ ...buttonStyle, marginLeft: "5px" }} onClick={() => setShowKey(!showKey)}>Show/Hide</button>
          <button style={{ ...buttonStyle, marginLeft: "5px" }} onClick={generateApiKey}>Regenerate</button>
        </div>
      </div>

      {/* Refresh / Logout Buttons */}
      <div style={{ marginTop: "20px" }}>
        <button style={buttonStyle} onClick={fetchData}>
          {loading ? "⏳ Fetching..." : "🔄 Refresh Data"}
        </button>
        <button style={{ ...buttonStyle, marginLeft: "10px" }} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ ...cardBase, marginTop: "20px" }}>
          <h3>📊 Requests</h3>
          <RequestChart data={chartData} />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ ...cardBase, marginTop: "20px" }}>
          <h3>📝 History</h3>
          {history.map((h, i) => (
            <div key={i} style={{ padding: "8px", marginBottom: "6px", borderRadius: "6px", background: darkMode ? "#2a2a2a" : "#eee" }}>
              {h.time} - {h.threat}
              <br />
              <strong>{h.endpoint}</strong> ({h.requests})
            </div>
          ))}
        </div>
      )}

      {/* AI Alerts */}
      {alerts.length > 0 && (
        <div style={{ ...cardBase, marginTop: "20px" }}>
          <h3>🚨 AI Alerts</h3>
          {alerts.map((a, i) => (
            <div key={i} style={{ padding: "8px", marginBottom: "6px", borderRadius: "6px", background: "#ff5252", color: "#fff", fontSize: "14px" }}>
              {a.time} – {a.message}
            </div>
          ))}
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default Dashboard;