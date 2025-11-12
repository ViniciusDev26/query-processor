import { describe, expect, it } from "vitest";
import { ASTToAlgebraTranslator } from "./ASTToAlgebraTranslator";
import type { SelectStatement } from "../ast/types";

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
});
