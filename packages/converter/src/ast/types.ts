// AST Node Types

// Statements
export type Statement =
	| SelectStatement
	| InsertStatement
	| UpdateStatement
	| DeleteStatement;

export interface SelectStatement {
	type: "SelectStatement";
	columns: Column[];
	from: FromClause;
	joins?: JoinClause[];
	where?: WhereClause;
}

export interface InsertStatement {
	type: "InsertStatement";
	table: string;
	columns?: string[];
	values: Literal[];
}

export interface UpdateStatement {
	type: "UpdateStatement";
	table: string;
	assignments: Assignment[];
	where?: WhereClause;
}

export interface DeleteStatement {
	type: "DeleteStatement";
	table: string;
	where?: WhereClause;
}

export interface Assignment {
	type: "Assignment";
	column: string;
	value: Literal;
}

export type Column = StarColumn | NamedColumn;

export interface StarColumn {
	type: "StarColumn";
}

export interface NamedColumn {
	type: "NamedColumn";
	name: string;
}

export interface FromClause {
	type: "FromClause";
	source: TableSource | SubquerySource;
	alias?: string;
}

export interface TableSource {
	type: "TableSource";
	table: string;
}

export interface SubquerySource {
	type: "SubquerySource";
	subquery: SelectStatement;
}

export interface JoinClause {
	type: "JoinClause";
	joinType: "INNER";
	table: string;
	alias?: string;
	on: Expression;
}

export interface WhereClause {
	type: "WhereClause";
	condition: Expression;
}

export type Expression = BinaryExpression | LogicalExpression;

export interface BinaryExpression {
	type: "BinaryExpression";
	left: Operand;
	operator: ComparisonOperator;
	right: Operand;
}

export interface LogicalExpression {
	type: "LogicalExpression";
	left: Expression;
	operator: LogicalOperator;
	right: Expression;
}

export type Operand = ColumnReference | Literal;

export interface ColumnReference {
	type: "ColumnReference";
	name: string;
}

export type Literal = NumberLiteral | StringLiteral;

export interface NumberLiteral {
	type: "NumberLiteral";
	value: number;
}

export interface StringLiteral {
	type: "StringLiteral";
	value: string;
}

export type ComparisonOperator =
	| "="
	| "!="
	| "<>"
	| "<"
	| "<="
	| ">"
	| ">=";
export type LogicalOperator = "AND" | "OR";

export type ASTNode =
	| Statement
	| Column
	| FromClause
	| TableSource
	| SubquerySource
	| JoinClause
	| WhereClause
	| Expression
	| Operand
	| Literal
	| Assignment;
