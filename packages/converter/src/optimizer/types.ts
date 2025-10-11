import type { RelationalAlgebraNode } from "../algebra/types";

/**
 * Available optimization heuristics
 */
export enum OptimizationHeuristic {
	/**
	 * Push selections down: Move selection operations as close to base relations as possible
	 * to reduce the number of tuples processed by subsequent operations
	 */
	PUSH_DOWN_SELECTIONS = "PUSH_DOWN_SELECTIONS",

	/**
	 * Push projections down: Move projection operations closer to base relations and
	 * combine consecutive projections to reduce the number of attributes processed
	 */
	PUSH_DOWN_PROJECTIONS = "PUSH_DOWN_PROJECTIONS",

	/**
	 * Apply most restrictive first: Reorder selections and joins to execute the most
	 * restrictive (selective) operations first, minimizing intermediate result sizes
	 */
	APPLY_MOST_RESTRICTIVE_FIRST = "APPLY_MOST_RESTRICTIVE_FIRST",

	/**
	 * Avoid Cartesian product: Convert cross products to joins when there are
	 * applicable selection conditions, dramatically reducing intermediate result sizes
	 */
	AVOID_CARTESIAN_PRODUCT = "AVOID_CARTESIAN_PRODUCT",
}

/**
 * Optimization result containing the optimized algebra tree
 */
export interface OptimizationResult {
	optimized: RelationalAlgebraNode;
	appliedRules: string[];
}

/**
 * Optimization rule that can be applied to a relational algebra tree
 */
export type OptimizationRule = (
	node: RelationalAlgebraNode,
) => RelationalAlgebraNode;
