# @query-processor/converter

SQL parser and converter to Abstract Syntax Tree (AST) and Relational Algebra.

## Features

- ✅ **Lexical Analysis**: Tokenization with support for SQL keywords, operators, and literals
- ✅ **Syntax Parsing**: Chevrotain-based parser generating Concrete Syntax Tree (CST)
- ✅ **AST Generation**: Type-safe Abstract Syntax Tree conversion
- ✅ **Relational Algebra Translation**: Convert SQL queries to Relational Algebra notation
- ✅ **Query Optimization**: Advanced heuristic-based optimization with 4 optimization rules
- ✅ **Visual Diagrams**: Generate Mermaid diagrams for Relational Algebra trees with execution order
- ✅ **Autocomplete**: Context-aware SQL autocomplete suggestions
- ✅ **Schema Validation**: Validate queries against database schema with type checking
- ✅ **Error Handling**: Custom SQLParseError with detailed error messages
- ✅ **Type Safety**: Full TypeScript support with exported types
- ✅ **Well Tested**: 195 comprehensive tests covering all features

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

-- JOIN operations
SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id
SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE users.age > 18

-- Subqueries in FROM clause
SELECT * FROM (SELECT * FROM users WHERE age > 18) AS adults
```

### JOIN Operations
- `INNER JOIN` with `ON` condition
- Support for table aliases
- Support for qualified column names (e.g., `users.id`, `u.name`)
- Multiple JOINs in a single query

### Subqueries
- Subqueries in `FROM` clause
- Subquery aliases with `AS`

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

const result = parseSQL('SELECT * FROM users WHERE age > 18');

if (result.success) {
  console.log('AST:', result.ast);
  console.log('Relational Algebra:', result.translationString);
  // Output: π [*](σ [age > 18](users))
}
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

### Relational Algebra Translation

Convert SQL queries to Relational Algebra notation:

```typescript
import { parseSQL, ASTToAlgebraTranslator } from '@query-processor/converter';

const result = parseSQL('SELECT name, email FROM users WHERE age > 18');

if (result.success) {
  // Access the translation result
  console.log(result.translationString);
  // Output: π [name, email](σ [age > 18](users))

  // Or use the translator directly
  const translator = new ASTToAlgebraTranslator();
  const algebra = translator.translate(result.ast);

  if (algebra.success) {
    console.log(translator.algebraToString(algebra.algebra));
  }
}
```

**Supported operations:**
- **Projection (π)**: Column selection
- **Selection (σ)**: WHERE clause conditions
- **Join (⨝)**: JOIN operations with conditions
- **Cross Product (×)**: Cartesian product
- **Relation**: Base tables

**Example translations:**

```sql
SELECT * FROM users WHERE age > 18
```
→ `π [*](σ [age > 18](users))`

```sql
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.age > 18
```
→ `π [u.name, o.total](σ [u.age > 18](⨝ [u.id = o.user_id](users, orders)))`

### Relational Algebra to Mermaid Visualization

Convert Relational Algebra to Mermaid diagrams for visual representation:

```typescript
import { parseSQL, algebraToMermaidMarkdown } from '@query-processor/converter';

const result = parseSQL('SELECT * FROM users WHERE age > 18');

