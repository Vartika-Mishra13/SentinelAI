import React, { useState } from "react";
import API from "../services/api";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/auth/signup", {
        username,
        email,
        password,
      });

      alert(res.data.message || "Registered successfully!");
      window.location.href = "/login";
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="auth-kicker">New Workspace</span>
        <h1 className="auth-title">Create your operator account</h1>
        <p className="auth-copy">
          Set up a secure account to generate API keys, inspect traffic history, and administer threat controls.
        </p>

        <form className="auth-form" onSubmit={handleRegister}>
          <label className="field-group">
            <span className="field-label">Username</span>
            <input
              className="field-input"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="field-group">
            <span className="field-label">Email</span>
            <input
              className="field-input"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field-group">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="primary-button" type="submit">
            Create Account
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <a className="auth-link" href="/login">Sign in here</a>
        </p>
      </div>
    </div>
  );
};

export default Register;
