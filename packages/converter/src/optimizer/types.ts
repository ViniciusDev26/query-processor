import type { RelationalAlgebraNode } from "../algebra/types";

/**
 * Available optimization heuristics
 *
 * IMPORTANT: The order of these heuristics matters!
 * 1. PUSH_DOWN_PROJECTIONS - First push projections to create intermediate projections
 * 2. PUSH_DOWN_SELECTIONS - Then push selections through those projections to leaf nodes
 * 3. APPLY_MOST_RESTRICTIVE_FIRST - Reorder selections for better performance
 * 4. AVOID_CARTESIAN_PRODUCT - Convert cross products to joins
 */
export enum OptimizationHeuristic {
	/**
	 * Push projections down: Move projection operations closer to base relations and
	 * combine consecutive projections to reduce the number of attributes processed
	 *
	 * Applied FIRST to create intermediate projections
	 */
	PUSH_DOWN_PROJECTIONS = "PUSH_DOWN_PROJECTIONS",

	/**
	 * Push selections down: Move selection operations as close to base relations as possible
	 * to reduce the number of tuples processed by subsequent operations
	 *
	 * Applied AFTER projections so selections can be pushed through intermediate projections
	 */
	PUSH_DOWN_SELECTIONS = "PUSH_DOWN_SELECTIONS",

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
