// AST Node Types

export interface SelectStatement {
	type: "SelectStatement";
	columns: Column[];
	from: FromClause;
	where?: WhereClause;
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
	table: string;
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
	| SelectStatement
	| Column
	| FromClause
	| WhereClause
	| Expression
	| Operand
	| Literal;
