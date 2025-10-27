import type { RelationalAlgebraNode } from '../../algebra/types';
import type { OptimizationRuleMetadata } from '../types';

/**
 * Eliminates or minimizes cross products (Cartesian products) in the query plan.
 *
 * A cross product occurs when two relations are combined without a join condition,
 * resulting in all possible combinations of rows (|R| × |S| rows).
 * This is extremely expensive and should be avoided when possible.
 *
 * Strategy:
 * 1. Detect implicit cross products (relations without join conditions)
 * 2. Look for selection conditions that can be converted to join conditions
 * 3. Reorder operations to apply join conditions immediately
 * 4. Warn when unavoidable cross products are detected
 * 5. Replace cross product + selection with proper join
 *
 * Examples of cross products to eliminate:
 * - σ[R.id = S.id](R × S) → R ⋈[id=id] S (convert to natural join)
 * - σ[R.a = S.b AND R.x > 10](R × S) → σ[R.x > 10](R) ⋈[a=b] S
 *
 * Detection patterns:
 * - FROM R, S (without WHERE condition) → cross product
 * - FROM R, S WHERE R.x = value AND S.y = value → still cross product
 * - FROM R, S WHERE R.id = S.ref_id → can be converted to join
 */
function applyCrossProductElimination(node: RelationalAlgebraNode): RelationalAlgebraNode {
  switch (node.type) {
    case 'Relation':
      return node;

    case 'Selection':
      return optimizeSelectionForCrossProduct(node);

    case 'Projection':
      return {
        type: 'Projection',
        attributes: node.attributes,
        input: applyCrossProductElimination(node.input)
      };

    case 'Join':
      return {
        type: 'Join',
        condition: node.condition,
        left: applyCrossProductElimination(node.left),
        right: applyCrossProductElimination(node.right)
      };

    case 'CrossProduct':
      // Cross product without a selection is unavoidable
      // Just optimize its children
      return {
        type: 'CrossProduct',
        left: applyCrossProductElimination(node.left),
        right: applyCrossProductElimination(node.right)
      };

    default:
      return node;
  }
}

/**
 * Optimizes a Selection to detect and eliminate cross products.
 *
 * Transforms: σ[R.id = S.ref_id AND R.status = 'active'](R × S)
 * Into: σ[R.status = 'active'](R ⋈[id=ref_id] S)
 */
function optimizeSelectionForCrossProduct(selection: RelationalAlgebraNode): RelationalAlgebraNode {
  if (selection.type !== 'Selection') {
    return selection;
  }

  // Check if the input is a cross product
  if (selection.input.type === 'CrossProduct') {
    const joinPredicates = extractJoinPredicates(selection.condition);
    const filterPredicates = extractFilterPredicates(selection.condition);

    if (joinPredicates.length > 0) {
      // Convert to join + selection
      const join = createJoin(
        selection.input.left,
        selection.input.right,
        joinPredicates
      );

      // Apply remaining filter predicates
      if (filterPredicates.length > 0) {
        return {
          type: 'Selection',
          condition: combinePredicates(filterPredicates),
          input: join
        };
      }

      return join;
    }
  }

  // Recursively optimize the input
  return {
    type: 'Selection',
    condition: selection.condition,
    input: applyCrossProductElimination(selection.input)
  };
}

/**
 * Detects if a node represents a cross product.
 */
function isCrossProduct(node: RelationalAlgebraNode): boolean {
  return node.type === 'CrossProduct';
}

/**
 * Extracts join predicates from a condition.
 *
 * Join predicates are conditions that relate attributes from different relations.
 * Example: "R.id = S.ref_id" is a join predicate
 *          "R.status = 'active'" is a filter predicate
 */
function extractJoinPredicates(condition: string): string[] {
  const joinPreds: string[] = [];

  // Split by AND to get individual predicates
  const predicates = splitByAnd(condition);

  for (const pred of predicates) {
    // Look for equality patterns like "table1.col = table2.col"
    const joinPattern = /(\w+\.\w+)\s*=\s*(\w+\.\w+)/;
    const match = pred.match(joinPattern);

    if (match) {
      const leftParts = match[1].split('.');
      const rightParts = match[2].split('.');

      // Check if the table/relation names are different
      if (leftParts.length === 2 && rightParts.length === 2) {
        const leftTable = leftParts[0];
        const rightTable = rightParts[0];

        if (leftTable !== rightTable) {
          joinPreds.push(pred.trim());
        }
      }
    }
  }

  return joinPreds;
}

/**
 * Extracts filter predicates from a condition.
 *
 * Filter predicates are conditions that only reference one relation.
 * Example: "R.status = 'active'" is a filter predicate
 *          "age > 18" is a filter predicate
 */
function extractFilterPredicates(condition: string): string[] {
  const filterPreds: string[] = [];

  // Split by AND to get individual predicates
  const predicates = splitByAnd(condition);
  const joinPreds = new Set(extractJoinPredicates(condition));

  for (const pred of predicates) {
    // If it's not a join predicate, it's a filter predicate
    if (!joinPreds.has(pred.trim())) {
      filterPreds.push(pred.trim());
    }
  }

  return filterPreds;
}

/**
 * Creates a join node from two relations and join conditions.
 */
function createJoin(
  left: RelationalAlgebraNode,
  right: RelationalAlgebraNode,
  conditions: string[]
): RelationalAlgebraNode {
  return {
    type: 'Join',
    condition: conditions.join(' AND '),
    left: applyCrossProductElimination(left),
    right: applyCrossProductElimination(right)
  };
}

/**
 * Combines multiple predicates with AND.
 */
function combinePredicates(predicates: string[]): string {
  return predicates.join(' AND ');
}

/**
 * Splits a condition string by AND operator.
 * Handles nested parentheses and string literals.
 */
function splitByAnd(condition: string): string[] {
  // Remove leading/trailing whitespace
  condition = condition.trim();

  const predicates: string[] = [];
  let current = '';
  let parenDepth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < condition.length; i++) {
    const char = condition[i];

    // Handle string literals
    if ((char === "'" || char === '"') && (i === 0 || condition[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      current += char;
      continue;
    }

    if (inString) {
      current += char;
      continue;
    }

    // Track parentheses depth
    if (char === '(') {
      parenDepth++;
      current += char;
      continue;
    }

    if (char === ')') {
      parenDepth--;
      current += char;
      continue;
    }

    // Check for AND keyword (only at depth 0)
    if (parenDepth === 0) {
      const remaining = condition.substring(i);
      const andMatch = remaining.match(/^(AND|and)\s+/i);

      if (andMatch) {
        // Found an AND separator
        if (current.trim()) {
          predicates.push(current.trim());
        }
        current = '';
        i += andMatch[0].length - 1; // -1 because loop will increment
        continue;
      }
    }

    current += char;
  }

  // Add the last predicate
  if (current.trim()) {
    predicates.push(current.trim());
  }

  return predicates.length > 0 ? predicates : [condition];
}


/**
 * Cross product elimination optimization rule with metadata.
 */
export const crossProductEliminationRule: OptimizationRuleMetadata = {
  name: 'cross-product-elimination',
  description: 'Detects and eliminates unnecessary cross products by converting them to joins',
  category: 'heuristic',
  apply: applyCrossProductElimination
};
