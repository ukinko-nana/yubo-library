const app = document.querySelector("#app");

const state = {
  novels: [],
  route: parseRoute(),
  fontSize: Number(localStorage.getItem("yubo.fontSize") || 18),
  lineHeight: Number(localStorage.getItem("yubo.lineHeight") || 2.1)
};

const statusLabel = {
  writing: "執筆中",
  complete: "完結"
};

const updates = [
  {
    version: "v1.2",
    date: "2024.05.12",
    title: "「海辺の午後」を追加しました。",
    message: "夏の匂いがすると、この物語を思い出します。"
  },
  {
    version: "v1.1",
    date: "2024.04.28",
    title: "読書画面を調整しました。",
    message: "余白と行間を少しだけゆったりさせました。"
  }
];

window.addEventListener("hashchange", () => {
  state.route = parseRoute();
  render();
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
});

load();

async function load() {
  try {
    const response = await fetch("./data/novels.json", { cache: "no-store" });
    state.novels = await response.json();
    render();
  } catch {
    app.innerHTML = shell(`<main class="screen"><div class="empty">作品データを読み込めませんでした。</div></main>`);
  }
}

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return {
    name: parts[0] || "shelf",
    novelId: parts[1] || "",
    episodeId: parts[2] || ""
  };
}

function navigate(path) {
  location.hash = path;
}

function shell(content) {
  return `
    <header class="topbar">
      <button class="brand" type="button" data-link="/">
        <span>ゆぼ文庫</span>
      </button>
      <div class="top-actions">
        ${catImage("peek", "top-cat")}
        <button class="text-button" type="button" data-link="/">本棚</button>
        <button class="text-button" type="button" data-link="/updates">更新メモ</button>
      </div>
    </header>
    ${content}
  `;
}

function render() {
  const route = state.route;
  if (route.name === "updates") {
    app.innerHTML = shell(renderUpdates());
  } else if (route.name === "novel") {
    const novel = findNovel(route.novelId);
    app.innerHTML = shell(novel ? renderNovelDetail(novel) : notFound());
  } else if (route.name === "episodes") {
    const novel = findNovel(route.novelId);
    app.innerHTML = shell(novel ? renderEpisodeList(novel) : notFound());
  } else if (route.name === "read") {
    const novel = findNovel(route.novelId);
    const episode = novel?.chapters.find((chapter) => chapter.id === route.episodeId);
    app.innerHTML = shell(novel && episode ? renderReader(novel, episode) : notFound());
    document.documentElement.style.setProperty("--reader-font", `${state.fontSize}px`);
    document.documentElement.style.setProperty("--reader-line", state.lineHeight);
  } else {
    app.innerHTML = shell(renderShelf());
  }

  bindActions();
}

function renderShelf() {
  return `
    <main class="screen">
      <section class="hero-row">
        <div>
          <p class="eyebrow">Private Web Library</p>
          <h1>ゆぼ文庫</h1>
          <p class="muted">更新された物語を、静かに読むための本棚。</p>
        </div>
        ${catImage("sit", "hero-cat")}
      </section>

      <section class="shelf-grid">
        ${state.novels.map((novel) => `
          <button class="book-card" type="button" data-link="/novel/${escapeAttr(novel.id)}">
            ${cover(novel)}
            <div class="book-title">${escapeHtml(novel.title)}</div>
            <div class="book-meta">${escapeHtml(novel.category)} ・ ${novel.chapters.length}話</div>
          </button>
        `).join("")}
      </section>
    </main>
  `;
}

function renderNovelDetail(novel) {
  return `
    <main class="screen">
      <div class="detail-layout">
        <div class="detail-cover">${cover(novel)}</div>
        <section class="detail-panel">
          <p class="eyebrow">作品詳細</p>
          <h2>${escapeHtml(novel.title)}</h2>
          <p class="muted">${escapeHtml(novel.author)} ・ ${escapeHtml(novel.category)}</p>
          <p>${escapeHtml(novel.summary)}</p>
          <div class="info-list">
            <span>公開日：${escapeHtml(novel.publishedDate)}</span>
            <span>更新日：${escapeHtml(novel.updatedDate)}</span>
            <span>話数：${novel.chapters.length}話</span>
          </div>
          <button class="primary-button" type="button" data-link="/episodes/${escapeAttr(novel.id)}">話一覧を見る</button>
          ${catImage("loaf", "detail-cat")}
        </section>
      </div>
    </main>
  `;
}

function renderEpisodeList(novel) {
  return `
    <main class="screen">
      <section class="hero-row">
        <div>
          <p class="eyebrow">Episode List</p>
          <h1>${escapeHtml(novel.title)}</h1>
          <p class="muted">${escapeHtml(novel.summary)}</p>
        </div>
        ${catImage("loaf", "hero-cat")}
      </section>

      <section class="episode-list">
        ${novel.chapters.map((chapter, index) => `
          <button class="episode-row" type="button" data-link="/read/${escapeAttr(novel.id)}/${escapeAttr(chapter.id)}">
            <span class="episode-number">${index + 1}</span>
            <span>
              <span class="episode-sub">${index + 1}話</span><br>
              <strong>${escapeHtml(chapter.title)}</strong>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        `).join("")}
      </section>
    </main>
  `;
}

