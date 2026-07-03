# Folder Structure

This document describes the purpose of each directory in the EDA Cleaner project. The application follows a layered architecture with strict separation between the Electron main process, preload bridge, and React renderer.

## Architecture Overview

```
React Renderer (renderer/)
       ↓  window.electron.*
Preload Bridge (electron/preload/)
       ↓  ipcRenderer.invoke
IPC Handlers (electron/main/ipc/)
       ↓
Services (electron/main/services/)
```

The renderer never accesses Node.js or Electron APIs directly. All cross-process communication flows through the preload layer.

---

## Root

| Path | Purpose |
|------|---------|
| `.vscode/` | Editor workspace settings (TypeScript SDK, formatting preferences). |
| `build/` | Build and packaging configuration (Electron Builder). |
| `electron/` | Electron main process and preload scripts. |
| `out/` | Compiled output from Electron Vite (generated — do not edit). |
| `release/` | Packaged installers produced by Electron Builder (generated). |
| `resources/` | Static assets bundled into the final application (icons, images). |
| `shared/` | Code shared between the main process, preload, and renderer. |
| `renderer/` | React renderer (UI layer). |

### Root Configuration Files

| File | Purpose |
|------|---------|
| `electron.vite.config.ts` | Electron Vite build configuration for main, preload, and renderer. |
| `package.json` | Dependencies, scripts, and project metadata. |
| `tsconfig.json` | Root TypeScript config with path aliases and project references. |
| `tsconfig.node.json` | TypeScript config for main process and preload. |
| `tsconfig.web.json` | TypeScript config for the React renderer. |
| `tailwind.config.js` | Tailwind CSS theme and content paths. |
| `postcss.config.cjs` | PostCSS plugins (Tailwind, Autoprefixer). |
| `eslint.config.js` | ESLint rules. |
| `.prettierrc` | Prettier formatting rules. |
| `.env.example` | Template for environment variables. |

---

## `electron/` — Electron Layer

All Electron-specific code lives here, split between the main process and the preload bridge.

### `electron/main/` — Main Process

The main process orchestrates the application. It does not contain business logic directly — that belongs in services.

| Path | Purpose |
|------|---------|
| `index.ts` | Entry point. Delegates to bootstrap — no application logic here. |
| `bootstrap/` | Application startup sequence: register events, IPC, and create the main window. |
| `config/` | Centralized configuration (environment, platform, feature flags). |
| `windows/` | BrowserWindow creation options and renderer URL/path resolution. |
| `managers/` | Stateful coordinators (e.g. `WindowManager` for multi-window lifecycle). |
| `services/` | Business logic classes (app, system, settings, updater). IPC handlers delegate to these. |
| `ipc/` | IPC channel registration. Maps renderer requests to service methods. |
| `events/` | Electron app lifecycle handlers (`activate`, `window-all-closed`, shortcuts). |
| `utils/` | Main-process utilities (logging, CSP policy generation). |

### `electron/preload/` — Preload Bridge

The only bridge between the renderer and Electron. Exposes typed APIs via `contextBridge`.

| Path | Purpose |
|------|---------|
| `index.ts` | Exposes `window.electron` APIs (`app`, `system`, `file`, `dialog`, `settings`, `updater`). |
| `api/` | Placeholder for splitting preload APIs into separate modules as they grow. |

---

## `renderer/` — React Renderer

The UI layer. Must never import Node.js or Electron modules directly — use `window.electron` instead.

| Path | Purpose |
|------|---------|
| `index.html` | HTML shell loaded by the renderer process. |
| `main.tsx` | React entry point — mounts the app to the DOM. |
| `vite-env.d.ts` | TypeScript declarations for Vite environment variables. |

### `renderer/app/`

Application root component and top-level composition.

| Path | Purpose |
|------|---------|
| `App.tsx` | Root React component. Wraps providers and the router. |

### `renderer/providers/`

React context providers that wrap the entire application.

| Path | Purpose |
|------|---------|
| `AppProviders.tsx` | Global providers (React Query, devtools). Add auth or theme providers here. |

### `renderer/routes/`

Client-side routing configuration.

| Path | Purpose |
|------|---------|
| `AppRouter.tsx` | React Router setup with layout and route definitions. |
| `index.tsx` | Route table — add new routes here as pages are created. |

### `renderer/layouts/`

Reusable page layout shells (header, sidebar, footer).

| Path | Purpose |
|------|---------|
| `MainLayout.tsx` | Default application layout with header and content area. |

