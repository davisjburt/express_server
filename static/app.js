const API = "/asq/api";

let currentUser = localStorage.getItem("asq_user") || null;

function $(id) {
  return document.getElementById(id);
}

function render(html) {
  $("app").innerHTML = html;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

function updateHeader() {
  const greeting = $("greeting");
  if (currentUser) {
    greeting.innerHTML = `Posting as <strong>${currentUser}</strong>`;
  } else {
    greeting.innerHTML = `<em>No user set</em>`;
  }
}

function promptUser(force = false) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>Welcome to ASQ</h2>
      <p>Enter a username to post questions, answers, and likes.</p>
      <div class="field">
        <label>Username (4–20 alphanumeric, start with a letter)</label>
        <input id="username-input" type="text" placeholder="e.g. davisb" maxlength="20">
      </div>
      <div id="username-error" class="error-msg" style="display:none"></div>
      <button class="btn-primary" id="username-submit" style="width:100%">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#username-input");
  const errEl = overlay.querySelector("#username-error");
  const submit = overlay.querySelector("#username-submit");

  if (currentUser) input.value = currentUser;
  input.focus();

  function trySubmit() {
    const val = input.value.trim();
    if (!/^[a-zA-Z][a-zA-Z\d]{3,19}$/.test(val)) {
      errEl.textContent =
        "Must be 4–20 characters, start with a letter, alphanumeric only.";
      errEl.style.display = "block";
      return;
    }
    currentUser = val;
    localStorage.setItem("asq_user", val);
    overlay.remove();
    updateHeader();
    route();
  }

  submit.addEventListener("click", trySubmit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") trySubmit();
  });

  if (!force) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
}

async function showQuestions() {
  render(`<div class="spinner">Loading…</div>`);
  const questions = await apiFetch("/questions");

  let cards = "";
  for (const q of questions) {
    cards += `
      <div class="card card-clickable" data-id="${q.id}" onclick="location.hash='#/questions/${q.id}'">
        <div class="card-title">${escHtml(q.title)}</div>
        <div class="card-meta">
          <span>by ${escHtml(q.author)}</span>
          <span>${formatDate(q.created)}</span>
          <span>❤️ ${q.likeCount}</span>
        </div>
      </div>
    `;
  }

  render(`
    <div class="page-header">
      <h1>Questions</h1>
      <button class="btn-primary" onclick="toggleNewQuestion()">+ Ask</button>
    </div>

    <form id="new-question-form" style="display:none">
      <h2>Ask a Question</h2>
      <div id="q-error" class="error-msg" style="display:none"></div>
      <div class="field">
        <label>Title (10–100 characters)</label>
        <input id="q-title" type="text" maxlength="100" placeholder="A clear, concise title">
      </div>
      <div class="field">
        <label>Details (up to 1000 characters)</label>
        <textarea id="q-contents" rows="3" maxlength="1000" placeholder="Give more context…"></textarea>
      </div>
      <button class="btn-primary" onclick="submitQuestion(event)">Post Question</button>
    </form>

    <div id="questions-list">
      ${cards.length ? cards : `<p class="empty">No questions yet. Be the first to ask!</p>`}
    </div>
  `);
}

