const http = require("http");
const mongoose = require("mongoose");
const app = require("./lib/app/app");
const config = require("./lib/config");
const logger = require("./lib/logger");

const auth = config.dbUser
  ? `${encodeURIComponent(config.dbUser)}:${encodeURIComponent(config.dbPass)}@`
  : "";

mongoose
  .connect(`mongodb://${auth}${config.dbHost}/${config.dbName}`)
  .then(() => {
    const server = http.createServer(app);
    server.listen(config.httpPort, () => {
      logger.info(`Server is running on port ${config.httpPort}`);
      logger.info(`Log Level is set to: ${config.logLevel}`);
    });
  });
