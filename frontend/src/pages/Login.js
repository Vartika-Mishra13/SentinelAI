import React, { useState } from "react";
import API from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="auth-kicker">Control Center Access</span>
        <h1 className="auth-title">Sign in to SentinelAI</h1>
        <p className="auth-copy">
          Monitor abusive traffic, review live request patterns, and manage API key access from one clean security dashboard.
        </p>

        <div className="auth-form">
          <label className="field-group">
            <span className="field-label">Email</span>
            <input
              className="field-input"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field-group">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="primary-button" onClick={handleLogin}>
            Enter Dashboard
          </button>
        </div>

        <p className="auth-footer">
          Need an account? <a className="auth-link" href="/register">Create one here</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
