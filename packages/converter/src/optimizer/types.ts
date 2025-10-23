import type { RelationalAlgebraNode } from '../algebra/types';

/**
 * An optimization rule that transforms a relational algebra tree.
 *
 * Optimization rules should be:
 * - Pure functions (no side effects)
 * - Idempotent (applying twice should be the same as applying once)
 * - Safe (always return a valid algebra tree)
 *
 * @param node - The input relational algebra tree
 * @returns The optimized relational algebra tree
 */
export type OptimizationRule = (node: RelationalAlgebraNode) => RelationalAlgebraNode;

/**
 * Metadata about an optimization rule.
 * Useful for debugging and explaining what optimizations were applied.
 */
export interface OptimizationRuleMetadata {
  /** Unique identifier for the rule */
  name: string;

  /** Human-readable description of what the rule does */
  description: string;

  /** Category of optimization (e.g., "heuristic", "cost-based") */
  category: 'heuristic' | 'cost-based' | 'logical';

  /** The optimization function */
  apply: OptimizationRule;
}
