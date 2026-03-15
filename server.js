const http = require("http");

const app = require("./lib/app/app");
const config = require("./lib/config");
const logger = require("./lib/logger");

const server = http.createServer(app);

server.listen(config.httpPort, () => {
  logger.info(`Server is running on port ${config.httpPort}`);
  logger.info(`Log Level is set to: ${config.logLevel}`);
});
