const path = require("path");

const config = {
  httpPort: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || "info",

  staticDir: path.join(__dirname, "..", "static"),
  morganFormat: process.env.MORGAN_FORMAT || "dev",
  sessionSecret: process.env.SESSION_SECRET || "change-me",

  dbHost: process.env.DB_HOST || "localhost",
  dbName: process.env.DB_NAME || "asq",
  dbUser: process.env.DB_USER || "",
  dbPass: process.env.DB_PASS || "",
};

module.exports = config;
