const SQL_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /insert|update|delete|drop|alter|create|truncate/i,
  /select.+from/i,
  /union.+select/i,
  /1=1|1 = 1|or 1|and 1/i,
];

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /<.*?on\w+.*?=.*?>/i,
  /javascript:/i,
  /vbscript:/i,
  /<iframe/i,
  /<img[^>]+src[^>]*>/i,
  /eval\s*\(/i,
  /document\.cookie/i,
  /document\.write/i,
  /window\.location/i,
  /<.*?>/i,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//i,
  /\.\.\\/, 
  /%2e%2e%2f/i,
  /%2e%2e\//i,
];

const scanValue = (value) => {
  if (typeof value !== "string") return null;

  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(value)) {
      return { type: "SQL Injection", pattern: pattern.toString() };
    }
  }

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return { type: "XSS Attack", pattern: pattern.toString() };
    }
  }

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(value)) {
      return { type: "Path Traversal", pattern: pattern.toString() };
    }
  }

  return null;
};

const scanObject = (obj, depth = 0) => {
  if (depth > 5) return null;

  for (const key of Object.keys(obj || {})) {
    const value = obj[key];

    if (typeof value === "string") {
      const result = scanValue(value);
      if (result) return { ...result, field: key };
    } else if (typeof value === "object" && value !== null) {
      const result = scanObject(value, depth + 1);
      if (result) return result;
    }
  }

  return null;
};

const threatDetection = (req, res, next) => {
  // Scan query params
  const queryThreat = scanObject(req.query);
  if (queryThreat) {
    res.locals.requestStatus = "Blocked";
    res.locals.requestReason = `${queryThreat.type} detected in query params (field: ${queryThreat.field})`;
    res.locals.threatType = queryThreat.type;
    return res.status(400).json({
      message: `Malicious request detected: ${queryThreat.type}`,
      blocked: true,
    });
  }

  // Scan request body
  const bodyThreat = scanObject(req.body);
  if (bodyThreat) {
    res.locals.requestStatus = "Blocked";
    res.locals.requestReason = `${bodyThreat.type} detected in request body (field: ${bodyThreat.field})`;
    res.locals.threatType = bodyThreat.type;
    return res.status(400).json({
      message: `Malicious request detected: ${bodyThreat.type}`,
      blocked: true,
    });
  }

  // Scan URL path
  const urlThreat = scanValue(req.originalUrl);
  if (urlThreat) {
    res.locals.requestStatus = "Blocked";
    res.locals.requestReason = `${urlThreat.type} detected in URL`;
    res.locals.threatType = urlThreat.type;
    return res.status(400).json({
      message: `Malicious request detected: ${urlThreat.type}`,
      blocked: true,
    });
  }

  next();
};

module.exports = threatDetection;