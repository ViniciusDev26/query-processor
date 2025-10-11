import { describe, expect, it } from "vitest";
import type { RelationalAlgebraNode } from "@/algebra/types";
import { applyMostRestrictiveFirst } from "./applyMostRestrictiveFirst";

describe(applyMostRestrictiveFirst.name, () => {
	it("should reorder selections by restrictiveness (equality before range)", () => {
		// Original: σ[age > 18](σ[status = 'active'](users))
		// Optimized: σ[age > 18](σ[status = 'active'](users)) - already optimal
		// (equality is more restrictive, so it should stay closer to data)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Selection",
				condition: "status = 'active'",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = applyMostRestrictiveFirst(input);

		// Structure should remain the same (already optimal)
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");

		const innerSelection = (result.node as any).input;
		expect(innerSelection.type).toBe("Selection");
		expect(innerSelection.condition).toBe("status = 'active'");

		// No rules should be applied (already optimal)
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should swap selections when outer is more restrictive", () => {
		// Original: σ[status = 'active'](σ[age > 18](users))
		// Optimized: σ[age > 18](σ[status = 'active'](users))
		// Equality is more restrictive than range, should be applied first
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "status = 'active'",
			input: {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = applyMostRestrictiveFirst(input);

		// Selections should be swapped
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");

		const innerSelection = (result.node as any).input;
		expect(innerSelection.type).toBe("Selection");
		expect(innerSelection.condition).toBe("status = 'active'");

		const relation = innerSelection.input;
		expect(relation.type).toBe("Relation");
		expect(relation.name).toBe("users");

		// Rule should be applied
		expect(result.appliedRules.length).toBeGreaterThan(0);
		expect(result.appliedRules[0]).toContain("more restrictive");
	});

	it("should handle single selection (no reordering needed)", () => {
		// Single selection - nothing to reorder
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Relation",
				name: "users",
			},
		};

		const result = applyMostRestrictiveFirst(input);

		// Structure should remain the same
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");
		expect((result.node as any).input.type).toBe("Relation");

		// No rules should be applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle AND conditions as more restrictive", () => {
		// Original: σ[age > 18](σ[age > 18 AND status = 'active'](users))
		// The AND condition is more restrictive, should stay closer to data
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Selection",
				condition: "age > 18 AND status = 'active'",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = applyMostRestrictiveFirst(input);

		// Should remain in same order (AND condition is already more restrictive)
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");

		const innerSelection = (result.node as any).input;
		expect(innerSelection.type).toBe("Selection");
		expect(innerSelection.condition).toBe("age > 18 AND status = 'active'");

		// No reordering needed
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle OR conditions as less restrictive", () => {
		// Original: σ[age > 18 OR age < 5](σ[status = 'active'](users))
		// OR is less restrictive, equality should be applied first
		// Already optimal - no swap needed
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18 OR age < 5",
			input: {
				type: "Selection",
				condition: "status = 'active'",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = applyMostRestrictiveFirst(input);

		// Should remain the same (equality is already closer to data)
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18 OR age < 5");

		const innerSelection = (result.node as any).input;
		expect(innerSelection.condition).toBe("status = 'active'");

		// No rules should be applied (already optimal)
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle selection over projection", () => {
		// Selection over projection - no reordering with projection
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Projection",
				attributes: ["name", "age"],
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const result = applyMostRestrictiveFirst(input);

		// Structure should remain the same
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");
		expect((result.node as any).input.type).toBe("Projection");

		// No rules applied
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle join operations", () => {
		// Join operations should be optimized recursively
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

		const result = applyMostRestrictiveFirst(input);

		// Structure should remain the same
		expect(result.node.type).toBe("Join");
		expect((result.node as any).condition).toBe(
			"users.id = orders.user_id",
		);

		// No rules applied (no selections to reorder)
		expect(result.appliedRules).toHaveLength(0);
	});

	it("should handle complex nested selections", () => {
		// σ[a](σ[b](σ[c](R))) where c is most restrictive
		// Original: σ[age > 18](σ[role = 'admin'](σ[status = 'active'](users))))
		// All are already in good order (equality closest to data)
		const input: RelationalAlgebraNode = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Selection",
				condition: "role = 'admin'",
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

		const result = applyMostRestrictiveFirst(input);

		// Should remain in same order
		expect(result.node.type).toBe("Selection");
		expect((result.node as any).condition).toBe("age > 18");
	});

	it("should handle relation without optimization", () => {
		// Base case - just a relation
		const input: RelationalAlgebraNode = {
			type: "Relation",
			name: "users",
		};

		const result = applyMostRestrictiveFirst(input);

		expect(result.node.type).toBe("Relation");
		expect((result.node as any).name).toBe("users");
		expect(result.appliedRules).toHaveLength(0);
	});
});
