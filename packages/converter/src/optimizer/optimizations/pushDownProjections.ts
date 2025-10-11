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
 * Extracts all attribute names from a list of qualified attributes
 * Example: ["TB1.name", "TB3.sal"] → ["TB1.name", "TB3.sal", "name", "sal"]
 */
function extractAttributeNames(attributes: string[]): Set<string> {
	const result = new Set<string>();
	for (const attr of attributes) {
		result.add(attr);
		// Also add unqualified version (after the dot)
		if (attr.includes(".")) {
			const parts = attr.split(".");
			result.add(parts[parts.length - 1]);
		}
	}
	return result;
}

/**
 * Extracts attribute names from a join/selection condition
 * Example: "TB1.PK = TB2.FK" → ["TB1.PK", "TB2.FK", "PK", "FK"]
 */
function extractAttributesFromCondition(condition: string): Set<string> {
	const result = new Set<string>();
	// Match patterns like "table.column" or just "column"
	const matches = condition.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\b/g);
	if (matches) {
		for (const match of matches) {
			result.add(match);
			// Also add unqualified version
			const parts = match.split(".");
			result.add(parts[parts.length - 1]);
		}
	}
	return result;
}

/**
 * Gets all relation names from a subtree
 */
function getRelationNames(node: RelationalAlgebraNode): Set<string> {
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
 * Checks if an attribute belongs to a specific side of a join
 */
function attributeBelongsToSide(
	attr: string,
	sideRelations: Set<string>,
): boolean {
	// If it's qualified (table.column), check if the table is in the side
	if (attr.includes(".")) {
		const tableName = attr.split(".")[0];
		return sideRelations.has(tableName);
	}
	// If unqualified, we can't determine, so assume it might belong
	return true;
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
	 * Combines consecutive projections and pushes them down through joins
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

		// Rule: π[attrs](R ⨝[cond] S) → introduce projections on both sides
		// Push projection through join to reduce attributes before join
		if (input.type === "Join" || input.type === "CrossProduct") {
			const binary =
				input.type === "Join" ? (input as Join) : (input as CrossProduct);

			// Get attributes needed from projection
			const projectionAttrs = extractAttributeNames(node.attributes);

			// Get attributes needed for join condition
			const joinAttrs =
				input.type === "Join"
					? extractAttributesFromCondition((binary as Join).condition)
					: new Set<string>();

			// Combine: we need projection attrs + join condition attrs
			const neededAttrs = new Set([...projectionAttrs, ...joinAttrs]);

			// Get relation names from each side
			const leftRelations = getRelationNames(binary.left);
			const rightRelations = getRelationNames(binary.right);

			// Determine which attributes belong to which side
			const leftAttrs: string[] = [];
			const rightAttrs: string[] = [];

			for (const attr of neededAttrs) {
				const belongsToLeft = attributeBelongsToSide(attr, leftRelations);
				const belongsToRight = attributeBelongsToSide(attr, rightRelations);

				if (belongsToLeft) {
					leftAttrs.push(attr);
				}
				if (belongsToRight) {
					rightAttrs.push(attr);
				}
			}

			// Only push down if we can reduce attributes on at least one side
			if (leftAttrs.length > 0 || rightAttrs.length > 0) {
				appliedRules.push(
					`Push projection through join: π[${node.attributes.join(", ")}] before join`,
				);

				// Create projections on each side (if they reduce attributes)
				let optimizedLeft = optimize(binary.left);
				let optimizedRight = optimize(binary.right);

				// Only add projection if it would actually reduce attributes
				// (i.e., we're not projecting all attributes with *)
				if (
					leftAttrs.length > 0 &&
					!node.attributes.includes("*") &&
					leftAttrs.length < 100
				) {
					// Arbitrary limit to avoid projecting everything
					optimizedLeft = {
						type: "Projection",
						attributes: leftAttrs,
						input: optimizedLeft,
					};
				}

				if (
					rightAttrs.length > 0 &&
					!node.attributes.includes("*") &&
					rightAttrs.length < 100
				) {
					optimizedRight = {
						type: "Projection",
						attributes: rightAttrs,
						input: optimizedRight,
					};
				}

				const optimizedJoin: Join | CrossProduct =
					input.type === "Join"
						? {
								type: "Join",
								condition: (binary as Join).condition,
								left: optimizedLeft,
								right: optimizedRight,
							}
						: {
								type: "CrossProduct",
								left: optimizedLeft,
								right: optimizedRight,
							};

				// Keep the outer projection to maintain the correct attribute order
				return {
					type: "Projection",
					attributes: node.attributes,
					input: optimizedJoin,
				};
			}
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
