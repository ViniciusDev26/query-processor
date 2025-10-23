/**
 * Optimization rules for relational algebra.
 *
 * This module exports all available optimization rules.
 * To add a new optimization rule:
 *
 * 1. Create a new file in this directory (e.g., `projectionPushdown.ts`)
 * 2. Implement your optimization function following the OptimizationRule type
 * 3. Export an OptimizationRuleMetadata object with name, description, and apply function
 * 4. Import and export it here
 * 5. Add it to the DEFAULT_OPTIMIZATION_RULES array
 *
 * Example:
 * ```ts
 * // rules/myNewRule.ts
 * import type { OptimizationRuleMetadata } from '../types';
 *
 * function applyMyOptimization(node: RelationalAlgebraNode): RelationalAlgebraNode {
 *   // Your optimization logic here
 *   return node;
 * }
 *
 * export const myNewRule: OptimizationRuleMetadata = {
 *   name: 'my-new-rule',
 *   description: 'Description of what this rule does',
 *   category: 'heuristic',
 *   apply: applyMyOptimization
 * };
 * ```
 */

// Fully implemented rules
export { selectionPushdownRule } from './selectionPushdown';

// Rules with structure ready for implementation (currently TODOs)
export { projectionPushdownRule } from './projectionPushdown';
export { restrictiveOrderingRule } from './restrictiveOrderingRule';
export { crossProductEliminationRule } from './crossProductElimination';

import type { OptimizationRuleMetadata } from '../types';
import { selectionPushdownRule } from './selectionPushdown';
import { projectionPushdownRule } from './projectionPushdown';
import { restrictiveOrderingRule } from './restrictiveOrderingRule';
import { crossProductEliminationRule } from './crossProductElimination';

/**
 * Default set of optimization rules applied in order.
 *
 * The order matters! Some optimizations may enable others.
 * Generally, the order should be:
 * 1. Logical optimizations (simplify expressions, eliminate redundancy)
 * 2. Heuristic optimizations (pushdown, reordering)
 * 3. Cost-based optimizations (if available)
 *
 * Recommended order when all rules are implemented:
 * 1. crossProductEliminationRule - Convert cross products to joins first
 * 2. selectionPushdownRule - Push selections down to reduce tuple count
 * 3. restrictiveOrderingRule - Order selections by selectivity
 * 4. projectionPushdownRule - Push projections down to reduce attribute count
 * 5. joinReorderingRule - Reorder joins based on cost (future)
 *
 * NOTE: Currently, projectionPushdownRule, restrictiveOrderingRule, and
 * crossProductEliminationRule are in passthrough mode (return input unchanged).
 * See IMPLEMENTATION_GUIDE.md for details on how to implement them.
 */
export const DEFAULT_OPTIMIZATION_RULES: OptimizationRuleMetadata[] = [
  crossProductEliminationRule,  // TODO: Currently passthrough
  selectionPushdownRule,         // ✅ Fully implemented
  restrictiveOrderingRule,       // TODO: Currently passthrough
  projectionPushdownRule,        // TODO: Currently passthrough
];
