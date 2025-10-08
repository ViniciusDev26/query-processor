import { describe, expect, it } from "vitest";
import type {
	NamedColumn,
	SelectStatement,
	StarColumn,
	TableSource,
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
			expect(ast.from.source.type).toBe("TableSource");
			expect((ast.from.source as TableSource).table).toBe("users");

			// Check translation
			expect(result.translation.success).toBe(true);
			expect(result.translationString).toBe("π[*](users)");
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

			// Check translation
			expect(result.translation.success).toBe(true);
			expect(result.translationString).toBe("π[id, name](users)");
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

			// Check translation
			expect(result.translation.success).toBe(true);
			expect(result.translationString).toBe("π[*](σ[age > 18](users))");
		}
	});

	it("should parse SELECT with table alias using AS", () => {
		const result = parseSQL("SELECT * FROM users AS u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("TableSource");
			expect((ast.from.source as TableSource).table).toBe("users");
			expect(ast.from.alias).toBe("u");
		}
	});

	it("should parse SELECT with implicit table alias", () => {
		const result = parseSQL("SELECT * FROM users u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("TableSource");
			expect((ast.from.source as TableSource).table).toBe("users");
			expect(ast.from.alias).toBe("u");
		}
	});

	it("should parse SELECT without alias", () => {
		const result = parseSQL("SELECT * FROM users");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("TableSource");
			expect((ast.from.source as TableSource).table).toBe("users");
			expect(ast.from.alias).toBeUndefined();
		}
	});

	it("should parse SELECT with alias and WHERE clause", () => {
		const result = parseSQL("SELECT * FROM users AS u WHERE age > 18");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("TableSource");
			expect((ast.from.source as TableSource).table).toBe("users");
			expect(ast.from.alias).toBe("u");
			expect(ast.where).toBeDefined();
		}
	});

	it("should parse SELECT with double-quoted string literals", () => {
		const result = parseSQL('SELECT name FROM "users"');
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("TableSource");
			expect((ast.from.source as TableSource).table).toBe("users");
		}
	});

	it("should parse SELECT with single-quoted string literals", () => {
		const result = parseSQL("SELECT name FROM 'users'");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("TableSource");
			expect((ast.from.source as TableSource).table).toBe("users");
		}
	});

	it("should parse SELECT with subquery in FROM", () => {
		const result = parseSQL("SELECT id FROM (SELECT * FROM users) AS u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.type).toBe("SelectStatement");
			expect(ast.from.source.type).toBe("SubquerySource");
			expect(ast.from.alias).toBe("u");
			if (ast.from.source.type === "SubquerySource") {
				expect(ast.from.source.subquery.type).toBe("SelectStatement");
			}

			// Check translation
			expect(result.translation.success).toBe(true);
			expect(result.translationString).toBe("π[id](π[*](users))");
		}
	});

	it("should parse SELECT with subquery without AS keyword", () => {
		const result = parseSQL("SELECT id FROM (SELECT * FROM users) u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("SubquerySource");
			expect(ast.from.alias).toBe("u");
		}
	});

	it("should parse nested subqueries", () => {
		const result = parseSQL(
			"SELECT id FROM (SELECT * FROM (SELECT * FROM users) AS inner_query) AS outer_query",
		);
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.from.source.type).toBe("SubquerySource");
			if (ast.from.source.type === "SubquerySource") {
				const innerQuery = ast.from.source.subquery;
				expect(innerQuery.from.source.type).toBe("SubquerySource");
			}

			// Check translation
			expect(result.translation.success).toBe(true);
			expect(result.translationString).toBe("π[id](π[*](π[*](users)))");
		}
	});

	it("should translate SELECT with multiple columns and WHERE", () => {
		const result = parseSQL("SELECT name, age FROM users WHERE age >= 21");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.translation.success).toBe(true);
			expect(result.translationString).toBe(
				"π[name, age](σ[age >= 21](users))",
			);
		}
	});

	it("should translate SELECT with complex WHERE clause", () => {
		const result = parseSQL(
			"SELECT id FROM users WHERE age > 18 AND name = 'John'",
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.translation.success).toBe(true);
			expect(result.translationString).toBe(
				"π[id](σ[(age > 18 AND name = 'John')](users))",
			);
		}
	});

	it("should parse SELECT with qualified column names", () => {
		const result = parseSQL("SELECT p.idPedido FROM pedido AS p");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.columns).toHaveLength(1);
			expect((ast.columns[0] as NamedColumn).name).toBe("p.idPedido");
			expect(ast.from.alias).toBe("p");
		}
	});

	it("should parse SELECT with multiple qualified columns", () => {
		const result = parseSQL("SELECT u.id, u.name FROM users AS u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.columns).toHaveLength(2);
			expect((ast.columns[0] as NamedColumn).name).toBe("u.id");
			expect((ast.columns[1] as NamedColumn).name).toBe("u.name");
		}
	});

	it("should parse SELECT with mixed qualified and unqualified columns", () => {
		const result = parseSQL("SELECT id, u.name FROM users AS u");
		expect(result.success).toBe(true);
		if (result.success) {
			const ast = result.ast as SelectStatement;
			expect(ast.columns).toHaveLength(2);
			expect((ast.columns[0] as NamedColumn).name).toBe("id");
			expect((ast.columns[1] as NamedColumn).name).toBe("u.name");
		}
	});
});
