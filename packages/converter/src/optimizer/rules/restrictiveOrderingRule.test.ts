import { describe, expect, it } from "vitest";
import { restrictiveOrderingRule } from "./restrictiveOrderingRule";
import type { RelationalAlgebraNode } from "../../algebra/types";

describe("restrictiveOrderingRule", () => {
	it("should leave simple relation unchanged", () => {
		const input: RelationalAlgebraNode = {
			type: "Relation",
			name: "users",
		};

		const result = restrictiveOrderingRule.apply(input);
		expect(result).toEqual(input);
	});

	it("should leave single selection unchanged", () => {
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Relation",
				name: "users",
			},
		};

		const result = restrictiveOrderingRule.apply(input);
		expect(result).toEqual(input);
	});

	it("should reorder selections by selectivity - id equality more restrictive than inequality", () => {
		// σ[age > 18](σ[id = 123](R))
		// age > 18: selectivity ~0.5 (less restrictive)
		// id = 123: selectivity ~0.001 (very restrictive)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Selection",
				condition: "id = 123",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// Should keep id = 123 first (most restrictive)
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("id = 123");
			expect(result.input.type).toBe("Selection");
			if (result.input.type === "Selection") {
				expect(result.input.condition).toBe("age > 18");
			}
		}
	});

	it("should reorder selections by selectivity - equality more restrictive than LIKE", () => {
		// σ[name LIKE '%son'](σ[status = 'active'](R))
		// name LIKE '%son': selectivity ~0.8 (not very restrictive)
		// status = 'active': selectivity ~0.1 (restrictive)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "name LIKE '%son'",
			input: {
				type: "Selection",
				condition: "status = 'active'",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// Should keep status = 'active' first (more restrictive)
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("status = 'active'");
			expect(result.input.type).toBe("Selection");
			if (result.input.type === "Selection") {
				expect(result.input.condition).toBe("name LIKE '%son'");
			}
		}
	});

	it("should reorder three selections by selectivity", () => {
		// σ[age > 18](σ[name LIKE '%a%'](σ[id = 5](R)))
		// age > 18: 0.5
		// name LIKE '%a%': 0.8
		// id = 5: 0.001
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Selection",
				condition: "name LIKE '%a%'",
				input: {
					type: "Selection",
					condition: "id = 5",
					input: {
						type: "Relation",
						name: "users",
					},
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// Should be ordered: id = 5 (0.001), age > 18 (0.5), name LIKE (0.8)
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("id = 5");
			expect(result.input.type).toBe("Selection");
			if (result.input.type === "Selection") {
				expect(result.input.condition).toBe("age > 18");
				expect(result.input.input.type).toBe("Selection");
				if (result.input.input.type === "Selection") {
					expect(result.input.input.condition).toBe("name LIKE '%a%'");
				}
			}
		}
	});

	it("should handle BETWEEN condition", () => {
		// σ[age > 18](σ[age BETWEEN 20 AND 30](R))
		// age > 18: 0.5
		// age BETWEEN 20 AND 30: 0.3 (more restrictive)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Selection",
				condition: "age BETWEEN 20 AND 30",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// BETWEEN should come first (more restrictive)
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("age BETWEEN 20 AND 30");
		}
	});

	it("should handle IN operator", () => {
		// σ[age > 18](σ[status IN ('active', 'pending')](R))
		// age > 18: 0.5
		// status IN (...): ~0.1-0.2 (more restrictive)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Selection",
				condition: "status IN ('active', 'pending')",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// IN should come first (more restrictive)
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("status IN ('active', 'pending')");
		}
	});

	it("should optimize selections with projection on top", () => {
		// π[name](σ[age > 18](σ[id = 123](R)))
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Selection",
					condition: "id = 123",
					input: {
						type: "Relation",
						name: "users",
					},
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// Projection should remain on top, selections reordered below
		expect(result.type).toBe("Projection");
		if (result.type === "Projection") {
			expect(result.input.type).toBe("Selection");
			if (result.input.type === "Selection") {
				// Most restrictive selection should be first
				expect(result.input.condition).toBe("id = 123");
			}
		}
	});

	it("should optimize joins recursively", () => {
		const input: RelationalAlgebraNode = {
			type: "Join",
			condition: "users.id = orders.user_id",
			left: {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Selection",
					condition: "id = 123",
					input: {
						type: "Relation",
						name: "users",
					},
				},
			},
			right: {
				type: "Relation",
				name: "orders",
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// Join should be preserved, left side selections should be reordered
		expect(result.type).toBe("Join");
		if (result.type === "Join") {
			expect(result.left.type).toBe("Selection");
			if (result.left.type === "Selection") {
				// Most restrictive should be first
				expect(result.left.condition).toBe("id = 123");
			}
		}
	});

	it("should handle selections already in optimal order", () => {
		// σ[id = 123](σ[age > 18](R)) - already optimal
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "id = 123",
			input: {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// Should remain in the same order
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("id = 123");
			expect(result.input.type).toBe("Selection");
			if (result.input.type === "Selection") {
				expect(result.input.condition).toBe("age > 18");
			}
		}
	});

	it("should handle LIKE without leading wildcard", () => {
		// σ[name LIKE 'John%'](σ[age > 18](R))
		// name LIKE 'John%': 0.3 (more restrictive without leading wildcard)
		// age > 18: 0.5
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "name LIKE 'John%'",
			input: {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = restrictiveOrderingRule.apply(input);

		// LIKE without leading wildcard should come first
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("name LIKE 'John%'");
		}
	});
});
