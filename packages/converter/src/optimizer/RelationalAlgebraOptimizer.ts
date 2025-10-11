import type { RelationalAlgebraNode } from "../algebra/types";
import { pushDownSelections } from "./optimizations/pushDownSelections";
import { pushDownProjections } from "./optimizations/pushDownProjections";
import { applyMostRestrictiveFirst } from "./optimizations/applyMostRestrictiveFirst";
import { avoidCartesianProduct } from "./optimizations/avoidCartesianProduct";
import type { OptimizationResult } from "./types";
import { OptimizationHeuristic } from "./types";

/**
 * Optimizer for Relational Algebra expressions
 *
 * Applies heuristic-based optimization rules to improve query execution performance.
 *
 * Current optimizations:
 * 1. Push selections down: Move selection operations as close to the base relations as possible
 *    to reduce the number of tuples processed by subsequent operations.
 *
 * @example
 * ```typescript
 * const optimizer = new RelationalAlgebraOptimizer();
 * const result = optimizer.optimize(algebraTree);
 * console.log('Applied rules:', result.appliedRules);
 * console.log('Optimized tree:', result.optimized);
 * ```
 */
/**
 * Type definition for optimization functions
 * All optimization functions must follow this signature
 */
type OptimizationFunction = (
	node: RelationalAlgebraNode,
) => { node: RelationalAlgebraNode; appliedRules: string[] };

export class RelationalAlgebraOptimizer {
	private appliedRules: string[] = [];

	/**
	 * Map of heuristics to their implementation functions
	 */
	private readonly heuristicHandlers: Record<
		OptimizationHeuristic,
		OptimizationFunction
	> = {
		[OptimizationHeuristic.PUSH_DOWN_SELECTIONS]: pushDownSelections,
		[OptimizationHeuristic.PUSH_DOWN_PROJECTIONS]: pushDownProjections,
		[OptimizationHeuristic.APPLY_MOST_RESTRICTIVE_FIRST]:
			applyMostRestrictiveFirst,
		[OptimizationHeuristic.AVOID_CARTESIAN_PRODUCT]: avoidCartesianProduct,
	};

	/**
	 * Optimizes a relational algebra tree using heuristic rules
	 *
	 * @param node - The relational algebra tree to optimize
	 * @param heuristics - Array of heuristics to apply. If not provided, all heuristics will be applied.
	 * @returns Optimization result with optimized tree and applied rules
	 *
	 * @example
	 * ```typescript
	 * // Apply all heuristics (default)
	 * optimizer.optimize(tree);
	 *
	 * // Apply only specific heuristics
	 * optimizer.optimize(tree, [OptimizationHeuristic.PUSH_DOWN_SELECTIONS]);
	 * ```
	 */
	optimize(
		node: RelationalAlgebraNode,
		heuristics?: OptimizationHeuristic[],
	): OptimizationResult {
		this.appliedRules = [];

		// If no heuristics specified, apply all available heuristics
		const heuristicsToApply =
			heuristics ?? Object.values(OptimizationHeuristic);

		let optimized = node;

		// Apply each requested heuristic using the handler map
		for (const heuristic of heuristicsToApply) {
			optimized = this.applyOptimization(heuristic, optimized);
		}

		return {
			optimized,
			appliedRules: this.appliedRules,
		};
	}

	/**
	 * Generic function to apply an optimization heuristic
	 *
	 * This function handles the common pattern of:
	 * 1. Getting the optimization function from the handler map
	 * 2. Calling the optimization function
	 * 3. Collecting the applied rules
	 * 4. Returning the optimized node
	 *
	 * @param heuristic - The heuristic to apply
	 * @param node - The node to optimize
	 * @returns The optimized node
	 *
	 * @example
	 * ```typescript
	 * const optimized = this.applyOptimization(
	 *   OptimizationHeuristic.PUSH_DOWN_SELECTIONS,
	 *   node
	 * );
	 * ```
	 */
	private applyOptimization(
		heuristic: OptimizationHeuristic,
		node: RelationalAlgebraNode,
	): RelationalAlgebraNode {
		const optimizationFn = this.heuristicHandlers[heuristic];

		if (!optimizationFn) {
			return node;
		}

		const result = optimizationFn(node);
		this.appliedRules.push(...result.appliedRules);
		return result.node;
	}
}
