# Query Processor

> What your database does under the hood when you run a `SELECT` — except visible, editable, and explained step by step.

**SQL → AST → Relational Algebra → Optimized Relational Algebra.** A SQL parser written from scratch in TypeScript, paired with a web editor that shows, side by side, the execution tree of a query before and after going through the same optimization heuristics a real RDBMS (PostgreSQL, MySQL...) would apply internally.

```sql
SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE users.age > 18 AND orders.total > 100
```

This doesn't just become a result — it becomes a relational algebra tree:

```
π(users.name, orders.total)
  └── ⋈(users.id = orders.user_id)
        ├── σ(users.age > 18)(users)
        └── σ(orders.total > 100)(orders)
```

with selections and projections already pushed as close as possible to the base relations, exactly like a real query optimizer would do before deciding on an execution plan.

## Why this exists

Every relational database translates the SQL you write into a **relational algebra tree** and then rewrites that tree to run faster — without changing the result. That process is usually a black box hidden inside the database's query optimizer.

This project exposes that process: a SQL lexer and parser built from scratch (no off-the-shelf SQL parsing library), a translator into formal relational algebra, and a heuristic optimizer that applies, in the right order, the same classic transformations you'd find in a database textbook. It's useful both for studying database theory hands-on and as a base for experimenting with new optimization rules.

## What it can already do

- **Full `SELECT` parsing**: `WHERE` with `AND`/`OR`/parentheses, `INNER JOIN` and `CROSS JOIN` with qualified columns (`table.column`), subqueries in `FROM`
- **Translation to formal relational algebra**: projection (`π`), selection (`σ`), join (`⋈`), and cross product (`×`)
- **Optimizer with 4 heuristics applied in cascade**, each one assuming the previous one already ran:
  1. *Push down selections* — filter as early as possible, close to the data
  2. *Push down projections* — drop unneeded columns before joins
  3. *Most restrictive conditions first* — reorder selections and joins by estimated selectivity
  4. *Avoid cartesian product* — convert `×` into `⋈` whenever a condition allows it
- **Semantic validation** against a database schema (case-insensitive tables/columns, type compatibility in comparisons, detection of invalid `JOIN` conditions)
- **Never throws**: the whole API is result-based (`{ success, ... }`), with detailed error messages at every stage (lexer, parser, translator, validator)
- **Web editor** with Monaco, schema-aware autocomplete, and Mermaid diagrams comparing the original tree with the optimized one — including the list of rules applied to each query

**SQL supported today:**
```sql
-- Basic queries
SELECT * FROM users
SELECT id, name FROM users
SELECT * FROM users WHERE age > 18

-- Complex conditions
SELECT * FROM users WHERE age >= 18 AND status = 'active'
SELECT * FROM users WHERE age < 18 OR age > 65
SELECT * FROM users WHERE (age > 18 AND status = 'active') OR premium = true

-- INNER JOIN with qualified columns
SELECT users.id, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id

-- CROSS JOIN
SELECT * FROM users CROSS JOIN orders

-- Subqueries in FROM
SELECT * FROM (SELECT id, name FROM users) AS active_users
```

## Monorepo structure

```
query-processor/
├── packages/
│   ├── converter/   # Lexer, parser, AST, translator, optimizer, and schema validator
│   └── web/          # Interactive SQL editor (Monaco) with Mermaid visualization
└── package.json      # Root monorepo config (npm workspaces)
```

### `@query-processor/converter`

Standalone, publishable TypeScript library with the full pipeline: **Lexer → Parser (CST, via [Chevrotain](https://chevrotain.io/)) → AST → Relational Algebra → Optimizer**.

**Stack:** TypeScript, Chevrotain, Vitest

### `web`

Interactive SQL editor to see the converter's pipeline in action: dark theme, real-time validation against a database schema, schema viewer, and a visual (Mermaid) comparison between the original and optimized trees.

**Stack:** React 19, Monaco Editor, Vite, Tailwind CSS 4, Mermaid

See [`packages/web/src/utils/README.md`](packages/web/src/utils/README.md) for details on how the SQL autocomplete is wired into Monaco.

## Getting started

### Install dependencies

```bash
npm install
```

### Build all packages

```bash
npm run build
```

### Run tests

```bash
# All tests
npm test

# Converter only
npm run test:converter

# Watch mode
cd packages/converter
npm run test:watch
```

### Development

```bash
# Web editor
cd packages/web
npm run dev

# Build the converter
cd packages/converter
npm run build
```

### Using the converter as a library

```typescript
import { parseSQL, validateSQL } from '@query-processor/converter';

// Parse SQL and get back the AST, algebra translation, and optimized version
const result = parseSQL('SELECT * FROM users WHERE age > 18');

if (!result.success) {
  console.error('Parse error:', result.error, result.details);
  return;
}

console.log('AST:', result.ast);
console.log('Relational algebra:', result.translationString);
console.log('Optimized algebra:', result.optimizationString);

// Validate SQL against a schema
const schema = {
  tables: {
    users: {
      columns: {
        id: { type: 'integer' },
        name: { type: 'text' },
        age: { type: 'integer' }
      }
    }
  }
};

const errors = validateSQL('SELECT * FROM users WHERE age > 18', schema);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

## License

ISC
