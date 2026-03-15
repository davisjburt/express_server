import assert from "assert";
import request from "supertest";
import app from "../lib/app/app.js";

async function testIndex() {
  const res = await request(app).get("/index.html");
  assert.strictEqual(res.status, 200);
  assert.ok(res.text.includes("Comp 4310"));
  assert.ok(res.text.includes("/secret/play"));
}

async function testCss() {
  const res = await request(app).get("/secret/play.css");
  assert.strictEqual(res.status, 200);
  assert.ok((res.headers["content-type"] || "").includes("text/css"));
}

async function testGuessAndOrder() {
  const agent = request.agent(app);

  await agent
    .post("/secret/guess")
    .type("form")
    .send({ guess: "10" })
    .expect(303);
  await agent
    .post("/secret/guess")
    .type("form")
    .send({ guess: "20" })
    .expect(303);

  const res = await agent.get("/secret/play");
  const text = res.text;
  const i10 = text.indexOf("10");
  const i20 = text.indexOf("20");
  assert.ok(i10 !== -1 && i20 !== -1);
  assert.ok(i20 < i10);
}

async function testInvalidAndReset() {
  const agent = request.agent(app);

  await agent
    .post("/secret/guess")
    .type("form")
    .send({ guess: "not-a-number" })
    .expect(303);
  let res = await agent.get("/secret/play");
  assert.ok(res.text.toLowerCase().includes("invalid guess"));

  await agent
    .post("/secret/guess")
    .type("form")
    .send({ guess: "50" })
    .expect(303);
  res = await agent.get("/secret/play");
  assert.ok(res.text.includes("50"));

  await agent.post("/secret/reset").expect(303);
  res = await agent.get("/secret/play");
  assert.ok(!res.text.includes("50"));
}

async function testDebugAnd404() {
  const agent = request.agent(app);

  const res1 = await agent.get("/secret/play?mode=debug");
  const match = res1.text.match(/#(\d{1,3})#/);
  assert.ok(match);
  const secret = parseInt(match[1], 10);
  assert.ok(secret >= 1 && secret <= 100);

  const res404 = await request(app).get("/no-such-route");
  assert.strictEqual(res404.status, 404);
}

async function run() {
  const tests = [
    testIndex,
    testCss,
    testGuessAndOrder,
    testInvalidAndReset,
    testDebugAnd404,
  ];

  for (const t of tests) {
    process.stdout.write(`Running ${t.name}... `);
    try {
      await t();
      console.log("OK");
    } catch (err) {
      console.error("\nFAILED:", t.name);
      console.error(err.stack || err);
      process.exit(1);
    }
  }
  console.log("All tests passed");
  process.exit(0);
}

run();
