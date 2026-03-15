const path = require("path");

const config = {
  httpPort: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || "info",

  staticDir: path.join(__dirname, "..", "static"),
  morganFormat: process.env.MORGAN_FORMAT || "dev",
  sessionSecret: process.env.SESSION_SECRET || "change-me",
};

module.exports = config;
