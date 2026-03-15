# Express Secret Game Server

**Description:** Express-based HTTP server with a number guessing game.

**Author:** Davis Burt

## External Sources

- Node.js Documentation
- Express Documentation
- Supertest Documentation

## Usage

1. **Install dependencies:** `npm install`
2. **Run server:** `npm start`
3. **Run tests:** `npm test`
4. **Create package:** `npm pack`

## Weaknesses

- **Sessions:** All game data is stored in memory sessions.
- **Views:** Only a single Handlebars view is used; layout/partials are not configured.

## Strengths

- **Express:** Clean routing and middleware instead of manual http handling.
- **Sessions:** Game state persists across requests per user.
- **Static files:** Static assets are served from a dedicated static/ directory.
