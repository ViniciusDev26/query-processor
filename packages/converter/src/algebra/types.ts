// Relational Algebra Types

export type RelationalAlgebraNode = Projection | Selection | Relation;

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
