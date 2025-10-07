import { describe, expect, it } from "vitest";
import type {
	NamedColumn,
	SelectStatement,
	StarColumn,
} from "./ast/types";
import { parseSQL } from "./index";

describe("parseSQL", () => {
	it("should parse valid SELECT * FROM query", () => {
		const result = parseSQL("SELECT * FROM users") as SelectStatement;
		expect(result).toBeDefined();
		expect(result.type).toBe("SelectStatement");
		expect((result.columns[0] as StarColumn).type).toBe("StarColumn");
		expect(result.from.table).toBe("users");
	});

	it("should parse valid SELECT with columns", () => {
		const result = parseSQL("SELECT id, name FROM users") as SelectStatement;
		expect(result).toBeDefined();
		expect(result.type).toBe("SelectStatement");
		expect(result.columns).toHaveLength(2);
		expect((result.columns[0] as NamedColumn).name).toBe("id");
		expect((result.columns[1] as NamedColumn).name).toBe("name");
	});

	it("should throw error on lexer error", () => {
		expect(() => parseSQL("SELECT @ FROM users")).toThrow("Lexer errors");
	});

	it("should throw error on parser error", () => {
		expect(() => parseSQL("SELECT FROM users")).toThrow("Parser errors");
	});

	it("should handle case-insensitive input", () => {
		const result = parseSQL("select id from users") as SelectStatement;
		expect(result).toBeDefined();
		expect(result.type).toBe("SelectStatement");
	});

	it("should parse SELECT with WHERE clause", () => {
		const result = parseSQL("SELECT * FROM users WHERE age > 18") as SelectStatement;
		expect(result).toBeDefined();
		expect(result.where).toBeDefined();
		expect(result.where?.type).toBe("WhereClause");
	});
});
