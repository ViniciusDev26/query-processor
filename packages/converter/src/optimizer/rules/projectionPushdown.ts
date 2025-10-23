import type { Projection, RelationalAlgebraNode, Selection } from '../../algebra/types';
import type { OptimizationRuleMetadata } from '../types';

/**
 * Pushes projection operations down the tree to reduce the number of attributes
 * processed early in the query execution.
 *
 * This is a heuristic optimization that reduces memory usage and I/O by
 * eliminating unnecessary columns as early as possible.
 *
 * Strategy:
 * 1. Push projections below selections when possible
 * 2. Merge consecutive projections into a single projection
 * 3. Eliminate projections that don't reduce attributes (π[*])
 * 4. Push projections through joins (more complex - requires attribute analysis)
 *
 * Examples:
 * - π[x](π[x, y](R)) → π[x](R)
 * - π[x, y](σ[x > 10](R)) → σ[x > 10](π[x, y](R)) (only if selection uses projected attrs)
 *
 * TODO: Implement the optimization logic
 * CURRENT STATUS: Passthrough - returns input unchanged
 */
function applyProjectionPushdown(node: RelationalAlgebraNode): RelationalAlgebraNode {
  // TODO: Remove this passthrough and implement the optimization
  return node;

  // Estrutura para quando implementar:
  // switch (node.type) {
  //   case 'Relation':
  //     return node;
  //   case 'Projection':
  //     return optimizeProjection(node);
  //   case 'Selection':
  //     return optimizeSelectionForProjection(node);
  //   default:
  //     return node;
  // }
}

/**
 * Optimizes a Projection node.
 *
 * TODO: Implement the following optimizations:
 * 1. Merge consecutive projections: π[a](π[a,b,c](R)) → π[a](R)
 * 2. Eliminate redundant projections: π[*](R) → R
 * 3. Push projection below selection if the selection only uses projected attributes
 */
function optimizeProjection(projection: Projection): RelationalAlgebraNode {
  // TODO: Check if input is another projection and merge them
  // if (projection.input.type === 'Projection') {
  //   // Merge: keep only the outer projection's attributes
  //   // But need to ensure the inner projection has all required attributes
  // }

  // TODO: Check if this is a redundant projection (projects all attributes)
  // if (projection.attributes.includes('*') || projection.attributes.length === 0) {
  //   // Return the input directly
  // }

  // Recursively optimize the input
  const optimizedInput = applyProjectionPushdown(projection.input);

  return {
    type: 'Projection',
    attributes: projection.attributes,
    input: optimizedInput
  };
}

/**
 * Optimizes a Selection node in the context of projection pushdown.
 *
 * TODO: Implement the following:
 * 1. Analyze which attributes the selection condition uses
 * 2. If there's a projection above, ensure it includes those attributes
 * 3. Consider pushing projection through selection if beneficial
 */
function optimizeSelectionForProjection(selection: Selection): RelationalAlgebraNode {
  // TODO: Extract attributes used in the condition
  // const usedAttributes = extractAttributesFromCondition(selection.condition);

  // TODO: Check if we can push a projection down through this selection
  // This requires analyzing the selection's input and the attributes it needs

  // For now, just recursively optimize the input
  const optimizedInput = applyProjectionPushdown(selection.input);

  return {
    type: 'Selection',
    condition: selection.condition,
    input: optimizedInput
  };
}

/**
 * Extracts attribute names from a condition string.
 *
 * TODO: Implement proper parsing of condition strings to extract attribute names.
 * Example: "age > 18 AND city = 'NY'" should return ["age", "city"]
 *
 * This is needed to determine which attributes a selection or join requires.
 */
function extractAttributesFromCondition(condition: string): string[] {
  // TODO: Parse the condition and extract column names
  // This might require a simple tokenizer or regex pattern
  // For now, return empty array
  return [];
}

/**
 * Projection pushdown optimization rule with metadata.
 */
export const projectionPushdownRule: OptimizationRuleMetadata = {
  name: 'projection-pushdown',
  description: 'Pushes projection operations closer to base relations to reduce attribute count early',
  category: 'heuristic',
  apply: applyProjectionPushdown
};
