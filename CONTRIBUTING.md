# Contributing to RunPort

Thank you for your interest in contributing to RunPort! 🚀

We welcome contributions of all kinds — bug reports, feature ideas, documentation improvements, and code contributions.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm, pnpm, or yarn

### Local Setup

```bash
# 1. Fork & clone
git clone https://github.com/Ayush-Antiwal/RunPort.git
cd RunPort

# 2. Install dependencies
npm install

# 3. Run in development mode
npm run dev
```

This starts the Vite dev server and the Electron process with hot reload.

---

## Project Structure

```
RunPort/
├── electron/          # Main process (Node.js / Electron)
│   ├── main.ts        # App entry, window management
│   ├── processManager.ts  # Server lifecycle management
│   ├── detector.ts    # Framework auto-detection
│   ├── portMonitor.ts # Port conflict resolution
│   ├── store.ts       # Persistent project storage
│   ├── tray.ts        # System tray integration
│   └── preload.ts     # IPC bridge (context bridge)
├── src/               # Renderer process (React)
│   ├── components/    # Reusable UI components
│   ├── views/         # Page-level views
│   ├── types/         # TypeScript types
│   └── styles/        # Global styles
└── docs/              # Static marketing website
```

---

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** — keep commits focused and atomic.

3. **Test manually** by running `npm run dev` and verifying the app works end-to-end.

4. **Open a Pull Request** against `main` — fill in the PR template.

---

## Code Style

- **TypeScript** everywhere — no `any` unless absolutely necessary.
- **Electron security**: never expose Node APIs directly; use the `contextBridge` in `preload.ts`.
- **IPC handlers**: add new handlers in `main.ts` and expose them via `preload.ts`.
- **React**: functional components + hooks only; no class components.
- **Naming**: camelCase for variables/functions, PascalCase for components/types.

---

## Bug Reports & Feature Requests

Use GitHub Issues with the appropriate template:
- 🐛 [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
