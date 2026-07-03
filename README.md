# EDA Cleaner

Production-ready Electron desktop application template.

## Tech Stack

- Electron + Electron Vite
- React + TypeScript
- React Router
- Zustand (client state)
- TanStack React Query (server state)
- Axios
- Tailwind CSS
- Electron Builder

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run build:win` | Build Windows installer |
| `npm run build:mac` | Build macOS DMG |
| `npm run build:linux` | Build Linux AppImage |

## Architecture

```
React Renderer → Preload (contextBridge) → IPC → Main Process
```

- **Renderer** (`src/`): React UI, never accesses Node.js/Electron directly
- **Preload** (`electron/preload/`): Secure bridge via `contextBridge`
- **Main** (`electron/main/`): Window management, IPC handlers, services
- **Shared** (`shared/`): Types, constants, enums used by both processes

## Security

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- No direct `ipcRenderer` exposure
