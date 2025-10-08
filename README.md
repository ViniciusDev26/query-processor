# Query Processor - SQL to Relational Algebra Converter

A monorepo containing a SQL parser/converter library and a web-based SQL editor.

## Structure

```
query-processor/
├── packages/
│   ├── converter/          # SQL to AST/Algebra converter library
│   └── web/                # Web-based SQL editor with Monaco
└── package.json            # Root monorepo config
```

## Packages

### @query-processor/converter

SQL parser and converter to Abstract Syntax Tree (AST) and Relational Algebra.

**Features:**
- ✅ Lexer with SQL tokens (SELECT, FROM, WHERE, AND, OR, operators)
- ✅ Parser using Chevrotain (CST → AST)
- ✅ Type-safe AST generation
- ✅ Support for basic SQL: SELECT, WHERE with conditions
- ✅ Custom error handling with SQLParseError
- ✅ Fully tested (70 tests)

**Supported SQL:**
```sql
SELECT * FROM users
SELECT id, name FROM users
SELECT * FROM users WHERE age > 18
SELECT * FROM users WHERE age >= 18 AND status = 'active'
SELECT * FROM users WHERE age < 18 OR age > 65
SELECT * FROM users WHERE name = "John Doe"
```

**Tech Stack:** TypeScript, Chevrotain, Vitest

### web

Interactive web-based SQL editor using Monaco Editor.

**Features:**
- ✅ Monaco Editor with SQL syntax highlighting
- ✅ Dark theme interface
- ✅ Integration with @query-processor/converter
- ✅ Real-time AST generation
- ✅ Modern UI with Tailwind CSS

**Tech Stack:** React 19, Monaco Editor, Vite, Tailwind CSS 4

## Getting Started

### Install Dependencies

```bash
npm install
```

### Build All Packages

```bash
npm run build
```

### Run Tests

```bash
# All tests
npm test

# Converter tests only
npm run test:converter

# Watch mode
cd packages/converter
npm run test:watch
```

### Development

```bash
# Run web development server
cd packages/web
npm run dev

# Build converter
cd packages/converter
npm run build
```

### Use Converter as Library

```typescript
import { parseSQL } from '@query-processor/converter';

const ast = parseSQL('SELECT * FROM users WHERE age > 18');
console.log(ast);
```
