import { describe, expect, it } from "vitest";
import type { RelationalAlgebraNode } from "../../algebra/types";
import { crossProductEliminationRule } from "./crossProductElimination";

describe("crossProductEliminationRule", () => {
	it("should leave simple relation unchanged", () => {
		const input: RelationalAlgebraNode = {
			type: "Relation",
			name: "users",
		};

		const result = crossProductEliminationRule.apply(input);
		expect(result).toEqual(input);
	});

	it("should convert cross product with join predicate to join", () => {
		// σ[users.id = orders.user_id](users × orders)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.id = orders.user_id",
			input: {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "users",
				},
				right: {
					type: "Relation",
					name: "orders",
				},
			},
		};

		const result = crossProductEliminationRule.apply(input);

		// Should convert to: users ⋈[id=user_id] orders
		expect(result.type).toBe("Join");
		if (result.type === "Join") {
			expect(result.condition).toBe("users.id = orders.user_id");
			expect(result.left.type).toBe("Relation");
			expect(result.right.type).toBe("Relation");
		}
	});

	it("should separate join predicates from filter predicates", () => {
		// σ[users.id = orders.user_id AND users.active = true](users × orders)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.id = orders.user_id AND users.active = true",
			input: {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "users",
				},
				right: {
					type: "Relation",
					name: "orders",
				},
			},
		};

		const result = crossProductEliminationRule.apply(input);

		// Should convert to: σ[users.active = true](users ⋈[id=user_id] orders)
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("users.active = true");
			expect(result.input.type).toBe("Join");
			if (result.input.type === "Join") {
				expect(result.input.condition).toBe("users.id = orders.user_id");
			}
		}
	});

	it("should handle multiple join predicates", () => {
		// σ[t1.a = t2.a AND t1.b = t2.b](t1 × t2)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "t1.a = t2.a AND t1.b = t2.b",
			input: {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "t1",
				},
				right: {
					type: "Relation",
					name: "t2",
				},
			},
		};

		const result = crossProductEliminationRule.apply(input);

		// Should convert to: t1 ⋈[a=a AND b=b] t2
		expect(result.type).toBe("Join");
		if (result.type === "Join") {
			expect(result.condition).toContain("t1.a = t2.a");
			expect(result.condition).toContain("t1.b = t2.b");
		}
	});

	it("should leave cross product without join predicate unchanged", () => {
		// σ[users.active = true](users × orders) - no join predicate
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.active = true",
			input: {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "users",
				},
				right: {
					type: "Relation",
					name: "orders",
				},
			},
		};

		const result = crossProductEliminationRule.apply(input);

		// Should remain as selection over cross product since no join predicate
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.input.type).toBe("CrossProduct");
		}
	});

	it("should optimize nested cross products", () => {
		// σ[t1.a = t2.a](π[*](t1 × t2))
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "t1.a = t2.a",
			input: {
				type: "Projection",
				attributes: ["*"],
				input: {
					type: "CrossProduct",
					left: {
						type: "Relation",
						name: "t1",
					},
					right: {
						type: "Relation",
						name: "t2",
					},
				},
			},
		};

		const result = crossProductEliminationRule.apply(input);

		// Projection should be preserved, cross product should be optimized recursively
		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.input.type).toBe("Projection");
		}
	});

	it("should optimize joins recursively", () => {
		const input: RelationalAlgebraNode = {
			type: "Join",
			condition: "a.id = b.id",
			left: {
				type: "Relation",
				name: "a",
			},
			right: {
				type: "Relation",
				name: "b",
			},
		};

		const result = crossProductEliminationRule.apply(input);

		// Should preserve join structure
		expect(result.type).toBe("Join");
		if (result.type === "Join") {
			expect(result.condition).toBe("a.id = b.id");
		}
	});
});
