# ASQ API

**Author:** Davis Burt

**Course:** Comp 4310

## Description

Express-based HTTP server with a number guessing game and a RESTful API backend for ASQ: A Stupid Question — a web application that allows users to post questions, post answers to questions, and like both questions and answers.

## External Sources

- Node.js Documentation
- Express Documentation
- Mongoose Documentation
- Supertest Documentation

## Usage

1. **Install dependencies:** `npm install`
2. **Start MongoDB:** make sure a local MongoDB instance is running
3. **Run server:** `npm start`
4. **Run tests:** `npm test`
5. **Create package:** `npm pack`

## Strengths

- Clean separation of the ASQ router into its own `asq/` directory with dedicated models
- Atomic like/unlike operations using MongoDB's `$inc` operator to prevent race conditions
- Shared `loadPost` param handler eliminates duplicated question/answer lookup logic

## Weaknesses

- Sessions are stored in memory and will be lost on server restart
- No authentication; any username string can be used freely
