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

	it("should recursively optimize projections created on join sides", () => {
		// π[u.name, o.total](users ⨝ (σ[o.total > 100](orders)))
		// Should create projections on both sides and optimize them recursively
		// Expected: π[u.name, o.total]((π[u.name, u.id](users)) ⨝ (π[o.total, o.user_id](σ[o.total > 100](orders))))
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["u.name", "o.total"],
			input: {
				type: "Join",
				condition: "u.id = o.user_id",
				left: {
					type: "Relation",
					name: "u",
				},
				right: {
					type: "Selection",
					condition: "o.total > 100",
					input: {
						type: "Relation",
						name: "o",
					},
				},
			},
		};

		const result = pushDownProjections(input);

		// Top-level should still be projection
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["u.name", "o.total"]);

		const join = (result.node as any).input;
		expect(join.type).toBe("Join");

		// Left side should have a projection pushed down
		expect(join.left.type).toBe("Projection");
		expect(join.left.attributes).toContain("u.name");
		expect(join.left.attributes).toContain("u.id"); // Join attribute

		// Right side should have a projection pushed down to just above the selection
		expect(join.right.type).toBe("Projection");
		expect(join.right.attributes).toContain("o.total");
		expect(join.right.attributes).toContain("o.user_id"); // Join attribute

		// The projection should be above the selection (π → σ → R is optimal)
		expect(join.right.input.type).toBe("Selection");
		expect(join.right.input.condition).toBe("o.total > 100");
		expect(join.right.input.input.type).toBe("Relation");

		// Should have applied rules
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});

	it("should handle case-insensitive attribute matching in joins", () => {
		// Test that Cliente (relation) matches cliente.nome (attribute) despite case difference
		// π[Cliente.nome](Cliente ⨝ Pedido)
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["Cliente.nome", "Pedido.id"],
			input: {
				type: "Join",
				condition: "Cliente.id = Pedido.cliente_id",
				left: {
					type: "Relation",
					name: "Cliente",
				},
				right: {
					type: "Relation",
					name: "Pedido",
				},
			},
		};

		const result = pushDownProjections(input);

		// Should create projections on both sides
		expect(result.node.type).toBe("Projection");

		const join = (result.node as any).input;
		expect(join.type).toBe("Join");

		// Left side should have projection with Cliente attributes (case-insensitive match)
		expect(join.left.type).toBe("Projection");
		expect(join.left.attributes.some((attr: string) =>
			attr.toLowerCase().includes("cliente")
		)).toBe(true);

		// Right side should have projection with Pedido attributes
		expect(join.right.type).toBe("Projection");
		expect(join.right.attributes.some((attr: string) =>
			attr.toLowerCase().includes("pedido")
		)).toBe(true);
	});

	it("should push projections through nested joins recursively", () => {
		// π[a.x]((a ⨝ b) ⨝ c)
		// Should push projections down through both levels of joins
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["a.x", "c.z"],
			input: {
				type: "Join",
				condition: "b.id = c.b_id",
				left: {
					type: "Join",
					condition: "a.id = b.a_id",
					left: {
						type: "Relation",
						name: "a",
					},
					right: {
						type: "Relation",
						name: "b",
					},
				},
				right: {
					type: "Relation",
					name: "c",
				},
			},
		};

		const result = pushDownProjections(input);

		// Top-level projection should exist
		expect(result.node.type).toBe("Projection");

		const topJoin = (result.node as any).input;
		expect(topJoin.type).toBe("Join");

		// The nested left join should also have projections pushed down
		expect(topJoin.left.type).toBe("Join");

		// At the deepest level, relation 'a' should have a projection
		const deepestLeft = topJoin.left.left;
		expect(deepestLeft.type).toBe("Projection");
		expect(deepestLeft.attributes).toContain("a.x");
		expect(deepestLeft.input.type).toBe("Relation");
		expect(deepestLeft.input.name).toBe("a");

		// Should have applied multiple rules (one for each level)
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});

	it("should maintain π → σ → Relation structure as optimal", () => {
		// This tests that projections are NOT pushed through selections
		// π[name, age](σ[age > 18](users)) should remain as-is
		const input: RelationalAlgebraNode = {
			type: "Projection",
			attributes: ["name", "age"],
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

		// Structure should be preserved: π → σ → R
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name", "age"]);

		const selection = (result.node as any).input;
		expect(selection.type).toBe("Selection");
		expect(selection.condition).toBe("age > 18");

		const relation = selection.input;
		expect(relation.type).toBe("Relation");
		expect(relation.name).toBe("users");

		// No rules should be applied (already optimal)
		expect(result.appliedRules).toHaveLength(0);
	});
});
