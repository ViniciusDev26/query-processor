# @query-processor/converter

SQL parser and converter to Abstract Syntax Tree (AST) and Relational Algebra.

## Features

- ✅ **Lexical Analysis**: Tokenization with support for SQL keywords, operators, and literals
- ✅ **Syntax Parsing**: Chevrotain-based parser generating Concrete Syntax Tree (CST)
- ✅ **AST Generation**: Type-safe Abstract Syntax Tree conversion
- ✅ **Schema Validation**: Validate queries against database schema with type checking
- ✅ **Error Handling**: Custom SQLParseError with detailed error messages
- ✅ **Type Safety**: Full TypeScript support with exported types
- ✅ **Well Tested**: 103 comprehensive tests covering all features

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

### Schema Validation

Validate SQL queries against a database schema before parsing:

```typescript
import { validateSQL, type DatabaseSchema, SchemaValidationError } from '@query-processor/converter';

// Define your database schema
const schema: DatabaseSchema = {
  tables: {
    users: {
      columns: {
        id: { type: 'INT', primaryKey: true },
        name: { type: 'VARCHAR', length: 100 },
        email: { type: 'VARCHAR', length: 255 },
        age: { type: 'TINYINT' },
        balance: { type: 'DECIMAL', precision: 10, scale: 2 },
        is_active: { type: 'BOOLEAN' },
        created_at: { type: 'DATETIME' }
      }
    }
  }
};

// Validate SQL against schema
const errors = validateSQL('SELECT name, email FROM users WHERE age > 18', schema);

if (errors.length === 0) {
  console.log('Query is valid!');
} else {
  console.error('Validation failed:');
  errors.forEach(err => console.error(`  - ${err.message}`));
}
```

**Supported column types:**
- `INT` - Integer numbers
- `TINYINT` - Small integer numbers (0-255)
- `VARCHAR` - Variable-length strings (with optional `length` parameter)
- `DECIMAL` - Decimal numbers (with optional `precision` and `scale` parameters)
- `BOOLEAN` - Boolean values
- `DATETIME` - Date and time values

**Validation checks:**
- ✅ Table existence (case-insensitive)
- ✅ Column existence in specified tables (case-insensitive)
- ✅ Type compatibility in comparisons (numeric, string, boolean, datetime)
- ✅ Proper type matching between literals and columns

**Note:** Table and column name validation is **case-insensitive**, following standard SQL behavior. This means `SELECT Name FROM Users` will match a schema with `name` and `users`.

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

### AST to Mermaid Visualization

Convert AST to Mermaid diagram syntax for visual representation:

```typescript
import { parseSQL, astToMermaidMarkdown } from '@query-processor/converter';

const result = parseSQL('SELECT * FROM users WHERE age > 18');

if (result.success) {
  const mermaidDiagram = astToMermaidMarkdown(result.ast);
  console.log(mermaidDiagram);
  // Outputs markdown with mermaid code block:
  // ```mermaid
  // graph TD
  //   node0(["SELECT"])
  //   node1(("*"))
  //   ...
  // ```
}
```

The Mermaid translator generates flowchart diagrams that visualize the AST structure, showing:
- Statement nodes (SELECT, FROM, WHERE, JOIN)
- Column references and literals
- Expression trees with operators
- Parent-child relationships between nodes

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

#### `validateSQL(input: string, schema: DatabaseSchema): ValidationError[]`

Validates a SQL query against a database schema.

**Parameters:**
- `input`: SQL query string to validate
- `schema`: Database schema definition

**Returns:**
- `ValidationError[]`: Array of validation errors (empty if valid)

**Throws:**
- `SQLParseError`: If the input contains lexical or syntax errors

#### `astToMermaidMarkdown(ast: Statement): string`

Converts an AST to Mermaid diagram syntax wrapped in a markdown code block.

**Parameters:**
- `ast`: Statement AST to visualize

**Returns:**
- `string`: Mermaid diagram code wrapped in markdown code fence

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

#### `SchemaValidationError`
Custom error class for schema validation errors.

```typescript
class SchemaValidationError extends Error {
  errors: ValidationError[];
  getDetails(): ValidationError[];
  hasErrorType(type: ValidationError["type"]): boolean;
}
```

#### `DatabaseSchema`
Database schema definition for validation.

```typescript
interface DatabaseSchema {
  tables: Record<string, TableSchema>;
}

interface TableSchema {
  columns: Record<string, ColumnDefinition>;
}

interface ColumnDefinition {
  type: ColumnType;
  length?: number;        // For VARCHAR (e.g., VARCHAR(255))
  precision?: number;     // For DECIMAL (total digits, e.g., DECIMAL(10,2) -> precision: 10)
  scale?: number;         // For DECIMAL (decimal places, e.g., DECIMAL(10,2) -> scale: 2)
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
}

type ColumnType = "INT" | "TINYINT" | "VARCHAR" | "DATETIME" | "DECIMAL" | "BOOLEAN";
```

## Architecture

The converter follows a multi-stage pipeline:

1. **Lexer** (`SQLLexer`): Tokenizes input string into tokens
2. **Parser** (`SQLParser`): Generates CST from tokens using Chevrotain
3. **AST Builder** (`ASTBuilder`): Converts CST to type-safe AST
4. **Translators**: Transform AST into different representations
   - **ASTToAlgebraTranslator**: Converts AST to Relational Algebra notation
   - **ASTToMermaidTranslator**: Converts AST to Mermaid diagram syntax

```
SQL Input → Lexer → Tokens → Parser → CST → AST Builder → AST
                                                            ↓
                                              ┌─────────────┴─────────────┐
                                              ↓                           ↓
                                    Relational Algebra          Mermaid Diagram
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
├── translator/
│   ├── ASTToAlgebraTranslator.ts  # AST to Relational Algebra
│   ├── ASTToMermaidTranslator.ts  # AST to Mermaid diagram
│   ├── types.ts           # Translator type definitions
│   └── index.ts           # Translator exports
├── validator/
│   ├── SchemaValidator.ts # Schema validation logic
│   ├── SchemaValidationError.ts # Validation error class
│   └── types.ts           # Schema type definitions
└── index.ts               # Public API
```

## Testing

The package includes comprehensive tests:

- **Lexer Tests**: Token recognition and error handling
- **Parser Tests**: CST generation for various SQL structures
- **AST Builder Tests**: AST conversion accuracy
- **Schema Validation Tests**: Table, column, and type validation
- **Integration Tests**: End-to-end parsing
- **Error Handling Tests**: Lexer and parser error scenarios

## Tech Stack

- **TypeScript 5.9+**: Type-safe development
- **Chevrotain 11**: Parser generator framework
- **Vitest 3**: Fast unit testing

## License

ISC