if (result.success && result.translation.success) {
  const mermaidDiagram = algebraToMermaidMarkdown(result.translation);
  console.log(mermaidDiagram);
  // Outputs markdown with mermaid code block:
  // ```mermaid
  // graph TD
  //   node2("1\. users")
  //   node1{{"2\. σ [age > 18]"}}
  //   node1 --> node2
  //   node0{{"3\. π [\*]"}}
  //   node0 --> node1
  // ```
}
```

The Mermaid translator generates flowchart diagrams (top-to-bottom) that visualize the Relational Algebra tree structure, showing:
- **Projection (π)** operations in hexagon shapes
- **Selection (σ)** operations in hexagon shapes
- **Join (⨝)** operations with left and right branches
- **Relation** (table) nodes in rounded shapes
- Parent-child relationships between operations
- **Execution order**: Each node is prefixed with a number indicating the order of execution (1, 2, 3...), following the bottom-up execution model where leaf nodes (Relations) are executed first, followed by Joins, Selections, and finally Projections

**Example execution order for**: `SELECT * FROM users WHERE age > 18`
```
1\. users        (Relation - load table)
2\. σ [age > 18] (Selection - filter rows)
3\. π [*]        (Projection - select columns)
```

**Complex example with JOINs**: `SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE u.age > 18`
```
1\. users                     (Relation - load first table)
2\. orders                    (Relation - load second table)
3\. ⨝ [u\.id = o\.user_id]    (Join - combine tables)
4\. σ [u\.age > 18]           (Selection - filter rows)
5\. π [u\.name, o\.total]     (Projection - select columns)
```

**Note:** Special characters in the Mermaid output are escaped for proper rendering (asterisks become `\*`).

### Query Optimization

The converter includes an advanced query optimizer that applies heuristic rules to improve query execution performance. The optimization is automatically applied when parsing SQL queries.

```typescript
import { parseSQL, RelationalAlgebraOptimizer } from '@query-processor/converter';

const result = parseSQL('SELECT name, email FROM users WHERE age > 18');

if (result.success && result.optimization) {
  console.log('Original:', result.translationString);
  console.log('Optimized:', result.optimizationString);
  console.log('Applied Rules:', result.optimization.appliedRules);
}
```

**Implemented Optimization Heuristics:**

#### 1. **Push Down Selections** (σ)
Move selection operations as close to the base relations as possible to reduce the number of tuples processed by subsequent operations.

**Example transformation:**
```
Original:    σ[age > 18](π[name, email](users))
Optimized:   π[name, email](σ[age > 18](users))
```

**Benefit:** Reduces the number of tuples that need to be processed by the projection, as the selection filters rows before projecting columns.

#### 2. **Push Down Projections** (π)
Move projection operations closer to base relations and combine consecutive projections to reduce the number of attributes processed.

**Example transformation:**
```
Original:    π[name](π[name, email, age](users))
Optimized:   π[name](users)
```

**Benefit:** Eliminates redundant projections and reduces the number of attributes carried through the query execution.

#### 3. **Apply Most Restrictive First**
Reorder selection operations to execute the most restrictive (selective) conditions first, minimizing intermediate result sizes.

**Example transformation:**
```
Original:    σ[age > 18](σ[status = 'active'](users))
Optimized:   σ[status = 'active'](σ[age > 18](users))
```
*(If status = 'active' is more selective than age > 18)*

**Benefit:** Reduces data volume earlier in the execution pipeline. The optimizer estimates selectivity based on operators:
- Equality conditions (`=`) are most restrictive
- Range conditions (`<`, `>`, `<=`, `>=`) are moderately restrictive
- `AND` increases restrictiveness, `OR` decreases it

#### 4. **Avoid Cartesian Product** (×)
Convert Cartesian products to joins when there are applicable selection conditions, dramatically reducing intermediate result sizes.

**Example transformation:**
```
Original:    σ[users.id = orders.user_id](users × orders)
Optimized:   users ⨝[users.id = orders.user_id] orders
```

**Benefit:** Critical optimization! Cartesian products create |R| × |S| tuples. For example:
- Users (1,000 rows) × Orders (1,000 rows) = 1,000,000 intermediate tuples!
- Join with condition: Only matching rows (much smaller result set)
- Enables efficient join algorithms (hash join, merge join)

**Manual optimization:**

You can also use the optimizer directly and choose which heuristics to apply:

```typescript
import { RelationalAlgebraOptimizer, OptimizationHeuristic } from '@query-processor/converter';

const optimizer = new RelationalAlgebraOptimizer();

// Apply all available heuristics (default - recommended)
const result1 = optimizer.optimize(algebraTree);

// Apply only specific heuristics
const result2 = optimizer.optimize(algebraTree, [
  OptimizationHeuristic.PUSH_DOWN_SELECTIONS,
  OptimizationHeuristic.PUSH_DOWN_PROJECTIONS,
  OptimizationHeuristic.APPLY_MOST_RESTRICTIVE_FIRST,
  OptimizationHeuristic.AVOID_CARTESIAN_PRODUCT
]);

