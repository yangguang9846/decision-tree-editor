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
- **Source**: `client/src/` (SPA), `server/` (Express static file server)
- **Build**: Vite root is `client/`, outputs to `dist/` at project root; server is bundled separately with esbuild
- **Base path**: `/decision-tree-editor/` in production (configured in `vite.config.ts` and `client/src/App.tsx`)
- **Path aliases**: `@/` → `client/src/` (configured in both `vite.config.ts` and `tsconfig.json`)

### Routing

SPA using `wouter` with a `Switch` over `/` (Home), `/404`, and a catch-all fallback (both → `NotFound`). `App.tsx` wraps the router in `ThemeProvider` (light-only, theme switching disabled), `TooltipProvider`, and `ErrorBoundary`. The base path is set via `<Router base="/decision-tree-editor">`.

### Data Model (`client/src/lib/treeTypes.ts`)

- `TreeData`: `{ platform_feats: string[], game_feats: string[], fallback?: string, decision_tree: TreeNode | null }`
- `TreeNode`: branch nodes have `id` + `type: 'branch'` + `key` + `branches: Record<string, TreeNode>`, leaf nodes have `id` + `type: 'leaf'` + `final: string`
- Conditions use comma-separated keys internally (e.g. `"818,863,866"`), converted to Python tuple format `("818", "863", "866")` on export
- Single-element tuples get trailing comma: `("818",)` for valid Python syntax
- Import uses `dictToTree()` which handles JSON, Python dict (booleans, None, single/double quotes), and CSV-exported format (double-double-quotes `""`). Accepts either `decision_tree` or `knowledge_tree` as the tree key
- Export uses `treeToDict()` which produces a Python dict string with `decision_tree` key and tab-indented formatting
- Core tree operations (all return immutable copies; most clone via `cloneNode()` before mutating):
  - `findNode()` — locate a node by id (recursive descent through `branches`)
  - `deleteNode()` — remove a node and its entire subtree
  - `spliceNode()` — "delete node only": remove a node but re-parent its children under the grandparent (preserves subtree)
  - `insertParentAbove()` — wrap a node in a new branch parent (new parent's `else` branch holds the target); if target is root, the new node becomes root
  - `renameBranchCondition()` — rename a condition key in a parent's `branches` map (refuses to clobber an existing key)
  - `cloneNode()` — deep clone, the basis for the immutable updates above

### Key Components

- **`pages/Home.tsx`**: Main page — manages all tree state via `useState`/`useCallback`. Layout: toolbar top, SVG canvas left, right panel (metadata editor + node properties + Python code preview)
- **`components/TreeVisualizer.tsx`**: SVG-based tree renderer using manual layout algorithm (no D3). Supports node dragging (stored as per-node relative offsets in `nodeOffsets`, not absolute coords), canvas panning (left/middle/right-click drag on empty space), scroll-wheel zoom toward mouse position, and a right-click context menu with four actions: add child branch, insert a branch parent above (`insertParentAbove`), delete node only / keep subtree (`spliceNode`), delete node and subtree (`deleteNode`). Clicking a connection's condition label triggers inline rename (`onEditCondition`). Uses `ResizeObserver` for container size; auto-fits the viewport once on first load, then locks (via `initializedRef`) so auto-fit doesn't fight manual dragging
- **`components/NodeEditDialog.tsx`**: shadcn Dialog for editing branch node `key` or leaf node `final`
- **`components/ui/`**: shadcn/ui component library (Radix UI primitives, new-york style)
- **`lib/exampleData.ts`**: Example tree data — a channel-based customer support flow for avatar/nickname changes

### Server (`server/index.ts`)

Minimal Express server that serves static files and falls back to `index.html` for all routes (client-side routing). Only used by `pnpm start`; **not** used in the GitHub Pages deployment, which is fully static. Note: the server reads static files from `dist/public/` (prod) or `../dist/public/` (dev), but the Vite build actually emits to `dist/` — so `pnpm start` won't find the client assets as-is. GitHub Pages is the real deployment path; treat the Express server as vestigial unless you fix the static path.

### Vite Config Plugins

The `vite.config.ts` includes several custom plugins:
- **`manus-debug-collector`**: In dev, injects a script that collects browser console logs, network requests, and session events via `POST /__manus__/logs`, writing them to `.manus-logs/` (auto-trimmed at 1MB)
- **`manus-storage-proxy`**: Proxies `/manus-storage/*` requests to a Forge storage backend for signed URLs
- **`jsxLocPlugin`** (`@builder.io/vite-plugin-jsx-loc`): Adds location attributes to JSX elements for debugging

### GitHub Pages SPA Setup

- `404.html` captures deep links into `sessionStorage` (`spa_redirect`) and redirects to root
- `index.html` contains an inline script that restores that saved path via `history.replaceState`; base-path prefix handling itself is done by wouter's `base` prop (the script does not strip the base)
- `.nojekyll` prevents Jekyll processing

### Template CSV Format

The `template_new.csv` defines decision trees with `knowledge_tree` key and Python tuple branch keys. Each row is a Q&A pair with `platform_feats`, `game_feats`, and `knowledge_tree` fields. The editor imports/exports this format — import handles both `knowledge_tree` and `decision_tree` keys, normalizing to `decision_tree` internally.