function toggleNewQuestion() {
  if (!currentUser) {
    promptUser();
    return;
  }
  const form = $("new-question-form");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

async function submitQuestion(e) {
  e.preventDefault();
  if (!currentUser) {
    promptUser();
    return;
  }
  const title = $("q-title").value;
  const contents = $("q-contents").value;
  const errEl = $("q-error");

  const res = await apiFetch("/questions", {
    method: "POST",
    body: JSON.stringify({ title, contents, author: currentUser }),
  });

  if (res.code) {
    errEl.textContent = res.message;
    errEl.style.display = "block";
    return;
  }

  location.hash = `#/questions/${res.id}`;
}

async function showQuestion(id) {
  render(`<div class="spinner">Loading…</div>`);

  const [question, answers] = await Promise.all([
    apiFetch(`/questions/${id}`),
    apiFetch(`/questions/${id}/answers`),
  ]);

  if (question.code === "NOT_FOUND") {
    render(`<p class="empty">Question not found. <a href="#/">Go back</a></p>`);
    return;
  }

  const qLiked = currentUser
    ? await apiFetch(`/likes/${id}/${currentUser}`)
    : false;

  let answerCards = "";
  for (const a of answers) {
    const aLiked = currentUser
      ? await apiFetch(`/likes/${a.id}/${currentUser}`)
      : false;
    answerCards += `
      <div class="card" id="answer-${a.id}">
        <div class="card-contents">${escHtml(a.contents)}</div>
        <div class="card-footer">
          <div class="card-meta">
            <span>by ${escHtml(a.author)}</span>
            <span>${formatDate(a.created)}</span>
          </div>
          <button class="btn-like ${aLiked ? "liked" : ""}"
            onclick="toggleLike('${a.id}', this)">
            ❤️ <span>${a.likeCount}</span>
          </button>
        </div>
      </div>
    `;
  }

  render(`
    <button class="btn-ghost back-btn" onclick="location.hash='#/'">← Back</button>

    <div class="card">
      <div class="card-title">${escHtml(question.title)}</div>
      <div class="card-contents">${escHtml(question.contents)}</div>
      <div class="card-footer">
        <div class="card-meta">
          <span>by ${escHtml(question.author)}</span>
          <span>${formatDate(question.created)}</span>
        </div>
        <button class="btn-like ${qLiked ? "liked" : ""}"
          onclick="toggleLike('${id}', this)">
          ❤️ <span>${question.likeCount}</span>
        </button>
      </div>
    </div>

    <hr class="divider">

    <form id="new-answer-form">
      <h2>Post an Answer</h2>
      <div id="a-error" class="error-msg" style="display:none"></div>
      <div class="field">
        <textarea id="a-contents" rows="3" maxlength="1000" placeholder="Write your answer…"></textarea>
      </div>
      <button class="btn-primary" onclick="submitAnswer(event, '${id}')">Post Answer</button>
    </form>

    <p class="answers-header">${answers.length} ${answers.length === 1 ? "Answer" : "Answers"}</p>
    <div id="answers-list">
      ${answerCards || `<p class="empty">No answers yet.</p>`}
    </div>
  `);
}

async function submitAnswer(e, questionId) {
  e.preventDefault();
  if (!currentUser) {
    promptUser();
    return;
  }
  const contents = $("a-contents").value;
  const errEl = $("a-error");

  const res = await apiFetch(`/questions/${questionId}/answers`, {
    method: "POST",
    body: JSON.stringify({ contents, author: currentUser }),
  });

  if (res.code) {
    errEl.textContent = res.message;
    errEl.style.display = "block";
    return;
  }

  showQuestion(questionId);
}

async function toggleLike(postId, btn) {
  if (!currentUser) {
    promptUser();
    return;
  }
  const liked = btn.classList.contains("liked");
  const method = liked ? "DELETE" : "POST";

  await apiFetch(`/likes/${postId}/${currentUser}`, { method });

  const post = await apiFetch(
    location.hash.includes("/questions/") &&
      !location.hash.includes("/answers/")
      ? `/questions/${postId}`
      : `/answers/${postId}`,
  );

  const countSpan = btn.querySelector("span");
  if (liked) {
    btn.classList.remove("liked");
    countSpan.textContent = post.code
      ? parseInt(countSpan.textContent) - 1
      : post.likeCount;
  } else {
    btn.classList.add("liked");
    countSpan.textContent = post.code
      ? parseInt(countSpan.textContent) + 1
      : post.likeCount;
  }
}

function escHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function route() {
  const hash = location.hash || "#/";
  const match = hash.match(/^#\/questions\/([a-f0-9]{24})$/);
  if (match) {
    showQuestion(match[1]);
  } else {
    showQuestions();
  }
}

$("change-user-btn").addEventListener("click", () => promptUser());
window.addEventListener("hashchange", route);

updateHeader();
if (!currentUser) {
  promptUser(true);
} else {
  route();
}