// Skip all optimizations (empty array)
const result3 = optimizer.optimize(algebraTree, []);

console.log('Optimized tree:', result1.optimized);
console.log('Rules applied:', result1.appliedRules);
```

**Available Heuristics:**
- `OptimizationHeuristic.PUSH_DOWN_SELECTIONS` - Move selections closer to base relations
- `OptimizationHeuristic.PUSH_DOWN_PROJECTIONS` - Move projections down and combine consecutive ones
- `OptimizationHeuristic.APPLY_MOST_RESTRICTIVE_FIRST` - Reorder selections by restrictiveness
- `OptimizationHeuristic.AVOID_CARTESIAN_PRODUCT` - Convert cross products to joins

**Combined Impact Example:**

```sql
SELECT u.name, o.total
FROM users u, orders o
WHERE u.id = o.user_id AND u.age > 18 AND u.status = 'active'
```

**Without optimization:**
```
π[name, total](σ[u.id = o.user_id AND u.age > 18 AND u.status = 'active'](users × orders))
```
- Cartesian product creates millions of tuples
- All conditions applied at once on huge dataset

**With all 4 optimizations:**
```
π[name, total](
  users ⨝[u.id = o.user_id] orders  ← Cartesian product converted to join
  with σ[u.status = 'active']        ← Most restrictive condition first
  and σ[u.age > 18]                  ← Applied in order of restrictiveness
)
```
- Join replaces Cartesian product (huge reduction)
- Selections applied in optimal order
- Projections simplified
- **Result: Dramatically faster execution!** 🚀

### Optimization Workflow Details

Each heuristic follows a specific workflow to transform the query plan. Here's a detailed breakdown of how each optimization works internally:

#### 1. Push Down Selections (σ) - Workflow

**Goal:** Move selection (filter) operations as close as possible to base relations (tables) to reduce the number of tuples processed by subsequent operations.

**Why it matters:** Filtering data early means less data to process in joins, projections, and other expensive operations.

**Workflow:**
1. **Start at root**, traverse tree recursively (post-order: process children first, then parent)
2. **When encountering a Selection node** `σ[condition](child)`:

   **Case A: Child is a Projection (π)**
   - Selection can safely pass through projection
   - **Transform**: `σ[condition](π[attrs](input))` → `π[attrs](σ[condition](input))`
   - **Reason**: Filtering before projecting is more efficient

   **Case B: Child is a Join (⨝) or Cross Product (×)**
   - **Decompose** compound conditions:
     - Split `AND` conditions into individual predicates
     - Example: `(a > 5 AND b < 10)` → `["a > 5", "b < 10"]`
   - **Analyze** each predicate to determine which relations it references:
     - Extract qualified column names (e.g., `users.id`, `orders.total`)
     - Get relation names from left and right subtrees
   - **Classify** predicates into three categories:
     - **Left-only**: References only left-side relations → push to left child
     - **Right-only**: References only right-side relations → push to right child
     - **Both sides**: References both relations → keep above join (can't push down)
   - **Push** predicates to appropriate sides by wrapping children with selections
   - **Recurse** on nested joins to push selections all the way down to base relations

   **Case C: Child is a Relation (base table)**
   - Already at the bottom, cannot push further
   - Keep selection as-is

3. **Repeat** until all selections are as close to base relations as possible

**Detailed Example:**
```
Query: SELECT * FROM TB1 JOIN TB2 JOIN TB3 WHERE TB1.id > 300 AND TB3.sal != 0

Initial tree:  σ[(TB1.id > 300 AND TB3.sal != 0)](TB1 ⨝ TB2 ⨝ TB3)

Step 1: Decompose compound condition
        Input:  "TB1.id > 300 AND TB3.sal != 0"
        Output: ["TB1.id > 300", "TB3.sal != 0"]

