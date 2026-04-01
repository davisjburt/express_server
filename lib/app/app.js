const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const jwt = require("jsonwebtoken");
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

function jsonConfigScore(name) {
  const lower = name.toLowerCase();
  if (lower.includes("taz")) return 0;
  if (lower.includes("auth")) return 1;
  return 2;
}

async function loadJwtVerificationMaterial() {
  let entries;
  try {
    entries = await fs.readdir(usersStaticDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }

  const files = entries
    .filter((d) => d.isFile() && d.name.endsWith(".json"))
    .map((d) => d.name)
    .sort((a, b) => jsonConfigScore(a) - jsonConfigScore(b) || a.localeCompare(b));

  const named = [
    "taz-authentication-service.json",
    "Taz Authentication Service.json",
    "taz.json",
    "authentication-service.json",
    "secret.json",
  ];
  const tryNames = [...named, ...files.filter((f) => !named.includes(f))];

  for (const name of tryNames) {
    let text;
    try {
      text = await fs.readFile(path.join(usersStaticDir, name), "utf8");
    } catch (err) {
      if (err.code === "ENOENT") continue;
      return null;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      continue;
    }
    if (typeof data !== "object" || data === null) continue;

    const symmetric =
      data.secret ??
      data.jwtSecret ??
      data.signingSecret ??
      data.sharedSecret ??
      data.key;
    if (typeof symmetric === "string" && symmetric.length > 0) {
      return { kind: "symmetric", value: symmetric };
    }

    const asymmetric = data.publicKey ?? data.public ?? data.privateKey;
    if (typeof asymmetric === "string" && asymmetric.length > 0) {
      return { kind: "asymmetric", value: asymmetric };
    }
  }

  return null;
}

function verifyJwtToken(token, material) {
  try {
    if (material.kind === "symmetric") {
      return jwt.verify(token, material.value, {
        algorithms: ["HS256", "HS384", "HS512"],
      });
    }
    return jwt.verify(token, material.value, {
      algorithms: ["RS256", "RS384", "RS512"],
    });
  } catch {
    return null;
  }
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

  const material = await loadJwtVerificationMaterial();
  if (!material) {
    return unauthorized(res, "Authentication not recognized");
  }

  const payload = verifyJwtToken(token, material);
  if (!payload) {
    return unauthorized(res, "Authentication not recognized");
  }

  const isAdminPath =
    req.path === "/admin" || req.path.startsWith("/admin/");
  if (isAdminPath && !hasAdminRole(payload)) {
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
