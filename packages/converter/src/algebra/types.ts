// Relational Algebra Types

export type RelationalAlgebraNode =
	| Projection
	| Selection
	| Relation
	| Join
	| CrossProduct;

export interface Projection {
	type: "Projection";
	attributes: string[]; // Column names to project (empty array or ["*"] for all)
	input: RelationalAlgebraNode;
}

export interface Selection {
	type: "Selection";
	condition: string; // Condition expression (e.g., "age > 18", "name = 'John'")
	input: RelationalAlgebraNode;
}

export interface Relation {
	type: "Relation";
	name: string; // Table name
}

export interface Join {
	type: "Join";
	condition: string; // Join condition (e.g., "users.id = orders.user_id")
	left: RelationalAlgebraNode; // Left input
	right: RelationalAlgebraNode; // Right input
}

export interface CrossProduct {
	type: "CrossProduct";
	left: RelationalAlgebraNode; // Left input
	right: RelationalAlgebraNode; // Right input
}
