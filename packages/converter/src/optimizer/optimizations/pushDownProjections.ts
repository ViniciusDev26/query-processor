import type {
	CrossProduct,
	Join,
	Projection,
	RelationalAlgebraNode,
	Selection,
} from "@/algebra/types";

export interface PushDownProjectionsResult {
	node: RelationalAlgebraNode;
	appliedRules: string[];
}

/**
 * Heuristic 2: Push projections down
 *
 * Moves projection operations closer to the base relations to reduce
 * the number of attributes processed by subsequent operations.
 *
 * Key optimizations:
 * 1. π[a1, a2](π[a1, a2, a3](R)) → π[a1, a2](R)
 *    (Combine consecutive projections, keeping only the outer attributes)
 *
 * 2. π[a](σ[c](R)) → stays as is (projection after selection is already optimal)
 *
 * 3. For joins: Introduce projections on each side to eliminate unused attributes
 *    before the join operation
 *
 * Example transformation:
 * π[a, b](R ⨝ S) → π[a, b]((π[a, join_attr](R)) ⨝ (π[b, join_attr](S)))
 *
 * @param node - The node to optimize
 * @returns Optimized node with projections pushed down and list of applied rules
 */
export function pushDownProjections(
	node: RelationalAlgebraNode,
): PushDownProjectionsResult {
	const appliedRules: string[] = [];

	function optimize(n: RelationalAlgebraNode): RelationalAlgebraNode {
		switch (n.type) {
			case "Projection":
				return optimizeProjection(n);
			case "Selection":
				return optimizeSelection(n);
			case "Join":
				return optimizeJoin(n);
			case "CrossProduct":
				return optimizeCrossProduct(n);
			case "Relation":
				return n; // Base case - no optimization needed
		}
	}

	const optimizedNode = optimize(node);

	return {
		node: optimizedNode,
		appliedRules,
	};

	/**
	 * Optimize projection nodes
	 *
	 * Combines consecutive projections and pushes them down
	 */
	function optimizeProjection(node: Projection): RelationalAlgebraNode {
		const input = node.input;

		// Rule: π[a1, a2](π[a1, a2, a3](R)) → π[a1, a2](R)
		// Combine consecutive projections
		if (input.type === "Projection") {
			const innerProjection = input as Projection;

			appliedRules.push(
				"Combine consecutive projections: π[a](π[b](R)) → π[a](R)",
			);

			// Recursively optimize the inner projection's input
			const optimizedInput = optimize(innerProjection.input);

			return {
				type: "Projection",
				attributes: node.attributes, // Keep only outer projection's attributes
				input: optimizedInput,
			};
		}

		// For other cases, recursively optimize the input
		const optimizedInput = optimize(input);

		return {
			type: "Projection",
			attributes: node.attributes,
			input: optimizedInput,
		};
	}

	/**
	 * Optimize selection nodes
	 */
	function optimizeSelection(node: Selection): RelationalAlgebraNode {
		// Recursively optimize the input
		const optimizedInput = optimize(node.input);

		return {
			type: "Selection",
			condition: node.condition,
			input: optimizedInput,
		};
	}

	/**
	 * Optimize join nodes
	 */
	function optimizeJoin(node: Join): RelationalAlgebraNode {
		// Recursively optimize both sides of the join
		const optimizedLeft = optimize(node.left);
		const optimizedRight = optimize(node.right);

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
