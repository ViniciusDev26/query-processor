import { describe, expect, it } from "vitest";
import type { RelationalAlgebraNode } from "@/algebra/types";
import { avoidCartesianProduct } from "./avoidCartesianProduct";

describe(avoidCartesianProduct.name, () => {
	it("should convert cross product with selection to join", () => {
		// Original: σ[users.id = orders.user_id](users × orders)
		// Optimized: users ⨝[users.id = orders.user_id] orders
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

		const result = avoidCartesianProduct(input);

		// Should be converted to a join
		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("users.id = orders.user_id");

		const left = (result.node as any).left;
		const right = (result.node as any).right;
		expect(left.type).toBe("Relation");
		expect(left.name).toBe("users");
		expect(right.type).toBe("Relation");
		expect(right.name).toBe("orders");

		// Rule should be applied
		expect(result.appliedRules.length).toBeGreaterThan(0);
		expect(result.appliedRules[0]).toContain("Convert Cartesian product to join");
	});

	it("should handle multiple relations in cross product", () => {
		// σ[R.a = S.b](R × S)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "R.a = S.b",
			input: {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "R",
				},
				right: {
					type: "Relation",
					name: "S",
				},
			},
		};

		const result = avoidCartesianProduct(input);

		// Should be converted to join
		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("R.a = S.b");
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});

	it("should not convert when condition doesn't involve both relations", () => {
		// σ[users.age > 18](users × orders)
		// Condition only involves 'users', not a join condition
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.age > 18",
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

		const result = avoidCartesianProduct(input);

		// Should remain as selection over cross product
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("users.age > 18");
		expect((result.node as any).input.type).toBe("CrossProduct");

		// No rules should be applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle cross product without selection", () => {
		// R × S (no selection above)
		const input: RelationalAlgebraNode = {
			type: "CrossProduct",
			left: {
				type: "Relation",
				name: "R",
			},
			right: {
				type: "Relation",
				name: "S",
			},
		};

		const result = avoidCartesianProduct(input);

		// Should remain as cross product (no optimization possible)
		expect(result.node.type).toBe("CrossProduct");
		expect((result.node as any).left.name).toBe("R");
		expect((result.node as any).right.name).toBe("S");

		// No rules applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle join operations (already optimized)", () => {
		// users ⨝[users.id = orders.user_id] orders
		const input: RelationalAlgebraNode = {
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

		const result = avoidCartesianProduct(input);

		// Should remain as join
		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("users.id = orders.user_id");

		// No rules applied (already optimal)
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle nested cross products", () => {
		// σ[A.x = C.z]((A × B) × C)
		// The condition involves A (in left subtree) and C (in right)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "A.x = C.z",
			input: {
				type: "CrossProduct",
				left: {
					type: "CrossProduct",
					left: {
						type: "Relation",
						name: "A",
					},
					right: {
						type: "Relation",
						name: "B",
					},
				},
				right: {
					type: "Relation",
					name: "C",
				},
			},
		};

		const result = avoidCartesianProduct(input);

		// The outer cross product should be converted to join
		// because the condition involves relations from both sides (A from left, C from right)
		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("A.x = C.z");
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});

	it("should handle projection over cross product", () => {
		// π[name](R × S)
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "R",
				},
				right: {
					type: "Relation",
					name: "S",
				},
			},
		};

		const result = avoidCartesianProduct(input);

		// Should remain as projection over cross product
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).input.type).toBe("CrossProduct");

		// No optimization (no selection to convert)
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle selection over projection over cross product", () => {
		// σ[R.a = S.b](π[a, b](R × S))
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "R.a = S.b",
			input: {
				type: "Projection",
				attributes: ["a", "b"],
				input: {
					type: "CrossProduct",
					left: {
						type: "Relation",
						name: "R",
					},
					right: {
						type: "Relation",
						name: "S",
					},
				},
			},
		};

		const result = avoidCartesianProduct(input);

		// Selection should remain, but cross product inside projection should stay
		// (This heuristic only converts when selection is directly above cross product)
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).input.type).toBe("Projection");

		// No direct conversion in this case
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle single relation (no cross product)", () => {
		// Just a relation
		const input: RelationalAlgebraNode = {
			type: "Relation",
			name: "users",
		};

		const result = avoidCartesianProduct(input);

		expect(result.node.type).toBe("Relation");
		expect((result.node as any).name).toBe("users");
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle complex join conditions", () => {
		// σ[employees.dept_id = departments.id AND employees.manager_id = managers.id]
		// (employees × departments)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition:
				"employees.dept_id = departments.id AND employees.manager_id = managers.id",
			input: {
				type: "CrossProduct",
				left: {
					type: "Relation",
					name: "employees",
				},
				right: {
					type: "Relation",
					name: "departments",
				},
			},
		};

		const result = avoidCartesianProduct(input);

		// Should convert to join (condition involves both employees and departments)
		expect(result.node.type).toBe("Join");
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});
});
