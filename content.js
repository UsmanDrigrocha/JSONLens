/**
 * JSONLens — JSON Viewer
 * Content script: detects raw JSON pages and renders them beautifully.
 */

(function () {
  "use strict";

  // ── Detection ──────────────────────────────────────────────────
  function isJsonPage() {
    const ct = document.contentType || "";
    if (ct.includes("application/json") || ct.includes("text/json"))
      return true;

    const body = document.body;
    if (!body) return false;
    const children = [...body.children];
    if (children.length === 1 && children[0].tagName === "PRE") {
      return looksLikeJson(children[0].textContent.trim());
    }
    if (body.children.length === 0) {
      return looksLikeJson(body.textContent.trim());
    }
    return false;
  }

  function looksLikeJson(text) {
    if (!text) return false;
    const t = text.trimStart();
    return (
      (t[0] === "{" || t[0] === "[") && (t.endsWith("}") || t.endsWith("]"))
    );
  }

  // ── Raw JSON extraction ────────────────────────────────────────
  function getRawJson() {
    const pre = document.body.querySelector("pre");
    return (pre ? pre.textContent : document.body.textContent).trim();
  }

  // ── Utilities ──────────────────────────────────────────────────
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Node renderer ──────────────────────────────────────────────
  let nodeId = 0;
  const collapsedSet = new Set();

  function createNode(value, key, isLast, depth) {
    const id = ++nodeId;
    const wrapper = document.createElement("div");
    wrapper.className = "jv-node";
    wrapper.dataset.id = id;

    const isObj = value !== null && typeof value === "object";
    const isArr = Array.isArray(value);
    const isEmpty =
      isObj && (isArr ? value.length === 0 : Object.keys(value).length === 0);

    // ── FIX: Declare at function scope so toggle closures can access them ──
    let collapsedPreview = null;
    let childrenEl = null;
    let closingRow = null;

    // Row
    const row = document.createElement("div");
    row.className = "jv-row";

    // Toggle arrow (only for non-empty objects/arrays)
    if (isObj && !isEmpty) {
      const toggle = document.createElement("span");
      toggle.className = "jv-toggle open";
      toggle.innerHTML =
        '<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleNode(id, toggle, childrenEl, collapsedPreview, closingRow);
      });
      row.appendChild(toggle);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "jv-toggle-placeholder";
      row.appendChild(placeholder);
    }

    // Key
    if (key !== null) {
      const keyEl = document.createElement("span");
      keyEl.className = "jv-key";
      keyEl.textContent = '"' + key + '"';
      row.appendChild(keyEl);

      const colon = document.createElement("span");
      colon.className = "jv-colon";
      colon.textContent = ": ";
      row.appendChild(colon);
    }

    // Value rendering
    if (!isObj) {
      // Primitive
      const valEl = document.createElement("span");
      if (typeof value === "string") {
        valEl.className = "jv-string";
        valEl.textContent = '"' + value + '"';
      } else if (typeof value === "number") {
        valEl.className = "jv-number";
        valEl.textContent = value;
      } else if (typeof value === "boolean") {
        valEl.className = "jv-boolean";
        valEl.textContent = value;
      } else if (value === null) {
        valEl.className = "jv-null";
        valEl.textContent = "null";
      }
      row.appendChild(valEl);

      // Copy button for values
      const copyBtn = makeCopyBtn(
        typeof value === "string" ? value : String(value),
      );
      row.appendChild(copyBtn);

      if (!isLast) {
        const comma = document.createElement("span");
        comma.className = "jv-comma";
        comma.textContent = ",";
        row.appendChild(comma);
      }
    } else if (isEmpty) {
      // Empty object/array
      const bracket = document.createElement("span");
      bracket.className = "jv-bracket";
      bracket.textContent = isArr ? "[]" : "{}";
      row.appendChild(bracket);

      if (!isLast) {
        const comma = document.createElement("span");
        comma.className = "jv-comma";
        comma.textContent = ",";
        row.appendChild(comma);
      }
    } else {
      // Opening bracket
      const openBracket = document.createElement("span");
      openBracket.className = "jv-bracket";
      openBracket.textContent = isArr ? "[" : "{";
      row.appendChild(openBracket);

      // Collapsed inline preview — assigned to function-scoped variable
      collapsedPreview = document.createElement("span");
      collapsedPreview.className = "jv-collapsed-preview";
      collapsedPreview.style.display = "none";
      const count = isArr ? value.length : Object.keys(value).length;
      collapsedPreview.textContent =
        count + " " + (count === 1 ? "item" : "items");
      collapsedPreview.addEventListener("click", function () {
        const toggle = wrapper.querySelector(".jv-toggle");
        toggleNode(id, toggle, childrenEl, collapsedPreview, closingRow);
      });
      row.appendChild(collapsedPreview);
    }

    wrapper.appendChild(row);

    // Children
    if (isObj && !isEmpty) {
      childrenEl = document.createElement("div");
      childrenEl.className = "jv-children";

      const childEntries = isArr
        ? value.map(function (v, i) {
            return [i, v];
          })
        : Object.entries(value);
      childEntries.forEach(function (entry, idx) {
        var k = entry[0],
          v = entry[1];
        var isChildLast = idx === childEntries.length - 1;
        childrenEl.appendChild(
          createNode(v, isArr ? null : k, isChildLast, depth + 1),
        );
      });

      wrapper.appendChild(childrenEl);

      // Closing bracket row — assigned to function-scoped variable
      closingRow = document.createElement("div");
      closingRow.className = "jv-row jv-closing-row";
      var placeholder2 = document.createElement("span");
      placeholder2.className = "jv-toggle-placeholder";
      closingRow.appendChild(placeholder2);
      var closeBracket = document.createElement("span");
      closeBracket.className = "jv-bracket";
      closeBracket.textContent = isArr ? "]" : "}";
      closingRow.appendChild(closeBracket);

      if (!isLast) {
        var comma = document.createElement("span");
        comma.className = "jv-comma";
        comma.textContent = ",";
        closingRow.appendChild(comma);
      }
      wrapper.appendChild(closingRow);
    }

    return wrapper;
  }

  function makeCopyBtn(text) {
    var btn = document.createElement("button");
    btn.className = "jv-copy-btn";
    btn.textContent = "copy";
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "copied";
        setTimeout(function () {
          btn.textContent = "copy";
        }, 1500);
      });
    });
    return btn;
  }

  // ── FIX: toggleNode now also hides/shows the closing bracket row ──
  function toggleNode(id, toggleEl, childrenEl, collapsedPreview, closingRow) {
    if (!childrenEl) return;
    var isOpen = !collapsedSet.has(id);
    if (isOpen) {
      // Collapse
      collapsedSet.add(id);
      childrenEl.style.display = "none";
      if (closingRow) closingRow.style.display = "none";
      if (collapsedPreview) collapsedPreview.style.display = "inline-flex";
      if (toggleEl) {
        toggleEl.classList.remove("open");
        toggleEl.classList.add("closed");
      }
    } else {
      // Expand
      collapsedSet.delete(id);
      childrenEl.style.display = "";
      if (closingRow) closingRow.style.display = "";
      if (collapsedPreview) collapsedPreview.style.display = "none";
      if (toggleEl) {
        toggleEl.classList.remove("closed");
        toggleEl.classList.add("open");
      }
    }
  }

  // ── Search ─────────────────────────────────────────────────────
  function setupSearch(root) {
    var input = root.querySelector("#jv-search-input");
    var counter = root.querySelector("#jv-search-counter");
    var highlights = [];
    var currentIdx = -1;

    function clearHighlights() {
      highlights.forEach(function (el) {
        el.classList.remove("jv-highlight");
      });
      highlights = [];
      currentIdx = -1;
      counter.textContent = "";
    }

    function doSearch(query) {
      clearHighlights();
      if (!query) return;
      var q = query.toLowerCase();
      var content = root.querySelector(".jv-content");
      var spans = content.querySelectorAll(
        ".jv-key, .jv-string, .jv-number, .jv-boolean, .jv-null",
      );
      spans.forEach(function (span) {
        if (span.textContent.toLowerCase().includes(q)) {
          highlights.push(span);
        }
      });
      if (highlights.length > 0) {
        currentIdx = 0;
        highlights[0].classList.add("jv-highlight");
        highlights[0].scrollIntoView({ behavior: "smooth", block: "center" });
        counter.textContent = "1 / " + highlights.length;
      } else {
        counter.textContent = "0 results";
      }
    }

    function navigate(dir) {
      if (!highlights.length) return;
      highlights[currentIdx].classList.remove("jv-highlight");
      currentIdx = (currentIdx + dir + highlights.length) % highlights.length;
      highlights[currentIdx].classList.add("jv-highlight");
      highlights[currentIdx].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      counter.textContent = currentIdx + 1 + " / " + highlights.length;
    }

    input.addEventListener("input", function () {
      doSearch(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.shiftKey ? navigate(-1) : navigate(1);
      }
      if (e.key === "Escape") {
        input.value = "";
        clearHighlights();
        input.blur();
      }
    });

    root
      .querySelector("#jv-search-prev")
      .addEventListener("click", function () {
        navigate(-1);
      });
    root
      .querySelector("#jv-search-next")
      .addEventListener("click", function () {
        navigate(1);
      });
  }

  // ── Collapse / Expand all — FIX: also toggle closing rows ─────
  function collapseAll(root) {
    root.querySelectorAll(".jv-children").forEach(function (el) {
      el.style.display = "none";
    });
    root.querySelectorAll(".jv-closing-row").forEach(function (el) {
      el.style.display = "none";
    });
    root.querySelectorAll(".jv-collapsed-preview").forEach(function (el) {
      el.style.display = "inline-flex";
    });
    root.querySelectorAll(".jv-toggle").forEach(function (el) {
      el.classList.remove("open");
      el.classList.add("closed");
    });
  }

  function expandAll(root) {
    root.querySelectorAll(".jv-children").forEach(function (el) {
      el.style.display = "";
    });
    root.querySelectorAll(".jv-closing-row").forEach(function (el) {
      el.style.display = "";
    });
    root.querySelectorAll(".jv-collapsed-preview").forEach(function (el) {
      el.style.display = "none";
    });
    root.querySelectorAll(".jv-toggle").forEach(function (el) {
      el.classList.remove("closed");
      el.classList.add("open");
    });
    collapsedSet.clear();
  }

  // ── Main render ────────────────────────────────────────────────
  function render(rawJson) {
    var parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      document.body.innerHTML = "";
      var errRoot = document.createElement("div");
      errRoot.id = "json-viewer-root";
      errRoot.innerHTML =
        '<div class="jv-error">' +
        '<div class="jv-error-title">Invalid JSON</div>' +
        '<pre class="jv-error-pre">' +
        escapeHtml(err.message) +
        "</pre>" +
        "</div>";
      document.body.appendChild(errRoot);
      return;
    }

    var byteSize = new TextEncoder().encode(rawJson).length;

    // Build DOM
    document.body.innerHTML = "";
    document.documentElement.style.cssText =
      "background:#0a0a0a;margin:0;padding:0;";
    document.body.style.cssText = "margin:0;padding:0;background:#0a0a0a;";

    var root = document.createElement("div");
    root.id = "json-viewer-root";

    // Toolbar
    var toolbar = document.createElement("div");
    toolbar.className = "jv-toolbar";
    toolbar.innerHTML =
      '<div class="jv-toolbar-logo">' +
      '<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M46 30L33 30L33 58L27 64L33 70L33 98L46 98" stroke="#ff6b6b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
      '<path d="M82 30L95 30L95 58L101 64L95 70L95 98L82 98" stroke="#7ee787" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
      '<circle cx="54" cy="64" r="4" fill="#79c0ff"/><circle cx="64" cy="64" r="4" fill="#79c0ff"/><circle cx="74" cy="64" r="4" fill="#79c0ff"/>' +
      "</svg>" +
      '<span class="jv-toolbar-label">JSON Viewer</span>' +
      "</div>" +
      '<div class="jv-toolbar-divider"></div>' +
      '<span class="jv-size-badge">' +
      formatBytes(byteSize) +
      "</span>" +
      '<div class="jv-spacer"></div>' +
      '<div class="jv-search-box">' +
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="color:#555;flex-shrink:0;">' +
      '<circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.3"/>' +
      '<path d="M8 8L10.5 10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
      "</svg>" +
      '<input id="jv-search-input" type="text" placeholder="Search\u2026" spellcheck="false">' +
      '<span id="jv-search-counter" class="jv-search-counter"></span>' +
      '<button id="jv-search-prev" class="jv-btn jv-btn-icon" title="Previous (Shift+Enter)">' +
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<button id="jv-search-next" class="jv-btn jv-btn-icon" title="Next (Enter)">' +
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      "</div>" +
      '<button id="jv-collapse-btn" class="jv-btn">' +
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 3.5H9M1 6.5H9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' +
      "<span>Collapse</span>" +
      "</button>" +
      '<button id="jv-expand-btn" class="jv-btn">' +
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 2H9M1 5H9M1 8H9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' +
      "<span>Expand</span>" +
      "</button>" +
      '<button id="jv-copy-all-btn" class="jv-btn">' +
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M7 3V2C7 1.44772 6.55228 1 6 1H2C1.44772 1 1 1.44772 1 2V6C1 6.55228 1.44772 7 2 7H3" stroke="currentColor" stroke-width="1.2"/></svg>' +
      "<span>Copy</span>" +
      "</button>";

    root.appendChild(toolbar);

    var content = document.createElement("div");
    content.className = "jv-content";
    root.appendChild(content);

    // Reset state
    nodeId = 0;
    collapsedSet.clear();

    var isArr = Array.isArray(parsed);
    var rootOpen = document.createElement("div");
    rootOpen.className = "jv-row";
    rootOpen.innerHTML =
      '<span class="jv-toggle-placeholder"></span><span class="jv-bracket">' +
      (isArr ? "[" : "{") +
      "</span>";
    content.appendChild(rootOpen);

    var childrenWrapper = document.createElement("div");
    childrenWrapper.className = "jv-children";
    var entries = isArr
      ? parsed.map(function (v, i) {
          return [i, v];
        })
      : Object.entries(parsed);
    entries.forEach(function (entry, idx) {
      var k = entry[0],
        v = entry[1];
      var isLast = idx === entries.length - 1;
      childrenWrapper.appendChild(createNode(v, isArr ? null : k, isLast, 1));
    });
    content.appendChild(childrenWrapper);

    var rootClose = document.createElement("div");
    rootClose.className = "jv-row";
    rootClose.innerHTML =
      '<span class="jv-toggle-placeholder"></span><span class="jv-bracket">' +
      (isArr ? "]" : "}") +
      "</span>";
    content.appendChild(rootClose);

    document.body.appendChild(root);

    // Button handlers
    root
      .querySelector("#jv-collapse-btn")
      .addEventListener("click", function () {
        collapseAll(root);
      });
    root.querySelector("#jv-expand-btn").addEventListener("click", function () {
      expandAll(root);
    });
    root
      .querySelector("#jv-copy-all-btn")
      .addEventListener("click", function () {
        var btn = this;
        var label = btn.querySelector("span");
        navigator.clipboard
          .writeText(JSON.stringify(parsed, null, 2))
          .then(function () {
            label.textContent = "Copied!";
            setTimeout(function () {
              label.textContent = "Copy";
            }, 1800);
          });
      });

    setupSearch(root);

    // Keyboard shortcut: Cmd/Ctrl+F focuses search
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        root.querySelector("#jv-search-input").focus();
      }
    });
  }

  // ── Entry point ────────────────────────────────────────────────
  if (isJsonPage()) {
    var raw = getRawJson();
    render(raw);
  }
})();
