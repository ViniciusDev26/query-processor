import { describe, expect, it } from "vitest";
import type { Projection, Relation, Selection, RelationalAlgebraNode } from "../../algebra/types";
import { projectionPushdownRule } from "./projectionPushdown";

describe("projectionPushdownRule", () => {
	it("should leave simple relation unchanged", () => {
		const input: RelationalAlgebraNode = {
			type: "Relation",
			name: "users",
		};

		const result = projectionPushdownRule.apply(input);
		expect(result).toEqual(input);
	});

	it("should merge consecutive projections", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Projection",
				attributes: ["name", "age", "email"],
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Projection;

		expect(result).toEqual({
			type: "Projection",
			attributes: ["name"],
			input: relation,
		});
	});

	it("should merge three consecutive projections", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Projection",
				attributes: ["name", "age"],
				input: {
					type: "Projection",
					attributes: ["name", "age", "email", "city"],
					input: relation,
				},
			},
		};

		const result = projectionPushdownRule.apply(input) as Projection;

		expect(result).toEqual({
			type: "Projection",
			attributes: ["name"],
			input: relation,
		});
	});

	it("should remove redundant wildcard projections", () => {
		const relation: Relation = {
			type: "Relation",
			name: "orders",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["*"],
			input: relation,
		};

		const result = projectionPushdownRule.apply(input);

		expect(result).toEqual(relation);
	});

	it("should remove empty attribute projections", () => {
		const relation: Relation = {
			type: "Relation",
			name: "products",
		};

		const input: Projection = {
			type: "Projection",
			attributes: [],
			input: relation,
		};

		const result = projectionPushdownRule.apply(input);

		expect(result).toEqual(relation);
	});

	it("should keep projection above selection (projection after filtering is more efficient)", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name", "age"],
			input: {
				type: "Selection",
				condition: "age > 18",
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input);

		// Projection should stay above selection - filter first, then project
		// This is more efficient: σ reduces rows, then π reduces columns
		expect(result.type).toBe("Projection");
		if (result.type === "Projection") {
			expect(result.attributes).toEqual(["name", "age"]);
			expect(result.input.type).toBe("Selection");
			if (result.input.type === "Selection") {
				expect(result.input.condition).toBe("age > 18");
				expect(result.input.input).toEqual(relation);
			}
		}
	});

	it("should keep projection above selection when attributes are missing", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Selection",
				condition: "age > 18",
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Projection;

		expect(result.type).toBe("Projection");
		if (result.type === "Projection") {
			expect(result.attributes).toEqual(["name"]);
			expect(result.input).toEqual({
				type: "Selection",
				condition: "age > 18",
				input: relation,
			});
		}
	});

	it("should ensure projection below selection keeps required attributes", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Selection = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Projection",
				attributes: ["name"],
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Selection;

		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("age > 18");
			expect(result.input.type).toBe("Projection");
			if (result.input.type === "Projection") {
				expect(result.input.attributes).toEqual(["name", "age"]);
				expect(result.input.input).toEqual(relation);
			}
		}
	});

	it("should handle qualified attribute names in selections", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Selection = {
			type: "Selection",
			condition: "users.age > 18 AND users.status = 'active'",
			input: {
				type: "Projection",
				attributes: ["users.name"],
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Selection;

		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.input.type).toBe("Projection");
			if (result.input.type === "Projection") {
				// Should add both 'age' and 'status' to projection
				expect(result.input.attributes).toContain("users.name");
				expect(result.input.attributes).toContain("users.age");
				expect(result.input.attributes).toContain("users.status");
			}
		}
	});

	it("should optimize joins recursively", () => {
		const input: RelationalAlgebraNode = {
			type: "Join",
			condition: "users.id = orders.user_id",
			left: {
				type: "Projection",
				attributes: ["*"],
				input: {
					type: "Relation",
					name: "users",
				},
			},
			right: {
				type: "Projection",
				attributes: ["*"],
				input: {
					type: "Relation",
					name: "orders",
				},
			},
		};

		const result = projectionPushdownRule.apply(input);

		// Wildcard projections should be eliminated
		expect(result.type).toBe("Join");
		if (result.type === "Join") {
			expect(result.left.type).toBe("Relation");
			expect(result.right.type).toBe("Relation");
			if (result.left.type === "Relation" && result.right.type === "Relation") {
				expect(result.left.name).toBe("users");
				expect(result.right.name).toBe("orders");
			}
		}
	});

	it("should optimize cross products recursively", () => {
		const input: RelationalAlgebraNode = {
			type: "CrossProduct",
			left: {
				type: "Projection",
				attributes: ["id", "name"],
				input: {
					type: "Projection",
					attributes: ["id", "name", "email"],
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

		const result = projectionPushdownRule.apply(input);

		// Consecutive projections on left should be merged
		expect(result.type).toBe("CrossProduct");
		if (result.type === "CrossProduct") {
			expect(result.left.type).toBe("Projection");
			if (result.left.type === "Projection") {
				expect(result.left.attributes).toEqual(["id", "name"]);
				expect(result.left.input.type).toBe("Relation");
			}
		}
	});

	it("should handle complex nested projections with joins", () => {
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name", "total"],
			input: {
				type: "Join",
				condition: "users.id = orders.user_id",
				left: {
					type: "Projection",
					attributes: ["*"],
					input: {
						type: "Relation",
						name: "users",
					},
				},
				right: {
					type: "Selection",
					condition: "total > 100",
					input: {
						type: "Projection",
						attributes: ["user_id", "total", "date"],
						input: {
							type: "Relation",
							name: "orders",
						},
					},
				},
			},
		};

		const result = projectionPushdownRule.apply(input);

		expect(result.type).toBe("Projection");
		if (result.type === "Projection") {
			expect(result.attributes).toEqual(["name", "total"]);
			expect(result.input.type).toBe("Join");
			if (result.input.type === "Join") {
				// Wildcard projection should be eliminated on left
				expect(result.input.left.type).toBe("Relation");
				// Selection on right should be optimized
				expect(result.input.right.type).toBe("Selection");
			}
		}
	});

	it("should handle projection with selection and multiple conditions", () => {
		const relation: Relation = {
			type: "Relation",
			name: "products",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name", "price", "category"],
			input: {
				type: "Selection",
				condition: "price > 100 AND category = 'electronics' AND stock > 0",
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input);

		// Projection cannot be pushed through selection because it doesn't include 'stock'
		// So it should remain a projection on top
		expect(result.type).toBe("Projection");
		if (result.type === "Projection") {
			expect(result.attributes).toEqual(["name", "price", "category"]);
			expect(result.input.type).toBe("Selection");
			if (result.input.type === "Selection") {
				expect(result.input.condition).toBe("price > 100 AND category = 'electronics' AND stock > 0");
			}
		}
	});

	it("should eliminate wildcard projection above selection", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["*"],
			input: {
				type: "Selection",
				condition: "age > 18",
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input);

		// Wildcard projection (π[*]) is redundant and should be eliminated
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("age > 18");
			expect(result.input).toEqual(relation);
		}
	});

	it("should normalize duplicate attributes in projection", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name", "age", "name", "email", "age"],
			input: relation,
		};

		const result = projectionPushdownRule.apply(input) as Projection;

		expect(result.type).toBe("Projection");
		if (result.type === "Projection") {
			// Duplicates should be removed
			expect(result.attributes).toEqual(["name", "age", "email"]);
		}
	});
});
