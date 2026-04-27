const calculateAnomalyScore = ({ 
  status, 
  reason, 
  threatType, 
  requestCount, 
  slidingLimit, 
  hour,
  geoCountry 
}) => {
  let score = 0;
  const reasons = [];

  // SQL/XSS attack — highest score
  if (threatType === "SQL Injection") {
    score += 40;
    reasons.push("SQL Injection attempt (+40)");
  } else if (threatType === "XSS Attack") {
    score += 40;
    reasons.push("XSS Attack attempt (+40)");
  } else if (threatType === "Path Traversal") {
    score += 35;
    reasons.push("Path Traversal attempt (+35)");
  }

  // Rate limit status
  if (status === "Blocked") {
    score += 20;
    reasons.push("Request blocked (+20)");
  } else if (status === "Suspicious") {
    score += 10;
    reasons.push("Suspicious activity (+10)");
  }

  // Request frequency
  if (requestCount && slidingLimit) {
    const usagePercent = (requestCount / slidingLimit) * 100;
    if (usagePercent >= 100) {
      score += 20;
      reasons.push("Rate limit exceeded (+20)");
    } else if (usagePercent >= 80) {
      score += 10;
      reasons.push("High request frequency (+10)");
    } else if (usagePercent >= 60) {
      score += 5;
      reasons.push("Moderate request frequency (+5)");
    }
  }

  // Odd timing — raat 12 se subah 5 baje
  if (hour !== undefined && (hour >= 0 && hour <= 5)) {
    score += 10;
    reasons.push("Unusual hour activity (+10)");
  }

  // Unknown location
  if (!geoCountry || geoCountry === "Unknown") {
    score += 10;
    reasons.push("Unknown geographic origin (+10)");
  }

  // Cap at 100
  score = Math.min(score, 100);

  const level =
    score >= 61 ? "Critical" :
    score >= 31 ? "Suspicious" :
    "Normal";

  return { score, reasons, level };
};

module.exports = calculateAnomalyScore;