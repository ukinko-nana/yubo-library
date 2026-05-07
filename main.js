const app = document.querySelector("#app");

const state = {
  novels: [],
  route: parseRoute(),
  fontSize: Number(localStorage.getItem("yubo.fontSize") || 18),
  lineHeight: Number(localStorage.getItem("yubo.lineHeight") || 2.1),
  fontFamily: localStorage.getItem("yubo.fontFamily") || "notoSerif",
  readingMode: localStorage.getItem("yubo.readingMode") || "horizontal",
  verticalPage: 0,
  verticalPageCount: 1
};

const fontOptions = {
  notoSerif: {
    label: "Noto Serif JP",
    description: "落ち着いた本文向けの標準明朝です。",
    stack: '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif'
  },
  yuMincho: {
    label: "游明朝",
    description: "紙の小説に近い、端正な読み心地です。",
    stack: '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif'
  },
  notoSans: {
    label: "Noto Sans JP",
    description: "くっきり読める、現代的なゴシックです。",
    stack: '"Noto Sans JP", "Yu Gothic", "Hiragino Sans", "Meiryo", sans-serif'
  }
};

if (!fontOptions[state.fontFamily]) {
  state.fontFamily = "notoSerif";
  localStorage.setItem("yubo.fontFamily", state.fontFamily);
}

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
  applyFontFamily();
  return `
    <header class="topbar">
      <button class="brand" type="button" data-link="/">
        <span>ゆぼ文庫</span>
      </button>
      <div class="top-actions">
        ${catImage("peek", "top-cat")}
        <button class="text-button" type="button" data-link="/">本棚</button>
        <button class="text-button" type="button" data-link="/updates">更新メモ</button>
        <button class="text-button" type="button" data-link="/settings">設定</button>
      </div>
    </header>
    ${content}
  `;
}

