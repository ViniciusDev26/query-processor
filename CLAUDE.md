# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Monorepo (npm workspaces) implementing a SQL → Relational Algebra converter:

- `packages/converter` (`@query-processor/converter`) — SQL lexer/parser (Chevrotain), AST builder, algebra translator, heuristic optimizer, schema validator, and Mermaid diagram exporter. Published as a library.
- `packages/web` (`@query-processor/web`) — React 19 + Vite SQL editor (Monaco) that consumes the converter to validate SQL against a schema and visualize the algebra tree (before/after optimization) as Mermaid diagrams.

## Commands

Run from the repo root unless noted.

```bash
npm install                 # install all workspaces

npm run build                # build all packages
npm test                     # run tests in all workspaces
npm run test:converter       # converter tests in watch mode
npm run lint                 # biome check . --unsafe (root-level lint/format)

npm run dev                  # start the web dev server (Vite)
```

Converter package (`packages/converter`):

```bash
npm run test --workspace=@query-processor/converter          # unit tests (src)
npm run test:unit --workspace=@query-processor/converter      # same as above
npm run test:e2e --workspace=@query-processor/converter       # e2e tests (tests/e2e)
npm run test:all --workspace=@query-processor/converter       # unit + e2e
npm run build --workspace=@query-processor/converter          # tsc build to dist/

# Single test file (from packages/converter):
npx vitest run src/optimizer/optimizations/pushDownSelections.spec.ts
npx vitest src/parser/SQLParser.spec.ts   # watch mode for one file
```

Web package (`packages/web`):

```bash
npm run dev --workspace=@query-processor/web       # Vite dev server
npm run build --workspace=@query-processor/web      # tsc -b && vite build
npm run lint --workspace=@query-processor/web       # eslint .
```

CI (`.github/workflows/test.yml`) runs, on Node 20.x/22.x: converter unit tests, converter e2e tests, then `npm run build` for all workspaces. Match this before considering a change done.

Formatting/linting is Biome (tabs, double quotes, organize-imports on save) for the converter and root; the web package uses ESLint instead (see `packages/web/eslint.config.js`).

## Architecture (converter package)

`parseSQL()` in `src/index.ts` is the main entry point and runs a fixed pipeline; each stage's source directory mirrors the pipeline stage:

1. **Lexer** (`src/lexer/`) — `SQLLexer` tokenizes raw SQL using Chevrotain token definitions split across `tokens/{keywords,literals,operators}.ts`.
2. **Parser** (`src/parser/`) — `SQLParser` (Chevrotain CST parser) turns tokens into a CST; only `selectStatement()` is currently invoked from `parseSQL`.
3. **AST builder** (`src/parser/ASTBuilder.ts`) — a Chevrotain visitor (`createASTBuilder`) walks the CST into the typed AST defined in `src/ast/types.ts`.
4. **Translator** (`src/translator/`) — `ASTToAlgebraTranslator` converts the AST (only `SelectStatement`s are supported — other statement types short-circuit `parseSQL` with an error) into the relational algebra tree defined in `src/algebra/types.ts` (`Projection`, `Selection`, `Relation`, `Join`, `CrossProduct`). `AlgebraToMermaidTranslator` / `algebraToMermaidMarkdown` render that tree as a Mermaid diagram for the web UI.
5. **Optimizer** (`src/optimizer/`) — `RelationalAlgebraOptimizer` rewrites the algebra tree by running the heuristics in `OptimizationHeuristic` **in enum declaration order**, since each pass assumes the previous one already ran:
   1. `PUSH_DOWN_SELECTIONS` — push filters toward base relations first.
   2. `PUSH_DOWN_PROJECTIONS` — then push/merge projections, now that selections are settled.
   3. `APPLY_MOST_RESTRICTIVE_FIRST` — reorder selections/joins by selectivity.
   4. `AVOID_CARTESIAN_PRODUCT` — convert cross products into joins where a condition allows it.
   Each heuristic lives in its own file under `src/optimizer/optimizations/` with a matching `.spec.ts`; adding a new heuristic means adding it both to the `OptimizationHeuristic` enum (in the correct position) and to `heuristicHandlers` in `RelationalAlgebraOptimizer`. Changing enum order changes optimization semantics, not just cosmetics.
6. **Validator** (`src/validator/`) — `SchemaValidator` checks a parsed `SelectStatement` against a `DatabaseSchema` (case-insensitive table/column names), independent of the optimizer.

Other notable pieces:
- `src/autocomplete/` — SQL keyword/operator suggestion helpers consumed by the web editor's completion provider.
- `src/errors/` — `SQLParseError`, lexer/parser error handlers producing the `details: string[]` returned by `parseSQL`'s error branch (the library never throws; all failure paths return `{ success: false, error, details }`).

Tests: unit specs live beside their source file (`*.spec.ts`, run via `test:unit`/`vitest run src`); cross-stage/e2e scenarios live in `packages/converter/tests/e2e/` (run via `test:e2e`).

## Architecture (web package)

- `src/App.tsx` wires together `SqlEditor` (Monaco), `ValidationErrors`, `MermaidDiagram`/`MermaidComparison`, and `CodeViewer`, calling into `@query-processor/converter`'s `parseSQL`/`validateSQL` to drive validation and diagram rendering (pre- and post-optimization algebra trees).
- `src/schema.ts` defines the static `DatabaseSchema` the editor validates against.
- `src/utils/sqlCompletionProvider.ts` adapts the converter's autocomplete exports into a Monaco completion provider.
- The web package depends on the converter via `@query-processor/converter` (workspace dependency) — after changing converter source, rebuild it (`npm run build --workspace=@query-processor/converter`) for the web app to pick up changes, since it consumes the built `dist/` output rather than `src/`.
