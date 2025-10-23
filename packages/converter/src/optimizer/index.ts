import type { RelationalAlgebraNode } from '../algebra/types';
import type { OptimizationRule, OptimizationRuleMetadata } from './types';
import { DEFAULT_OPTIMIZATION_RULES } from './rules';

/**
 * Applies a sequence of optimization rules to a relational algebra tree.
 *
 * @param node - The input relational algebra tree
 * @param rules - Array of optimization rules to apply (defaults to DEFAULT_OPTIMIZATION_RULES)
 * @returns Optimized relational algebra tree
 */
export function optimizeQuery(
  node: RelationalAlgebraNode,
  rules: OptimizationRuleMetadata[] = DEFAULT_OPTIMIZATION_RULES
): RelationalAlgebraNode {
  // Apply each optimization rule in sequence
  let optimized = node;

  for (const rule of rules) {
    optimized = rule.apply(optimized);
  }

  return optimized;
}

/**
 * Applies a single optimization rule to a relational algebra tree.
 * Useful for testing individual optimizations.
 *
 * @param node - The input relational algebra tree
 * @param rule - The optimization rule to apply
 * @returns Optimized relational algebra tree
 */
export function applyOptimizationRule(
  node: RelationalAlgebraNode,
  rule: OptimizationRule
): RelationalAlgebraNode {
  return rule(node);
}

/**
 * Generates a string representation of the algebra expression.
 * Uses standard relational algebra notation.
 */
export function algebraToString(node: RelationalAlgebraNode): string {
  switch (node.type) {
    case 'Relation':
      return node.name;

    case 'Selection':
      return `σ[${node.condition}](${algebraToString(node.input)})`;

    case 'Projection': {
      const attrs = node.attributes.length === 0 || node.attributes[0] === '*'
        ? '*'
        : node.attributes.join(', ');
      return `π[${attrs}](${algebraToString(node.input)})`;
    }

    default:
      return 'Unknown';
  }
}

/**
 * Explains the optimization steps taken.
 * Useful for debugging and understanding what changed.
 */
export function explainOptimization(
  original: RelationalAlgebraNode,
  optimized: RelationalAlgebraNode
): string {
  const originalStr = algebraToString(original);
  const optimizedStr = algebraToString(optimized);

  if (originalStr === optimizedStr) {
    return 'No optimization needed - query is already optimal.';
  }

  const activeRules = DEFAULT_OPTIMIZATION_RULES
    .filter(r => r.name === 'selection-pushdown') // Only fully implemented rule
    .map(r => r.name);

  const pendingRules = DEFAULT_OPTIMIZATION_RULES
    .filter(r => r.name !== 'selection-pushdown')
    .map(r => `${r.name} (TODO)`);

  const allRules = [...activeRules, ...pendingRules].join(', ');

  return `Original:  ${originalStr}\nOptimized: ${optimizedStr}\n\nOptimizations available: ${allRules}`;
}

// Re-export types for convenience
export type { OptimizationRule, OptimizationRuleMetadata } from './types';
export { DEFAULT_OPTIMIZATION_RULES } from './rules';
