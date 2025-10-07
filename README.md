# Query Processor - SQL to Relational Algebra Converter

A monorepo containing a SQL parser/converter library.

## Structure

```
query-processor/
├── packages/
│   └── converter/          # SQL to AST/Algebra converter library
└── package.json            # Root monorepo config
```

## Package: @query-processor/converter

SQL parser and converter to Abstract Syntax Tree (AST) and Relational Algebra.

### Features
- ✅ Lexer with SQL tokens (SELECT, FROM, WHERE, AND, OR, operators)
- ✅ Parser using Chevrotain (CST → AST)
- ✅ Type-safe AST generation
- ✅ Support for basic SQL: SELECT, WHERE with conditions
- ✅ Fully tested (53 tests)

### Supported SQL

```sql
SELECT * FROM users
SELECT id, name FROM users
SELECT * FROM users WHERE age > 18
SELECT * FROM users WHERE age >= 18 AND status = 'active'
SELECT * FROM users WHERE age < 18 OR age > 65
```

### Tech Stack
- TypeScript
- Chevrotain (parser)
- Vitest (testing)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Build Converter

```bash
cd packages/converter
npm run build
```

### Run Tests

```bash
cd packages/converter
npm test
```

### Use as Library

```typescript
import { parseSQL } from '@query-processor/converter';

const ast = parseSQL('SELECT * FROM users WHERE age > 18');
console.log(ast);
```

## Development

```bash
# Run tests in watch mode
npm run dev:converter
```
