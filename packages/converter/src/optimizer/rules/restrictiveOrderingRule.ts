import type { RelationalAlgebraNode, Selection } from '../../algebra/types';
import type { OptimizationRuleMetadata } from '../types';

/**
 * Reorders selections and joins to apply the most restrictive operations first.
 *
 * This is a heuristic optimization that reduces the size of intermediate results
 * by filtering data as early as possible.
 *
 * Strategy:
 * 1. Reorder consecutive selections from most restrictive to least restrictive
 * 2. Estimate selectivity based on condition type (equality > inequality > LIKE)
 * 3. When joins are added to the algebra, reorder them by estimated result size
 * 4. Apply selections before joins when possible (combined with selection pushdown)
 *
 * Selectivity heuristics (from most to least restrictive):
 * - Equality on key attributes: σ[id = 5]
 * - Equality on non-key attributes: σ[status = 'active']
 * - Range conditions: σ[age BETWEEN 18 AND 25]
 * - Inequality: σ[age > 18]
 * - LIKE patterns: σ[name LIKE 'A%']
 * - NOT conditions: σ[NOT deleted]
 *
 * Examples:
 * - σ[name LIKE '%son'](σ[id = 123](R)) → σ[id = 123](σ[name LIKE '%son'](R))
 * - σ[age > 18](σ[status = 'active'](R)) → σ[status = 'active'](σ[age > 18](R))
 *
 * TODO: Implement the reordering logic based on selectivity estimation
 * CURRENT STATUS: Passthrough - returns input unchanged
 */
function applyRestrictiveOrdering(node: RelationalAlgebraNode): RelationalAlgebraNode {
  // TODO: Remove this passthrough and implement the optimization
  return node;

  // Estrutura para quando implementar:
  // switch (node.type) {
  //   case 'Relation':
  //     return node;
  //   case 'Selection':
  //     return optimizeSelectionOrder(node);
  //   case 'Projection':
  //     return {
  //       type: 'Projection',
  //       attributes: node.attributes,
  //       input: applyRestrictiveOrdering(node.input)
  //     };
  //   default:
  //     return node;
  // }
}

/**
 * Optimizes the order of consecutive selections.
 *
 * TODO: Implement the following:
 * 1. Collect all consecutive selections in a chain
 * 2. Estimate selectivity for each selection
 * 3. Reorder them from most to least restrictive
 * 4. Rebuild the selection chain in the new order
 */
function optimizeSelectionOrder(selection: Selection): RelationalAlgebraNode {
  // Collect all consecutive selections
  const selections: Selection[] = [];
  let current: RelationalAlgebraNode = selection;

  while (current.type === 'Selection') {
    selections.push(current);
    current = current.input;
  }

  // If we have multiple selections, reorder them
  if (selections.length > 1) {
    // TODO: Sort selections by estimated selectivity
    // const sortedSelections = sortBySelectivity(selections);

    // For now, just keep the original order and recursively optimize
    // TODO: Implement proper reordering logic
  }

  // Recursively optimize the input (the non-selection node)
  const optimizedInput = applyRestrictiveOrdering(current);

  // Rebuild the selection chain
  return {
    type: 'Selection',
    condition: selection.condition,
    input: optimizedInput
  };
}

/**
 * Estimates the selectivity of a selection condition.
 *
 * Returns a value between 0 and 1, where:
 * - 0 means the condition is very restrictive (filters out most rows)
 * - 1 means the condition is not restrictive (keeps most rows)
 *
 * TODO: Implement selectivity estimation based on:
 * 1. Condition type (equality, inequality, range, LIKE)
 * 2. Attribute type (key, indexed, regular)
 * 3. Operators used (=, !=, <, >, BETWEEN, LIKE, IN)
 * 4. Presence of wildcards in LIKE patterns
 * 5. Use of AND/OR operators
 *
 * Example heuristics:
 * - "id = constant" → 0.001 (very selective on primary key)
 * - "status = 'value'" → 0.1 (moderately selective)
 * - "age > 18" → 0.5 (not very selective)
 * - "name LIKE '%pattern%'" → 0.8 (not selective)
 */
function estimateSelectivity(condition: string): number {
  // TODO: Analyze the condition string to estimate selectivity

  // Simple heuristics to get started:
  // 1. Check for equality operators
  if (condition.includes(' = ')) {
    // Equality is generally more selective
    if (condition.toLowerCase().includes('id')) {
      return 0.001; // Very selective on ID
    }
    return 0.1; // Moderately selective
  }

  // 2. Check for inequality operators
  if (condition.includes(' > ') || condition.includes(' < ') ||
      condition.includes(' >= ') || condition.includes(' <= ')) {
    return 0.5; // Less selective
  }

  // 3. Check for LIKE operators
  if (condition.toLowerCase().includes(' like ')) {
    if (condition.includes('%')) {
      return 0.8; // Not very selective with wildcards
    }
    return 0.3; // More selective without leading wildcard
  }

  // 4. Check for BETWEEN
  if (condition.toLowerCase().includes(' between ')) {
    return 0.3; // Moderately selective
  }

  // 5. Check for IN operator
  if (condition.toLowerCase().includes(' in ')) {
    return 0.2; // Depends on the list size
  }

  // Default: assume moderate selectivity
  return 0.5;
}

/**
 * Sorts selections by their estimated selectivity (most restrictive first).
 *
 * TODO: Implement proper sorting based on selectivity estimation
 */
function sortBySelectivity(selections: Selection[]): Selection[] {
  // TODO: Sort by selectivity (lower selectivity = more restrictive = should come first)
  return selections.sort((a, b) => {
    const selectivityA = estimateSelectivity(a.condition);
    const selectivityB = estimateSelectivity(b.condition);
    return selectivityA - selectivityB;
  });
}

/**
 * Future extension: Reorder joins based on estimated result size.
 *
 * TODO: When Join nodes are added to RelationalAlgebraNode:
 * 1. Estimate the cardinality of each join
 * 2. Perform smaller joins first
 * 3. Consider join selectivity and available indexes
 * 4. Apply join commutativity and associativity rules
 *
 * Example:
 * - (R ⋈ S) ⋈ T where |R ⋈ S| is large
 * - → R ⋈ (S ⋈ T) if |S ⋈ T| is smaller
 */
function reorderJoins(node: RelationalAlgebraNode): RelationalAlgebraNode {
  // TODO: Implement when Join type is added to the algebra
  return node;
}

/**
 * Restrictive ordering optimization rule with metadata.
 */
export const restrictiveOrderingRule: OptimizationRuleMetadata = {
  name: 'restrictive-ordering',
  description: 'Reorders selections and joins to apply the most restrictive operations first',
  category: 'heuristic',
  apply: applyRestrictiveOrdering
};
