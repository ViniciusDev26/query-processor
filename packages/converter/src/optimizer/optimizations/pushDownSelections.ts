import type {
	CrossProduct,
	Join,
	Projection,
	RelationalAlgebraNode,
	Selection,
} from "@/algebra/types";

export interface PushDownSelectionsResult {
	node: RelationalAlgebraNode;
	appliedRules: string[];
}

/**
 * Decomposes a compound AND condition into individual predicates
 * Example: "TB1.id > 300 AND TB3.sal != 0" → ["TB1.id > 300", "TB3.sal != 0"]
 * Example: "(TB1.id > 300 AND TB3.sal != 0)" → ["TB1.id > 300", "TB3.sal != 0"]
 * Example: "(((A AND B) AND C) AND D)" → ["A", "B", "C", "D"] (recursive decomposition)
 */
function decomposeAndCondition(condition: string): string[] {
	// First, strip outer parentheses if present
	let cleaned = condition.trim();
	while (cleaned.startsWith("(") && cleaned.endsWith(")")) {
		// Check if these are actually matching outer parens
		let depth = 0;
		let isOuterParen = true;
		for (let i = 0; i < cleaned.length; i++) {
			if (cleaned[i] === "(") depth++;
			if (cleaned[i] === ")") depth--;
			// If depth hits 0 before the end, these aren't outer parens
			if (depth === 0 && i < cleaned.length - 1) {
				isOuterParen = false;
				break;
			}
		}
		if (isOuterParen) {
			cleaned = cleaned.substring(1, cleaned.length - 1).trim();
		} else {
			break;
		}
	}

	const predicates: string[] = [];
	let depth = 0;
	let currentPredicate = "";

	for (let i = 0; i < cleaned.length; i++) {
		const char = cleaned[i];

		if (char === "(") {
			depth++;
			currentPredicate += char;
		} else if (char === ")") {
			depth--;
			currentPredicate += char;
		} else if (
			depth === 0 &&
			cleaned.substring(i, i + 5).toUpperCase() === " AND "
		) {
			predicates.push(currentPredicate.trim());
			currentPredicate = "";
			i += 4; // Skip " AND" (will be incremented by loop)
		} else {
			currentPredicate += char;
		}
	}

	if (currentPredicate.trim()) {
		predicates.push(currentPredicate.trim());
	}

	// If we only got one predicate back, return it
	if (predicates.length <= 1) {
		return predicates.length > 0 ? predicates : [cleaned];
	}

	// Recursively decompose each predicate to handle nested parentheses
	const fullyDecomposed: string[] = [];
	for (const predicate of predicates) {
		const decomposed = decomposeAndCondition(predicate);
		fullyDecomposed.push(...decomposed);
	}

	return fullyDecomposed;
}

/**
 * Extracts relation names from a subtree
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
 * Checks if a predicate references any of the given relations
 * Case-insensitive comparison to handle SQL's case-insensitive identifiers
 */
function predicateReferences(
	predicate: string,
	relations: Set<string>,
): boolean {
	const predicateLower = predicate.toLowerCase();
	for (const relation of relations) {
		// Check for qualified column references like "TB1.id" or "users.age"
		// Use case-insensitive comparison since SQL identifiers are typically case-insensitive
		if (predicateLower.includes(`${relation.toLowerCase()}.`)) {
			return true;
		}
	}
	return false;
}

/**
 * Extracts all qualified column references from a condition
 * Example: "TB1.id > 300 AND TB2.name = 'test'" → ["TB1.id", "TB2.name"]
 */
