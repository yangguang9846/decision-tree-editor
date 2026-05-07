# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Decision Tree Editor — a React 19 SPA for building and editing customer support decision trees. Deployed on GitHub Pages at `/decision-tree-editor/`.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server (port 3000, auto-finds next if busy)
pnpm build            # Vite build + esbuild server bundle → dist/
pnpm start            # Run production Express server (requires pnpm build first)
pnpm preview          # Vite preview of production build
pnpm check            # TypeScript type-check (tsc --noEmit)
pnpm format           # Prettier format all files
```

After `pnpm build`, Vite outputs the client to `dist/` and esbuild bundles `server/index.ts` into `dist/index.js`. The built client files are also copied to the repo root (`index.html`, `assets/`, `404.html`) for GitHub Pages deployment.

## Architecture

- **Stack**: Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix UI)
- **Source**: `client/src/` (SPA), `server/` (Express static file server), `shared/` (constants)
- **Build**: Vite root is `client/`, outputs to `dist/` at project root; server is bundled separately with esbuild
- **Base path**: `/decision-tree-editor/` in production (configured in `vite.config.ts` and `client/src/App.tsx`)
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/` (configured in both `vite.config.ts` and `tsconfig.json`)

### Routing

Single-route SPA using `wouter`. `App.tsx` wraps the router in `ThemeProvider` (light-only, theme switching disabled), `TooltipProvider`, and `ErrorBoundary`. The base path `/decision-tree-editor/` is set on the wouter `Router`.

### Data Model (`client/src/lib/treeTypes.ts`)

- `TreeData`: `{ platform_feats: string[], game_feats: string[], fallback?: string, decision_tree: TreeNode | null }`
- `TreeNode`: branch nodes have `id` + `type: 'branch'` + `key` + `branches: Record<string, TreeNode>`, leaf nodes have `id` + `type: 'leaf'` + `final: string`
- Conditions use comma-separated keys internally (e.g. `"818,863,866"`), converted to Python tuple format `("818", "863", "866")` on export
- Single-element tuples get trailing comma: `("818",)` for valid Python syntax
- Import uses `dictToTree()` which handles JSON, Python dict (booleans, None, single/double quotes), and CSV-exported format (double-double-quotes `""`). Accepts either `decision_tree` or `knowledge_tree` as the tree key
- Export uses `treeToDict()` which produces a Python dict string with `decision_tree` key and tab-indented formatting
- Core tree operations: `findNode()`, `findNodePath()`, `deleteNode()`, `cloneNode()` — all work on immutable copies returned by `cloneNode()`

### Key Components

- **`pages/Home.tsx`**: Main page — manages all tree state via `useState`/`useCallback`. Layout: toolbar top, SVG canvas left, right panel (metadata editor + node properties + Python code preview)
- **`components/TreeVisualizer.tsx`**: SVG-based tree renderer using manual layout algorithm (no D3). Supports node dragging, canvas panning (left/middle/right-click drag on empty space), scroll-wheel zoom toward mouse position, right-click context menu (add child / delete). Uses `ResizeObserver` for container size tracking
- **`components/NodeEditDialog.tsx`**: shadcn Dialog for editing branch node `key` or leaf node `final`
- **`components/ui/`**: shadcn/ui component library (Radix UI primitives, new-york style)
- **`lib/exampleData.ts`**: Example tree data — a channel-based customer support flow for avatar/nickname changes

### Server (`server/index.ts`)

Minimal Express server. In production serves static files from `dist/`; in development proxies from `../dist/`. All routes serve `index.html` for client-side routing. Only used when running `pnpm start`; not used in GitHub Pages deployment.

### Vite Config Plugins

The `vite.config.ts` includes several custom plugins:
- **`manus-debug-collector`**: In dev, injects a script that collects browser console logs, network requests, and session events via `POST /__manus__/logs`, writing them to `.manus-logs/` (auto-trimmed at 1MB)
- **`manus-storage-proxy`**: Proxies `/manus-storage/*` requests to a Forge storage backend for signed URLs
- **`jsxLocPlugin`** (`@builder.io/vite-plugin-jsx-loc`): Adds location attributes to JSX elements for debugging

### GitHub Pages SPA Setup

- `index.html` contains inline script that strips `/decision-tree-editor/` base path for wouter routing
- `404.html` captures deep links into `sessionStorage` and redirects to root, where `index.html` restores the path
- `.nojekyll` prevents Jekyll processing

### Template CSV Format

The `template (2).csv` defines decision trees with `knowledge_tree` key and Python tuple branch keys. Each row is a Q&A pair with `platform_feats`, `game_feats`, and `knowledge_tree` fields. The editor imports/exports this format — import handles both `knowledge_tree` and `decision_tree` keys.