Step 2: Analyze top-level join (TB1 ⨝ TB2) ⨝ TB3
        Left subtree relations:  [TB1, TB2]
        Right subtree relations: [TB3]

        Classify predicates:
        - "TB1.id > 300"  → references TB1 → left-only
        - "TB3.sal != 0"  → references TB3 → right-only

Step 3: Push predicates to respective sides
        Result: σ[TB1.id > 300](TB1 ⨝ TB2) ⨝ σ[TB3.sal != 0](TB3)

Step 4: Recurse on left subtree (TB1 ⨝ TB2)
        Only one predicate: "TB1.id > 300"
        Left subtree:  TB1
        Right subtree: TB2

        Classify: "TB1.id > 300" references only TB1 → left-only

Step 5: Push to TB1
        Result: σ[TB1.id > 300](TB1) ⨝ TB2

Final optimized tree:
        (σ[TB1.id > 300](TB1) ⨝ TB2) ⨝ σ[TB3.sal != 0](TB3)
```

**Performance impact:**
- Without: Filter 1M rows after joining 3 tables
- With: Filter each table first, then join (e.g., 1K + 500K + 200K = 701K rows filtered)

---

#### 2. Push Down Projections (π) - Workflow

**Goal:** Move projection (column selection) operations closer to base relations and eliminate redundant projections to reduce the number of attributes carried through query execution.

**Why it matters:** Fewer columns = less memory, less I/O, faster processing. Critical for queries with wide tables.

**Workflow:**
1. **Start at root**, traverse tree recursively
2. **When encountering a Projection node** `π[attributes](child)`:

   **Case A: Child is another Projection**
   - **Combine** projections: Only the outer attributes matter
   - **Transform**: `π[outer_attrs](π[inner_attrs](input))` → `π[outer_attrs](input)`
   - **Reason**: Inner projection is redundant; final output only needs outer attributes

   **Case B: Child is a Join (⨝)**
   - **Extract required attributes**:
     - Attributes from outer projection list (what user wants)
     - Attributes from join condition (needed to perform join)
   - **Combine** into single set of needed attributes
   - **Get relation information**:
     - Traverse left and right subtrees to collect all relation names
   - **Classify attributes** by which relation they belong to:
     - Parse qualified names (e.g., `TB1.name` → belongs to TB1)
   - **For each child subtree**:
     - If child is a **base relation or selection**: Insert projection with needed attributes for that side
     - If child is a **join**: Recursively push down with needed attributes (don't add extra projection yet)
   - **Result**: Each base relation projects only the columns it needs for joins and final output

   **Case C: Child is a Selection (σ)**
   - Projection can pass through selection
   - **Recurse** with projection attributes to child of selection

   **Case D: Child is a Relation (base table)**
   - Already at bottom, projection stays here

3. **Repeat** until projections are as close to base relations as possible

**Detailed Example:**
```
Query: SELECT TB1.name, TB3.salary
       FROM TB1 JOIN TB2 ON TB1.id = TB2.fk1
       JOIN TB3 ON TB2.id = TB3.fk2

Initial tree:  π[TB1.name, TB3.salary](
                 TB1 ⨝[TB1.id = TB2.fk1] TB2 ⨝[TB2.id = TB3.fk2] TB3
               )

Step 1: Encounter outer projection
        Projection attrs: [TB1.name, TB3.salary]
        Child: Join node → ⨝[TB2.id = TB3.fk2]

Step 2: Extract join condition attributes
        Condition: "TB2.id = TB3.fk2"
        Attributes needed for join: [TB2.id, TB3.fk2]

Step 3: Combine needed attributes
        Total needed: [TB1.name, TB3.salary, TB2.id, TB3.fk2]

Step 4: Classify by side (left vs right)
        Left subtree (TB1 ⨝ TB2): [TB1.name, TB2.id, TB3.fk2]
                                   But TB3.fk2 doesn't belong here!
                                   Actually: [TB1.name, TB2.id]
                                   (TB2.id comes from left side of this join)
        Right subtree (TB3):      [TB3.salary, TB3.fk2]

