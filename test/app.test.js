const assert = require("assert");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../lib/app/app");
const config = require("../lib/config");

const agent = request.agent(app);

let questionId;
let answerId;

async function testCreateQuestion() {
  const res = await agent
    .post("/asq/api/questions")
    .send({
      title: "What is your favorite color?",
      contents: "I am curious what everyone thinks.",
      author: "davisb",
    })
    .expect(201);
  assert.ok(res.body.id);
  assert.strictEqual(res.body.title, "What is your favorite color?");
  assert.strictEqual(res.body.author, "davisb");
  assert.strictEqual(res.body.likeCount, 0);
  assert.ok(res.body.created);
  assert.ok(res.body.edited);
  assert.strictEqual(res.body.reference, undefined);
  assert.strictEqual(res.body.__v, undefined);
  assert.strictEqual(res.body._id, undefined);
  questionId = res.body.id;
}

async function testCreateQuestionMissingTitle() {
  const res = await agent
    .post("/asq/api/questions")
    .send({ contents: "Some contents here.", author: "davisb" })
    .expect(400);
  assert.strictEqual(res.body.code, "INVALID_PARAMS");
}

async function testCreateQuestionMissingAuthor() {
  const res = await agent
    .post("/asq/api/questions")
    .send({
      title: "What is your favorite color?",
      contents: "Some contents here.",
    })
    .expect(400);
  assert.strictEqual(res.body.code, "INVALID_PARAMS");
}

async function testCreateQuestionMissingContents() {
  const res = await agent
    .post("/asq/api/questions")
    .send({ title: "What is your favorite color?", author: "davisb" })
    .expect(400);
  assert.strictEqual(res.body.code, "INVALID_PARAMS");
}

async function testGetQuestions() {
  const res = await agent.get("/asq/api/questions").expect(200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 1);
  const q = res.body.find((x) => x.id === questionId);
  assert.ok(q);
  assert.strictEqual(q.contents, undefined);
  assert.strictEqual(q.reference, undefined);
  assert.strictEqual(q.__v, undefined);
}

async function testGetQuestion() {
  const res = await agent.get(`/asq/api/questions/${questionId}`).expect(200);
  assert.strictEqual(res.body.id, questionId);
  assert.strictEqual(res.body.reference, undefined);
  assert.strictEqual(res.body.__v, undefined);
}

async function testUpdateQuestion() {
  const res = await agent
    .put(`/asq/api/questions/${questionId}`)
    .send({
      title: "What is your favorite food instead?",
      contents: "Updated contents here.",
    })
    .expect(200);
  assert.strictEqual(res.body.title, "What is your favorite food instead?");
  assert.strictEqual(res.body.contents, "Updated contents here.");
}

async function testCreateAnswer() {
  const res = await agent
    .post(`/asq/api/questions/${questionId}/answers`)
    .send({ contents: "My favorite color is blue.", author: "davisb" })
    .expect(201);
  assert.ok(res.body.id);
  assert.strictEqual(res.body.contents, "My favorite color is blue.");
  assert.strictEqual(res.body.likeCount, 0);
  assert.strictEqual(res.body.title, undefined);
  assert.strictEqual(res.body.__v, undefined);
  assert.strictEqual(res.body._id, undefined);
  answerId = res.body.id;
}

async function testGetAnswers() {
  const res = await agent
    .get(`/asq/api/questions/${questionId}/answers`)
    .expect(200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 1);
  const a = res.body.find((x) => x.id === answerId);
  assert.ok(a);
  assert.strictEqual(a.title, undefined);
  assert.strictEqual(a.__v, undefined);
}

async function testGetAnswer() {
  const res = await agent.get(`/asq/api/answers/${answerId}`).expect(200);
  assert.strictEqual(res.body.id, answerId);
  assert.strictEqual(res.body.title, undefined);
  assert.strictEqual(res.body.__v, undefined);
}

async function testUpdateAnswer() {
  const res = await agent
    .put(`/asq/api/answers/${answerId}`)
    .send({ contents: "Actually my favorite color is red." })
    .expect(200);
  assert.strictEqual(res.body.contents, "Actually my favorite color is red.");
}

async function testQuestionIdAsAnswerId() {
  await agent.get(`/asq/api/answers/${questionId}`).expect(404);
}

