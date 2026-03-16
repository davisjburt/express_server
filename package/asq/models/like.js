const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    match: /^[a-zA-Z][a-zA-Z\d]*$/,
    minlength: 4,
    maxlength: 20,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
});

LikeSchema.index({ post: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Like", LikeSchema);
