const config = require("./config");

const levels = ["silent", "error", "warn", "info", "http", "debug"];

function shouldLog(level) {
  const currentIndex = levels.indexOf(config.logLevel);
  const levelIndex = levels.indexOf(level);
  if (currentIndex === -1 || levelIndex === -1) return false;
  return levelIndex <= currentIndex && config.logLevel !== "silent";
}

function log(level, msg) {
  if (!shouldLog(level)) return;
  const line = `[${level.toUpperCase()}] ${msg}`;
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  error: (msg) => log("error", msg),
  warn: (msg) => log("warn", msg),
  info: (msg) => log("info", msg),
  http: (msg) => log("http", msg),
  debug: (msg) => log("debug", msg),
};
