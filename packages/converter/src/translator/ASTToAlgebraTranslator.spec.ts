import { describe, expect, it } from "vitest";
import { ASTToAlgebraTranslator, translationResultToString } from "./ASTToAlgebraTranslator";
import type { SelectStatement } from "../ast/types";
import type { RelationalAlgebraNode } from "../algebra/types";

describe("ASTToAlgebraTranslator", () => {
	const translator = new ASTToAlgebraTranslator();

	describe("translate", () => {
		it("should translate simple SELECT * query", () => {
			const ast: SelectStatement = {
				type: "SelectStatement",
				columns: [{ type: "StarColumn" }],
				from: {
					type: "FromClause",
					source: {
						type: "TableSource",
						table: "users",
					},
				},
			};

			const result = translator.translate(ast);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.algebra).toEqual({
					type: "Projection",
					attributes: ["*"],
					input: {
						type: "Relation",
						name: "users",
					},
				});
			}
		});

		it("should translate CROSS JOIN query", () => {
			const ast: SelectStatement = {
				type: "SelectStatement",
				columns: [
					{
						type: "NamedColumn",
						name: "users.name",
					},
					{
						type: "NamedColumn",
						name: "products.title",
					},
				],
				from: {
					type: "FromClause",
					source: {
						type: "TableSource",
						table: "users",
					},
				},
				joins: [
					{
						type: "JoinClause",
						joinType: "CROSS",
						table: "products",
					},
				],
			};

			const result = translator.translate(ast);

			expect(result.success).toBe(true);
			if (result.success) {
				// Should create a CrossProduct node
				expect(result.algebra).toEqual({
					type: "Projection",
					attributes: ["users.name", "products.title"],
					input: {
						type: "CrossProduct",
						left: {
							type: "Relation",
							name: "users",
						},
						right: {
							type: "Relation",
							name: "products",
						},
					},
				});
			}
		});

		it("should translate INNER JOIN query", () => {
			const ast: SelectStatement = {
				type: "SelectStatement",
				columns: [
					{
						type: "NamedColumn",
						name: "users.name",
					},
					{
						type: "NamedColumn",
						name: "orders.total",
					},
				],
				from: {
					type: "FromClause",
					source: {
						type: "TableSource",
						table: "users",
					},
				},
				joins: [
					{
						type: "JoinClause",
						joinType: "INNER",
						table: "orders",
						on: {
							type: "BinaryExpression",
							operator: "=",
							left: {
								type: "ColumnReference",
								name: "users.id",
							},
							right: {
								type: "ColumnReference",
								name: "orders.user_id",
							},
						},
					},
				],
			};

			const result = translator.translate(ast);

			expect(result.success).toBe(true);
			if (result.success) {
				// Should create a Join node (not CrossProduct)
				expect(result.algebra.type).toBe("Projection");
				expect(result.algebra).toHaveProperty("input");
				if (result.algebra.type === "Projection") {
					expect(result.algebra.input.type).toBe("Join");
				}
			}
		});
	});

	describe("algebraToString - Theoretical Notation", () => {
		it("should use correct notation for Selection: σ[condition](R)", () => {
			const node: RelationalAlgebraNode = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users",
				},
			};

			const result = translator.algebraToString(node);

			// Should use σ[condition](R) format
			expect(result).toBe("σ[age > 18](users)");
			// Should NOT have space between σ and [
			expect(result).not.toContain("σ [");
		});

		it("should use correct notation for Projection: π[attrs](R)", () => {
			const node: RelationalAlgebraNode = {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Relation",
					name: "users",
				},
			};

			const result = translator.algebraToString(node);

			// Should use π[attrs](R) format
			expect(result).toBe("π[name, email](users)");
			// Should NOT have space between π and [
			expect(result).not.toContain("π [");
		});

		it("should use correct infix notation for Join: R ⨝[condition] S", () => {
			const node: RelationalAlgebraNode = {
				type: "Join",
				condition: "users.id = orders.user_id",
				left: {
					type: "Relation",
					name: "users",
				},
				right: {
					type: "Relation",
					name: "orders",
				},
			};

			const result = translator.algebraToString(node);

			// Should use infix notation: R ⨝[condition] S
			expect(result).toBe("users ⨝[users.id = orders.user_id] orders");
			// Should NOT use function notation: ⨝[condition](R, S)
			expect(result).not.toContain("⨝[users.id = orders.user_id](");
		});

		it("should use correct infix notation for CrossProduct: R × S", () => {
			const node: RelationalAlgebraNode = {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "users",
				},
				right: {
					type: "Relation",
					name: "products",
				},
			};

			const result = translator.algebraToString(node);

			// Should use infix notation: R × S
			expect(result).toBe("users × products");
			// Should NOT use function notation or unnecessary parentheses
			expect(result).not.toContain("×(");
		});

		it("should handle complex nested expressions correctly", () => {
			// π[name](σ[age > 18](users ⨝[users.id = orders.user_id] orders))
			const node: RelationalAlgebraNode = {
				type: "Projection",
				attributes: ["name"],
				input: {
					type: "Selection",
					condition: "age > 18",
					input: {
						type: "Join",
						condition: "users.id = orders.user_id",
						left: {
							type: "Relation",
							name: "users",
						},
						right: {
							type: "Relation",
							name: "orders",
						},
					},
				},
			};

			const result = translator.algebraToString(node);

			// Should use proper theoretical notation throughout
			expect(result).toBe("π[name](σ[age > 18](users ⨝[users.id = orders.user_id] orders))");
			// Verify no spaces between operators and brackets
			expect(result).not.toMatch(/[πσ⨝] \[/);
		});

		it("should handle translationResultToString correctly", () => {
			const algebra: RelationalAlgebraNode = {
				type: "Projection",
				attributes: ["*"],
				input: {
					type: "Relation",
					name: "users",
				},
			};

			const result = translationResultToString({ success: true, algebra });

			expect(result).toBe("π[*](users)");
		});

		it("should handle error results in translationResultToString", () => {
			const result = translationResultToString({
				success: false,
				error: "Parse error",
				details: ["Missing FROM clause"],
			});

			expect(result).toContain("Error: Parse error");
			expect(result).toContain("Missing FROM clause");
		});
	});
});
