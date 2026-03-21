import React, { useState } from "react";
import API from "../services/api";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
     const res = await API.post("/auth/signup", {
  email,
  password,
});

alert(res.data.message || "✅ Registered successfully!");
      // 👉 redirect to login
      window.location.href = "/login";

    } catch (err) {
      console.log(err.response);
alert(JSON.stringify(err.response?.data));
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📝 Register</h2>

      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br /><br />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br /><br />

        <button type="submit">Register</button>
      </form>

      <p>
        Already have an account?{" "}
        <a href="/login">Login here</a>
      </p>
    </div>
  );
};

export default Register;