async function testAnswerIdAsQuestionId() {
  await agent.get(`/asq/api/questions/${answerId}`).expect(404);
}

async function testLikePost() {
  const res = await agent
    .post(`/asq/api/likes/${questionId}/davisb`)
    .expect(200);
  assert.strictEqual(res.body, true);
}

async function testLikePostIdempotent() {
  const res = await agent
    .post(`/asq/api/likes/${questionId}/davisb`)
    .expect(200);
  assert.strictEqual(res.body, true);
}

async function testLikeCountIncremented() {
  const res = await agent.get(`/asq/api/questions/${questionId}`).expect(200);
  assert.strictEqual(res.body.likeCount, 1);
}

async function testGetLikes() {
  const res = await agent.get(`/asq/api/likes/${questionId}`).expect(200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.includes("davisb"));
}

async function testGetLikeTrue() {
  const res = await agent
    .get(`/asq/api/likes/${questionId}/davisb`)
    .expect(200);
  assert.strictEqual(res.body, true);
}

async function testGetLikeFalse() {
  const res = await agent
    .get(`/asq/api/likes/${questionId}/nobody`)
    .expect(200);
  assert.strictEqual(res.body, false);
}

async function testUnlike() {
  const res = await agent
    .delete(`/asq/api/likes/${questionId}/davisb`)
    .expect(200);
  assert.strictEqual(res.body, false);
}

async function testUnlikeIdempotent() {
  const res = await agent
    .delete(`/asq/api/likes/${questionId}/davisb`)
    .expect(200);
  assert.strictEqual(res.body, false);
}

async function testLikeCountDecremented() {
  const res = await agent.get(`/asq/api/questions/${questionId}`).expect(200);
  assert.strictEqual(res.body.likeCount, 0);
}

async function testNotFound() {
  const res = await agent
    .get("/asq/api/questions/000000000000000000000000")
    .expect(404);
  assert.strictEqual(res.body.code, "NOT_FOUND");
}

async function testUnsupportedMethod() {
  const res = await agent.delete("/asq/api/questions").expect(405);
  assert.strictEqual(res.body.code, "UNSUPPORTED");
}

async function testInvalidJson() {
  const res = await agent
    .post("/asq/api/questions")
    .set("Content-Type", "application/json")
    .send("{ bad json }")
    .expect(400);
  assert.strictEqual(res.body.code, "INVALID_JSON");
}

async function testUnknownRoute() {
  const res = await agent.get("/asq/api/nonexistent").expect(404);
  assert.strictEqual(res.body.code, "NOT_FOUND");
}

async function run() {
  const auth = config.dbUser
    ? `${encodeURIComponent(config.dbUser)}:${encodeURIComponent(config.dbPass)}@`
    : "";
  const mongoUri = `mongodb://${auth}${config.dbHost}/${config.dbName}`;
  try {
    await mongoose.connect(mongoUri);
  } catch (err) {
    console.error(
      "\nCould not connect to MongoDB. Start a local MongoDB instance (see README) and retry.",
    );
    console.error(err.message || err);
    process.exit(1);
  }

  const tests = [
    testCreateQuestion,
    testCreateQuestionMissingTitle,
    testCreateQuestionMissingAuthor,
    testCreateQuestionMissingContents,
    testGetQuestions,
    testGetQuestion,
    testUpdateQuestion,
    testCreateAnswer,
    testGetAnswers,
    testGetAnswer,
    testUpdateAnswer,
    testQuestionIdAsAnswerId,
    testAnswerIdAsQuestionId,
    testLikePost,
    testLikePostIdempotent,
    testLikeCountIncremented,
    testGetLikes,
    testGetLikeTrue,
    testGetLikeFalse,
    testUnlike,
    testUnlikeIdempotent,
    testLikeCountDecremented,
    testNotFound,
    testUnsupportedMethod,
    testInvalidJson,
    testUnknownRoute,
  ];

  for (const t of tests) {
    process.stdout.write(`Running ${t.name}... `);
    try {
      await t();
      console.log("OK");
    } catch (err) {
      console.error(`\nFAILED: ${t.name}`);
      console.error(err.stack || err);
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  console.log("\nAll tests passed");
  await mongoose.disconnect();
  process.exit(0);
}

run();
