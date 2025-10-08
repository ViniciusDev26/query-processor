# SQL Autocomplete Provider

## Overview

This module provides a thin wrapper around the `@query-processor/converter` package's autocomplete functionality for the Monaco Editor.

## Architecture

**All autocomplete logic is in the converter package**, which ensures:
- ✅ Keywords come directly from the lexer tokens
- ✅ Context analysis uses the same AST parser as validation
- ✅ Single source of truth for SQL grammar rules
- ✅ Autocomplete suggestions match what the parser actually accepts

This module (`sqlCompletionProvider.ts`) is just a **Monaco-specific adapter** that:
1. Extracts text from Monaco editor
2. Calls `getAutocompleteSuggestions()` from converter
3. Converts the results to Monaco's format

## How It Works

### AST-Based Context Analysis (from converter)

The autocomplete analyzes the SQL query in real-time using the AST parser to understand:

1. **Available Tables**: Extracts tables from FROM clauses and JOINs
2. **Query Context**: Determines where the cursor is (after SELECT, FROM, WHERE, etc.)
3. **Relevant Suggestions**: Only suggests columns from tables that are actually in the query

### Features

#### Smart Table Suggestions
- Tables are suggested after `FROM` or `JOIN` keywords
- Shows table metadata including:
  - Number of columns
  - Primary key
  - List of all columns

#### Context-Aware Column Suggestions
- **After FROM clause**: Suggests only columns from tables in the current query
- **Multiple tables**: When JOINs are detected, suggests columns from all joined tables
- **Qualified names**: Suggests both `columnName` and `tableName.columnName`
- **Type information**: Shows column type and constraints

#### Priority System
Suggestions are sorted by relevance:
1. Tables (when appropriate)
2. Columns from tables in current query (unqualified)
3. Columns from tables in current query (qualified)
4. All columns with table prefix (fallback)

## Example Usage

```typescript
import { createSqlCompletionProvider } from './utils/sqlCompletionProvider';
import { databaseSchema } from './schema';

// In Monaco Editor setup
monaco.languages.registerCompletionItemProvider(
  'sql',
  createSqlCompletionProvider(databaseSchema)
);
```

## Code Organization

### Converter Package (`@query-processor/converter`)
Location: `/packages/converter/src/autocomplete/index.ts`

**Responsibilities:**
- Extract keywords from lexer tokens
- Parse SQL to AST for context analysis
- Generate suggestions based on schema
- Define suggestion types and priorities

**Key Functions:**
- `getSqlKeywords()` - Extracts keywords from lexer
- `getComparisonOperators()` - Returns valid operators
- `getAutocompleteSuggestions()` - Main autocomplete logic

### Web Package (this package)
Location: `/packages/web/src/utils/sqlCompletionProvider.ts`

**Responsibilities:**
- Adapter for Monaco Editor only
- Extract text from editor
- Convert suggestions to Monaco format

**Size:** ~50 lines (vs 200+ lines in old implementation)

## Technical Details

### Context Detection (from converter)

The converter uses two strategies:

1. **AST Parsing**: Parses complete/partial SQL to extract semantic information
2. **Regex Matching**: Falls back to pattern matching for incomplete queries

### Example Scenarios

#### Scenario 1: After FROM
```sql
SELECT * FROM |
```
**Suggestions**: All table names from schema

#### Scenario 2: Column Selection
```sql
SELECT | FROM cliente
```
**Suggestions**: Columns from `cliente` table (prioritized), plus qualified columns

#### Scenario 3: WHERE Clause
```sql
SELECT * FROM cliente WHERE |
```
**Suggestions**: Columns from `cliente` table with type information

#### Scenario 4: JOINs
```sql
SELECT * FROM cliente JOIN pedido ON |
```
**Suggestions**: Columns from both `cliente` and `pedido` tables

## Benefits Over Simple Autocomplete

✅ **Context-Aware**: Only suggests relevant columns based on the query structure
✅ **AST-Powered**: Uses the same parser as the query validator
✅ **Type Information**: Shows column types and constraints
✅ **Smart Prioritization**: Most relevant suggestions appear first
✅ **Error-Tolerant**: Works even with incomplete/invalid SQL

## Future Enhancements

- [ ] Suggest aggregate functions (COUNT, SUM, AVG, etc.)
- [ ] Suggest WHERE conditions based on column types
- [ ] Support for table aliases
- [ ] Suggest valid JOIN conditions based on foreign keys
- [ ] Support for subquery analysis
- [ ] Syntax highlighting for errors in real-time
