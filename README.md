# Knowledge Gardener 🌿

[![GitHub release](https://img.shields.io/github/v/release/buoopk/obsidian-knowledge-gardener?style=flat-square)](https://github.com/buoopk/obsidian-knowledge-gardener/releases)
[![Downloads](https://img.shields.io/github/downloads/buoopk/obsidian-knowledge-gardener/total?style=flat-square&color=success)](https://github.com/buoopk/obsidian-knowledge-gardener/releases)
[![License](https://img.shields.io/github/license/buoopk/obsidian-knowledge-gardener?style=flat-square)](LICENSE)

**Does your vault feel like an overgrown jungle?**

You write notes every day. You capture ideas, clip articles, jot down thoughts. But when was the last time you *tended* to them? How many notes are sitting in your Inbox, untouched for weeks? How many brilliant ideas are completely disconnected from everything else — invisible, forgotten, alone?

**Knowledge Gardener** treats your vault like a living garden. It scans your notes, diagnoses their health, and gives you a simple daily prescription: *"Here are the 3 notes that need your attention today."*

Stop feeling overwhelmed. Start gardening.

> ⚡ **Want to automate your vault maintenance?** 
> Check out [Knowledge Gardener Pro](https://remoquest6.gumroad.com/l/knowledgegardener) for Dashboard View, One-click fixes, and lightning-fast incremental scans.

---

![Scan result notice showing maturity distribution, orphan count, and stale inbox count](./docs/images/scan-result.png)

---

## ✨ Features

### 🔍 Vault Health Scan

Run a single command and instantly see the state of your entire vault:

- **Maturity distribution** — How many notes are Seeds, Sprouts, Evergreens, or Dead?
- **Orphan detection** — Notes with zero incoming *and* outgoing links.
- **Stale inbox tracking** — Notes languishing in your Inbox past their expiration date.
- **Excluded folder awareness** — Templates, daily notes, and other folders you specify are automatically skipped.

### 💊 Today's Prescription

The heart of the plugin. Instead of dumping a wall of diagnostics on you, Knowledge Gardener picks the **most important notes** and tells you *exactly* what to do — one note at a time.

Each prescription card includes:
- **The note** — Click to open it immediately.
- **The diagnosis** — What's wrong, in plain language.
- **The next action** — A concrete, small step you can take right now.
- **The why** — So you understand *why* this matters.

Think of it as a daily workout for your knowledge base. Three notes. Five minutes. Every day.

![Today's Prescription modal showing three actionable note cards with diagnoses and suggested actions](./docs/images/prescription-modal.png)

### 🌳 Maturity Levels

Every note in your vault is classified into one of four maturity stages:

| Stage | Icon | Meaning |
|-------|------|---------|
| **Seed** | 🌱 | Too short. This note has potential but needs more content to become useful. |
| **Sprout** | 🌿 | Growing! Has some content but could use more links or original writing (less quoting). |
| **Evergreen** | 🌲 | Fully mature. Well-written, well-connected, stands on its own. This is the goal. |
| **Dead** | 💀 | Abandoned. Hasn't been updated in a long time. Needs revival or archiving. |

### 🔗 Connectedness Diagnosis

Notes don't exist in isolation — or at least they shouldn't. Knowledge Gardener checks every note for:

| Condition | Severity | What it means |
|-----------|----------|---------------|
| No outgoing links AND no incoming links | 🔴 Critical | Completely orphaned. Knowledge is isolated. |
| No outgoing links | 🟡 Warning | One-way dead end. No pathways to related knowledge. |
| No incoming links | 🔵 Info | Nobody references this note. It might be invisible. |

### 📥 Inbox Staleness

Notes in your Inbox folder(s) are meant to be *temporary*. Knowledge Gardener flags notes that have been sitting there too long.

- Configure the threshold (default: 3 days).
- Choose the basis: **last modified date** or **creation date**.
- Inbox notes bypass the grace period — they're diagnosed immediately.

### 🎭 Tone Settings

Not everyone wants the same bedside manner. Choose your diagnostic tone:

| Tone | Style | Example message |
|------|-------|-----------------|
| 🌸 **Gentle** | Encouraging, emoji-rich | *"🌿 This note isn't connected to anything yet. How about adding a few links?"* |
| 📝 **Neutral** | Matter-of-fact, professional | *"Orphan note: both outgoing and incoming links are 0."* |
| 🔥 **Strict** | Direct, urgent | *"⚠️ Completely isolated. Add links now."* |

---

## 💎 Free vs Pro (Automate your workflow)

Knowledge Gardener is fully functional as a free community plugin. But if you value your time and want to maintain your vault **10x faster**, the **Pro** version is for you.

Stop manually dragging files and rewriting frontmatter. See the full picture of your vault and fix problems with a single click.

| Feature | Free | Pro |
|---------|:----:|:---:|
| Vault health scan | ✅ | ✅ |
| Today's Prescription modal | ✅ | ✅ |
| Connectedness & Inbox diagnosis | ✅ | ✅ |
| i18n & Emoji toggle | ✅ | ✅ |
| **Dashboard view** (See all issues at once) | — | ✅ |
| **One-click actions** (Move to Permanent/Archive instantly) | — | ✅ |
| **Prescription history & cooldown** (No repeat nagging) | — | ✅ |
| **Incremental caching** (200ms scans on large vaults) | — | ✅ |
| Priority support | — | ✅ |

### 👉 **[Get Knowledge Gardener Pro Here](https://remoquest6.gumroad.com/l/knowledgegardener)** 

---

## ⚙️ Configuration

All settings are accessible from **Settings → Knowledge Gardener**:

| Setting | Default | Description |
|---------|---------|-------------|
| Seed minimum chars | 300 | Notes shorter than this are classified as Seed |
| Dead note threshold | 90 days | Notes not updated for this long are classified as Dead |
| Excluded folders | `templates` | Comma-separated list of folders to skip |
| Inbox folders | `Inbox` | Comma-separated list of Inbox folders |
| Grace period | 7 days | New notes are excluded from diagnosis |
| Inbox stale days | 3 | Inbox notes older than this trigger a warning |
| Inbox staleness basis | Last modified | Measure from creation date or last modified date |
| Max daily suggestions | 3 | Number of notes shown in Today's Prescription |
| Tone | Gentle | Gentle / Neutral / Strict |
| Language | Auto-detect | English / Japanese / Auto |

---

## 📥 Installation

### From Obsidian Community Plugins
*(Coming soon - pending review)*

### Via BRAT (Beta Testing)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat).
2. Open **Settings → BRAT → Add Beta plugin**.
3. Enter: `buoopk/obsidian-knowledge-gardener`
4. Enable the plugin.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/buoopk/obsidian-knowledge-gardener/releases).
2. Create a folder: `<your-vault>/.obsidian/plugins/knowledge-gardener/`
3. Copy the three files into that folder.
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

---

## 🚀 Quick Start

1. **Install & enable** the plugin.
2. Open the command palette (`Ctrl/Cmd + P`).
3. Run **"Knowledge Gardener: Scan vault"** to see your vault's health.
4. Run **"Knowledge Gardener: Today's prescription"** (or click the 💗 ribbon icon) to get your daily action items.
5. Fix one note. Feel good. Repeat tomorrow.

---

## 🧠 Philosophy

Knowledge management tools help you *capture* information. But capturing is only half the job. Without regular maintenance, your vault becomes a graveyard of half-finished thoughts.

Knowledge Gardener is built on three principles:
1. **Small daily actions beat big annual cleanups.** Three notes a day, five minutes each. That's it.
2. **Diagnosis without action is noise.** Every problem comes with a concrete next step.
3. **Your tools should respect your attention.** No popups on startup. No aggressive notifications. You ask for the prescription when you're ready.

---

## ❤️ Support & Links

If Knowledge Gardener helps you maintain your vault, consider supporting its development:

- ⭐ **Star this repository** — It helps others discover the plugin.
- 🐛 **Report bugs** — [Open an issue](https://github.com/buoopk/obsidian-knowledge-gardener/issues).
- 💎 **[Unlock Pro Features](https://remoquest6.gumroad.com/l/knowledgegardener)** — Get the Dashboard, One-click fixes, and caching.
- ☕ **[Buy me a coffee](https://ko-fi.com/knowledge_gardener)** — Every cup fuels another free update.

---

## 📄 License

[MIT](LICENSE) — Use it freely. Grow your garden. 🌱