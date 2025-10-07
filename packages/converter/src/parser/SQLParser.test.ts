import { beforeEach, describe, expect, it } from "vitest";
import { SQLLexer } from "../lexer/SQLLexer";
import { SQLParser } from "./SQLParser";

describe("SQLParser", () => {
	let parser: SQLParser;

	beforeEach(() => {
		parser = new SQLParser();
	});

	const parse = (input: string) => {
		const lexResult = SQLLexer.tokenize(input);
		parser.input = lexResult.tokens;
		const cst = parser.selectStatement();
		return { cst, errors: parser.errors };
	};

	it("should parse SELECT * FROM table", () => {
		const { cst, errors } = parse("SELECT * FROM users");

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse SELECT with single column", () => {
		const { cst, errors } = parse("SELECT id FROM users");

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse SELECT with multiple columns", () => {
		const { cst, errors } = parse("SELECT id, name, email FROM users");

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse case-insensitive keywords", () => {
		const { cst, errors } = parse("select id from users");

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should fail on missing FROM keyword", () => {
		const { errors } = parse("SELECT id users");

		expect(errors.length).toBeGreaterThan(0);
	});

	it("should fail on missing table name", () => {
		const { errors } = parse("SELECT id FROM");

		expect(errors.length).toBeGreaterThan(0);
	});

	it("should fail on missing column list", () => {
		const { errors } = parse("SELECT FROM users");

		expect(errors.length).toBeGreaterThan(0);
	});

	it("should handle extra whitespace", () => {
		const { cst, errors } = parse("  SELECT   *   FROM   users  ");

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse SELECT with simple WHERE clause", () => {
		const { cst, errors } = parse("SELECT * FROM users WHERE age > 18");

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse SELECT with WHERE using different operators", () => {
		const inputs = [
			"SELECT * FROM users WHERE age = 18",
			"SELECT * FROM users WHERE age != 18",
			"SELECT * FROM users WHERE age <> 18",
			"SELECT * FROM users WHERE age < 18",
			"SELECT * FROM users WHERE age <= 18",
			"SELECT * FROM users WHERE age > 18",
			"SELECT * FROM users WHERE age >= 18",
		];

		for (const input of inputs) {
			const { errors } = parse(input);
			expect(errors).toHaveLength(0);
		}
	});

	it("should parse WHERE with string literals", () => {
		const { cst, errors } = parse(
			"SELECT * FROM users WHERE name = 'John'",
		);

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse WHERE with AND condition", () => {
		const { cst, errors } = parse(
			"SELECT * FROM users WHERE age > 18 AND status = 'active'",
		);

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse WHERE with OR condition", () => {
		const { cst, errors } = parse(
			"SELECT * FROM users WHERE age < 18 OR age > 65",
		);

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse WHERE with complex AND/OR condition", () => {
		const { cst, errors } = parse(
			"SELECT * FROM users WHERE age >= 18 AND status = 'active' OR role = 'admin'",
		);

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse SELECT with columns and WHERE", () => {
		const { cst, errors } = parse(
			"SELECT id, name FROM users WHERE age > 18",
		);

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should parse without WHERE clause (optional)", () => {
		const { cst, errors } = parse("SELECT id FROM users");

		expect(errors).toHaveLength(0);
		expect(cst).toBeDefined();
	});

	it("should fail on incomplete WHERE clause", () => {
		const { errors } = parse("SELECT * FROM users WHERE");

		expect(errors.length).toBeGreaterThan(0);
	});

	it("should fail on WHERE with missing operator", () => {
		const { errors } = parse("SELECT * FROM users WHERE age 18");

		expect(errors.length).toBeGreaterThan(0);
	});

	it("should fail on WHERE with missing right operand", () => {
		const { errors } = parse("SELECT * FROM users WHERE age >");

		expect(errors.length).toBeGreaterThan(0);
	});
});
