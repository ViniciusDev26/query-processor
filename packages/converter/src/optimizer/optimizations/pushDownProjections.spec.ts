import { describe, expect, it } from "vitest";
import type { RelationalAlgebraNode } from "@/algebra/types";
import { pushDownProjections } from "./pushDownProjections";

describe(pushDownProjections.name, () => {
	it("should combine consecutive projections", () => {
		// Original: π[name, email](π[name, email, age](users))
		// Optimized: π[name, email](users)
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name", "email"],
			input: {
				type: "Projection",
				attributes: ["name", "email", "age"],
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = pushDownProjections(input);

		// Check structure: Projection -> Relation (inner projection removed)
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name", "email"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Relation");
		expect(projInput.name).toBe("users");

		// Check that the rule was applied
		expect(result.appliedRules).toContain(
			"Combine consecutive projections: π[a](π[b](R)) → π[a](R)",
		);
	});

	it("should handle multiple consecutive projections", () => {
		// Original: π[name](π[name, email](π[name, email, age, status](users)))
		// After one pass: π[name](π[name, email, age, status](users))
		// Note: Multiple consecutive projections require multiple optimization passes
		// Each pass collapses one level at a time
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Projection",
					attributes: ["name", "email", "age", "status"],
					input: {
						type: "Relation",
						name: "users",
					},
				},
			},
		};

		const result = pushDownProjections(input);

		// Should collapse at least the outer projection
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name"]);

		// Should have applied at least one rule
		expect(result.appliedRules.length).toBeGreaterThan(0);

		// The input should be simplified (fewer projections than before)
		const projInput = (result.node as any).input;
		// After optimization, should have at most one projection left, or direct relation
		expect(["Projection", "Relation"]).toContain(projInput.type);
	});

	it("should not modify projection over selection (already optimal)", () => {
		// π[name](σ[age > 18](users)) - already optimal
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = pushDownProjections(input);

		// Structure should remain the same
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Selection");
		expect(projInput.condition).toBe("age > 18");

		// No rules should be applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle projection over join", () => {
		// π[u.name, o.total](users ⨝ orders)
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["u.name", "o.total"],
			input: {
				type: "Join",
				condition: "u.id = o.user_id",
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

		const result = pushDownProjections(input);

		// Should maintain structure (projection over join)
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["u.name", "o.total"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Join");
		expect(projInput.condition).toBe("u.id = o.user_id");
	});

	it("should handle relation without any optimization", () => {
		// Base case: just a relation
		const input: RelationalAlgebraNode = {
			type: "Relation",
			name: "users",
		};

		const result = pushDownProjections(input);

		expect(result.node.type).toBe("Relation");
		expect((result.node as any).name).toBe("users");
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle single projection (already optimal)", () => {
		// π[name, email](users) - already optimal
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name", "email"],
			input: {
				type: "Relation",
				name: "users",
			},
		};

		const result = pushDownProjections(input);

		// Structure should remain the same
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name", "email"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Relation");
		expect(projInput.name).toBe("users");

		// No rules should be applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle complex nested structure with projections and selections", () => {
		// π[name](π[name, email](σ[age > 18](users)))
		// Should optimize to: π[name](σ[age > 18](users))
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Selection",
					condition: "age > 18",
					input: {
						type: "Relation",
						name: "users",
					},
				},
			},
		};

		const result = pushDownProjections(input);

		// Should be: Projection -> Selection -> Relation
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Selection");
		expect(projInput.condition).toBe("age > 18");

		const selInput = projInput.input;
		expect(selInput.type).toBe("Relation");
		expect(selInput.name).toBe("users");

		// Check that optimization was applied
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});

	it("should handle projection with wildcard", () => {
		// π[*](π[name, email](users))
		// Optimized: π[*](users)
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["*"],
			input: {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = pushDownProjections(input);

		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["*"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Relation");
		expect(projInput.name).toBe("users");

		// Rule should be applied
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});
});