Step 5: Recurse on left join (TB1 ⨝[TB1.id = TB2.fk1] TB2)
        Needed from above: [TB1.name, TB2.id]
        Join condition: [TB1.id, TB2.fk1]
        Total needed: [TB1.name, TB2.id, TB1.id, TB2.fk1]

        Classify by side:
        Left (TB1):  [TB1.name, TB1.id]
        Right (TB2): [TB2.id, TB2.fk1]

Step 6: Insert projections at base relations
        Left: π[TB1.name, TB1.id](TB1)
        Right: π[TB2.id, TB2.fk1](TB2)

Step 7: Process right side of original join (TB3)
        Needed: [TB3.salary, TB3.fk2]
        Insert: π[TB3.salary, TB3.fk2](TB3)

Final optimized tree:
        π[TB1.name, TB3.salary](
          ⨝[TB2.id = TB3.fk2](
            ⨝[TB1.id = TB2.fk1](
              π[TB1.name, TB1.id](TB1),
              π[TB2.id, TB2.fk1](TB2)
            ),
            π[TB3.salary, TB3.fk2](TB3)
          )
        )
```

**Performance impact:**
- Without: If TB1 has 50 columns, all 50 flow through entire query
- With: Only 2 columns from TB1 (name, id) flow through query
- Example: 1M rows × 50 cols vs 1M rows × 2 cols = 25x less data!

---

#### 3. Apply Most Restrictive First - Workflow

**Goal:** Reorder consecutive selection operations so the most selective (restrictive) conditions execute first, minimizing the size of intermediate results.

**Why it matters:** If condition A filters 90% of rows and condition B filters 10%, applying A first processes 10x less data in B.

**Workflow:**
1. **Traverse tree** looking for consecutive selections
2. **When encountering** `σ[condition1](σ[condition2](input))`:

   **Estimate selectivity** of each condition:
   - Start with base score = 1.0 (100% of rows pass)
   - **Equality operators** (`=`): Most selective → multiply by 0.1
   - **Range operators** (`<`, `>`, `<=`, `>=`, `!=`, `<>`): Moderately selective → multiply by 0.3
   - **AND** operators: More ANDs = more restrictive → multiply by 0.5^(AND_count)
   - **OR** operators: More ORs = less restrictive → multiply by 1.5^(OR_count)
   - **Final score**: Lower = more restrictive = should execute first

   **Compare selectivity scores**:
   - If `score(outer) < score(inner)`: Outer is more restrictive
   - Swap positions to put more restrictive condition first

   **Example calculation**:
   ```
   Condition A: "age > 18"
   - 1 range operator: 1.0 × 0.3 = 0.3

   Condition B: "status = 'active' AND role = 'admin'"
   - 2 equality operators: 1.0 × 0.1 × 0.1 = 0.01
   - 1 AND: 0.01 × 0.5 = 0.005

   0.005 < 0.3 → B is more restrictive, should execute first
   ```

3. **Recurse** on child nodes to optimize entire tree
4. **Result**: Most selective filters execute first, reducing data volume early

**Detailed Example:**
```
Query: SELECT * FROM users
       WHERE age > 18 AND status = 'active'

Initial tree (after selection push-down):
        σ[age > 18](σ[status = 'active'](users))

Step 1: Estimate selectivity of outer condition
        Condition: "age > 18"
        Analysis:
        - Base score: 1.0
        - Has 1 range operator (>): 1.0 × 0.3 = 0.3
        - No AND/OR operators
        Final score: 0.3

Step 2: Estimate selectivity of inner condition
        Condition: "status = 'active'"
        Analysis:
        - Base score: 1.0
        - Has 1 equality operator (=): 1.0 × 0.1 = 0.1
        - No AND/OR operators
        Final score: 0.1

Step 3: Compare scores
        Outer: 0.3
        Inner: 0.1
        0.1 < 0.3 → Inner is MORE restrictive than outer
        Keep current order (already optimal)

Result: σ[age > 18](σ[status = 'active'](users))
        (Equality condition executes first, as intended)

---

Counter-example (needs reordering):

Initial tree:  σ[status = 'active'](σ[age > 18](users))

