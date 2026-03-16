const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 100,
    },
    contents: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 1000,
      required: true,
    },
    author: {
      type: String,
      required: true,
      match: /^[a-zA-Z][a-zA-Z\d]*$/,
      minlength: 4,
      maxlength: 20,
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    likeCount: {
      type: Number,
      required: true,
    },
    created: {
      type: Date,
      required: true,
    },
    edited: {
      type: Date,
      required: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

module.exports = mongoose.model("Post", PostSchema);
