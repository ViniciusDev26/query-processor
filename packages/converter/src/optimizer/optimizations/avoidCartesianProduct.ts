import type {
	CrossProduct,
	Join,
	Projection,
	RelationalAlgebraNode,
	Selection,
} from "@/algebra/types";

export interface AvoidCartesianProductResult {
	node: RelationalAlgebraNode;
	appliedRules: string[];
}

/**
 * Extracts relation names from a node recursively
 */
function extractRelationNames(node: RelationalAlgebraNode): Set<string> {
	const relations = new Set<string>();

	function traverse(n: RelationalAlgebraNode): void {
		switch (n.type) {
			case "Relation":
				relations.add(n.name);
				break;
			case "Selection":
			case "Projection":
				traverse(n.input);
				break;
			case "Join":
			case "CrossProduct":
				traverse(n.left);
				traverse(n.right);
				break;
		}
	}

	traverse(node);
	return relations;
}

/**
 * Checks if a condition involves attributes from specific relations
 * This is a simplified heuristic that looks for relation names in the condition
 */
function conditionInvolves(
	condition: string,
	leftRelations: Set<string>,
	rightRelations: Set<string>,
): boolean {
	// Check if condition mentions relations from both sides
	let mentionsLeft = false;
	let mentionsRight = false;

	for (const rel of leftRelations) {
		if (condition.includes(rel)) {
			mentionsLeft = true;
			break;
		}
	}

	for (const rel of rightRelations) {
		if (condition.includes(rel)) {
			mentionsRight = true;
			break;
		}
	}

	// A join condition should involve both sides
	return mentionsLeft && mentionsRight;
}

/**
 * Heuristic 4: Avoid Cartesian Product
 *
 * Transforms Cartesian products (cross products) into joins when there are
 * applicable selection conditions. This is crucial because Cartesian products
 * can be extremely expensive (|R| × |S| tuples).
 *
 * Key optimizations:
 * 1. σ[join_condition](R × S) → R ⨝[join_condition] S
 * 2. Identify selection conditions that can become join conditions
 * 3. Convert cross products to equi-joins when possible
 *
 * Example transformation:
 * σ[R.id = S.id](R × S) → R ⨝[R.id = S.id] S
 *
 * Benefits:
 * - Dramatically reduces intermediate result size
 * - Enables use of efficient join algorithms (hash join, merge join)
 * - Reduces I/O and computation costs
 *
 * @param node - The node to optimize
 * @returns Optimized node with Cartesian products converted to joins where possible
 */
export function avoidCartesianProduct(
	node: RelationalAlgebraNode,
): AvoidCartesianProductResult {
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
	 * Key rule: σ[join_condition](R × S) → R ⨝[join_condition] S
	 */
	function optimizeSelection(node: Selection): RelationalAlgebraNode {
		const input = node.input;

		// Rule: σ[condition](R × S) → R ⨝[condition] S
		// Convert cross product + selection to join
		if (input.type === "CrossProduct") {
			const crossProduct = input as CrossProduct;

			// Extract relation names from both sides
			const leftRelations = extractRelationNames(crossProduct.left);
			const rightRelations = extractRelationNames(crossProduct.right);

			// Check if the condition involves both sides (making it a join condition)
			if (conditionInvolves(node.condition, leftRelations, rightRelations)) {
				appliedRules.push(
					`Convert Cartesian product to join: σ[${node.condition}](R × S) → R ⨝[${node.condition}] S`,
				);

				// Recursively optimize both sides
				const optimizedLeft = optimize(crossProduct.left);
				const optimizedRight = optimize(crossProduct.right);

				// Return a join instead of selection over cross product
				return {
					type: "Join",
					condition: node.condition,
					left: optimizedLeft,
					right: optimizedRight,
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
	 */
	function optimizeJoin(node: Join): RelationalAlgebraNode {
		// Recursively optimize both sides
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

		// If we reach here, no selection was found above to convert to join
		// Just optimize the children
		return {
			type: "CrossProduct",
			left: optimizedLeft,
			right: optimizedRight,
		};
	}
}
