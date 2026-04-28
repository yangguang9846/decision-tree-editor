# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Decision Tree Editor — a React 19 SPA for building and editing customer support decision trees. Deployed on GitHub Pages at `/decision-tree-editor/`.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (port 3000, auto-finds next if busy)
pnpm build            # Production build → dist/
pnpm preview          # Preview production build
pnpm check            # TypeScript type-check
```

After `pnpm build`, the built files in `dist/` are copied to the repo root (`index.html`, `assets/`, `404.html`) for GitHub Pages deployment.

## Architecture

- **Stack**: Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix UI)
- **Source**: `client/src/` (SPA), `server/` (Express API), `shared/` (constants)
- **Build**: Vite root is `client/`, outputs to `dist/` at project root
- **Base path**: `/decision-tree-editor/` in production (configured in `vite.config.ts` and `client/index.html`)

### Data Model (`client/src/lib/treeTypes.ts`)

- `TreeData`: `{ platform_feats: string[], game_feats: string[], knowledge_tree: TreeNode | null }`
- `TreeNode`: branch nodes have `key` + `branches: Record<string, TreeNode>`, leaf nodes have `final: string`
- Conditions use comma-separated keys internally (e.g. `"818,863,866"`), converted to Python tuple format `("818", "863", "866")` on export
- Single-element tuples get trailing comma: `("818",)` for valid Python syntax
- Import uses `dictToTree()` which handles JSON, Python dict, and CSV-exported format (double-double-quotes `""`)
- Export uses `treeToDict()` which produces Python dict with `knowledge_tree` key matching `template (2).csv` format

### Key Components

- **`pages/Home.tsx`**: Main page — toolbar, canvas, right panel (metadata + node props + code preview)
- **`components/TreeVisualizer.tsx`**: SVG-based tree renderer using manual layout algorithm (no D3). Supports node dragging, canvas panning (left-click drag on empty space), scroll-wheel zoom, context menu
- **`components/NodeEditDialog.tsx`**: Modal for editing node key/final
- **`components/ui/`**: shadcn/ui component library (Radix UI primitives)

### GitHub Pages SPA Setup

- `index.html` contains inline script that strips `/decision-tree-editor/` base path for wouter routing
- `404.html` captures deep links into `sessionStorage` and redirects to root, where `index.html` restores the path
- `.nojekyll` prevents Jekyll processing

### Template CSV Format

The `template (2).csv` defines decision trees with `knowledge_tree` key and Python tuple branch keys. Each row is a Q&A pair with `platform_feats`, `game_feats`, and `knowledge_tree` fields. The editor imports/exports this format directly.