### `renderer/pages/`

Placeholder for global pages that span multiple features. Feature-specific pages live under `renderer/features/`.

### `renderer/features/`

Feature-based modules. Each feature owns its components, hooks, services, types, and pages.

| Path | Purpose |
|------|---------|
| `home/` | Home/dashboard feature. |
| `home/hooks/` | Feature-specific React Query hooks and data fetching. |
| `home/pages/` | Feature page components (`HomePage.tsx`). |

When adding a new capability (e.g. authentication, disk analyzer), create a new folder under `features/` with the same internal structure.

### `renderer/components/`

Globally reusable UI components only. Feature-specific components belong in `renderer/features/<name>/components/`.

| Path | Purpose |
|------|---------|
| `layout/` | Shared layout components (`AppHeader`). |
| `ui/` | Generic UI primitives (`Button`, `Card`). |

### `renderer/hooks/`

Shared React hooks used across multiple features.

| Path | Purpose |
|------|---------|
| `useElectron.ts` | Typed access to the preload bridge APIs. |

### `renderer/services/`

Renderer-side service layer.

| Path | Purpose |
|------|---------|
| `electron-service.ts` | Wrapper around `window.electron` for safe API access. |
| `api-client.ts` | Axios HTTP client for external API calls. |

### `renderer/store/`

Client-side state managed by Zustand. Independent from React Query (server/async state).

| Path | Purpose |
|------|---------|
| `app-store.ts` | Global application state (app name, readiness flags). |

### `renderer/contexts/`

Placeholder for shared React contexts (e.g. theme, auth session) as the app grows.

### `renderer/styles/`

Global CSS and Tailwind imports.

| Path | Purpose |
|------|---------|
| `globals.css` | Tailwind directives, base styles, and global utility classes. |

### `renderer/types/`

Renderer-specific TypeScript type definitions.

### `renderer/utils/`

Renderer-side utility functions.

| Path | Purpose |
|------|---------|
| `cn.ts` | Tailwind class name merger (`clsx` + `tailwind-merge`). |

### `renderer/assets/`

Static assets imported by the renderer (fonts, images, SVGs).

---

## `shared/` — Cross-Process Code

Types, constants, and utilities used by both the Electron main process and the React renderer. Avoid duplicating definitions across layers.

| Path | Purpose |
|------|---------|
| `constants/` | Application-wide constants (app name, IPC channel names, window defaults). |
| `enums/` | Shared enumerations (`Platform`, `Environment`, `UpdateStatus`). |
| `interfaces/` | Shared data contracts (`SystemInfo`, `DialogResult`, `IpcResponse`). |
| `types/` | Shared utility types, config interfaces, and Electron API type definitions. |
| `utils/` | Shared pure functions (`formatBytes`, `sleep`). |

---

## `build/` — Build & Packaging

| Path | Purpose |
|------|---------|
| `electron-builder.config.js` | Electron Builder configuration for Windows (NSIS), macOS (DMG), and Linux (AppImage). Code signing placeholders are included for future use. |

---

## `resources/` — Application Assets

Static files bundled into the packaged application by Electron Builder.

| Path | Purpose |
|------|---------|
| `icons/` | Application icons for installers and the OS (`.ico`, `.icns`, `.png`). |
| `images/` | Images used in the packaged app (splash screens, about dialog). |

---

## Generated Directories

These directories are created during development and build. They are listed in `.gitignore` and should not be edited manually.

| Path | Purpose |
|------|---------|
| `out/` | Compiled main, preload, and renderer output from `electron-vite build`. |
| `release/` | Final distributable installers from `electron-builder`. |
| `node_modules/` | Installed npm dependencies. |

---

## Path Aliases

Absolute imports are configured to avoid long relative paths:

| Alias | Maps To | Used By |
|-------|---------|---------|
| `@/*` | `renderer/*` | Renderer |
| `@shared/*` | `shared/*` | All layers |
| `@main/*` | `electron/main/*` | Main process |
| `@preload/*` | `electron/preload/*` | Preload |

---

## Adding New Modules

To add a future capability (authentication, auto-updates, disk analyzer, etc.):

1. Add IPC channels in `shared/constants/`
2. Add types in `shared/interfaces/`
3. Create a service in `electron/main/services/`
4. Register handlers in `electron/main/ipc/`
5. Expose the API in `electron/preload/`
6. Create a feature folder in `renderer/features/<name>/`

This pattern keeps each layer independent and avoids restructuring existing code.
