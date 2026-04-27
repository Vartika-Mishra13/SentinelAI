const geoip = require("geoip-lite");
const axios = require("axios");

const normalizeIp = (ip) => {
  if (!ip) return "unknown";
  if (ip.includes(",")) return ip.split(",")[0].trim();
  return ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;
};

const isLocalIp = (ip) => {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
};

const geoCache = new Map();

const getGeoInfoFromAPI = async (ip) => {
  try {
    // Cache check karo — same IP ke liye baar baar API call mat karo
    if (geoCache.has(ip)) {
      return geoCache.get(ip);
    }

    const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`, {
      timeout: 3000
    });

    if (res.data.status === "success") {
      const result = {
        ip,
        country: res.data.country || "Unknown",
        city: res.data.city || "Unknown",
        label: [res.data.city, res.data.regionName, res.data.country]
          .filter(Boolean)
          .join(", ") || "Unknown Region"
      };

      // Cache mein save karo 1 ghante ke liye
      geoCache.set(ip, result);
      setTimeout(() => geoCache.delete(ip), 60 * 60 * 1000);

      return result;
    }
  } catch (err) {
    // API fail hone pe geoip-lite fallback
  }
  return null;
};

const getGeoInfo = (rawIp) => {
  const ip = normalizeIp(rawIp);

  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
    return {
      ip,
      country: "Local",
      city: "Loopback",
      label: "Local Loopback"
    };
  }

  if (isLocalIp(ip)) {
    return {
      ip,
      country: "Private",
      city: "Network",
      label: "Private Network"
    };
  }

  // geoip-lite se try karo pehle
  const lookup = geoip.lookup(ip);
  if (lookup) {
    return {
      ip,
      country: lookup.country || "Unknown",
      city: lookup.city || "Unknown",
      label: [lookup.city, lookup.region, lookup.country]
        .filter(Boolean)
        .join(", ") || "Unknown Region"
    };
  }

  return {
    ip,
    country: "Unknown",
    city: "Unknown",
    label: "Unknown Region"
  };
};

// Async version — real IPs ke liye ip-api.com use karta hai
const getGeoInfoAsync = async (rawIp) => {
  const ip = normalizeIp(rawIp);

  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
    return { ip, country: "Local", city: "Loopback", label: "Local Loopback" };
  }

  if (isLocalIp(ip)) {
    return { ip, country: "Private", city: "Network", label: "Private Network" };
  }

  // ip-api.com se try karo
  const apiResult = await getGeoInfoFromAPI(ip);
  if (apiResult) return apiResult;

  // Fallback — geoip-lite
  const lookup = geoip.lookup(ip);
  if (lookup) {
    return {
      ip,
      country: lookup.country || "Unknown",
      city: lookup.city || "Unknown",
      label: [lookup.city, lookup.region, lookup.country]
        .filter(Boolean)
        .join(", ") || "Unknown Region"
    };
  }

  return { ip, country: "Unknown", city: "Unknown", label: "Unknown Region" };
};

module.exports = { getGeoInfo, getGeoInfoAsync, normalizeIp };