Step 1: Score outer = 0.1 (equality)
Step 2: Score inner = 0.3 (range)
Step 3: 0.1 < 0.3 → Outer is MORE restrictive
        SWAP positions!

Result: σ[age > 18](σ[status = 'active'](users))
```

**Real-world example:**
```
Table: 1,000,000 users

Condition A: age > 18          → filters to ~750,000 rows (25% reduction)
Condition B: status = 'active' → filters to ~50,000 rows (95% reduction)

Without optimization (A then B):
  1,000,000 rows → A → 750,000 rows → B → 50,000 rows
  Total rows processed: 1,000,000 + 750,000 = 1,750,000

With optimization (B then A):
  1,000,000 rows → B → 50,000 rows → A → ~37,500 rows
  Total rows processed: 1,000,000 + 50,000 = 1,050,000

Improvement: 40% less data processed!
```

---

#### 4. Avoid Cartesian Product (×) - Workflow

**Goal:** Convert Cartesian product followed by selection into a proper join operation, dramatically reducing intermediate result size.

**Why it matters:** Cartesian products are EXTREMELY expensive! `R × S` creates `|R| × |S|` tuples. A join only creates matching tuples.

**Workflow:**
1. **Traverse tree** looking for the pattern: `σ[condition](R × S)`
2. **When pattern found**:

   **Extract relation information**:
   - Get relation names from left subtree (e.g., "users", "TB1")
   - Get relation names from right subtree (e.g., "orders", "TB2")

   **Analyze selection condition**:
   - Parse condition for equality comparisons
   - Look for pattern: `relation1.column = relation2.column`
   - Example: `users.id = orders.user_id`, `TB1.pk = TB2.fk`

   **Check if condition is a valid join condition**:
   - Verify condition references relations from BOTH sides
   - Verify it's an equality comparison (=)
   - If not a valid join condition, keep as Cartesian product

   **If valid join condition found**:
   - **Replace** CrossProduct (×) with Join (⨝)
   - **Move** condition from Selection (σ) to Join
   - **Remove** the Selection node entirely
   - **Result**: `σ[R.a = S.b](R × S)` → `R ⨝[R.a = S.b] S`

3. **Recurse** on child nodes to handle nested patterns
4. **Result**: Efficient join instead of Cartesian product + filter

**Detailed Example:**
```
Query: SELECT u.name, o.total
       FROM users u, orders o
       WHERE u.id = o.user_id

Initial tree (without optimization):
        π[u.name, o.total](
          σ[u.id = o.user_id](
            users × orders
          )
        )

Step 1: Detect pattern
        Node type: Selection
        Child type: CrossProduct
        Pattern match: ✓ σ[condition](R × S)

Step 2: Extract relation names
        CrossProduct.left:  users
        CrossProduct.right: orders

Step 3: Analyze condition
        Condition: "u.id = o.user_id"

        Parse for qualified column references:
        - "u.id" → table "u" (alias for users), column "id"
        - "o.user_id" → table "o" (alias for orders), column "user_id"

        Check operator: "=" → equality ✓

        Check if both sides referenced:
        - Left side (users): "u.id" references users ✓
        - Right side (orders): "o.user_id" references orders ✓

        Valid join condition: ✓

Step 4: Transform to join
        Before: σ[u.id = o.user_id](users × orders)
        After:  users ⨝[u.id = o.user_id] orders

        Selection node is eliminated!

Final optimized tree:
        π[u.name, o.total](
          users ⨝[u.id = o.user_id] orders
        )
```

**Performance impact (MASSIVE!):**

**Scenario**: 1,000 users, 10,000 orders

**Without optimization (Cartesian product)**:
```
Step 1: users × orders
        → 1,000 × 10,000 = 10,000,000 intermediate tuples
        → Each tuple ~1KB = ~10GB of intermediate data!

Step 2: σ[u.id = o.user_id](10,000,000 tuples)
        → Filter down to ~10,000 matching tuples
        → Process 10,000,000 tuples to get 10,000 results

Total: 10,000,000 tuples created and processed
```

**With optimization (Join)**:
```
Step 1: users ⨝[u.id = o.user_id] orders
        → Database uses hash join or merge join
        → Only creates ~10,000 matching tuples directly
        → ~10MB of data

