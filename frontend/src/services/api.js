import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api", // backend URL
});

// 🔑 Automatically attach API key
API.interceptors.request.use((req) => {
  const apiKey = localStorage.getItem("apiKey");

  if (apiKey) {
    req.headers["x-api-key"] = apiKey;
  }

  return req;
});

export default API;