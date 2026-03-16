const express = require("express");
const path = require("path");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const session = require("express-session");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../logger");
const asqRouter = require("../../asq");

const auth = config.dbUser
  ? `${encodeURIComponent(config.dbUser)}:${encodeURIComponent(config.dbPass)}@`
  : "";
mongoose.connect(`mongodb://${auth}${config.dbHost}/${config.dbName}`);

const app = express();

app.engine("hbs", exphbs.engine({ extname: ".hbs", defaultLayout: false }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "..", ".."));

if (config.logLevel !== "silent") {
  app.use(
    morgan(config.morganFormat, {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }),
  );
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
  }),
);

app.use(express.static(config.staticDir));

app.use("/asq/api", asqRouter);

app.use((req, res) => {
  res.status(404).send(`
    <html><body>
      <h1>404 – Not found</h1>
      <p>${req.originalUrl} was not found.</p>
    </body></html>
  `);
});

module.exports = app;
