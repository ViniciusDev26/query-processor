import { beforeEach, describe, expect, it } from "vitest";
import type { SelectStatement } from "../ast/types";
import { parseSQL } from "../index";
import { SchemaValidator } from "./SchemaValidator";
import type { DatabaseSchema } from "./types";

describe("SchemaValidator", () => {
	let schema: DatabaseSchema;
	let validator: SchemaValidator;

	// Helper to parse SQL and get AST
	const parse = (sql: string): SelectStatement => {
		const result = parseSQL(sql);
		expect(result.success).toBe(true);
		if (!result.success) throw new Error("Parse failed");
		return result.ast as SelectStatement;
	};

	beforeEach(() => {
		schema = {
			tables: {
				users: {
					columns: {
						id: { type: "INT", primaryKey: true },
						name: { type: "VARCHAR", length: 100 },
						email: { type: "VARCHAR", length: 255 },
						age: { type: "TINYINT" },
						balance: { type: "DECIMAL", precision: 10, scale: 2 },
						is_active: { type: "BOOLEAN" },
						created_at: { type: "DATETIME" },
					},
				},
				products: {
					columns: {
						id: { type: "INT", primaryKey: true },
						name: { type: "VARCHAR", length: 200 },
						price: { type: "DECIMAL", precision: 8, scale: 2 },
						stock: { type: "INT" },
					},
				},
			},
		};
		validator = new SchemaValidator(schema);
	});

	describe("Table validation", () => {
		it("should validate existing table", () => {
			const ast = parse("SELECT * FROM users");
			const errors = validator.validate(ast);
			expect(errors).toHaveLength(0);
		});

		it("should reject non-existent table", () => {
			const ast = parse("SELECT * FROM nonexistent");
			const errors = validator.validate(ast);
			expect(errors).toHaveLength(1);
			expect(errors[0].type).toBe("UNKNOWN_TABLE");
			expect(errors[0].table).toBe("nonexistent");
			expect(errors[0].message).toContain("nonexistent");
		});
	});

	describe("Column validation", () => {
		it("should validate existing columns", () => {
			const ast = parse("SELECT id, name, email FROM users");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should reject non-existent column", () => {
			const ast = parse("SELECT id, invalid_column FROM users");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(1);
			expect(errors[0].type).toBe("UNKNOWN_COLUMN");
			expect(errors[0].column).toBe("invalid_column");
			expect(errors[0].table).toBe("users");
		});

		it("should allow SELECT *", () => {
			const ast = parse("SELECT * FROM users");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});
	});

	describe("WHERE clause validation", () => {
		it("should validate columns in WHERE clause", () => {
			const ast = parse("SELECT * FROM users WHERE age > 18");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should reject non-existent column in WHERE", () => {
			const ast = parse("SELECT * FROM users WHERE invalid_col > 18");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(1);
			expect(errors[0].type).toBe("UNKNOWN_COLUMN");
			expect(errors[0].column).toBe("invalid_col");
		});
	});

	describe("Type compatibility", () => {
		it("should allow numeric comparisons (INT vs DECIMAL)", () => {
			const ast = parse("SELECT * FROM users WHERE age > 18");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should allow numeric comparisons (TINYINT vs INT)", () => {
			const ast = parse("SELECT * FROM users WHERE age = 25");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should allow string comparisons", () => {
			const ast = parse("SELECT * FROM users WHERE name = 'John'");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should allow DATETIME comparisons", () => {
			// Note: This requires DATETIME literal support which we don't have yet
			// For now we test column to column comparison
			const ast = parse("SELECT * FROM users WHERE created_at = created_at");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should allow BOOLEAN equality comparisons", () => {
			const ast = parse("SELECT * FROM users WHERE is_active = is_active");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should reject type mismatch (string vs number)", () => {
			const ast = parse("SELECT * FROM users WHERE name > 18");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(1);
			expect(errors[0].type).toBe("TYPE_MISMATCH");
			expect(errors[0].message).toContain("VARCHAR");
			expect(errors[0].message).toContain("DECIMAL");
		});

		it("should reject type mismatch (number vs string)", () => {
			const ast = parse("SELECT * FROM users WHERE age = 'John'");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(1);
			expect(errors[0].type).toBe("TYPE_MISMATCH");
		});

		it("should reject type mismatch (BOOLEAN ordering)", () => {
			const ast = parse("SELECT * FROM users WHERE is_active > is_active");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(1);
			expect(errors[0].type).toBe("TYPE_MISMATCH");
		});
	});

	describe("Complex WHERE clauses", () => {
		it("should validate AND expression", () => {
			const ast = parse(
				"SELECT * FROM users WHERE age > 18 AND is_active = is_active",
			);
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should validate OR expression", () => {
			const ast = parse("SELECT * FROM users WHERE age < 18 OR age > 65");
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should validate parenthesized expressions", () => {
			const ast = parse(
				"SELECT * FROM users WHERE (age > 18 AND age < 65) OR is_active = is_active",
			);
			const errors = validator.validate(ast);

			expect(errors).toHaveLength(0);
		});

		it("should collect multiple errors", () => {
			const ast = parse(
				"SELECT invalid1, invalid2 FROM users WHERE invalid3 > 18",
			);
			const errors = validator.validate(ast);

			expect(errors.length).toBeGreaterThanOrEqual(3);
			expect(errors.filter((e) => e.type === "UNKNOWN_COLUMN")).toHaveLength(3);
		});
	});

	describe("Multiple tables", () => {
		it("should validate different tables", () => {
			const ast1 = parse("SELECT * FROM users");
			const errors1 = validator.validate(ast1);
			expect(errors1).toHaveLength(0);

			const ast2 = parse("SELECT * FROM products");
			const errors2 = validator.validate(ast2);
			expect(errors2).toHaveLength(0);
		});

		it("should not mix columns from different tables", () => {
			// This tests that validation is per-query
			const ast = parse("SELECT name FROM users");
			const errors = validator.validate(ast);
			expect(errors).toHaveLength(0);

			// products also has 'name' but this is a new query
			const ast2 = parse("SELECT price FROM users");
			const errors2 = validator.validate(ast2);
			expect(errors2).toHaveLength(1);
			expect(errors2[0].column).toBe("price");
		});
	});

	describe("Case-insensitive validation", () => {
		it("should validate table names case-insensitively", () => {
			const testCases = [
				"SELECT * FROM users",
				"SELECT * FROM USERS",
				"SELECT * FROM Users",
				"SELECT * FROM uSeRs",
			];

			for (const query of testCases) {
				const ast = parse(query);
				const errors = validator.validate(ast);
				expect(errors).toHaveLength(0);
			}
		});

		it("should validate column names case-insensitively", () => {
			const testCases = [
				"SELECT name FROM users",
				"SELECT NAME FROM users",
				"SELECT Name FROM users",
				"SELECT nAmE FROM users",
			];

			for (const query of testCases) {
				const ast = parse(query);
				const errors = validator.validate(ast);
				expect(errors).toHaveLength(0);
			}
		});

		it("should validate WHERE clause columns case-insensitively", () => {
			const testCases = [
				"SELECT * FROM users WHERE age > 18",
				"SELECT * FROM users WHERE AGE > 18",
				"SELECT * FROM users WHERE Age > 18",
				"SELECT * FROM users WHERE aGe > 18",
			];

			for (const query of testCases) {
				const ast = parse(query);
				const errors = validator.validate(ast);
				expect(errors).toHaveLength(0);
			}
		});

		it("should validate mixed case table and columns", () => {
			const ast = parse("SELECT NAME, EMAIL FROM USERS WHERE AGE > 18");
			const errors = validator.validate(ast);
			expect(errors).toHaveLength(0);
		});

		it("should reject invalid columns regardless of case", () => {
			const testCases = [
				"SELECT invalid FROM users",
				"SELECT INVALID FROM users",
				"SELECT Invalid FROM users",
			];

			for (const query of testCases) {
				const ast = parse(query);
				const errors = validator.validate(ast);
				expect(errors).toHaveLength(1);
				expect(errors[0].type).toBe("UNKNOWN_COLUMN");
			}
		});

		it("should reject invalid tables regardless of case", () => {
			const testCases = [
				"SELECT * FROM invalid",
				"SELECT * FROM INVALID",
				"SELECT * FROM Invalid",
			];

			for (const query of testCases) {
				const ast = parse(query);
				const errors = validator.validate(ast);
				expect(errors).toHaveLength(1);
				expect(errors[0].type).toBe("UNKNOWN_TABLE");
			}
		});
	});
});
