const express = require("express");
const mongoose = require("mongoose");
const Post = require("./models/post");
const Like = require("./models/like");

const router = express.Router();

function notFound(res) {
  res
    .status(404)
    .json({ code: "NOT_FOUND", message: "Requested resource was not found" });
}

function unsupported(res) {
  res
    .status(405)
    .json({
      code: "UNSUPPORTED",
      message: "Requested resource does not support this method",
    });
}

function postJSON(doc, omit = []) {
  const obj = doc.toJSON();
  omit.forEach((f) => delete obj[f]);
  return obj;
}

async function loadPost(req, res, next, id, mustBeQuestion) {
  try {
    if (!mongoose.isValidObjectId(id)) return notFound(res);
    const post = await Post.findById(id);
    if (!post) return notFound(res);
    const isQuestion = post.reference == null;
    if (mustBeQuestion && !isQuestion) return notFound(res);
    if (!mustBeQuestion && isQuestion) return notFound(res);
    req.post = post;
    next();
  } catch (err) {
    next(err);
  }
}

router.param("questionid", (req, res, next, id) =>
  loadPost(req, res, next, id, true),
);
router.param("answerid", (req, res, next, id) =>
  loadPost(req, res, next, id, false),
);

router.param("postid", async (req, res, next, id) => {
  try {
    if (!mongoose.isValidObjectId(id)) return notFound(res);
    const post = await Post.findById(id);
    if (!post) return notFound(res);
    req.post = post;
    next();
  } catch (err) {
    next(err);
  }
});

router
  .route("/questions")
  .get(async (req, res, next) => {
    try {
      const questions = await Post.find(
        { reference: undefined },
        "-contents -reference -__v",
      );
      res.json(questions.map((q) => q.toJSON()));
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    try {
      const now = Date.now();
      const post = new Post({
        title: req.body.title ?? "",
        contents: req.body.contents,
        author: req.body.author,
        likeCount: 0,
        created: now,
        edited: now,
      });
      await post.save();
      res.status(201).json(postJSON(post, ["reference"]));
    } catch (err) {
      next(err);
    }
  })
  .all((req, res) => unsupported(res));

router
  .route("/questions/:questionid")
  .get((req, res) => {
    res.json(postJSON(req.post, ["reference"]));
  })
  .put(async (req, res, next) => {
    try {
      if (req.body.title !== undefined) req.post.title = req.body.title;
      if (req.body.contents !== undefined)
        req.post.contents = req.body.contents;
      req.post.edited = Date.now();
      await req.post.save();
      res.json(postJSON(req.post, ["reference"]));
    } catch (err) {
      next(err);
    }
  })
  .all((req, res) => unsupported(res));

router
  .route("/questions/:questionid/answers")
  .get(async (req, res, next) => {
    try {
      const answers = await Post.find(
        { reference: req.post._id },
        "-title -__v",
      );
      res.json(answers.map((a) => a.toJSON()));
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    try {
      const now = Date.now();
      const post = new Post({
        contents: req.body.contents,
        author: req.body.author,
        reference: req.post._id,
        likeCount: 0,
        created: now,
        edited: now,
      });
      await post.save();
      res.status(201).json(postJSON(post, ["title"]));
    } catch (err) {
      next(err);
    }
  })
  .all((req, res) => unsupported(res));

router
  .route("/answers/:answerid")
  .get((req, res) => {
    res.json(postJSON(req.post, ["title"]));
  })
  .put(async (req, res, next) => {
    try {
      if (req.body.contents !== undefined)
        req.post.contents = req.body.contents;
      req.post.edited = Date.now();
      await req.post.save();
      res.json(postJSON(req.post, ["title"]));
    } catch (err) {
      next(err);
    }
  })
  .all((req, res) => unsupported(res));

router
  .route("/likes/:postid")
  .get(async (req, res, next) => {
    try {
      const likes = await Like.find({ post: req.post._id });
      res.json(likes.map((l) => l.user));
    } catch (err) {
      next(err);
    }
  })
  .all((req, res) => unsupported(res));

router
  .route("/likes/:postid/:username")
  .get(async (req, res, next) => {
    try {
      const like = await Like.findOne({
        post: req.post._id,
        user: req.params.username,
      });
      res.json(like != null);
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    try {
      const like = new Like({ post: req.post._id, user: req.params.username });
      try {
        await like.save();
        await Post.updateOne({ _id: req.post._id }, { $inc: { likeCount: 1 } });
      } catch (err) {
        if (err.name === "MongoServerError" && err.code === 11000) {
        } else {
          throw err;
        }
      }
      res.json(true);
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const { deletedCount } = await Like.deleteOne({
        post: req.post._id,
        user: req.params.username,
      });
      if (deletedCount > 0) {
        await Post.updateOne(
          { _id: req.post._id },
          { $inc: { likeCount: -1 } },
        );
      }
      res.json(false);
    } catch (err) {
      next(err);
    }
  })
  .all((req, res) => unsupported(res));

router.use((req, res) => notFound(res));

router.use((err, req, res, _next) => {
  if (err.name === "SyntaxError") {
    res.status(400).json({ code: "INVALID_JSON", message: err.message });
  } else if (err.name === "ValidationError") {
    res.status(400).json({ code: "INVALID_PARAMS", message: err.message });
  } else {
    res
      .status(500)
      .json({
        code: "INTERNAL",
        message: "The server encountered an unexpected error",
      });
  }
});

module.exports = router;
