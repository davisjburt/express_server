const express = require("express");
const path = require("path");

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session.secretGame) {
    req.session.secretGame = {
      secret: Math.floor(Math.random() * 100) + 1,
      guesses: [],
      lastInvalid: false,
    };
  }
  next();
});

router.get("/play", (req, res) => {
  const game = req.session.secretGame;

  const hasWon = game.guesses.some((g) => g.result === "correct");

  const mode = req.query.mode;
  const debugNumber = mode === "debug" ? `#${game.secret}#` : null;

  const viewModel = {
    guesses: game.guesses,
    hasWon,
    guessCount: game.guesses.length,
    showInvalid: game.lastInvalid,
    showForm: !hasWon,
    showNewGame: hasWon,
    debugNumber,
  };

  res.render(path.join("secret", "views", "play"), viewModel);
});

router.post("/guess", (req, res) => {
  const game = req.session.secretGame;
  const raw = req.body.guess;
  const n = Number(raw);

  game.lastInvalid = false;

  if (!Number.isFinite(n)) {
    game.lastInvalid = true;
  } else {
    let result;
    let label;

    if (n < game.secret) {
      result = "low";
      label = "too low";
    } else if (n > game.secret) {
      result = "high";
      label = "too high";
    } else {
      result = "correct";
      label = "correct";
    }

    game.guesses.unshift({ value: n, result, label });
  }

  res.redirect(303, "play");
});

router.post("/reset", (req, res) => {
  req.session.secretGame = {
    secret: Math.floor(Math.random() * 100) + 1,
    guesses: [],
    lastInvalid: false,
  };

  res.redirect(303, "play");
});

module.exports = router;