Total: 10,000 tuples created and processed
```

**Result**: ~1000x improvement! (10,000,000 vs 10,000 tuples)

**Real-world example (extreme case)**:
```
Products: 100,000 rows
Orders: 1,000,000 rows

Without: 100,000 × 1,000,000 = 100,000,000,000 tuples (100 billion!)
         At 1KB/tuple = 100TB of intermediate data
         Would crash most systems or take hours/days

With:    ~1,000,000 matching tuples (assuming each product has ~10 orders)
         At 1KB/tuple = ~1GB of data
         Completes in seconds

Speedup: 100,000x faster!!! 🚀
```

**Note**: This is why SQL engines strongly prefer joins over Cartesian products, and why this optimization is absolutely critical for query performance.

### Autocomplete Suggestions

Get context-aware SQL autocomplete suggestions for Monaco Editor or other editors:

```typescript
import { getAutocompleteSuggestions, SuggestionKind } from '@query-processor/converter';

// Example: Getting suggestions at cursor position
const sql = 'SELECT name FROM users WHERE ';
const cursorPosition = sql.length;

const suggestions = getAutocompleteSuggestions(sql, cursorPosition);

console.log(suggestions);
// Returns suggestions like:
// [
//   { label: 'age', kind: SuggestionKind.Field, ... },
//   { label: 'email', kind: SuggestionKind.Field, ... },
//   ...
// ]
```

**Features:**
- Context-aware suggestions based on cursor position
- Column name suggestions from SELECT and WHERE clauses
- SQL keyword suggestions (SELECT, FROM, WHERE, JOIN, etc.)
- Comparison operators (=, !=, <, >, <=, >=)
- Compatible with Monaco Editor's completion API

## API Reference

### Functions

#### `parseSQL(input: string): ParseResult`

Parses a SQL query string and returns a result with AST and Relational Algebra translation.

**Parameters:**
- `input`: SQL query string to parse

**Returns:**
- `ParseResult`: Object with the following structure:
  ```typescript
  {
    success: true;
    ast: Statement;                  // Abstract Syntax Tree
    translation: TranslationResult;  // Relational Algebra translation
    translationString: string;       // Relational Algebra as string (e.g., "π [*](users)")
  }
  // or on error:
  {
    success: false;
    error: string;
    details: string[];
  }
  ```

#### `validateSQL(input: string, schema: DatabaseSchema): ValidationError[]`

Validates a SQL query against a database schema.

**Parameters:**
- `input`: SQL query string to validate
- `schema`: Database schema definition

**Returns:**
- `ValidationError[]`: Array of validation errors (empty if valid)

**Throws:**
- `SQLParseError`: If the input contains lexical or syntax errors

#### `algebraToMermaidMarkdown(result: TranslationResult): string`

Converts a Relational Algebra translation to Mermaid diagram syntax wrapped in a markdown code block.

**Parameters:**
- `result`: TranslationResult containing the Relational Algebra tree

**Returns:**
- `string`: Mermaid diagram code wrapped in markdown code fence

#### `translationResultToString(result: TranslationResult): string`

Converts a TranslationResult to a readable string representation using standard Relational Algebra notation.

**Parameters:**
- `result`: TranslationResult to convert

**Returns:**
- `string`: Relational Algebra notation (e.g., `π [*](σ [age > 18](users))`)

#### `getAutocompleteSuggestions(sql: string, position: number): CompletionItem[]`

Get context-aware autocomplete suggestions based on the SQL query and cursor position.

**Parameters:**
- `sql`: SQL query string
- `position`: Cursor position in the query

**Returns:**
- `CompletionItem[]`: Array of completion suggestions compatible with Monaco Editor

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

#### `TranslationResult`
Result of translating AST to Relational Algebra.

```typescript
type TranslationResult =
  | { success: true; algebra: RelationalAlgebraNode }
  | { success: false; error: string; details: string[] };
