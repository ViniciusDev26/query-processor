import { describe, expect, it } from "vitest";
import { selectionPushdownRule } from "./selectionPushdown";
import type { RelationalAlgebraNode, Selection, Projection, Relation } from "../../algebra/types";

describe("selectionPushdownRule", () => {
	describe("metadata", () => {
		it("should have correct metadata", () => {
			expect(selectionPushdownRule.name).toBe("selection-pushdown");
			expect(selectionPushdownRule.category).toBe("heuristic");
			expect(selectionPushdownRule.description).toBeTruthy();
			expect(typeof selectionPushdownRule.apply).toBe("function");
		});
	});

	describe("apply", () => {
		it("should not modify a simple relation", () => {
			const relation: Relation = {
				type: "Relation",
				name: "users"
			};

			const result = selectionPushdownRule.apply(relation);

			expect(result).toEqual(relation);
		});

		it("should not modify selection on relation (already optimal)", () => {
			const query: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users"
				}
			};

			const result = selectionPushdownRule.apply(query);

			expect(result).toEqual(query);
		});

		it("should push selection below projection", () => {
			// Input: σ[age > 18](π[name, age](users))
			// Expected: π[name, age](σ[age > 18](users))
			const query: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Projection",
					attributes: ["name", "age"],
					input: {
						type: "Relation",
						name: "users"
					}
				}
			};

			const result = selectionPushdownRule.apply(query);

			// Result should be a Projection
			expect(result.type).toBe("Projection");

			if (result.type === "Projection") {
				expect(result.attributes).toEqual(["name", "age"]);

				// Under the projection should be a Selection
				expect(result.input.type).toBe("Selection");

				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("age > 18");

					// Under the selection should be the Relation
					expect(result.input.input).toEqual({
						type: "Relation",
						name: "users"
					});
				}
			}
		});

		it("should handle nested projections correctly", () => {
			// Input: σ[condition](π[a, b](π[a, b, c](R)))
			// Expected: π[a, b](π[a, b, c](σ[condition](R)))
			const query: Selection = {
				type: "Selection",
				condition: "a > 10",
				input: {
					type: "Projection",
					attributes: ["a", "b"],
					input: {
						type: "Projection",
						attributes: ["a", "b", "c"],
						input: {
							type: "Relation",
							name: "table1"
						}
					}
				}
			};

			const result = selectionPushdownRule.apply(query);

			// The outer structure should be Projection
			expect(result.type).toBe("Projection");

			if (result.type === "Projection") {
				expect(result.attributes).toEqual(["a", "b"]);

				// Below should be Selection (pushed down)
				expect(result.input.type).toBe("Selection");

				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("a > 10");

					// And below selection should be the inner Projection
					expect(result.input.input.type).toBe("Projection");

					if (result.input.input.type === "Projection") {
						expect(result.input.input.attributes).toEqual(["a", "b", "c"]);
						expect(result.input.input.input).toEqual({
							type: "Relation",
							name: "table1"
						});
					}
				}
			}
		});

		it("should keep consecutive selections together", () => {
			// Input: σ[age > 18](σ[city = 'NY'](users))
			// Expected: No change (already optimal - both at the bottom)
			const query: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Selection",
					condition: "city = 'NY'",
					input: {
						type: "Relation",
						name: "users"
					}
				}
			};

			const result = selectionPushdownRule.apply(query);

			// Should maintain the same structure
			expect(result.type).toBe("Selection");
			if (result.type === "Selection") {
				expect(result.condition).toBe("age > 18");
				expect(result.input.type).toBe("Selection");

				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("city = 'NY'");
					expect(result.input.input).toEqual({
						type: "Relation",
						name: "users"
					});
				}
			}
		});

		it("should push selection through multiple projections", () => {
			// Input: σ[cond](π[x](π[x, y](R)))
			// Expected: π[x](π[x, y](σ[cond](R)))
			const query: Selection = {
				type: "Selection",
				condition: "x > 5",
				input: {
					type: "Projection",
					attributes: ["x"],
					input: {
						type: "Projection",
						attributes: ["x", "y"],
						input: {
							type: "Relation",
							name: "data"
						}
					}
				}
			};

			const result = selectionPushdownRule.apply(query);

			// Outer: Projection[x]
			expect(result.type).toBe("Projection");
			if (result.type === "Projection") {
				expect(result.attributes).toEqual(["x"]);

				// Next: Selection pushed below first projection
				expect(result.input.type).toBe("Selection");
				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("x > 5");

					// Next: Inner projection
					expect(result.input.input.type).toBe("Projection");
					if (result.input.input.type === "Projection") {
						expect(result.input.input.attributes).toEqual(["x", "y"]);
						expect(result.input.input.input).toEqual({
							type: "Relation",
							name: "data"
						});
					}
				}
			}
		});

		it("should not modify projection without selections", () => {
			const query: Projection = {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Relation",
					name: "users"
				}
			};

			const result = selectionPushdownRule.apply(query);

			expect(result).toEqual(query);
		});

		it("should handle complex condition strings", () => {
			const query: Selection = {
				type: "Selection",
				condition: "age > 18 AND city = 'NY' OR status = 'active'",
				input: {
					type: "Projection",
					attributes: ["*"],
					input: {
						type: "Relation",
						name: "users"
					}
				}
			};

			const result = selectionPushdownRule.apply(query);

			expect(result.type).toBe("Projection");
			if (result.type === "Projection") {
				expect(result.input.type).toBe("Selection");
				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("age > 18 AND city = 'NY' OR status = 'active'");
				}
			}
		});

		it("should push selection below projection with star attributes", () => {
			const query: Selection = {
				type: "Selection",
				condition: "status = 'active'",
				input: {
					type: "Projection",
					attributes: ["*"],
					input: {
						type: "Relation",
						name: "products"
					}
				}
			};

			const result = selectionPushdownRule.apply(query);

			expect(result.type).toBe("Projection");
			if (result.type === "Projection") {
				expect(result.attributes).toEqual(["*"]);
				expect(result.input.type).toBe("Selection");
				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("status = 'active'");
					expect(result.input.input).toEqual({
						type: "Relation",
						name: "products"
					});
				}
			}
		});
	});

	describe("edge cases", () => {
		it("should handle empty projection attributes", () => {
			const query: Selection = {
				type: "Selection",
				condition: "id > 0",
				input: {
					type: "Projection",
					attributes: [],
					input: {
						type: "Relation",
						name: "items"
					}
				}
			};

			const result = selectionPushdownRule.apply(query);

			expect(result.type).toBe("Projection");
			if (result.type === "Projection") {
				expect(result.attributes).toEqual([]);
				expect(result.input.type).toBe("Selection");
			}
		});
	});
});