function render() {
  const route = state.route;
  if (route.name === "updates") {
    app.innerHTML = shell(renderUpdates());
  } else if (route.name === "settings") {
    app.innerHTML = shell(renderSettings());
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

  if (route.name === "read") {
    setupVerticalPager();
  }
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
  const isVertical = state.readingMode === "vertical";

  return `
    <main class="screen reader-screen ${isVertical ? "vertical-mode" : ""}">
      <header class="reader-header">
        <p class="eyebrow">${index + 1}話 / ${novel.chapters.length}話</p>
        <h1>${escapeHtml(episode.title)}</h1>
        <p class="muted">${escapeHtml(novel.title)}</p>
        ${catImage("sleep", "reader-cat")}
      </header>

      <article class="reader-body ${isVertical ? "vertical" : "horizontal"}">
        <div class="reader-page-content">${renderReaderBody(novel, episode)}</div>
      </article>

      <nav class="reader-controls" aria-label="読書操作">
        <div class="control-group">
          <button class="icon-button" type="button" data-font="-1">A-</button>
          <button class="icon-button" type="button" data-font="1">A+</button>
          <button class="icon-button" type="button" data-line="-0.1">行間-</button>
          <button class="icon-button" type="button" data-line="0.1">行間+</button>
          <button class="icon-button" type="button" data-reading-mode="${isVertical ? "horizontal" : "vertical"}">${isVertical ? "横読み" : "縦読み"}</button>
        </div>
        ${isVertical ? `
          <div class="control-group page-control-group">
            <button class="text-button" type="button" data-page-turn="-1">前頁</button>
            <span class="page-indicator" data-page-indicator>1 / 1</span>
            <button class="text-button primary" type="button" data-page-turn="1">次頁</button>
          </div>
        ` : ""}
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

function renderSettings() {
  return `
    <main class="screen">
      <section class="hero-row">
        <div>
          <p class="eyebrow">Settings</p>
          <h1>読みやすさを選ぶ</h1>
          <p class="muted">フォントはこの端末に保存されます。</p>
        </div>
        ${catImage("sit", "hero-cat")}
      </section>

      <section class="settings-panel">
        <h2>読み方向</h2>
        <div class="reading-choice-grid">
          <button class="reading-choice ${state.readingMode === "horizontal" ? "active" : ""}" type="button" data-reading-mode="horizontal">
            <span class="reading-choice-title">横読み</span>
            <span class="reading-choice-description">いつものWebページのように、上から下へ読みます。</span>
          </button>
          <button class="reading-choice ${state.readingMode === "vertical" ? "active" : ""}" type="button" data-reading-mode="vertical">
            <span class="reading-choice-title">縦読み</span>
            <span class="reading-choice-description">右から左へ流れる、文庫らしい読み方です。</span>
          </button>
        </div>
      </section>

      <section class="settings-panel">
        <h2>フォント</h2>
        <div class="font-choice-grid">
          ${Object.entries(fontOptions).map(([key, option]) => `
            <button class="font-choice ${state.fontFamily === key ? "active" : ""}" type="button" data-font-choice="${key}">
              <span class="font-choice-title font-preview-${key}">${option.label}</span>
              <span class="font-choice-sample font-preview-${key}">海辺の午後、静かなページをめくる。</span>
              <span class="font-choice-description">${option.description}</span>
            </button>
          `).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderReaderBody(novel, episode) {
  const illustrations = readerIllustrations(novel, episode);
  const illustrationsByParagraph = new Map();

  illustrations.forEach((illustration) => {
    const afterParagraph = Number(illustration.afterParagraph || 1);
    const list = illustrationsByParagraph.get(afterParagraph) || [];
    list.push(illustration);
    illustrationsByParagraph.set(afterParagraph, list);
  });

  const paragraphs = String(episode.body || "")
    .split(/\n+/)
    .filter((paragraph) => paragraph.trim());

  return paragraphs.map((paragraph, index) => {
    const paragraphNumber = index + 1;
    const figures = (illustrationsByParagraph.get(paragraphNumber) || [])
      .map(renderIllustration)
      .join("");

    return `<p class="reader-paragraph">${escapeHtml(paragraph)}</p>${figures}`;
  }).join("");
}

function setupVerticalPager() {
  if (state.readingMode !== "vertical") {
    state.verticalPage = 0;
    state.verticalPageCount = 1;
    return;
  }

  const paginate = () => {
    const viewport = app.querySelector(".reader-body.vertical");
    const content = app.querySelector(".reader-body.vertical .reader-page-content");
    if (!viewport || !content) {
      return;
    }

    paginateVerticalContent(viewport, content);
    const pageWidth = verticalPageWidth(viewport);
    state.verticalPageCount = Math.max(1, content.querySelectorAll(".reader-page").length);
    state.verticalPage = clamp(state.verticalPage, 0, state.verticalPageCount - 1);
    applyVerticalPage();
  };

  paginate();
  setTimeout(paginate, 0);
}

function paginateVerticalContent(viewport, content) {
  if (content.dataset.paginated === "true") {
    return;
  }

  const blocks = Array.from(content.children);
  const pageWidth = verticalPageWidth(viewport);
  content.innerHTML = "";

  let page = createReaderPage(content);

  blocks.forEach((block) => {
    if (block.classList.contains("reader-illustration")) {
      if (pageHasContent(page)) {
        page = createReaderPage(content);
      }
      page.dataset.pageKind = "illustration";
      page.appendChild(block);
      page = createReaderPage(content);
      return;
    }

    const segments = paragraphSegments(block.textContent || "");
    segments.forEach((segment) => {
      const paragraph = document.createElement("p");
      paragraph.className = "reader-paragraph";
      paragraph.textContent = segment;
      page.appendChild(paragraph);

      if (page.scrollWidth > pageWidth && page.children.length > 1) {
        paragraph.remove();
        page = createReaderPage(content);
        page.appendChild(paragraph);
      }
    });
  });

  if (!pageHasContent(page) && content.children.length > 1) {
    page.remove();
  }

  content.dataset.paginated = "true";
}

function createReaderPage(content) {
  const page = document.createElement("div");
  page.className = "reader-page measuring";
  content.appendChild(page);
  return page;
}

function pageHasContent(page) {
  return page.children.length > 0 || page.textContent.trim();
}

function paragraphSegments(text) {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const sentences = normalized.match(/[^。！？!?]+[。！？!?」』）)]*|.+$/g) || [normalized];
  const segments = [];

  sentences.forEach((sentence) => {
    if (sentence.length <= 42) {
      segments.push(sentence);
      return;
    }

    for (let index = 0; index < sentence.length; index += 42) {
      segments.push(sentence.slice(index, index + 42));
    }
  });

  return segments;
}

function verticalPageWidth(viewport) {
  const styles = getComputedStyle(viewport);
  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
  return Math.max(1, viewport.clientWidth - paddingLeft - paddingRight);
}

function applyVerticalPage() {
  const viewport = app.querySelector(".reader-body.vertical");
  const content = app.querySelector(".reader-body.vertical .reader-page-content");
  const indicator = app.querySelector("[data-page-indicator]");
  if (!viewport || !content) {
    return;
  }

  content.querySelectorAll(".reader-page").forEach((page, index) => {
    page.classList.remove("measuring");
    page.classList.toggle("active", index === state.verticalPage);
  });

  app.querySelectorAll("[data-page-turn]").forEach((button) => {
    const direction = Number(button.dataset.pageTurn);
    button.disabled = direction < 0
      ? state.verticalPage <= 0
      : state.verticalPage >= state.verticalPageCount - 1;
  });

  if (indicator) {
    indicator.textContent = `${state.verticalPage + 1} / ${state.verticalPageCount}`;
  }
}

function renderIllustration(illustration) {
  const src = illustrationSrc(illustration.src);
  if (!src) {
    return "";
  }

  const caption = illustration.caption
    ? `<figcaption>${escapeHtml(illustration.caption)}</figcaption>`
    : "";

  return `
    <figure class="reader-illustration">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(illustration.alt || "")}">
      ${caption}
    </figure>
  `;
}

function readerIllustrations(novel, episode) {
  if (Array.isArray(episode.illustrations) && episode.illustrations.length) {
    return episode.illustrations;
  }

  if (novel.id === "novel-1777457907420" && episode.id === "episode-1") {
    return [
      {
        afterParagraph: 3,
        src: "./assets/cat-books.png",
        alt: "本のそばにいる猫",
        caption: "挿絵サンプル"
      }
    ];
  }

  return [];
}

function illustrationSrc(src) {
  if (!src) {
    return "";
  }

  if (/^(https?:)?\/\//.test(src) || src.startsWith("./") || src.startsWith("/")) {
    return src;
  }

  return `./assets/${src}`;
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
    element.classList.toggle("active", linkMatchesRoute(element.dataset.link));
    element.addEventListener("click", () => navigate(element.dataset.link));
  });

  app.querySelectorAll("[data-font-choice]").forEach((element) => {
    element.addEventListener("click", () => {
      state.fontFamily = element.dataset.fontChoice;
      localStorage.setItem("yubo.fontFamily", state.fontFamily);
      render();
    });
  });

  app.querySelectorAll("[data-reading-mode]").forEach((element) => {
    element.addEventListener("click", () => {
      state.readingMode = element.dataset.readingMode === "vertical" ? "vertical" : "horizontal";
      localStorage.setItem("yubo.readingMode", state.readingMode);
      state.verticalPage = 0;
      render();
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  });

  app.querySelectorAll("[data-page-turn]").forEach((element) => {
    element.addEventListener("click", () => {
      state.verticalPage = clamp(
        state.verticalPage + Number(element.dataset.pageTurn),
        0,
        state.verticalPageCount - 1
      );
      applyVerticalPage();
    });
  });

  app.querySelectorAll("[data-font]").forEach((element) => {
    element.addEventListener("click", () => {
      state.fontSize = clamp(state.fontSize + Number(element.dataset.font), 15, 24);
      localStorage.setItem("yubo.fontSize", state.fontSize);
      state.verticalPage = 0;
      render();
    });
  });

  app.querySelectorAll("[data-line]").forEach((element) => {
    element.addEventListener("click", () => {
      state.lineHeight = clamp(Number((state.lineHeight + Number(element.dataset.line)).toFixed(1)), 1.7, 2.6);
      localStorage.setItem("yubo.lineHeight", state.lineHeight);
      state.verticalPage = 0;
      render();
    });
  });
}

function findNovel(id) {
  return state.novels.find((novel) => novel.id === id);
}

function linkMatchesRoute(link) {
  if (link === "/") {
    return state.route.name === "shelf";
  }

  if (link === "/updates") {
    return state.route.name === "updates";
  }

  if (link === "/settings") {
    return state.route.name === "settings";
  }

  return false;
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

function applyFontFamily() {
  const option = fontOptions[state.fontFamily] || fontOptions.notoSerif;
  document.documentElement.style.setProperty("--reader-family", option.stack);
}
