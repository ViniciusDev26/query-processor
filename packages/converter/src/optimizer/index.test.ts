import { describe, expect, it } from "vitest";
import { optimizeQuery, algebraToString, explainOptimization } from "./index";
import type { RelationalAlgebraNode, Selection, Projection, Relation } from "../algebra/types";

describe("Optimizer", () => {
	describe("optimizeQuery", () => {
		it("should keep a simple relation unchanged", () => {
			const relation: Relation = {
				type: "Relation",
				name: "users"
			};

			const result = optimizeQuery(relation);

			expect(result).toEqual(relation);
		});

		it("should keep selection on relation unchanged (already optimal)", () => {
			const query: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users"
				}
			};

			const result = optimizeQuery(query);

			expect(result).toEqual(query);
		});

		it("should move projection above selection for efficient execution", () => {
			// Original (inefficient): σ[age > 18](π[name, age](users))
			// This processes all columns through selection, then projects
			// Optimized (efficient): π[name, age](σ[age > 18](users))
			// This filters rows first, then projects only needed columns
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

			const result = optimizeQuery(query);

			// Selection pushdown moves selection closer to relation
			// Result should be: Projection -> Selection -> Relation
			expect(result.type).toBe("Projection");
			if (result.type === "Projection") {
				expect(result.attributes).toEqual(["name", "age"]);
				expect(result.input.type).toBe("Selection");
				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("age > 18");
					expect(result.input.input).toEqual({
						type: "Relation",
						name: "users"
					});
				}
			}
		});

		it("should reorder consecutive selections by selectivity", () => {
			// σ[age > 18](σ[name = 'John'](users))
			// Should remain the same (both selections pushed down to relation)
			const query: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Selection",
					condition: "name = 'John'",
					input: {
						type: "Relation",
						name: "users"
					}
				}
			};

			const result = optimizeQuery(query);

			expect(result.type).toBe("Selection");
			if (result.type === "Selection") {
				expect(result.condition).toBe("name = 'John'");
				expect(result.input.type).toBe("Selection");
				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("age > 18");
					expect(result.input.input).toEqual({
						type: "Relation",
						name: "users"
					});
				}
			}
		});

		it("should reorder selections by estimated selectivity", () => {
			// σ[age > 18](σ[id = 123](users)) → σ[id = 123](σ[age > 18](users))
			const query: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Selection",
					condition: "id = 123",
					input: {
						type: "Relation",
						name: "users"
					}
				}
			};

			const result = optimizeQuery(query);

			expect(result.type).toBe("Selection");
			if (result.type === "Selection") {
				expect(result.condition).toBe("id = 123");
				expect(result.input.type).toBe("Selection");
				if (result.input.type === "Selection") {
					expect(result.input.condition).toBe("age > 18");
					expect(result.input.input).toEqual({
						type: "Relation",
						name: "users"
					});
				}
			}
		});

		it("should reflect selection pushdown in algebra string", () => {
			// Original: σ[age > 18](π[name, age](users))
			// Optimized after selection pushdown: π[name, age](σ[age > 18](users))
			const query: RelationalAlgebraNode = {
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

			const optimized = optimizeQuery(query);
			const optimizedStr = algebraToString(optimized);

			// Selection pushdown moves selection closer to relation
			expect(optimizedStr).toBe("π[name, age](σ[age > 18](users))");
		});

		it("should handle projection without selections", () => {
			const query: Projection = {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Relation",
					name: "users"
				}
			};

			const result = optimizeQuery(query);

			expect(result).toEqual(query);
		});
	});

	describe("algebraToString", () => {
		it("should convert relation to string", () => {
			const relation: Relation = {
				type: "Relation",
				name: "users"
			};

			expect(algebraToString(relation)).toBe("users");
		});

		it("should convert selection to string", () => {
			const selection: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users"
				}
			};

			expect(algebraToString(selection)).toBe("σ[age > 18](users)");
		});

		it("should convert projection to string", () => {
			const projection: Projection = {
				type: "Projection",
				attributes: ["name", "age"],
				input: {
					type: "Relation",
					name: "users"
				}
			};

			expect(algebraToString(projection)).toBe("π[name, age](users)");
		});

		it("should convert projection with * to string", () => {
			const projection: Projection = {
				type: "Projection",
				attributes: ["*"],
				input: {
					type: "Relation",
					name: "users"
				}
			};

			expect(algebraToString(projection)).toBe("π[*](users)");
		});

		it("should convert complex nested expression to string", () => {
			const query: Projection = {
				type: "Projection",
				attributes: ["name"],
				input: {
					type: "Selection",
					condition: "age > 18",
					input: {
						type: "Relation",
						name: "users"
					}
				}
			};

			expect(algebraToString(query)).toBe("π[name](σ[age > 18](users))");
		});
	});

	describe("explainOptimization", () => {
		it("should indicate no optimization when query is optimal", () => {
			const query: Selection = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users"
				}
			};

			const optimized = optimizeQuery(query);
			const explanation = explainOptimization(query, optimized);

			expect(explanation).toContain("No optimization needed");
		});

		it("should explain projection pushdown optimization", () => {
			const original: Projection = {
				type: "Projection",
				attributes: ["name"],
				input: {
					type: "Projection",
					attributes: ["name", "age"],
					input: {
						type: "Relation",
						name: "users"
					}
				}
			};

			const optimized = optimizeQuery(original);
			const explanation = explainOptimization(original, optimized);

			expect(explanation).toContain("Original:");
			expect(explanation).toContain("Optimized:");
			expect(explanation).toContain("projection-pushdown");
			expect(explanation).toContain("π[name](π[name, age](users))");
			expect(explanation).toContain("π[name](users)");
		});
	});
});
