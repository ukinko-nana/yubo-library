const editor = document.querySelector("#editor");

const state = {
  novels: [],
  selectedNovelId: "",
  selectedChapterId: "",
  dirty: false,
  status: "読み込み中..."
};

loadNovels();

async function loadNovels() {
  try {
    const response = await fetch("./api/novels", { cache: "no-store" });
    const novels = await response.json();
    if (!response.ok || !Array.isArray(novels)) {
      throw new Error(novels.error || "作品データを読み込めませんでした。");
    }
    state.novels = novels;
    state.selectedNovelId = state.novels[0]?.id || "";
    state.selectedChapterId = selectedNovel()?.chapters[0]?.id || "";
    state.status = "読み込みました";
    render();
  } catch {
    state.status = "読み込めませんでした";
    render();
  }
}

function render() {
  const novel = selectedNovel();
  const chapter = selectedChapter();

  editor.innerHTML = `
    <main class="editor-shell">
      <header class="topbar">
        <div>
          <h1 class="brand">ゆぼ文庫 更新用アプリ</h1>
          <p class="subtitle">本文を貼って保存すると、読むサイトの作品データに反映されます。</p>
        </div>
        <div class="status">${escapeHtml(state.status)}</div>
      </header>

      <div class="layout">
        <aside class="panel side">
          <div class="section">
            <h2 class="section-title">作品</h2>
            <div class="novel-list">
              ${state.novels.map((item) => `
                <button class="list-button ${item.id === state.selectedNovelId ? "active" : ""}" type="button" data-select-novel="${escapeAttr(item.id)}">
                  ${escapeHtml(item.title)}
                  <span class="list-sub">${item.chapters.length}話 ・ ${escapeHtml(item.updatedDate)}</span>
                </button>
              `).join("") || `<div class="empty">作品がありません</div>`}
            </div>
            <p class="button-row">
              <button class="text-button" type="button" data-add-novel>新しい作品</button>
            </p>
          </div>

          <div class="section">
            <h2 class="section-title">話</h2>
            <div class="episode-list">
              ${novel ? novel.chapters.map((item, index) => `
                <button class="list-button ${item.id === state.selectedChapterId ? "active" : ""}" type="button" data-select-chapter="${escapeAttr(item.id)}">
                  ${index + 1}話　${escapeHtml(item.title)}
                </button>
              `).join("") : `<div class="empty">作品を選んでください</div>`}
            </div>
            <p class="button-row">
              <button class="text-button" type="button" data-add-chapter ${novel ? "" : "disabled"}>話を追加</button>
            </p>
          </div>
        </aside>

        <section class="panel">
          ${novel ? renderNovelForm(novel, chapter) : renderEmpty()}
        </section>
      </div>
    </main>
  `;

  bind();
}

function renderNovelForm(novel, chapter) {
  return `
    <div class="section">
      <h2 class="section-title">作品情報</h2>
      <div class="form-grid">
        ${field("タイトル", "title", novel.title)}
        ${field("作者", "author", novel.author)}
        ${field("種類", "category", novel.category)}
        ${field("公開日", "publishedDate", novel.publishedDate)}
        ${field("更新日", "updatedDate", novel.updatedDate)}
        <label class="field">
          <span>状態</span>
          <select data-novel-field="status">
            ${option("writing", "執筆中", novel.status)}
            ${option("complete", "完結", novel.status)}
          </select>
        </label>
        <label class="field">
          <span>表紙</span>
          <select data-novel-field="cover">
            ${option("mist", "淡い青", novel.cover)}
            ${option("night", "夜の青", novel.cover)}
            ${option("paper", "紙色", novel.cover)}
            ${option("flower", "花", novel.cover)}
            ${option("secondPart", "第二部表紙", novel.cover)}
          </select>
        </label>
        <label class="field full">
          <span>紹介文</span>
          <textarea data-novel-field="summary">${escapeHtml(novel.summary)}</textarea>
        </label>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">本文</h2>
      ${chapter ? `
        <div class="form-grid">
          <label class="field full">
            <span>話タイトル</span>
            <input data-chapter-field="title" value="${escapeAttr(chapter.title)}">
          </label>
          <label class="field full">
            <span>本文テキスト</span>
            <textarea class="body-text" data-chapter-field="body" placeholder="ここに本文を貼り付けます。空行もそのまま保存されます。">${escapeHtml(chapter.body)}</textarea>
          </label>
        </div>
        <p class="hint">テキストファイルの本文をそのまま貼り付けて大丈夫です。段落の空行も保持されます。</p>
        <p class="button-row">
          <button class="danger-button" type="button" data-delete-chapter>この話を削除</button>
        </p>
      ` : `<div class="empty">話を追加してください</div>`}
    </div>

    <div class="section">
      <div class="button-row">
        <button class="primary-button" type="button" data-save>保存してJSONに反映</button>
        <button class="text-button" type="button" data-open-reader>読むサイトを開く</button>
        <button class="danger-button" type="button" data-delete-novel>この作品を削除</button>
      </div>
      <p class="hint">保存すると、直前のデータは <code>data/novels.backup.json</code> に残ります。</p>
    </div>
  `;
}

