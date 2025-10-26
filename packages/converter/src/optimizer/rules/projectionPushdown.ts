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
  switch (node.type) {
    case 'Relation':
      return node;
    case 'Projection':
      return optimizeProjection(node);
    case 'Selection':
      return optimizeSelectionForProjection(node);
    default:
      return node;
  }
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
  const normalizedAttributes = normalizeProjectionAttributes(projection.attributes);

  // If projection does not reduce attributes, eliminate it
  if (normalizedAttributes.length === 0 || normalizedAttributes.includes('*')) {
    return applyProjectionPushdown(projection.input);
  }

  const optimizedInput = applyProjectionPushdown(projection.input);

  // Merge consecutive projections when possible
  if (optimizedInput.type === 'Projection') {
    const innerAttributes = normalizeProjectionAttributes(optimizedInput.attributes);
    if (
      innerAttributes.includes('*') ||
      normalizedAttributes.every((attr) => projectionHasAttribute(innerAttributes, attr))
    ) {
      return applyProjectionPushdown({
        type: 'Projection',
        attributes: normalizedAttributes,
        input: optimizedInput.input,
      });
    }
  }

  // Push projection below selection if the selection only uses projected attributes
  if (optimizedInput.type === 'Selection') {
    const selection = optimizedInput;
    if (canPushProjectionThroughSelection(normalizedAttributes, selection.condition)) {
      const pushedProjection: Projection = {
        type: 'Projection',
        attributes: normalizedAttributes,
        input: selection.input,
      };

      return {
        type: 'Selection',
        condition: selection.condition,
        input: applyProjectionPushdown(pushedProjection),
      };
    }
  }

  return {
    type: 'Projection',
    attributes: normalizedAttributes,
    input: optimizedInput,
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
  const optimizedInput = applyProjectionPushdown(selection.input);
  const requiredAttributes = extractAttributesFromCondition(selection.condition);

  if (
    optimizedInput.type === 'Projection' &&
    !normalizeProjectionAttributes(optimizedInput.attributes).includes('*')
  ) {
    const ensured = ensureProjectionAttributes(optimizedInput.attributes, requiredAttributes);

    if (ensured.changed) {
      const adjustedProjection: Projection = {
        type: 'Projection',
        attributes: normalizeProjectionAttributes(ensured.attributes),
        input: optimizedInput.input,
      };

      return {
        type: 'Selection',
        condition: selection.condition,
        input: applyProjectionPushdown(adjustedProjection),
      };
    }
  }

  return {
    type: 'Selection',
    condition: selection.condition,
    input: optimizedInput,
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
  if (!condition) {
    return [];
  }

  const withoutStrings = condition
    .replace(/'[^']*'/g, ' ')
    .replace(/"[^"]*"/g, ' ');

  const tokens = withoutStrings.match(/[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/g) ?? [];
  const keywords = new Set([
    'AND',
    'OR',
    'NOT',
    'TRUE',
    'FALSE',
    'NULL',
    'LIKE',
    'BETWEEN',
    'IN',
    'IS',
    'ON',
  ]);

  const attributes: string[] = [];

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (keywords.has(upper)) {
      continue;
    }
    if (/^[0-9]+$/.test(token)) {
      continue;
    }
    if (!attributes.includes(token)) {
      attributes.push(token);
    }
  }

  return attributes;
}

function normalizeProjectionAttributes(attributes: string[]): string[] {
  if (attributes.length === 0) {
    return [];
  }

  if (attributes.includes('*')) {
    return ['*'];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const attr of attributes) {
    if (!seen.has(attr)) {
      seen.add(attr);
      normalized.push(attr);
    }
  }

  return normalized;
}

function buildAttributeSet(attributes: string[]): Set<string> {
  const set = new Set<string>();

  for (const attr of attributes) {
    if (!attr) {
      continue;
    }

    set.add(attr);

    const parts = attr.split('.');
    const lastPart = parts[parts.length - 1];
    set.add(lastPart);
  }

  return set;
}

function attributeSetHas(attributeSet: Set<string>, attribute: string): boolean {
  if (attributeSet.has(attribute)) {
    return true;
  }

  const parts = attribute.split('.');
  const lastPart = parts[parts.length - 1];

  return attributeSet.has(lastPart);
}

function projectionHasAttribute(attributes: string[], attribute: string): boolean {
  if (attributes.includes('*')) {
    return true;
  }

  const attributeSet = buildAttributeSet(attributes);
  return attributeSetHas(attributeSet, attribute);
}

function canPushProjectionThroughSelection(attributes: string[], condition: string): boolean {
  if (attributes.includes('*')) {
    return true;
  }

  const requiredAttributes = extractAttributesFromCondition(condition);
  if (requiredAttributes.length === 0) {
    return true;
  }

  const attributeSet = buildAttributeSet(attributes);
  return requiredAttributes.every((attr) => attributeSetHas(attributeSet, attr));
}

function ensureProjectionAttributes(
  attributes: string[],
  requiredAttributes: string[],
): { attributes: string[]; changed: boolean } {
  if (attributes.includes('*')) {
    return { attributes: ['*'], changed: false };
  }

  if (requiredAttributes.length === 0) {
    return { attributes: normalizeProjectionAttributes(attributes), changed: false };
  }

  const result = [...attributes];
  const attributeSet = buildAttributeSet(result);
  let changed = false;

  for (const attr of requiredAttributes) {
    if (!attributeSetHas(attributeSet, attr)) {
      result.push(attr);
      changed = true;
      attributeSet.add(attr);

      const parts = attr.split('.');
      const lastPart = parts[parts.length - 1];
      attributeSet.add(lastPart);
    }
  }

  return { attributes: result, changed };
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