function extractAttributes(condition: string): string[] {
	const attributes: string[] = [];

	// First, remove string literals to avoid matching patterns inside them
	// Replace single-quoted strings with placeholders
	const withoutStrings = condition.replace(/'[^']*'/g, "''");

	// Match qualified column references like "table.column"
	const regex = /\b([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\b/g;
	let match: RegExpExecArray | null;

	// biome-ignore lint: while with assignment is intentional
	while ((match = regex.exec(withoutStrings)) !== null) {
		attributes.push(match[1]);
	}

	return Array.from(new Set(attributes)); // Remove duplicates
}

/**
 * Heuristic 1: Push selections down
 *
 * Moves selection operations as close to the base relations as possible.
 * This reduces the number of tuples that need to be processed by subsequent operations.
 *
 * Key transformations:
 * 1. σ[condition](π[cols](R)) → π[cols](σ[condition](R))
 * 2. σ[c1 AND c2](R ⨝ S) → σ[c1](R) ⨝ σ[c2](S) (when c1 only references R and c2 only references S)
 *
 * @param node - The node to optimize
 * @returns Optimized node with selections pushed down and list of applied rules
 */
export function pushDownSelections(
	node: RelationalAlgebraNode,
): PushDownSelectionsResult {
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
				return n; // Base case - no optimization needed
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
	 * Attempts to push the selection down through other operations
	 */
	function optimizeSelection(node: Selection): RelationalAlgebraNode {
		const input = node.input;

		// Rule: σ[c](π[a](R)) → π[a∪attrs(c)](σ[c](R))
		// Push selection through projection, ensuring projection includes attributes needed by selection
		if (input.type === "Projection") {
			const projection = input as Projection;

			// Extract attributes referenced in the selection condition
			const selectionAttrs = extractAttributes(node.condition);

			// Merge projection attributes with selection attributes, removing duplicates
			const allAttributes = Array.from(
				new Set([...projection.attributes, ...selectionAttrs]),
			);

			// Only add rule if we actually modified something
			if (allAttributes.length !== projection.attributes.length) {
				appliedRules.push(
					`Push selection through projection and add required attributes: σ[${node.condition}] through π`,
				);
			} else {
				appliedRules.push(
					"Push selection through projection: σ[c](π[a](R)) → π[a](σ[c](R))",
				);
			}

			// Create the new selection node and recursively optimize it to push it down further
			const newSelection: Selection = {
				type: "Selection",
				condition: node.condition,
				input: projection.input,
			};

			const optimizedSelection = optimize(newSelection);

			return {
				type: "Projection",
				attributes: allAttributes,
				input: optimizedSelection,
			};
		}

		// Rule: σ[c1 AND c2](R ⨝ S) → σ[c1](R) ⨝ σ[c2](S)
		// For joins, decompose AND conditions and push to appropriate sides
		if (input.type === "Join" || input.type === "CrossProduct") {
			const binary =
				input.type === "Join" ? (input as Join) : (input as CrossProduct);

			// Decompose compound AND conditions
			const predicates = decomposeAndCondition(node.condition);

			if (predicates.length === 1) {
				// Single predicate - check if it can be pushed to one side
				const leftRelations = extractRelationNames(binary.left);
				const rightRelations = extractRelationNames(binary.right);

				const referencesLeft = predicateReferences(
					predicates[0],
					leftRelations,
				);
				const referencesRight = predicateReferences(
					predicates[0],
					rightRelations,
				);

				// Push to left side if it only references left relations
				if (referencesLeft && !referencesRight) {
					appliedRules.push(
						`Push selection to left side of join: σ[${predicates[0]}] before join`,
					);

					const optimizedBinary =
						input.type === "Join"
							? ({
									type: "Join",
									condition: (binary as Join).condition,
									left: optimize({
										type: "Selection",
										condition: predicates[0],
										input: binary.left,
									} as Selection),
									right: optimize(binary.right),
								} as Join)
							: ({
									type: "CrossProduct",
									left: optimize({
										type: "Selection",
										condition: predicates[0],
										input: binary.left,
									} as Selection),
									right: optimize(binary.right),
								} as CrossProduct);

					return optimizedBinary;
				}

				// Push to right side if it only references right relations
				if (referencesRight && !referencesLeft) {
					appliedRules.push(
						`Push selection to right side of join: σ[${predicates[0]}] before join`,
					);

					const optimizedBinary =
						input.type === "Join"
							? ({
									type: "Join",
									condition: (binary as Join).condition,
									left: optimize(binary.left),
									right: optimize({
										type: "Selection",
										condition: predicates[0],
										input: binary.right,
									} as Selection),
								} as Join)
							: ({
									type: "CrossProduct",
									left: optimize(binary.left),
									right: optimize({
										type: "Selection",
										condition: predicates[0],
										input: binary.right,
									} as Selection),
								} as CrossProduct);

					return optimizedBinary;
				}

				// If it references both sides, keep it above the join
				const optimizedBinary =
					input.type === "Join" ? optimizeJoin(binary as Join) : optimizeCrossProduct(binary as CrossProduct);

				return {
					type: "Selection",
					condition: node.condition,
					input: optimizedBinary,
				};
			}

			// Multiple predicates - decompose and push each to appropriate side
			const leftRelations = extractRelationNames(binary.left);
			const rightRelations = extractRelationNames(binary.right);

			const leftPredicates: string[] = [];
			const rightPredicates: string[] = [];
			const remainingPredicates: string[] = [];

			for (const predicate of predicates) {
				const referencesLeft = predicateReferences(predicate, leftRelations);
				const referencesRight = predicateReferences(predicate, rightRelations);

				if (referencesLeft && !referencesRight) {
					leftPredicates.push(predicate);
				} else if (referencesRight && !referencesLeft) {
					rightPredicates.push(predicate);
				} else {
					// Predicate references both sides or no sides - keep above join
					remainingPredicates.push(predicate);
				}
			}

			// Build optimized tree
			let optimizedLeft = binary.left;
			let optimizedRight = binary.right;

			if (leftPredicates.length > 0) {
				appliedRules.push(
					`Decompose AND and push to left: σ[${leftPredicates.join(" AND ")}] before join`,
				);
				// Create selection and recursively optimize it to push it down further
				const leftSelection: Selection = {
					type: "Selection",
					condition: leftPredicates.join(" AND "),
					input: binary.left,
				};
				optimizedLeft = optimize(leftSelection);
			} else {
				optimizedLeft = optimize(binary.left);
			}

			if (rightPredicates.length > 0) {
				appliedRules.push(
					`Decompose AND and push to right: σ[${rightPredicates.join(" AND ")}] before join`,
				);
				// Create selection and recursively optimize it to push it down further
				const rightSelection: Selection = {
					type: "Selection",
					condition: rightPredicates.join(" AND "),
					input: binary.right,
				};
				optimizedRight = optimize(rightSelection);
			} else {
				optimizedRight = optimize(binary.right);
			}

			let result: RelationalAlgebraNode =
				input.type === "Join"
					? ({
							type: "Join",
							condition: (binary as Join).condition,
							left: optimizedLeft,
							right: optimizedRight,
						} as Join)
					: ({
							type: "CrossProduct",
							left: optimizedLeft,
							right: optimizedRight,
						} as CrossProduct);

			// Wrap with remaining predicates if any
			if (remainingPredicates.length > 0) {
				result = {
					type: "Selection",
					condition: remainingPredicates.join(" AND "),
					input: result,
				};
			}

			return result;
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
