import type { RelationalAlgebraNode } from "../algebra/types";

/**
 * Available optimization heuristics
 *
 * IMPORTANT: The order of these heuristics matters!
 * 1. PUSH_DOWN_SELECTIONS - First push selections to filter tuples as early as possible
 * 2. PUSH_DOWN_PROJECTIONS - Then push projections to eliminate unnecessary attributes
 * 3. APPLY_MOST_RESTRICTIVE_FIRST - Reorder selections for better performance
 * 4. AVOID_CARTESIAN_PRODUCT - Convert cross products to joins
 */
export enum OptimizationHeuristic {
	/**
	 * Push selections down: Move selection operations as close to base relations as possible
	 * to reduce the number of tuples processed by subsequent operations
	 *
	 * Applied FIRST to filter data as early as possible
	 */
	PUSH_DOWN_SELECTIONS = "PUSH_DOWN_SELECTIONS",

	/**
	 * Push projections down: Move projection operations closer to base relations and
	 * combine consecutive projections to reduce the number of attributes processed
	 *
	 * Applied AFTER selections so projections can include attributes needed by selections
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
