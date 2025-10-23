import type { Projection, RelationalAlgebraNode, Selection } from '../../algebra/types';
import type { OptimizationRuleMetadata } from '../types';

/**
 * Pushes selection operations down the tree as far as possible.
 *
 * This is a heuristic optimization that reduces the number of tuples
 * early in the query execution, which can significantly improve performance.
 *
 * Strategy:
 * 1. If we have a Selection on top of a Projection, push Selection below
 * 2. If we have consecutive Selections, keep them together (naturally at the bottom)
 * 3. Selections should be as close to Relations as possible
 *
 * Examples:
 * - σ[cond](π[attrs](R)) → π[attrs](σ[cond](R))
 * - σ[c1](σ[c2](R)) → σ[c1](σ[c2](R)) (already optimal)
 * - σ[cond](R) → σ[cond](R) (already optimal)
 */
function applySelectionPushdown(node: RelationalAlgebraNode): RelationalAlgebraNode {
  switch (node.type) {
    case 'Relation':
      // Base case: no optimization needed for relations
      return node;

    case 'Selection':
      return optimizeSelection(node);

    case 'Projection':
      return optimizeProjection(node);

    default:
      return node;
  }
}

/**
 * Optimizes a Selection node by trying to push it down.
 */
function optimizeSelection(selection: Selection): RelationalAlgebraNode {
  const input = selection.input;

  // Case 1: Selection on top of Projection
  // σ[cond](π[attrs](R)) -> Try to push selection below projection
  if (input.type === 'Projection') {
    // Note: In a more sophisticated implementation, we would check if the
    // selection condition references attributes that are projected.
    // For now, we assume it's safe to push down.

    // Push the selection below the projection
    const optimizedInput = applySelectionPushdown(input.input);
    const newSelection: Selection = {
      type: 'Selection',
      condition: selection.condition,
      input: optimizedInput
    };

    // Recreate the projection on top
    const newProjection: Projection = {
      type: 'Projection',
      attributes: input.attributes,
      input: newSelection
    };

    return newProjection;
  }

  // Case 2: Selection on top of Selection
  // σ[cond1](σ[cond2](R)) -> Keep both selections together
  // They'll naturally cascade down to the base relation
  if (input.type === 'Selection') {
    const optimizedInput = applySelectionPushdown(input);
    return {
      type: 'Selection',
      condition: selection.condition,
      input: optimizedInput
    };
  }

  // Case 3: Selection on top of Relation
  // This is already optimal - selection is as low as possible
  if (input.type === 'Relation') {
    return selection;
  }

  // Default: recursively optimize the input
  return {
    type: 'Selection',
    condition: selection.condition,
    input: applySelectionPushdown(input)
  };
}

/**
 * Optimizes a Projection node by recursively optimizing its input.
 */
function optimizeProjection(projection: Projection): RelationalAlgebraNode {
  // Recursively optimize the input
  const optimizedInput = applySelectionPushdown(projection.input);

  return {
    type: 'Projection',
    attributes: projection.attributes,
    input: optimizedInput
  };
}

/**
 * Selection pushdown optimization rule with metadata.
 */
export const selectionPushdownRule: OptimizationRuleMetadata = {
  name: 'selection-pushdown',
  description: 'Pushes selection operations closer to base relations to reduce tuple count early',
  category: 'heuristic',
  apply: applySelectionPushdown
};
