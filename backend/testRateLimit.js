// testRateLimit.js
const axios = require("axios");

const API_URL = "http://localhost:5000/api/user/data"; // your endpoint
const API_KEY = "sk_9d353ce0-95bd-4759-9bff-19b8999194b2"; // replace with your key

async function testRateLimit() {
  for (let i = 1; i <= 105; i++) {
    try {
      const res = await axios.get(API_URL, {
        headers: { "x-api-key": API_KEY }
      });
      console.log(`${i}:`, res.data);
    } catch (err) {
      if (err.response) {
        console.log(`${i}:`, err.response.data);
      } else {
        console.log(`${i}:`, err.message);
      }
    }
  }
}

testRateLimit();