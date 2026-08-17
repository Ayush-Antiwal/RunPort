# RunPort — Case Study

**Product**: RunPort — Local Development Server Manager  
**Author**: [Ayush Antiwal](https://ayushantiwal.in)  
**Type**: Open-source desktop application  
**Platform**: Windows  
**Stack**: Electron · React 19 · TypeScript · Vite · TailwindCSS 4  
**Repo**: [github.com/Ayush-Antiwal/RunPort](https://github.com/Ayush-Antiwal/RunPort)  
**Website**: [ayush-antiwal.github.io/RunPort](https://ayush-antiwal.github.io/RunPort)

---

## The Problem

Every developer who works on more than one project at a time knows the ritual.

Open a terminal. Navigate to the project folder. Remember the right command. Run it. Watch it start. Open another terminal for the next project. Repeat.

By midday, eight terminal windows are open. They all look the same. You have no idea which one is running which project. A "port already in use" error appears and you spend five minutes hunting for the process to kill.

You repeat this entire sequence every morning.

The question that started RunPort was simple:

> Why should managing a running process be harder than managing an open application?

Everything else on your computer — music players, browsers, document editors — has a title, a visible state, and controls. Your development servers have none of that. They're invisible, anonymous, and impossible to manage without context-switching to a terminal.

---

## The Vision

A dashboard where every registered project is a card or row.

- Green dot = server running
- One click to start, stop, or restart
- Port and local URL visible at all times
- Live log output one tab away
- No terminal required for day-to-day use

The goal was not to replace the terminal entirely — it was to eliminate the *routine* parts: navigating, remembering commands, tracking which server is on which port, and managing process lifecycles.

---

## What Was Built

### Core Dashboard

The main view shows all registered projects in a sidebar list. Each project shows:

- **Name and framework badge** (e.g. `VITE`, `NEXT`, `EXPRESS`)
- **Status indicator** — Running (green), Idle (gray), Starting, Failed
- **Port number** — right-aligned for instant scanning
- **Active Git branch** — no more switching to terminal to run `git branch`
- **Uptime counter** — real-time, ticking from the moment the server started

Selecting a project opens the detail panel on the right: the local URL, a clickable "Open in Browser" button, VS&nbsp;Code integration, and the live terminal log output.

### Auto-Detection

When a developer clicks "Add Project" and selects a folder, RunPort inspects the project automatically:

- Reads `package.json` scripts to find the dev command
- Identifies the framework from dependencies and config files
- Selects the appropriate package manager (`npm`, `pnpm`, `yarn`, or `bun`)
- Pre-fills the port from framework defaults

Supported: **Next.js · Vite · Create React App · Angular · Nuxt · Vue CLI · NestJS · Express · Python · Go · Cargo (Rust)**

The developer reviews the detected configuration and saves. The project is persisted to disk and remembered between sessions.

### Floating Widget

A frameless, always-on-top mini window floats above the code editor. It shows every registered project with its running status and port. Each row has Start / Stop buttons. The widget is designed for one purpose: control your servers without leaving your editor.

### Smart Port Conflict Resolver

When a start command fails because a port is occupied, RunPort:
1. Identifies which process (PID) is using the port
2. Presents a choice: **Kill the process** or **Use the next free port**
3. Executes whichever action the developer chooses — no manual `netstat` or Task Manager needed

### Live Log Streaming

Server output streams in real time inside the app. The log panel supports:
- **Filter** — search within log output
- **Copy** — copy all log text to clipboard
- **Clear** — wipe the buffer
- **Color-coded lines** — timestamps in cyan, URLs in green, errors highlighted

### System Tray

RunPort minimizes to the system tray. Right-clicking the tray icon gives access to **Start All** and **Stop All** — useful for ending a work session or spinning up an entire environment at once.

---

## Technical Challenges

### 1. Process Tree Killing on Windows

Stopping a Node.js development server is not as simple as killing the process you spawned. On Windows, the child process (`node`, `vite`, `next`) is a grandchild of the spawned shell. Killing the shell leaves the server running, which means the port stays occupied and the developer sees a ghost process.

RunPort uses `tree-kill` to send a SIGTERM (and fallback SIGKILL) to the entire process group rooted at the spawned PID. This guarantees that all descendant processes — build watchers, bundlers, HMR servers — are terminated cleanly.

### 2. High-Velocity Log Output

During a cold Vite or Next.js build, hundreds of log lines can arrive in a few hundred milliseconds. Sending each line as an individual IPC message from the Electron main process to the renderer caused the React component to re-render on every line, blocking the main thread and making the UI unresponsive.

The solution: **50&nbsp;ms IPC batching**. Log lines are collected in a buffer in the main process and flushed to the renderer as a batch every 50&nbsp;ms. The renderer appends the entire batch in one DOM update. The UI stays smooth regardless of output velocity.

A bounded ring buffer (2,048&nbsp;MB dynamic cap) prevents unbounded memory growth for long-running servers.

### 3. Frameless Transparent Widget on Windows

Creating a floating widget that looks polished on Windows required a frameless Electron `BrowserWindow` with `transparent: true` and `alwaysOnTop: true`. The challenge is hit-testing: the widget background must be click-through-transparent, but the widget content must receive clicks normally.

This is solved with CSS `pointer-events: none` on the background and `pointer-events: auto` on content elements, combined with Electron's `setIgnoreMouseEvents` API toggled based on whether the cursor is over interactive content.

### 4. IPC Security (Context Bridge)

Electron's `contextBridge` is used exclusively for all main-to-renderer communication. No Node.js APIs are exposed directly to the renderer. All IPC handlers are registered in `main.ts` and exposed as typed functions in `preload.ts`. This means the React UI has zero direct access to the filesystem, child processes, or native OS APIs — all operations go through the narrow, typed bridge.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│           Renderer (React + Vite)        │
│  Dashboard · AddProjectModal · LogPanel  │
│  Widget · Sidebar · SettingsModal        │
└──────────────┬──────────────────────────┘
               │  IPC (contextBridge)
┌──────────────▼──────────────────────────┐
│         Main Process (Electron)          │
│  main.ts — window management, IPC hub   │
│  ProcessManager — server lifecycle       │
│  Store — JSON persistence (electron-    │
│           store pattern)                 │
│  detector.ts — framework detection      │
│  portMonitor.ts — port conflict UX      │
│  tray.ts — system tray integration      │
└─────────────────────────────────────────┘
```

**God nodes** (most connected abstractions):
- `ProcessManager` — 22 edges; the central controller for all server processes
- `Store` — 10 edges; bridges project data between the main process and renderer

---

## Results vs. MVP Spec

The original MVP spec defined 11 required capabilities. All 11 shipped:

| # | Requirement | Status |
|---|---|---|
| 1 | Add a project | ✅ |
| 2 | Save project for future use | ✅ |
| 3 | Configure or detect dev server | ✅ |
| 4 | Start the server | ✅ |
| 5 | Stop the server | ✅ |
| 6 | Restart the server | ✅ |
| 7 | Display current server status | ✅ |
| 8 | Display local URL and port | ✅ |
| 9 | Open project in browser | ✅ |
| 10 | View basic server output | ✅ |
| 11 | Manage multiple projects simultaneously | ✅ |

Additional features delivered beyond MVP:
- Floating always-on-top widget
- Git branch display
- Uptime counter
- System tray with Start All / Stop All
- Smart port conflict resolver
- VS Code integration

---

## Lessons Learned

**What worked:**
- Starting with a tight MVP spec prevented scope creep during the first build
- The IPC context bridge pattern made the security boundary obvious from day one
- TailwindCSS 4 + Radix UI (for accessible dialogs/selects) eliminated an entire class of UI decisions

**What would change:**
- The process kill on Windows should have been validated earlier — it was the last thing tested and required a significant fix near the end
- The log batching architecture was added reactively after noticing UI jank. It should be a first-class architectural decision from the start

---

## Roadmap

| Feature | Description |
|---|---|
| **Development Profiles** | Group projects into named profiles; start/stop an entire environment with one action |
| **Docker Integration** | Manage Docker containers alongside local dev servers from the same dashboard |
| **WSL Support** | Surface WSL-hosted servers in the RunPort UI |
| **Resource Monitoring** | Per-process CPU and memory usage |
| **macOS** | Cross-platform build extending the current Windows-only release |
| **Auto-Restart on Crash** | Detect unexpected server exits and optionally restart with configurable back-off |

---

*RunPort is open source under the MIT License. Contributions welcome at [github.com/Ayush-Antiwal/RunPort](https://github.com/Ayush-Antiwal/RunPort).*
