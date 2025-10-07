import { beforeEach, describe, expect, it } from "vitest";
import type {
	BinaryExpression,
	LogicalExpression,
	NamedColumn,
	SelectStatement,
	StarColumn,
} from "../ast/types";
import { SQLLexer } from "../lexer/SQLLexer";
import { createASTBuilder } from "./ASTBuilder";
import { SQLParser } from "./SQLParser";

describe("ASTBuilder", () => {
	let parser: SQLParser;
	let astBuilder: ReturnType<typeof createASTBuilder>;

	beforeEach(() => {
		parser = new SQLParser();
		astBuilder = createASTBuilder(parser);
	});

	const parseToAST = (input: string): SelectStatement => {
		const lexResult = SQLLexer.tokenize(input);
		parser.input = lexResult.tokens;
		const cst = parser.selectStatement();
		return astBuilder.visit(cst) as SelectStatement;
	};

	describe("SELECT statements", () => {
		it("should build AST for SELECT * FROM table", () => {
			const ast = parseToAST("SELECT * FROM users");

			expect(ast.type).toBe("SelectStatement");
			expect(ast.columns).toHaveLength(1);
			expect((ast.columns[0] as StarColumn).type).toBe("StarColumn");
			expect(ast.from.type).toBe("FromClause");
			expect(ast.from.table).toBe("users");
			expect(ast.where).toBeUndefined();
		});

		it("should build AST for SELECT with single column", () => {
			const ast = parseToAST("SELECT id FROM users");

			expect(ast.type).toBe("SelectStatement");
			expect(ast.columns).toHaveLength(1);
			expect((ast.columns[0] as NamedColumn).type).toBe("NamedColumn");
			expect((ast.columns[0] as NamedColumn).name).toBe("id");
			expect(ast.from.table).toBe("users");
		});

		it("should build AST for SELECT with multiple columns", () => {
			const ast = parseToAST("SELECT id, name, email FROM users");

			expect(ast.type).toBe("SelectStatement");
			expect(ast.columns).toHaveLength(3);
			expect((ast.columns[0] as NamedColumn).name).toBe("id");
			expect((ast.columns[1] as NamedColumn).name).toBe("name");
			expect((ast.columns[2] as NamedColumn).name).toBe("email");
		});
	});

	describe("WHERE clause", () => {
		it("should build AST with simple WHERE clause", () => {
			const ast = parseToAST("SELECT * FROM users WHERE age > 18");

			expect(ast.where).toBeDefined();
			expect(ast.where?.type).toBe("WhereClause");

			const condition = ast.where?.condition as BinaryExpression;
			expect(condition.type).toBe("BinaryExpression");
			expect(condition.operator).toBe(">");

			expect(condition.left.type).toBe("ColumnReference");
			expect((condition.left as any).name).toBe("age");

			expect(condition.right.type).toBe("NumberLiteral");
			expect((condition.right as any).value).toBe(18);
		});

		it("should build AST with different comparison operators", () => {
			const testCases = [
				{ query: "SELECT * FROM users WHERE age = 18", op: "=" },
				{ query: "SELECT * FROM users WHERE age != 18", op: "!=" },
				{ query: "SELECT * FROM users WHERE age < 18", op: "<" },
				{ query: "SELECT * FROM users WHERE age <= 18", op: "<=" },
				{ query: "SELECT * FROM users WHERE age > 18", op: ">" },
				{ query: "SELECT * FROM users WHERE age >= 18", op: ">=" },
			];

			for (const { query, op } of testCases) {
				const ast = parseToAST(query);
				const condition = ast.where?.condition as BinaryExpression;
				expect(condition.operator).toBe(op);
			}
		});

		it("should build AST with string literal", () => {
			const ast = parseToAST("SELECT * FROM users WHERE name = 'John'");

			const condition = ast.where?.condition as BinaryExpression;
			expect(condition.right.type).toBe("StringLiteral");
			expect((condition.right as any).value).toBe("John");
		});

		it("should build AST with number literal", () => {
			const ast = parseToAST("SELECT * FROM users WHERE age > 18.5");

			const condition = ast.where?.condition as BinaryExpression;
			expect(condition.right.type).toBe("NumberLiteral");
			expect((condition.right as any).value).toBe(18.5);
		});
	});

	describe("Logical expressions", () => {
		it("should build AST with AND condition", () => {
			const ast = parseToAST(
				"SELECT * FROM users WHERE age > 18 AND status = 'active'",
			);

			const condition = ast.where?.condition as LogicalExpression;
			expect(condition.type).toBe("LogicalExpression");
			expect(condition.operator).toBe("AND");

			const left = condition.left as BinaryExpression;
			expect(left.type).toBe("BinaryExpression");
			expect((left.left as any).name).toBe("age");

			const right = condition.right as BinaryExpression;
			expect(right.type).toBe("BinaryExpression");
			expect((right.left as any).name).toBe("status");
		});

		it("should build AST with OR condition", () => {
			const ast = parseToAST(
				"SELECT * FROM users WHERE age < 18 OR age > 65",
			);

			const condition = ast.where?.condition as LogicalExpression;
			expect(condition.type).toBe("LogicalExpression");
			expect(condition.operator).toBe("OR");
		});

		it("should build AST with complex AND/OR condition", () => {
			const ast = parseToAST(
				"SELECT * FROM users WHERE age >= 18 AND status = 'active' OR role = 'admin'",
			);

			const condition = ast.where?.condition as LogicalExpression;
			expect(condition.type).toBe("LogicalExpression");
			expect(condition.operator).toBe("OR");

			// Left side should be an AND expression
			const leftSide = condition.left as LogicalExpression;
			expect(leftSide.type).toBe("LogicalExpression");
			expect(leftSide.operator).toBe("AND");

			// Right side should be a binary expression
			const rightSide = condition.right as BinaryExpression;
			expect(rightSide.type).toBe("BinaryExpression");
		});

		it("should build AST with multiple AND conditions", () => {
			const ast = parseToAST(
				"SELECT * FROM users WHERE age > 18 AND status = 'active' AND role = 'user'",
			);

			const condition = ast.where?.condition as LogicalExpression;
			expect(condition.type).toBe("LogicalExpression");
			expect(condition.operator).toBe("AND");

			// Should be left-associative: ((age > 18 AND status = 'active') AND role = 'user')
			const leftSide = condition.left as LogicalExpression;
			expect(leftSide.type).toBe("LogicalExpression");
			expect(leftSide.operator).toBe("AND");
		});
	});
});