function renderReader(novel, episode) {
  const index = novel.chapters.findIndex((chapter) => chapter.id === episode.id);
  const prev = novel.chapters[index - 1];
  const next = novel.chapters[index + 1];

  return `
    <main class="screen reader-screen">
      <header class="reader-header">
        <p class="eyebrow">${index + 1}話 / ${novel.chapters.length}話</p>
        <h1>${escapeHtml(episode.title)}</h1>
        <p class="muted">${escapeHtml(novel.title)}</p>
        ${catImage("sleep", "reader-cat")}
      </header>

      <article class="reader-body">${escapeHtml(episode.body)}</article>

      <nav class="reader-controls" aria-label="読書操作">
        <div class="control-group">
          <button class="icon-button" type="button" data-font="-1">A-</button>
          <button class="icon-button" type="button" data-font="1">A+</button>
          <button class="icon-button" type="button" data-line="-0.1">行間-</button>
          <button class="icon-button" type="button" data-line="0.1">行間+</button>
        </div>
        <div class="control-group">
          ${prev ? `<button class="text-button" type="button" data-link="/read/${escapeAttr(novel.id)}/${escapeAttr(prev.id)}">前の話</button>` : ""}
          <button class="text-button" type="button" data-link="/episodes/${escapeAttr(novel.id)}">話一覧</button>
          ${next ? `<button class="text-button primary" type="button" data-link="/read/${escapeAttr(novel.id)}/${escapeAttr(next.id)}">次の話</button>` : ""}
        </div>
      </nav>
    </main>
  `;
}

function renderUpdates() {
  return `
    <main class="screen">
      <section class="hero-row">
        <div>
          <p class="eyebrow">Update Notes</p>
          <h1>更新メモ</h1>
          <p class="muted">新しく届いた物語と、少しだけの手紙。</p>
        </div>
        ${catImage("sit", "hero-cat")}
      </section>

      <section class="updates">
        ${updates.map((note) => `
          <article class="note-card">
            <div class="note-top">
              <strong>${escapeHtml(note.version)}</strong>
              <span>${escapeHtml(note.date)}</span>
            </div>
            <h3>${escapeHtml(note.title)}</h3>
            <p>${escapeHtml(note.message)}</p>
            ${catImage("stretch", "note-cat")}
          </article>
        `).join("")}
      </section>
    </main>
  `;
}

function cover(novel) {
  const image = coverImage(novel.cover);
  if (image) {
    return `
      <div class="cover image-cover">
        <img src="${image}" alt="">
        <span class="status">${escapeHtml(statusLabel[novel.status] || novel.status)}</span>
      </div>
    `;
  }

  const style = coverStyle(novel.cover);
  return `
    <div class="cover" style="${style}">
      <span class="status">${escapeHtml(statusLabel[novel.status] || novel.status)}</span>
    </div>
  `;
}

function catImage(type = "sit", className = "") {
  const files = {
    sit: "cat-sit.png",
    sleep: "cat-sleep.png",
    peek: "cat-peek.png",
    loaf: "cat-loaf.png",
    stretch: "cat-stretch.png"
  };

  return `<img class="cat-img ${className}" src="./assets/${files[type] || files.sit}" alt="" aria-hidden="true">`;
}

function coverStyle(name) {
  const styles = {
    mist: "--cover-a:#dce7ed;--cover-b:#7895a9;--cover-c:#183c59;",
    night: "--cover-a:#eef1f5;--cover-b:#8895a4;--cover-c:#213247;",
    branch: "--cover-a:#edf3f3;--cover-b:#a8bab9;--cover-c:#637b7c;",
    lake: "--cover-a:#f2f3ed;--cover-b:#b8c5c8;--cover-c:#536f83;",
    paper: "--cover-a:#f5efe4;--cover-b:#d8c6aa;--cover-c:#9a8567;",
    flower: "--cover-a:#f4ece9;--cover-b:#d7b4ad;--cover-c:#a87772;"
  };
  return styles[name] || styles.mist;
}

function coverImage(name) {
  const images = {
    secondPart: "./assets/covers/second-part-cover.png"
  };
  return images[name] || "";
}

function bindActions() {
  app.querySelectorAll("[data-link]").forEach((element) => {
    element.addEventListener("click", () => navigate(element.dataset.link));
  });

  app.querySelectorAll("[data-font]").forEach((element) => {
    element.addEventListener("click", () => {
      state.fontSize = clamp(state.fontSize + Number(element.dataset.font), 15, 24);
      localStorage.setItem("yubo.fontSize", state.fontSize);
      render();
    });
  });

  app.querySelectorAll("[data-line]").forEach((element) => {
    element.addEventListener("click", () => {
      state.lineHeight = clamp(Number((state.lineHeight + Number(element.dataset.line)).toFixed(1)), 1.7, 2.6);
      localStorage.setItem("yubo.lineHeight", state.lineHeight);
      render();
    });
  });
}

function findNovel(id) {
  return state.novels.find((novel) => novel.id === id);
}

function notFound() {
  return `<main class="screen"><div class="empty">ページが見つかりません。</div></main>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(encodeURIComponent(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
