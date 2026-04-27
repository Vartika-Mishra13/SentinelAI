import React, { useEffect, useState } from "react";
import API from "../services/api";
import RequestChart from "../components/RequestChart";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LIVE_REFRESH_MS = 5000;

const Dashboard = () => {
  const [chartData, setChartData] = useState(
    JSON.parse(localStorage.getItem("chartData") || "[]")
  );
  const [history, setHistory] = useState(
    JSON.parse(localStorage.getItem("history") || "[]")
  );
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "");
  const [threatLevel, setThreatLevel] = useState("Normal");
  const [, setRequestTimes] = useState([]);
  const [, setAlerts] = useState([]);
  const [showKey, setShowKey] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );
  const [adminStats, setAdminStats] = useState(null);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rules, setRules] = useState(null);
  const [ruleForm, setRuleForm] = useState(null);

  const [trafficSearch, setTrafficSearch] = useState("");
  const [trafficStatus, setTrafficStatus] = useState("");
  const [trafficPage, setTrafficPage] = useState(1);
  const [trafficPagination, setTrafficPagination] = useState(null);

  const [blockedSearch, setBlockedSearch] = useState("");
  const [blockedPage, setBlockedPage] = useState(1);
  const [blockedPagination, setBlockedPagination] = useState(null);

  const [keySearch, setKeySearch] = useState("");
  const [keyStatus, setKeyStatus] = useState("");
  const [keyPage, setKeyPage] = useState(1);
  const [keyPagination, setKeyPagination] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    return () => document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("chartData", JSON.stringify(chartData));
  }, [chartData]);

  useEffect(() => {
    localStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const activeRules = rules || {
    slidingLimit: 5,
    suspiciousThresholdPercent: 60,
    burstThresholdCount: 3,
    burstWindowSeconds: 2,
    spikeThresholdCount: 5,
    spikeWindowSeconds: 10,
  };

  const calculateThreat = (used, limit) => {
    if (used >= limit) return "Attack Detected";
    if (used >= Math.ceil(limit * (activeRules.suspiciousThresholdPercent / 100))) {
      return "Suspicious Activity";
    }
    return "Normal";
  };

  const detectAnomaly = (times) => {
    const now = Date.now();
    const lastBurstWindow = times.filter(
      (time) => now - time <= activeRules.burstWindowSeconds * 1000
    );
    const lastSpikeWindow = times.filter(
      (time) => now - time <= activeRules.spikeWindowSeconds * 1000
    );

    if (lastBurstWindow.length >= activeRules.burstThresholdCount) {
      return `Burst detected: ${lastBurstWindow.length} requests in ${activeRules.burstWindowSeconds}s`;
    }

    if (lastSpikeWindow.length >= activeRules.spikeThresholdCount) {
      return `Traffic spike: ${lastSpikeWindow.length} requests in ${activeRules.spikeWindowSeconds}s`;
    }

    if (times.length >= Math.max(activeRules.slidingLimit - 1, 1)) {
      return `High usage: ${times.length}/${activeRules.slidingLimit} requests`;
    }

    return null;
  };

  const recordRequest = (endpoint) => {
    const now = Date.now();

    setRequestTimes((prev) => {
      const recent = [...prev, now].filter(
        (time) => now - time <= activeRules.slidingWindowSeconds * 1000
      );
      const used = recent.length;
      const threat = calculateThreat(used, activeRules.slidingLimit);
      const anomaly = detectAnomaly(recent);

      setThreatLevel(threat);

      if (anomaly) {
        toast.error(anomaly);
        setAlerts((prevAlerts) => [
          { time: new Date().toLocaleTimeString(), message: anomaly },
          ...prevAlerts.slice(0, 5),
        ]);
      }

      setChartData((prevChartData) => [
        ...prevChartData,
        { time: new Date().toLocaleTimeString(), requests: used },
      ]);

      setHistory((prevHistory) => [
        {
          time: new Date().toLocaleTimeString(),
          threat,
          endpoint,
          requests: used,
        },
        ...prevHistory.slice(0, 9),
      ]);

      if (threat === "Attack Detected") {
        toast.error(`Attack! (${used}/${activeRules.slidingLimit})`);
      } else if (threat === "Suspicious Activity") {
        toast.warning(`Suspicious (${used}/${activeRules.slidingLimit})`);
      }

      return recent;
    });
  };

  const fetchRules = async () => {
    const res = await API.get("/admin/rules", { headers: authHeaders });
    setRules(res.data.rules);
    setRuleForm({
      slidingLimit: res.data.rules.slidingLimit,
      slidingWindowSeconds: res.data.rules.slidingWindowSeconds,
      suspiciousThresholdPercent: res.data.rules.suspiciousThresholdPercent,
      burstThresholdCount: res.data.rules.burstThresholdCount,
      burstWindowSeconds: res.data.rules.burstWindowSeconds,
      spikeThresholdCount: res.data.rules.spikeThresholdCount,
      spikeWindowSeconds: res.data.rules.spikeWindowSeconds,
      ipBurstThresholdCount: res.data.rules.ipBurstThresholdCount,
      ipBurstWindowSeconds: res.data.rules.ipBurstWindowSeconds,
      ipBlockDurationSeconds: res.data.rules.ipBlockDurationSeconds,
      userHourlyLimit: res.data.rules.userHourlyLimit,
    });
  };

  const fetchAdminStats = async () => {
    const res = await API.get("/admin/stats", {
      headers: authHeaders,
      params: {
        page: trafficPage,
        limit: 10,
        search: trafficSearch,
        status: trafficStatus || undefined,
      },
    });
    setAdminStats(res.data);
    setTrafficPagination(res.data.requestPagination);
    if (res.data.rules && !rules) {
      setRules(res.data.rules);
    }
  };

  const fetchBlockedIPs = async () => {
    const res = await API.get("/admin/blocked-ips", {
      headers: authHeaders,
      params: {
        page: blockedPage,
        limit: 5,
        search: blockedSearch || undefined,
      },
    });
    setBlockedIPs(res.data.blockedIPs || []);
    setBlockedPagination(res.data.pagination);
  };

  const fetchApiKeys = async () => {
    const res = await API.get("/admin/api-keys", {
      headers: authHeaders,
      params: {
        page: keyPage,
        limit: 5,
        search: keySearch || undefined,
        status: keyStatus || undefined,
      },
    });
    setApiKeys(res.data.apiKeys || []);
    setKeyPagination(res.data.pagination);
  };

  const fetchAdminData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setAdminLoading(true);
      }

      await Promise.all([
        fetchAdminStats(),
        fetchBlockedIPs(),
        fetchApiKeys(),
        !rules ? fetchRules() : Promise.resolve(),
      ]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) {
        setAdminLoading(false);
      }
    }
  };

  const fetchData = async () => {
    if (!apiKey) {
      toast.warning("Generate API key first");
      return;
    }

    try {
      setLoading(true);
      await API.get("/user/data", { headers: { "x-api-key": apiKey } });
      await fetchAdminData({ silent: true });
      recordRequest("/user/data");
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error("Rate limit exceeded");
        setThreatLevel("Attack Detected");
      } else {
        toast.error(err.response?.data?.message || "Failed to fetch data");
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
        { headers: authHeaders }
      );
      setApiKey(res.data.apiKey);
      localStorage.setItem("apiKey", res.data.apiKey);
      toast.success("API Key Generated");
      await fetchAdminData({ silent: true });
      return res.data.apiKey;
    } catch {
      toast.error("Error generating key");
      return null;
    }
  };

  const saveRules = async () => {
    try {
      setRulesSaving(true);
      const res = await API.patch("/admin/rules", ruleForm, { headers: authHeaders });
      setRules(res.data.rules);
      toast.success("Security rules updated");
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update rules");
    } finally {
      setRulesSaving(false);
    }
  };

  const unblockIP = async (id) => {
    try {
      await API.delete(`/admin/blocked-ips/${id}`, { headers: authHeaders });
      toast.success("IP unblocked");
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unblock IP");
    }
  };

  const blockApiKey = async (userId) => {
    try {
      await API.patch(
        `/admin/api-keys/${userId}/block`,
        { reason: "Blocked from dashboard" },
        { headers: authHeaders }
      );
      toast.success("API key blocked");
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block API key");
    }
  };

  const unblockApiKey = async (userId) => {
    try {
      await API.patch(
        `/admin/api-keys/${userId}/unblock`,
        {},
        { headers: authHeaders }
      );
      toast.success("API key unblocked");
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unblock API key");
    }
  };

  const revokeApiKey = async (userId) => {
    try {
      await API.delete(`/admin/api-keys/${userId}`, { headers: authHeaders });
      toast.success("API key revoked");
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revoke API key");
    }
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, trafficPage, trafficStatus, blockedPage, keyPage, keyStatus]);

  useEffect(() => {
    if (!token || apiKey) {
      return;
    }

    generateApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, apiKey]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const interval = setInterval(() => {
      fetchAdminData({ silent: true });
    }, LIVE_REFRESH_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, trafficPage, blockedPage, keyPage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRequestTimes((prev) => {
        const now = Date.now();
        const recent = prev.filter(
          (time) => now - time <= activeRules.slidingWindowSeconds * 1000
        );

        if (recent.length !== prev.length) {
          setThreatLevel(calculateThreat(recent.length, activeRules.slidingLimit));
        }

        return recent;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRules.slidingLimit, activeRules.slidingWindowSeconds, activeRules.suspiciousThresholdPercent]);

  const handleLogout = () => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    window.location.href = "/login";
  };

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newTheme = !prev;
      localStorage.setItem("theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  const renderTrafficClass = (status) => {
    if (status === "Blocked") return "traffic-item blocked";
    if (status === "Suspicious") return "traffic-item suspicious";
    return "traffic-item";
  };

  const smartAlertFeed = (adminStats?.recentLogs || [])
    .filter((log) => log.reason)
    .slice(0, 5)
    .map((log) => ({
      id: log._id,
      time: new Date(log.timestamp).toLocaleTimeString(),
      message: `${log.status}: ${log.reason}`,
    }));

  const renderPagination = (pagination, page, setPage) => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="inline-actions">
        <button
          className="secondary-button"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
        >
          Previous
        </button>
        <span className="section-copy">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          className="secondary-button"
          disabled={page >= pagination.totalPages}
          onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className={`dashboard-shell${darkMode ? " dark" : ""}`}>
      <div className="dashboard-frame">
        <section className="dashboard-hero">
          <div className="dashboard-hero-top">
            <div>
              <span className="dashboard-kicker">Active Defense Console</span>
              <h1 className="dashboard-title">Watch traffic. Flag abuse. Act fast.</h1>
              <p className="dashboard-copy">
                SentinelAI now includes configurable gateway rules, searchable panels, threshold-driven alerts, basic Geo-IP context, and cleaner pagination for long admin views.
              </p>
            </div>

            <div className="button-row" style={{ marginTop: 0 }}>
              <button className="secondary-button" onClick={toggleTheme}>
                {darkMode ? "Switch to Light" : "Switch to Dark"}
              </button>
              <button className="primary-button" onClick={() => fetchAdminData()}>
                {adminLoading ? "Refreshing..." : "Sync Panels"}
              </button>
            </div>
          </div>

          <div className="dashboard-status-row">
            <div className="status-pill">
              <span className="status-pill-label">Refresh Cadence</span>
              <span className="status-pill-value">{LIVE_REFRESH_MS / 1000}s</span>
            </div>
            <div className="status-pill">
              <span className="status-pill-label">Sliding Limit</span>
              <span className="status-pill-value">
                {activeRules.slidingLimit}/{activeRules.slidingWindowSeconds || 60}s
              </span>
            </div>
            <div className="status-pill">
              <span className="status-pill-label">Threat State</span>
              <span className="status-pill-value">{threatLevel}</span>
            </div>
            <div className="status-pill">
              <span className="status-pill-label">Last Update</span>
              <span className="status-pill-value">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "Pending"}
              </span>
            </div>
          </div>
        </section>

        {adminStats && (
          <section className="dashboard-grid">
            <div className="stats-grid">
              <div className="panel-card stat-card">
                <span className="stat-label">Total Requests</span>
                <p className="stat-value">{adminStats.totalRequests}</p>
              </div>
              <div className="panel-card stat-card">
                <span className="stat-label">Normal</span>
                <p className="stat-value">{adminStats.normalRequests}</p>
              </div>
              <div className="panel-card stat-card">
                <span className="stat-label">Suspicious</span>
                <p className="stat-value">{adminStats.suspiciousRequests}</p>
              </div>
              <div className="panel-card stat-card">
                <span className="stat-label">Blocked</span>
                <p className="stat-value">{adminStats.blockedRequests}</p>
              </div>
              <div className="panel-card stat-card">
                <span className="stat-label">Blocked IPs</span>
                <p className="stat-value">{adminStats.activeBlockedIPs || 0}</p>
              </div>
              <div className="panel-card stat-card">
                <span className="stat-label">Blocked Keys</span>
                <p className="stat-value">{adminStats.blockedApiKeys || 0}</p>
              </div>
            </div>

            <div className="cards-grid">
              <div className="panel-card pad threat-card">
                <div className="section-header">
                  <div>
                    <h3 className="section-title">Threat Posture</h3>
                    <p className="section-copy">Current pressure against the protected route using the active rules.</p>
                  </div>
                </div>
                <div className="status-pill">
                  <span className="status-pill-label">Status</span>
                  <span className="status-pill-value">{threatLevel}</span>
                </div>
                <div className="button-row">
                  <button className="primary-button" onClick={fetchData}>
                    {loading ? "Fetching..." : "Refresh Protected Data"}
                  </button>
                  <button className="secondary-button" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>

              <div className="panel-card pad key-card">
                <div className="section-header">
                  <div>
                    <h3 className="section-title">Operator API Key</h3>
                    <p className="section-copy">Copy, reveal, or regenerate the key tied to your current account.</p>
                  </div>
                </div>

                <div className="key-box">
                  <div className="key-value">
                    {showKey ? apiKey : `${apiKey.slice(0, 6)}........`}
                  </div>
                </div>

                <div className="button-row">
                  <button className="secondary-button" onClick={() => navigator.clipboard.writeText(apiKey)}>
                    Copy Key
                  </button>
                  <button className="secondary-button" onClick={() => setShowKey(!showKey)}>
                    {showKey ? "Hide Key" : "Show Key"}
                  </button>
                  <button className="primary-button" onClick={generateApiKey}>
                    Regenerate Key
                  </button>
                </div>
              </div>

              {ruleForm && (
                <div className="panel-card pad chart-card">
                  <div className="section-header">
                    <div>
                      <h3 className="section-title">Rule Configuration</h3>
                      <p className="section-copy">Adjust thresholds that drive blocking, suspicious activity, and smart alerts.</p>
                    </div>
                  </div>
                  <div className="stats-grid">
                    {[
                      ["slidingLimit", "Sliding limit"],
                      ["slidingWindowSeconds", "Sliding window (s)"],
                      ["suspiciousThresholdPercent", "Suspicious threshold (%)"],
                      ["burstThresholdCount", "Burst count"],
                      ["burstWindowSeconds", "Burst window (s)"],
                      ["spikeThresholdCount", "Spike count"],
                      ["spikeWindowSeconds", "Spike window (s)"],
                      ["ipBurstThresholdCount", "IP burst count"],
                      ["ipBurstWindowSeconds", "IP burst window (s)"],
                      ["ipBlockDurationSeconds", "IP block duration (s)"],
                      ["userHourlyLimit", "User hourly limit"],
                    ].map(([key, label]) => (
                      <label className="field-group" key={key}>
                        <span className="field-label">{label}</span>
                        <input
                          className="field-input"
                          type="number"
                          min="1"
                          value={ruleForm[key]}
                          onChange={(e) =>
                            setRuleForm((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="button-row">
                    <button className="primary-button" onClick={saveRules}>
                      {rulesSaving ? "Saving..." : "Save Rules"}
                    </button>
                  </div>
                </div>
              )}

              {chartData.length > 0 && (
                <div className="panel-card pad chart-card">
                  <div className="section-header">
                    <div>
                      <h3 className="section-title">Request Pressure Trend</h3>
                      <p className="section-copy">A rolling snapshot of recent dashboard-triggered request volume.</p>
                    </div>
                  </div>
                  <RequestChart data={chartData} />
                </div>
              )}

              {adminStats.recentLogs?.length > 0 && (
                <div className="panel-card pad traffic-card">
                  <div className="section-header">
                    <div>
                      <h3 className="section-title">Live Traffic Feed</h3>
                      <p className="section-copy">Search by IP, endpoint, location, API key, or reason.</p>
                    </div>
                  </div>
                  <div className="button-row" style={{ marginTop: 0, marginBottom: 14 }}>
                    <input
                      className="field-input"
                      style={{ maxWidth: 280 }}
                      placeholder="Search traffic..."
                      value={trafficSearch}
                      onChange={(e) => setTrafficSearch(e.target.value)}
                    />
                    <select
                      className="field-input"
                      style={{ maxWidth: 220 }}
                      value={trafficStatus}
                      onChange={(e) => {
                        setTrafficStatus(e.target.value);
                        setTrafficPage(1);
                      }}
                    >
                      <option value="">All statuses</option>
                      <option value="Normal">Normal</option>
                      <option value="Suspicious">Suspicious</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setTrafficPage(1);
                        fetchAdminData();
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  <div className="traffic-list">
                    {adminStats.recentLogs.map((log) => (
                      <div key={log._id} className={renderTrafficClass(log.status)}>
                        <div className="item-title">{log.endpoint} • {log.status}</div>
                        <div className="item-meta">
                          {log.ip} • {log.geoLabel} • {new Date(log.timestamp).toLocaleString()}
                          <br />
                          Reason: {log.reason || "No rule triggered"}
                        </div>
                      </div>
                    ))}
                  </div>
                  {renderPagination(trafficPagination, trafficPage, setTrafficPage)}
                </div>
              )}

              <div className="panel-card pad blocked-card">
                <div className="section-header">
                  <div>
                    <h3 className="section-title">Blocked IP Management</h3>
                    <p className="section-copy">Search recent blocked addresses with location context.</p>
                  </div>
                </div>
                <div className="button-row" style={{ marginTop: 0, marginBottom: 14 }}>
                  <input
                    className="field-input"
                    style={{ maxWidth: 280 }}
                    placeholder="Search blocked IPs..."
                    value={blockedSearch}
                    onChange={(e) => setBlockedSearch(e.target.value)}
                  />
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setBlockedPage(1);
                      fetchAdminData();
                    }}
                  >
                    Apply
                  </button>
                </div>
                {blockedIPs.length === 0 ? (
                  <div className="empty-state">No blocked IPs right now.</div>
                ) : (
                  <div className="entity-list">
                    {blockedIPs.map((item) => (
                      <div key={item._id} className="entity-item">
                        <div className="item-title">{item.ipAddress}</div>
                        <div className="item-meta">
                          {item.reason}
                          <br />
                          {item.geoLabel}
                          <br />
                          {item.blockedUntil
                            ? `Blocked until ${new Date(item.blockedUntil).toLocaleString()}`
                            : `Blocked ${new Date(item.blockedAt).toLocaleString()}`}
                        </div>
                        <div className="inline-actions">
                          <button className="secondary-button" onClick={() => unblockIP(item._id)}>
                            Unblock IP
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {renderPagination(blockedPagination, blockedPage, setBlockedPage)}
              </div>

              <div className="panel-card pad keys-card">
                <div className="section-header">
                  <div>
                    <h3 className="section-title">API Key Management</h3>
                    <p className="section-copy">Search by owner, email, key text, or blocked status.</p>
                  </div>
                </div>
                <div className="button-row" style={{ marginTop: 0, marginBottom: 14 }}>
                  <input
                    className="field-input"
                    style={{ maxWidth: 280 }}
                    placeholder="Search API keys..."
                    value={keySearch}
                    onChange={(e) => setKeySearch(e.target.value)}
                  />
                  <select
                    className="field-input"
                    style={{ maxWidth: 220 }}
                    value={keyStatus}
                    onChange={(e) => {
                      setKeyStatus(e.target.value);
                      setKeyPage(1);
                    }}
                  >
                    <option value="">All key states</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setKeyPage(1);
                      fetchAdminData();
                    }}
                  >
                    Apply
                  </button>
                </div>
                {apiKeys.length === 0 ? (
                  <div className="empty-state">No generated API keys found yet.</div>
                ) : (
                  <div className="entity-list">
                    {apiKeys.map((item) => (
                      <div key={item._id} className="entity-item">
                        <div className="item-title">{item.username} • {item.email}</div>
                        <div className="item-meta">
                          {item.apiKeyBlocked ? "Blocked" : item.apiKey ? "Active" : "Revoked"}
                          <br />
                          {item.apiKeyLastUsedAt
                            ? `Last used ${new Date(item.apiKeyLastUsedAt).toLocaleString()}`
                            : "Never used"}
                          {item.apiKeyBlockedReason ? (
                            <>
                              <br />
                              Block reason: {item.apiKeyBlockedReason}
                            </>
                          ) : null}
                        </div>
                        <div className="inline-actions">
                          {item.apiKey && !item.apiKeyBlocked && (
                            <button className="secondary-button" onClick={() => blockApiKey(item._id)}>
                              Block Key
                            </button>
                          )}
                          {item.apiKey && item.apiKeyBlocked && (
                            <button className="secondary-button" onClick={() => unblockApiKey(item._id)}>
                              Unblock Key
                            </button>
                          )}
                          {item.apiKey && (
                            <button className="danger-button" onClick={() => revokeApiKey(item._id)}>
                              Revoke Key
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {renderPagination(keyPagination, keyPage, setKeyPage)}
              </div>

              {history.length > 0 && (
                <div className="panel-card pad history-card">
                  <div className="section-header">
                    <div>
                      <h3 className="section-title">Session History</h3>
                      <p className="section-copy">Recent protected-route refreshes from this browser session.</p>
                    </div>
                  </div>
                  <div className="history-list">
                    {history.map((item, index) => (
                      <div key={index} className="history-item">
                        <div className="item-title">{item.time} • {item.threat}</div>
                        <div className="item-meta">
                          Endpoint: {item.endpoint}
                          <br />
                          Request count: {item.requests}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {smartAlertFeed.length > 0 && (
                <div className="panel-card pad alerts-card">
                  <div className="section-header">
                    <div>
                      <h3 className="section-title">Smart Alerts</h3>
                      <p className="section-copy">Threshold-based reasons derived from your current security rules.</p>
                    </div>
                  </div>
                  <div className="alerts-list">
                    {smartAlertFeed.map((alert) => (
                      <div key={alert.id} className="alert-item">
                        <div className="item-title">{alert.time}</div>
                        <div className="item-meta" style={{ color: "inherit" }}>
                          {alert.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <ToastContainer />
      </div>
    </div>
  );
};

export default Dashboard;
