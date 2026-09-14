import type { RelationalAlgebraNode } from "./types";

/**
 * Collects the names of all base relations (leaves) in a relational algebra subtree.
 */
export function getRelationNames(node: RelationalAlgebraNode): Set<string> {
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

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes single-quoted string literals from a condition, replacing their
 * contents so later regex matching never sees text that lives inside a
 * literal (e.g. a relation/column name that happens to appear in a value).
 */
export function stripStringLiterals(condition: string): string {
	return condition.replace(/'[^']*'/g, "''");
}

/**
 * Checks whether a condition references a given relation via a qualified
 * column reference (e.g. "users.id"). Comparison is case-insensitive and
 * requires the relation name to be followed by "." and not be a substring
 * of a longer identifier, so relation "a" never matches "cat.column" or a
 * value inside a string literal.
 */
export function conditionReferencesRelation(
	condition: string,
	relationName: string,
): boolean {
	const withoutStrings = stripStringLiterals(condition);
	const pattern = new RegExp(
		`(^|[^a-zA-Z0-9_])${escapeRegExp(relationName)}\\.`,
		"i",
	);
	return pattern.test(withoutStrings);
}

/**
 * Checks whether a condition references any of the given relations.
 */
export function conditionReferencesAnyRelation(
	condition: string,
	relations: Set<string>,
): boolean {
	for (const relation of relations) {
		if (conditionReferencesRelation(condition, relation)) {
			return true;
		}
	}
	return false;
}

/**
 * Extracts all qualified column references ("table.column") from a
 * condition, ignoring anything inside string literals.
 * Example: "TB1.id > 300 AND TB2.name = 'a.b'" → ["TB1.id", "TB2.name"]
 */
export function extractQualifiedAttributes(condition: string): string[] {
	const withoutStrings = stripStringLiterals(condition);
	const regex = /\b([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\b/g;
	const attributes: string[] = [];

	let match: RegExpExecArray | null;
	// biome-ignore lint: while with assignment is intentional
	while ((match = regex.exec(withoutStrings)) !== null) {
		attributes.push(match[1]);
	}

	return Array.from(new Set(attributes));
}