function renderEmpty() {
  return `
    <div class="empty">
      まず「新しい作品」を押してください。
    </div>
  `;
}

function field(label, key, value) {
  return `
    <label class="field">
      <span>${label}</span>
      <input data-novel-field="${key}" value="${escapeAttr(value)}">
    </label>
  `;
}

function option(value, label, current) {
  return `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`;
}

function bind() {
  editor.querySelectorAll("[data-select-novel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedNovelId = button.dataset.selectNovel;
      state.selectedChapterId = selectedNovel()?.chapters[0]?.id || "";
      render();
    });
  });

  editor.querySelectorAll("[data-select-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedChapterId = button.dataset.selectChapter;
      render();
    });
  });

  editor.querySelectorAll("[data-novel-field]").forEach((input) => {
    input.addEventListener("input", () => {
      selectedNovel()[input.dataset.novelField] = input.value;
      markDirty();
    });
  });

  editor.querySelectorAll("[data-chapter-field]").forEach((input) => {
    input.addEventListener("input", () => {
      selectedChapter()[input.dataset.chapterField] = input.value;
      markDirty();
    });
  });

  editor.querySelector("[data-add-novel]")?.addEventListener("click", addNovel);
  editor.querySelector("[data-add-chapter]")?.addEventListener("click", addChapter);
  editor.querySelector("[data-delete-novel]")?.addEventListener("click", deleteNovel);
  editor.querySelector("[data-delete-chapter]")?.addEventListener("click", deleteChapter);
  editor.querySelector("[data-save]")?.addEventListener("click", save);
  editor.querySelector("[data-open-reader]")?.addEventListener("click", () => {
    window.open("./", "_blank");
  });
}

function selectedNovel() {
  return state.novels.find((novel) => novel.id === state.selectedNovelId);
}

function selectedChapter() {
  return selectedNovel()?.chapters.find((chapter) => chapter.id === state.selectedChapterId);
}

function addNovel() {
  const today = formatDate(new Date());
  const novel = {
    id: `novel-${Date.now()}`,
    title: "新しい作品",
    author: "ゆぼ",
    category: "短編小説",
    summary: "",
    publishedDate: today,
    updatedDate: today,
    status: "writing",
    cover: "mist",
    chapters: [
      {
        id: "episode-1",
        title: "第一話",
        body: ""
      }
    ]
  };
  state.novels.unshift(novel);
  state.selectedNovelId = novel.id;
  state.selectedChapterId = novel.chapters[0].id;
  markDirty("新しい作品を作りました");
  render();
}

function addChapter() {
  const novel = selectedNovel();
  if (!novel) return;

  const next = novel.chapters.length + 1;
  const chapter = {
    id: `episode-${next}`,
    title: `第${next}話`,
    body: ""
  };
  novel.chapters.push(chapter);
  novel.updatedDate = formatDate(new Date());
  novel.status = "writing";
  state.selectedChapterId = chapter.id;
  markDirty("話を追加しました");
  render();
}

function deleteNovel() {
  const novel = selectedNovel();
  if (!novel || !confirm(`「${novel.title}」を削除しますか？`)) return;

  state.novels = state.novels.filter((item) => item.id !== novel.id);
  state.selectedNovelId = state.novels[0]?.id || "";
  state.selectedChapterId = selectedNovel()?.chapters[0]?.id || "";
  markDirty("作品を削除しました");
  render();
}

function deleteChapter() {
  const novel = selectedNovel();
  const chapter = selectedChapter();
  if (!novel || !chapter || !confirm(`「${chapter.title}」を削除しますか？`)) return;

  novel.chapters = novel.chapters.filter((item) => item.id !== chapter.id);
  state.selectedChapterId = novel.chapters[0]?.id || "";
  markDirty("話を削除しました");
  render();
}

async function save() {
  try {
    state.status = "保存中...";
    render();
    const response = await fetch("./api/novels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.novels)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    state.dirty = false;
    state.status = "保存しました";
    render();
  } catch (error) {
    state.status = error.message || "保存できませんでした";
    render();
  }
}

function markDirty(message = "未保存の変更があります") {
  state.dirty = true;
  state.status = message;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
