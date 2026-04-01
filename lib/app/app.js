const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const session = require("express-session");
const exphbs = require("express-handlebars");
const config = require("../config");
const logger = require("../logger");
const asqRouter = require("../../asq");

const app = express();
const usersStaticDir = path.join(config.staticDir, "users");

function unauthorized(res, message) {
  res
    .set("WWW-Authenticate", "Bearer")
    .status(401)
    .json({ message });
}

function hasAdminRole(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.role === "admin") return true;
  if (payload.isAdmin === true) return true;
  if (Array.isArray(payload.roles) && payload.roles.includes("admin")) return true;
  if (
    Array.isArray(payload.privileges) &&
    payload.privileges.includes("admin")
  ) {
    return true;
  }
  return false;
}

async function readTokenPayload(token) {
  const candidatePaths = [
    path.join(usersStaticDir, "tokens", `${token}.json`),
    path.join(usersStaticDir, "auth", `${token}.json`),
    path.join(usersStaticDir, `${token}.json`),
  ];

  for (const tokenPath of candidatePaths) {
    try {
      const file = await fs.readFile(tokenPath, "utf8");
      return JSON.parse(file);
    } catch (err) {
      if (err.code === "ENOENT") continue;
      return null;
    }
  }

  return null;
}

async function usersAuth(req, res, next) {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return unauthorized(
      res,
      "Authentication is required to access this resource",
    );
  }

  const [scheme, token] = authHeader.split(" ");
  if (
    !scheme ||
    !token ||
    !/^Bearer$/i.test(scheme) ||
    authHeader.split(" ").length !== 2
  ) {
    return unauthorized(res, "Authentication not recognized");
  }

  const payload = await readTokenPayload(token);
  if (!payload) {
    return unauthorized(res, "Authentication not recognized");
  }

  if (req.path.startsWith("/admin") && !hasAdminRole(payload)) {
    return res
      .status(403)
      .json({
        message: "Administrator privileges are required to access this resource",
      });
  }

  return next();
}

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

app.use("/users", usersAuth);
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
