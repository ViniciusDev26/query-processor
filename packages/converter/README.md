# @query-processor/converter

SQL parser and converter to Abstract Syntax Tree (AST) and Relational Algebra.

## Features

- ✅ **Lexical Analysis**: Tokenization with support for SQL keywords, operators, and literals
- ✅ **Syntax Parsing**: Chevrotain-based parser generating Concrete Syntax Tree (CST)
- ✅ **AST Generation**: Type-safe Abstract Syntax Tree conversion
- ✅ **Error Handling**: Custom SQLParseError with detailed error messages
- ✅ **Type Safety**: Full TypeScript support with exported types
- ✅ **Well Tested**: 70 comprehensive tests covering all features

## Supported SQL Features

### SELECT Statements
```sql
-- Simple select
SELECT * FROM users

-- Column selection
SELECT id, name, email FROM users

-- WHERE conditions
SELECT * FROM users WHERE age > 18
SELECT * FROM users WHERE status = 'active'
SELECT * FROM users WHERE name = "John Doe"

-- Logical operators
SELECT * FROM users WHERE age >= 18 AND status = 'active'
SELECT * FROM users WHERE age < 18 OR age > 65

-- Parenthesized expressions
SELECT * FROM users WHERE (age > 18 AND status = 'active') OR role = 'admin'
SELECT * FROM users WHERE ((age > 18 AND age < 65) OR role = 'admin') AND status = 'active'
```

### Supported Operators
- Comparison: `=`, `!=`, `<>`, `<`, `>`, `<=`, `>=`
- Logical: `AND`, `OR`
- Grouping: `( )` for parenthesized expressions

### Supported Data Types
- Numbers: `42`, `3.14`
- Strings: `'single quoted'`, `"double quoted"`
- Identifiers: table names, column names

## Installation

```bash
npm install @query-processor/converter
```

## Usage

### Basic Parsing

```typescript
import { parseSQL } from '@query-processor/converter';

const ast = parseSQL('SELECT * FROM users WHERE age > 18');
console.log(ast);
```

### Error Handling

```typescript
import { parseSQL, SQLParseError } from '@query-processor/converter';

try {
  const ast = parseSQL('SELECT * FROM');
} catch (error) {
  if (error instanceof SQLParseError) {
    console.error('SQL Parse Error:', error.message);
    console.error('Details:', error.details);
  }
}
```

### Working with AST

```typescript
import { parseSQL, type Statement, type SelectStatement } from '@query-processor/converter';

const ast = parseSQL('SELECT id, name FROM users') as SelectStatement;

console.log('Type:', ast.type); // 'SELECT'
console.log('Columns:', ast.columns); // Array of column identifiers
console.log('Table:', ast.from); // 'users'
```

## API Reference

### Functions

#### `parseSQL(input: string): Statement`

Parses a SQL query string and returns an AST.

**Parameters:**
- `input`: SQL query string to parse

**Returns:**
- `Statement`: Abstract Syntax Tree representation

**Throws:**
- `SQLParseError`: If the input contains lexical or syntax errors

### Types

#### `Statement`
Union type of all supported statement types.

#### `SelectStatement`
```typescript
interface SelectStatement {
  type: 'SELECT';
  columns: Array<{ type: 'IDENTIFIER'; value: string } | { type: 'WILDCARD' }>;
  from: string;
  where?: WhereClause;
}
```

#### `WhereClause`
Represents WHERE conditions with comparison and logical operators.

#### `SQLParseError`
Custom error class for parsing errors.

```typescript
class SQLParseError extends Error {
  details: string;
  constructor(message: string, details: string);
}
```

## Architecture

The converter follows a three-stage pipeline:

1. **Lexer** (`SQLLexer`): Tokenizes input string into tokens
2. **Parser** (`SQLParser`): Generates CST from tokens using Chevrotain
3. **AST Builder** (`ASTBuilder`): Converts CST to type-safe AST

```
SQL Input → Lexer → Tokens → Parser → CST → AST Builder → AST
```

### Operator Precedence

The parser implements proper operator precedence for logical operators:

```
whereClause
    └── orExpression        (OR - lowest precedence)
        └── andExpression   (AND - higher precedence)
            └── primaryExpression
                └── comparisonExpression (=, !=, <, >, etc. - highest precedence)
```

**Key Rules:**

1. **AND has higher precedence than OR**
   - `age > 18 AND status = 'active' OR role = 'admin'`
   - Evaluated as: `(age > 18 AND status = 'active') OR (role = 'admin')`

2. **Parentheses override precedence**
   - `age > 18 AND (status = 'active' OR role = 'admin')`
   - OR is evaluated first due to parentheses

3. **Comparison operators have highest precedence**
   - Always evaluated before logical operators

**Grammar Hierarchy:**

- `whereClause` starts with `orExpression` (lowest precedence operator)
- Each level consumes the next higher precedence level
- This naturally creates left-to-right grouping with proper precedence

## Development

### Build

```bash
npm run build
```

### Test

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Project Structure

```
src/
├── ast/
│   └── types.ts           # AST type definitions
├── errors/
│   ├── SQLParseError.ts   # Custom error class
│   ├── lexerErrorHandler.ts
│   └── parserErrorHandler.ts
├── lexer/
│   ├── SQLLexer.ts        # Tokenizer
│   └── tokens/            # Token definitions
├── parser/
│   ├── SQLParser.ts       # Parser (CST generation)
│   ├── ASTBuilder.ts      # CST to AST converter
│   └── types.ts           # Parser type definitions
└── index.ts               # Public API
```

## Testing

The package includes comprehensive tests:

- **Lexer Tests**: Token recognition and error handling
- **Parser Tests**: CST generation for various SQL structures
- **AST Builder Tests**: AST conversion accuracy
- **Integration Tests**: End-to-end parsing
- **Error Handling Tests**: Lexer and parser error scenarios

## Tech Stack

- **TypeScript 5.9+**: Type-safe development
- **Chevrotain 11**: Parser generator framework
- **Vitest 3**: Fast unit testing

## License

ISC
