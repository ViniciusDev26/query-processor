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
 * Keeps only the qualified version (e.g., "TB1.name" not "name")
 * Example: ["TB1.name", "TB3.sal"] → ["TB1.name", "TB3.sal"]
 */
function extractAttributeNames(attributes: string[]): Set<string> {
	return new Set(attributes);
}

/**
 * Extracts attribute names from a join/selection condition
 * Keeps only qualified versions when available
 * Example: "TB1.PK = TB2.FK" → ["TB1.PK", "TB2.FK"]
 */
function extractAttributesFromCondition(condition: string): Set<string> {
	const result = new Set<string>();
	// Match patterns like "table.column"
	const matches = condition.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\b/g);
	if (matches) {
		for (const match of matches) {
			result.add(match);
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
 * Case-insensitive comparison to handle SQL's case-insensitive identifiers
 */
function attributeBelongsToSide(
	attr: string,
	sideRelations: Set<string>,
): boolean {
	// If it's qualified (table.column), check if the table is in the side
	if (attr.includes(".")) {
		const tableName = attr.split(".")[0].toLowerCase();
		// Case-insensitive comparison
		for (const relation of sideRelations) {
			if (relation.toLowerCase() === tableName) {
				return true;
			}
		}
		return false;
	}
	// If unqualified, we can't determine, so assume it might belong
	return true;
}

/**
 * Collects all attributes referenced in a subtree (from selections, projections)
 * This is used to determine which attributes need to be preserved when pushing
 * projections down through joins.
 *
 * NOTE: We DON'T collect attributes from selections because those are only needed
 * for filtering and can be discarded after the selection is applied.
 */
function collectAttributesFromSubtree(node: RelationalAlgebraNode): Set<string> {
	const attributes = new Set<string>();

	function traverse(n: RelationalAlgebraNode): void {
		switch (n.type) {
			case "Selection":
				// DON'T add attributes from selection - they're only needed for filtering
				// Continue traversing to find projections and joins below
				traverse(n.input);
				break;
			case "Projection":
				// Add attributes from the projection
				for (const attr of n.attributes) {
					if (attr !== "*") {
						attributes.add(attr);
					}
				}
				traverse(n.input);
				break;
			case "Join":
				// Add attributes from join condition
				const joinAttrs = extractAttributesFromCondition(n.condition);
				for (const attr of joinAttrs) {
					attributes.add(attr);
				}
				traverse(n.left);
				traverse(n.right);
				break;
			case "CrossProduct":
				traverse(n.left);
				traverse(n.right);
				break;
			case "Relation":
				// Base case - no attributes to collect
				break;
		}
	}

	traverse(node);
	return attributes;
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

		// Rule: π[attrs](R ⨝[cond] S) → push projections through join
		// Delegate to optimizeJoin with needed attributes
		if (input.type === "Join") {
			const join = input as Join;

			// Get attributes needed from projection
			const projectionAttrs = extractAttributeNames(node.attributes);

			// Skip if it's a wildcard projection
			if (!node.attributes.includes("*")) {
				appliedRules.push(
					`Push projection through join: π[${node.attributes.join(", ")}] before join`,
				);

				// Optimize the join with the needed attributes
				const optimizedJoin = optimizeJoin(join, projectionAttrs);

				// Keep the outer projection to maintain the correct attribute order
				return {
					type: "Projection",
					attributes: node.attributes,
					input: optimizedJoin,
				};
			}
		}

		if (input.type === "CrossProduct") {
			const crossProduct = input as CrossProduct;

			// For cross products, just optimize recursively
			const optimizedLeft = optimize(crossProduct.left);
			const optimizedRight = optimize(crossProduct.right);

			return {
				type: "Projection",
				attributes: node.attributes,
				input: {
					type: "CrossProduct",
					left: optimizedLeft,
					right: optimizedRight,
				},
			};
		}

		// Note: π[a](σ[c](R)) is already optimal!
		// In relational algebra trees, the innermost operation executes first.
		// So π[a](σ[c](R)) means: apply σ first, then π - which is the correct order.
		// We should NOT push projections through selections.

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
	 *
	 * When optimizing joins, we need to introduce projections on each side
	 * to keep only the attributes needed for this join and any parent operations
	 */
	function optimizeJoin(node: Join, neededAttrs?: Set<string>): RelationalAlgebraNode {
		// Get attributes needed for the join condition
		const joinAttrs = extractAttributesFromCondition(node.condition);

		// Collect attributes from the subtrees (e.g., from selections pushed down)
		const leftSubtreeAttrs = collectAttributesFromSubtree(node.left);
		const rightSubtreeAttrs = collectAttributesFromSubtree(node.right);

		// Combine all needed attributes: parent needs + join condition + subtree needs
		const allNeededAttrs = new Set([
			...joinAttrs,
			...leftSubtreeAttrs,
			...rightSubtreeAttrs,
			...(neededAttrs || []),
		]);

		// Get relation names from each side
		const leftRelations = getRelationNames(node.left);
		const rightRelations = getRelationNames(node.right);

		// Determine which attributes belong to which side
		const leftAttrs: string[] = [];
		const rightAttrs: string[] = [];

		for (const attr of allNeededAttrs) {
			const belongsToLeft = attributeBelongsToSide(attr, leftRelations);
			const belongsToRight = attributeBelongsToSide(attr, rightRelations);

			if (belongsToLeft) {
				leftAttrs.push(attr);
			}
			if (belongsToRight) {
				rightAttrs.push(attr);
			}
		}

		// Recursively optimize both sides, passing down needed attributes
		let optimizedLeft = node.left;
		let optimizedRight = node.right;

		// If left side is also a join, pass needed attributes down
		// Don't add extra projections - the nested join will handle it
		if (node.left.type === "Join") {
			optimizedLeft = optimizeJoin(node.left as Join, new Set(leftAttrs));
		} else {
			optimizedLeft = optimize(node.left);

			// Check if we need to add or update projection
			if (leftAttrs.length > 0 && allNeededAttrs.size > 0) {
				if (optimizedLeft.type === "Projection") {
					// There's already a projection - check if it has all needed attributes
					const existingProj = optimizedLeft as Projection;
					const existingAttrs = new Set(existingProj.attributes);
					const missingAttrs = leftAttrs.filter((attr) => !existingAttrs.has(attr));

					if (missingAttrs.length > 0) {
						// Update the projection to include missing attributes
						appliedRules.push(
							`Add missing attributes to existing projection: ${missingAttrs.join(", ")}`,
						);
						optimizedLeft = {
							type: "Projection",
							attributes: Array.from(new Set([...existingProj.attributes, ...leftAttrs])),
							input: existingProj.input,
						};
					}
				} else {
					// No projection exists - create one
					appliedRules.push(
						`Push projection on left side of join: π[${leftAttrs.join(", ")}]`,
					);
					const newProjection: Projection = {
						type: "Projection",
						attributes: leftAttrs,
						input: optimizedLeft,
					};
					optimizedLeft = optimize(newProjection);
				}
			}
		}

		// If right side is also a join, pass needed attributes down
		// Don't add extra projections - the nested join will handle it
		if (node.right.type === "Join") {
			optimizedRight = optimizeJoin(node.right as Join, new Set(rightAttrs));
		} else {
			optimizedRight = optimize(node.right);

			// Check if we need to add or update projection
			if (rightAttrs.length > 0 && allNeededAttrs.size > 0) {
				if (optimizedRight.type === "Projection") {
					// There's already a projection - check if it has all needed attributes
					const existingProj = optimizedRight as Projection;
					const existingAttrs = new Set(existingProj.attributes);
					const missingAttrs = rightAttrs.filter((attr) => !existingAttrs.has(attr));

					if (missingAttrs.length > 0) {
						// Update the projection to include missing attributes
						appliedRules.push(
							`Add missing attributes to existing projection: ${missingAttrs.join(", ")}`,
						);
						optimizedRight = {
							type: "Projection",
							attributes: Array.from(new Set([...existingProj.attributes, ...rightAttrs])),
							input: existingProj.input,
						};
					}
				} else {
					// No projection exists - create one
					appliedRules.push(
						`Push projection on right side of join: π[${rightAttrs.join(", ")}]`,
					);
					const newProjection: Projection = {
						type: "Projection",
						attributes: rightAttrs,
						input: optimizedRight,
					};
					optimizedRight = optimize(newProjection);
				}
			}
		}

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