```

#### `RelationalAlgebraNode`
Union type representing Relational Algebra operations.

```typescript
type RelationalAlgebraNode =
  | Projection    // π - Column selection
  | Selection     // σ - WHERE conditions
  | Relation      // Base table
  | Join          // ⨝ - JOIN operations
  | CrossProduct; // × - Cartesian product
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
   - **AlgebraToMermaidTranslator**: Converts Relational Algebra to Mermaid diagrams
5. **Optimizer** (`RelationalAlgebraOptimizer`): Applies heuristic-based optimizations
6. **Autocomplete**: Provides context-aware SQL suggestions from AST

```
SQL Input → Lexer → Tokens → Parser → CST → AST Builder → AST
                                                            ↓
                                              ┌─────────────┴─────────────┐
                                              ↓                           ↓
                                    Relational Algebra       Context-Aware Autocomplete
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                            Optimizer          Mermaid Diagram
                      (4 Heuristics)        (Visual Representation)
                            ↓
                   Optimized Algebra
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
├── algebra/
│   └── types.ts                            # Relational Algebra type definitions
├── ast/
│   └── types.ts                            # AST type definitions
├── autocomplete/
│   ├── index.ts                            # Autocomplete logic
│   └── types.ts                            # Autocomplete type definitions
├── errors/
│   ├── SQLParseError.ts                    # Custom error class
│   ├── lexerErrorHandler.ts
│   └── parserErrorHandler.ts
├── lexer/
│   ├── SQLLexer.ts                         # Tokenizer
│   └── tokens/                             # Token definitions
├── optimizer/
│   ├── RelationalAlgebraOptimizer.ts       # Optimizer orchestrator
│   ├── optimizations/
│   │   ├── pushDownSelections.ts           # Heuristic 1: Push selections down
│   │   ├── pushDownProjections.ts          # Heuristic 2: Push projections down
│   │   ├── applyMostRestrictiveFirst.ts    # Heuristic 3: Apply most restrictive first
│   │   └── avoidCartesianProduct.ts        # Heuristic 4: Avoid Cartesian product
│   └── types.ts                            # Optimizer type definitions
├── parser/
│   ├── SQLParser.ts                        # Parser (CST generation)
│   ├── ASTBuilder.ts                       # CST to AST converter
│   └── types.ts                            # Parser type definitions
├── translator/
│   ├── ASTToAlgebraTranslator.ts           # AST to Relational Algebra
│   ├── AlgebraToMermaidTranslator.ts       # Relational Algebra to Mermaid
│   ├── types.ts                            # Translator type definitions
│   └── index.ts                            # Translator exports
├── validator/
│   ├── SchemaValidator.ts                  # Schema validation logic
│   ├── SchemaValidationError.ts            # Validation error class
│   └── types.ts                            # Schema type definitions
└── index.ts                                # Public API

tests/
└── e2e/
    ├── algebra-to-mermaid.e2e.test.ts      # E2E tests for Mermaid generation
    └── optimizer.e2e.test.ts               # E2E tests for optimizer
```

## Testing

The package includes comprehensive tests (195 total):

- **Lexer Tests**: Token recognition and error handling
- **Parser Tests**: CST generation for various SQL structures
- **AST Builder Tests**: AST conversion accuracy
- **Relational Algebra Tests**: AST to Relational Algebra translation accuracy
- **Optimizer Tests**: All 4 optimization heuristics with unit and integration tests
  - Push Down Selections (6 tests)
  - Push Down Projections (8 tests)
  - Apply Most Restrictive First (9 tests)
  - Avoid Cartesian Product (10 tests)
- **Mermaid Translator Tests**: Relational Algebra to Mermaid diagram generation
- **Autocomplete Tests**: Context-aware suggestions for different SQL contexts
- **Schema Validation Tests**: Table, column, and type validation
- **E2E Tests**: End-to-end parsing, optimization, and diagram generation (23 tests)
- **Error Handling Tests**: Lexer and parser error scenarios

## Tech Stack

- **TypeScript 5.9+**: Type-safe development
- **Chevrotain 11**: Parser generator framework
- **Vitest 3**: Fast unit testing

## License

ISC
