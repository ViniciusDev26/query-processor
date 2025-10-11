import type {
	CrossProduct,
	Join,
	Projection,
	RelationalAlgebraNode,
	Selection,
} from "@/algebra/types";

export interface ApplyMostRestrictiveFirstResult {
	node: RelationalAlgebraNode;
	appliedRules: string[];
}

/**
 * Estimates the selectivity of a condition (lower is more restrictive)
 * This is a simplified heuristic that analyzes the condition string
 */
function estimateSelectivity(condition: string): number {
	// More restrictive operators get lower scores (applied first)
	const restrictiveOperators = ["=", "!=", "<>"];
	const rangeOperators = [">", "<", ">=", "<="];

	let score = 1.0;

	// Equality is most restrictive
	if (restrictiveOperators.some((op) => condition.includes(op))) {
		score *= 0.1;
	}

	// Range operators are moderately restrictive
	if (rangeOperators.some((op) => condition.includes(op))) {
		score *= 0.3;
	}

	// AND makes it more restrictive (multiply selectivity values)
	const andCount = (condition.match(/AND/gi) || []).length;
	score *= 0.5 ** andCount;

	// OR makes it less restrictive (add selectivity values)
	const orCount = (condition.match(/OR/gi) || []).length;
	score *= 1.5 ** orCount;

	return score;
}

/**
 * Heuristic 3: Apply most restrictive selections and joins first
 *
 * Reorders operations to execute the most restrictive (selective) operations first,
 * reducing the amount of data processed by subsequent operations.
 *
 * Key optimizations:
 * 1. Multiple selections: Reorder σ[c1](σ[c2](R)) to put most restrictive first
 * 2. Selection before join: σ[c](R ⨝ S) → σ[c](R) ⨝ S (if condition only involves R)
 * 3. Smaller relations first in joins: Estimate and reorder join operands
 *
 * Example transformation:
 * σ[age > 18](σ[status = 'active'](R))
 * If 'status = active' is more restrictive than 'age > 18':
 * → σ[status = 'active'](σ[age > 18](R))
 *
 * @param node - The node to optimize
 * @returns Optimized node with operations reordered by restrictiveness
 */
export function applyMostRestrictiveFirst(
	node: RelationalAlgebraNode,
): ApplyMostRestrictiveFirstResult {
	const appliedRules: string[] = [];

	function optimize(n: RelationalAlgebraNode): RelationalAlgebraNode {
		switch (n.type) {
			case "Selection":
				return optimizeSelection(n);
			case "Projection":
				return optimizeProjection(n);
			case "Join":
				return optimizeJoin(n);
			case "CrossProduct":
				return optimizeCrossProduct(n);
			case "Relation":
				return n; // Base case
		}
	}

	const optimizedNode = optimize(node);

	return {
		node: optimizedNode,
		appliedRules,
	};

	/**
	 * Optimize selection nodes
	 *
	 * Reorders consecutive selections by restrictiveness
	 */
	function optimizeSelection(node: Selection): RelationalAlgebraNode {
		const input = node.input;

		// Rule: Reorder consecutive selections by selectivity
		// σ[c1](σ[c2](R)) → σ[most_restrictive](σ[less_restrictive](R))
		if (input.type === "Selection") {
			const innerSelection = input as Selection;

			const outerSelectivity = estimateSelectivity(node.condition);
			const innerSelectivity = estimateSelectivity(
				innerSelection.condition,
			);

			// If outer is more restrictive than inner, swap them
			if (outerSelectivity < innerSelectivity) {
				appliedRules.push(
					`Reorder selections by restrictiveness: σ[${node.condition}] is more restrictive than σ[${innerSelection.condition}]`,
				);

				// Recursively optimize the inner input
				const optimizedInput = optimize(innerSelection.input);

				// Swap: put more restrictive (outer) condition closer to the data
				return {
					type: "Selection",
					condition: innerSelection.condition, // Less restrictive on top
					input: {
						type: "Selection",
						condition: node.condition, // More restrictive below
						input: optimizedInput,
					},
				};
			}
		}

		// For other cases, recursively optimize the input
		const optimizedInput = optimize(input);

		return {
			type: "Selection",
			condition: node.condition,
			input: optimizedInput,
		};
	}

	/**
	 * Optimize projection nodes
	 */
	function optimizeProjection(node: Projection): RelationalAlgebraNode {
		// Recursively optimize the input
		const optimizedInput = optimize(node.input);

		return {
			type: "Projection",
			attributes: node.attributes,
			input: optimizedInput,
		};
	}

	/**
	 * Optimize join nodes
	 *
	 * Could be extended to reorder join operands based on estimated sizes
	 */
	function optimizeJoin(node: Join): RelationalAlgebraNode {
		// Recursively optimize both sides
		const optimizedLeft = optimize(node.left);
		const optimizedRight = optimize(node.right);

		// Future optimization: swap operands if right is smaller than left
		// For now, just optimize recursively

		return {
			type: "Join",
			condition: node.condition,
			left: optimizedLeft,
			right: optimizedRight,
		};
	}

	/**
	 * Optimize cross product nodes
	 */
	function optimizeCrossProduct(node: CrossProduct): RelationalAlgebraNode {
		// Recursively optimize both sides
		const optimizedLeft = optimize(node.left);
		const optimizedRight = optimize(node.right);

		return {
			type: "CrossProduct",
			left: optimizedLeft,
			right: optimizedRight,
		};
	}
}
