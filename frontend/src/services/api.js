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

// 🔒 Auto redirect to login on token expiry
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;