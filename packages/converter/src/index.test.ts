import { describe, expect, it } from "vitest";
import type {
	NamedColumn,
	SelectStatement,
	StarColumn,
} from "./ast/types";
import { parseSQL } from "./index";

describe("parseSQL", () => {
	it("should parse valid SELECT * FROM query", () => {
		const result = parseSQL("SELECT * FROM users");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.type).toBe("SelectStatement");
			expect((ast.columns[0] as StarColumn).type).toBe("StarColumn");
			expect(ast.from.table).toBe("users");
		}
	});

	it("should parse valid SELECT with columns", () => {
		const result = parseSQL("SELECT id, name FROM users");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.type).toBe("SelectStatement");
			expect(ast.columns).toHaveLength(2);
			expect((ast.columns[0] as NamedColumn).name).toBe("id");
			expect((ast.columns[1] as NamedColumn).name).toBe("name");
		}
	});

	it("should return error on lexer error", () => {
		const result = parseSQL("SELECT @ FROM users");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Lexer errors");
			expect(result.details.length).toBeGreaterThan(0);
		}
	});

	it("should return error on parser error", () => {
		const result = parseSQL("SELECT FROM users");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Parser errors");
			expect(result.details.length).toBeGreaterThan(0);
		}
	});

	it("should handle case-insensitive input", () => {
		const result = parseSQL("select id from users");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.type).toBe("SelectStatement");
		}
	});

	it("should parse SELECT with WHERE clause", () => {
		const result = parseSQL("SELECT * FROM users WHERE age > 18");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.where).toBeDefined();
			expect(ast.where?.type).toBe("WhereClause");
		}
	});

	it("should parse SELECT with table alias using AS", () => {
		const result = parseSQL("SELECT * FROM users AS u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.table).toBe("users");
			expect(ast.from.alias).toBe("u");
		}
	});

	it("should parse SELECT with implicit table alias", () => {
		const result = parseSQL("SELECT * FROM users u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.table).toBe("users");
			expect(ast.from.alias).toBe("u");
		}
	});

	it("should parse SELECT without alias", () => {
		const result = parseSQL("SELECT * FROM users");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.table).toBe("users");
			expect(ast.from.alias).toBeUndefined();
		}
	});

	it("should parse SELECT with alias and WHERE clause", () => {
		const result = parseSQL("SELECT * FROM users AS u WHERE age > 18");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.table).toBe("users");
			expect(ast.from.alias).toBe("u");
			expect(ast.where).toBeDefined();
		}
	});

	it("should parse SELECT with double-quoted string literals", () => {
		const result = parseSQL('SELECT name FROM "users"');
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.table).toBe("users");
		}
	});

	it("should parse SELECT with single-quoted string literals", () => {
		const result = parseSQL("SELECT name FROM 'users'");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.table).toBe("users");
		}
	});
});
