const geoip = require("geoip-lite");

const normalizeIp = (ip) => {
  if (!ip) return "unknown";
  if (ip.includes(",")) return ip.split(",")[0].trim();
  return ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;
};

const getGeoInfo = (rawIp) => {
  const ip = normalizeIp(rawIp);

  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost"
  ) {
    return {
      ip,
      country: "Local",
      city: "Loopback",
      label: "Local Loopback"
    };
  }

  if (
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  ) {
    return {
      ip,
      country: "Private",
      city: "Network",
      label: "Private Network"
    };
  }

  const lookup = geoip.lookup(ip);
  if (!lookup) {
    return {
      ip,
      country: "Unknown",
      city: "Unknown",
      label: "Unknown Region"
    };
  }

  const city = Array.isArray(lookup.ll) ? lookup.ll.join(", ") : (lookup.city || "Unknown");

  return {
    ip,
    country: lookup.country || "Unknown",
    city,
    label: [lookup.city, lookup.region, lookup.country].filter(Boolean).join(", ") || "Unknown Region"
  };
};

module.exports = { getGeoInfo, normalizeIp };
