import { describe, expect, it } from "vitest";
import type { RelationalAlgebraNode } from "@/algebra/types";
import { pushDownSelections } from "./pushDownSelections";

describe(pushDownSelections.name, () => {
	it("should push selection through projection", () => {
		// Original: σ[age > 18](π[name, email](users))
		// Optimized: π[name, email](σ[age > 18](users))
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = pushDownSelections(input);

		// Check structure: Projection -> Selection -> Relation
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name", "email"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Selection");
		expect(projInput.condition).toBe("age > 18");

		const selInput = projInput.input;
		expect(selInput.type).toBe("Relation");
		expect(selInput.name).toBe("users");

		// Check that the rule was applied
		expect(result.appliedRules).toContain(
			"Push selection through projection: σ[c](π[a](R)) → π[a](σ[c](R))",
		);
	});

	it("should handle selection over relation (no optimization needed)", () => {
		// σ[age > 18](users) - already optimal
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Relation",
				name: "users",
			},
		};

		const result = pushDownSelections(input);

		// Structure should remain the same
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");
		expect((result.node as any).input.type).toBe("Relation");
		expect((result.node as any).input.name).toBe("users");

		// No rules should be applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle projection over selection (already optimal)", () => {
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

		const result = pushDownSelections(input);

		// Structure should remain the same
		expect(result.node.type).toBe("Projection");
		expect((result.node as any).attributes).toEqual(["name"]);

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Selection");
		expect(projInput.condition).toBe("age > 18");

		// No rules should be applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle selection over join", () => {
		// σ[condition](users ⨝ orders)
		const input: RelationalAlgebraNode = {
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
		};

		const result = pushDownSelections(input);

		// Should maintain structure (selection over join)
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");

		const selInput = (result.node as any).input;
		expect(selInput.type).toBe("Join");
		expect(selInput.condition).toBe("users.id = orders.user_id");
	});

	it("should handle complex nested structure", () => {
		// σ[age > 18](π[name, email](σ[status = 'active'](users)))
		// Should optimize to: π[name, email](σ[age > 18](σ[status = 'active'](users)))
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Selection",
					condition: "status = 'active'",
					input: {
						type: "Relation",
						name: "users",
					},
				},
			},
		};

		const result = pushDownSelections(input);

		// Should be: Projection -> Selection (age) -> Selection (status) -> Relation
		expect(result.node.type).toBe("Projection");

		const projInput = (result.node as any).input;
		expect(projInput.type).toBe("Selection");
		expect(projInput.condition).toBe("age > 18");

		const sel1Input = projInput.input;
		expect(sel1Input.type).toBe("Selection");
		expect(sel1Input.condition).toBe("status = 'active'");

		const sel2Input = sel1Input.input;
		expect(sel2Input.type).toBe("Relation");
		expect(sel2Input.name).toBe("users");

		// Check that optimization was applied
		expect(result.appliedRules.length).toBeGreaterThan(0);
	});

	it("should handle relation without any optimization", () => {
		// Base case: just a relation
		const input: RelationalAlgebraNode = {
			type: "Relation",
			name: "users",
		};

		const result = pushDownSelections(input);

		expect(result.node.type).toBe("Relation");
		expect((result.node as any).name).toBe("users");
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should push single selection to left side of join when it only references left relation", () => {
		// σ[users.age > 18](users ⨝[users.id = orders.user_id] orders)
		// Should become: σ[users.age > 18](users) ⨝[users.id = orders.user_id] orders
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.age > 18",
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
		};

		const result = pushDownSelections(input);

		// Result should be a Join with selection on left side
		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("users.id = orders.user_id");

		const leftSide = (result.node as any).left;
		expect(leftSide.type).toBe("Selection");
		expect(leftSide.condition).toBe("users.age > 18");
		expect(leftSide.input.type).toBe("Relation");
		expect(leftSide.input.name).toBe("users");

		const rightSide = (result.node as any).right;
		expect(rightSide.type).toBe("Relation");
		expect(rightSide.name).toBe("orders");

		expect(result.appliedRules.length).toBeGreaterThan(0);
		expect(result.appliedRules[0]).toContain("Push selection to left side of join");
	});

	it("should push single selection to right side of join when it only references right relation", () => {
		// σ[orders.total > 100](users ⨝[users.id = orders.user_id] orders)
		// Should become: users ⨝[users.id = orders.user_id] σ[orders.total > 100](orders)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "orders.total > 100",
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
		};

		const result = pushDownSelections(input);

		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("users.id = orders.user_id");

		const leftSide = (result.node as any).left;
		expect(leftSide.type).toBe("Relation");
		expect(leftSide.name).toBe("users");

		const rightSide = (result.node as any).right;
		expect(rightSide.type).toBe("Selection");
		expect(rightSide.condition).toBe("orders.total > 100");
		expect(rightSide.input.type).toBe("Relation");
		expect(rightSide.input.name).toBe("orders");

		expect(result.appliedRules.length).toBeGreaterThan(0);
		expect(result.appliedRules[0]).toContain("Push selection to right side of join");
	});

	it("should decompose compound AND condition and push each predicate to appropriate side", () => {
		// σ[users.age > 18 AND orders.total > 100](users ⨝[users.id = orders.user_id] orders)
		// Should become: σ[users.age > 18](users) ⨝[users.id = orders.user_id] σ[orders.total > 100](orders)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.age > 18 AND orders.total > 100",
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
		};

		const result = pushDownSelections(input);

		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("users.id = orders.user_id");

		const leftSide = (result.node as any).left;
		expect(leftSide.type).toBe("Selection");
		expect(leftSide.condition).toBe("users.age > 18");
		expect(leftSide.input.name).toBe("users");

		const rightSide = (result.node as any).right;
		expect(rightSide.type).toBe("Selection");
		expect(rightSide.condition).toBe("orders.total > 100");
		expect(rightSide.input.name).toBe("orders");

		expect(result.appliedRules.length).toBe(2);
		expect(result.appliedRules[0]).toContain("Decompose AND and push to left");
		expect(result.appliedRules[1]).toContain("Decompose AND and push to right");
	});

	it("should handle multiple joins with complex WHERE clause", () => {
		// σ[TB1.id > 300 AND TB3.sal != 0](TB1 ⨝[TB1.PK = TB2.FK] (TB2 ⨝[TB2.PK = TB3.FK] TB3))
		// Should push TB1.id > 300 to TB1 directly and TB3.sal != 0 to TB3 directly
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "TB1.id > 300 AND TB3.sal != 0",
			input: {
				type: "Join",
				condition: "TB1.PK = TB2.FK",
				left: {
					type: "Relation",
					name: "TB1",
				},
				right: {
					type: "Join",
					condition: "TB2.PK = TB3.FK",
					left: {
						type: "Relation",
						name: "TB2",
					},
					right: {
						type: "Relation",
						name: "TB3",
					},
				},
			},
		};

		const result = pushDownSelections(input);

		// Result should be: TB1.PK = TB2.FK join with:
		//   left: σ[TB1.id > 300](TB1)
		//   right: nested join (TB2.PK = TB3.FK) with σ[TB3.sal != 0](TB3) on the right
		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe("TB1.PK = TB2.FK");

		// Check left side has selection on TB1
		const leftSide = (result.node as any).left;
		expect(leftSide.type).toBe("Selection");
		expect(leftSide.condition).toBe("TB1.id > 300");
		expect(leftSide.input.type).toBe("Relation");
		expect(leftSide.input.name).toBe("TB1");

		// Check right side is a nested join
		const rightSide = (result.node as any).right;
		expect(rightSide.type).toBe("Join");
		expect(rightSide.condition).toBe("TB2.PK = TB3.FK");

		// The nested join should have TB2 on left and σ[TB3.sal != 0](TB3) on right
		expect(rightSide.left.type).toBe("Relation");
		expect(rightSide.left.name).toBe("TB2");

		expect(rightSide.right.type).toBe("Selection");
		expect(rightSide.right.condition).toBe("TB3.sal != 0");
		expect(rightSide.right.input.type).toBe("Relation");
		expect(rightSide.right.input.name).toBe("TB3");

		expect(result.appliedRules.length).toBeGreaterThan(0);
	});

	it("should keep predicate above join when it references both sides", () => {
		// σ[users.age > orders.quantity](users ⨝[users.id = orders.user_id] orders)
		// Predicate compares columns from both relations, must stay above join
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.age > orders.quantity",
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
		};

		const result = pushDownSelections(input);

		// Should remain as selection above join
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("users.age > orders.quantity");
		expect((result.node as any).input.type).toBe("Join");
	});

	it("should handle mixed predicates - some pushable, some not", () => {
		// σ[users.age > 18 AND users.name = orders.item](users ⨝ orders)
		// users.age > 18 can be pushed to left
		// users.name = orders.item references both, stays above
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "users.age > 18 AND users.name = orders.item",
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
		};

		const result = pushDownSelections(input);

		// Should be: σ[users.name = orders.item](σ[users.age > 18](users) ⨝ orders)
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("users.name = orders.item");

		const selInput = (result.node as any).input;
		expect(selInput.type).toBe("Join");

		const leftSide = selInput.left;
		expect(leftSide.type).toBe("Selection");
		expect(leftSide.condition).toBe("users.age > 18");

		expect(result.appliedRules.length).toBeGreaterThan(0);
	});
});
