# JSONLens — JSON Viewer

A minimal Chrome extension that renders raw JSON pages with syntax highlighting, collapsible nodes, search, and a dark interface inspired by modern developer tooling.

![Icon](icons/icon128.png)

---

## Features

- **Syntax highlighting** — Keys (red), strings (green), numbers (blue), booleans (pink), and null (gray) are each rendered in distinct colors for instant readability.
- **Collapse / Expand** — Click the `▸` arrow next to any object or array to collapse it. The collapsed preview shows the item count. Click again or press **Expand** in the toolbar to open everything back up.
- **Search** — Use the search bar (or `Ctrl+F` / `⌘F`) to find keys or values. Navigate matches with `Enter` / `Shift+Enter` or the arrow buttons.
- **Copy** — Copy the entire formatted JSON with one click, or hover any value row to reveal an inline copy button.
- **Geist Mono font** — Ships with Geist Mono (Regular & Medium) for a clean, modern look that matches Vercel's design system.
- **Sticky toolbar** — The toolbar stays pinned to the top with a frosted-glass blur effect while you scroll through large payloads.
- **Size badge** — Displays the byte size of the JSON payload in the toolbar.
- **Indent guides** — Subtle vertical lines mark each nesting level.
- **Error handling** — If the page contains invalid JSON, a clear error message with the parse error is shown instead.

---

## Installation

### From source (Developer mode)

1. **Download or clone** this repository to a folder on your machine.

2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** using the toggle in the top-right corner.

4. Click **Load unpacked**.

5. Select the folder containing the extension files (the one with `manifest.json` in it).

6. The extension icon should appear in your toolbar. Navigate to any raw JSON URL (e.g. a REST API endpoint) to see it in action.

### From ZIP

1. Download the `JSONLens.zip` file.
2. Unzip it to a permanent location (don't delete this folder — Chrome reads from it).
3. Follow steps 2–6 above, pointing "Load unpacked" at the unzipped folder.

---

## Usage

Once installed, the extension activates automatically on any page that serves raw JSON — either via an `application/json` content type or a page whose body contains a single `<pre>` element with valid JSON.

### Toolbar controls

| Control | Description |
|---|---|
| **Search** (`Ctrl/⌘ + F`) | Find keys or values. `Enter` goes to next match, `Shift+Enter` goes to previous. |
| **Collapse** | Collapse every object and array in the tree. |
| **Expand** | Expand everything back to its full depth. |
| **Copy** | Copy the pretty-printed JSON to your clipboard. |

### Inline interactions

- **Click `▸`** on any object/array row to toggle collapse.
- **Click the item count badge** (e.g. `3 items`) on a collapsed node to expand it.
- **Hover a value row** to reveal a `copy` button for that individual value.

---

## File structure

```
JSONLens /
├── manifest.json          # Chrome extension manifest (MV3)
├── content.js             # Main script — detects JSON and renders the tree
├── styles.css             # All styling for the rendered JSON viewer
├── popup.html             # Popup shown when clicking the extension icon
├── fonts/
│   ├── GeistMono-Regular.woff2
│   └── GeistMono-Medium.woff2
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Color palette

| Token | Color | Hex |
|---|---|---|
| Keys | Red | `#ff6b6b` |
| Strings | Green | `#7ee787` |
| Numbers | Blue | `#79c0ff` |
| Booleans | Pink | `#f97583` |
| Null | Gray | `#8b949e` |
| Background | Near-black | `#0a0a0a` |
| Brackets | Light gray | `#888888` |

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + F` | Focus the search input |
| `Enter` | Next search result |
| `Shift + Enter` | Previous search result |
| `Escape` | Clear search |

---

## Compatibility

- **Chrome** 88+ (Manifest V3)
- **Edge** 88+ (Chromium-based)
- **Brave**, **Arc**, and other Chromium browsers

---

## Permissions

The extension requests only the `activeTab` permission. It does not access browsing history, cookies, or any data beyond the current tab's page content when it detects raw JSON.

---

## Troubleshooting

**The viewer doesn't activate on a JSON page**
- Make sure the page serves raw JSON (content type `application/json` or a plain `<pre>` block). Pages that wrap JSON inside an HTML layout won't trigger the extension.
- Check `chrome://extensions` to confirm the extension is enabled.

**Fonts look different than expected**
- The Geist Mono fonts are bundled and declared as `web_accessible_resources`. If they fail to load, the extension falls back to JetBrains Mono → Fira Code → system monospace.

**Collapse/expand isn't working**
- Ensure you're using the latest version of `content.js`. Earlier versions had a scoping bug where the collapsed preview element wasn't accessible to the toggle handler.

---
