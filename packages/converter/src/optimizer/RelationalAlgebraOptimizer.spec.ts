import { describe, expect, it } from "vitest";
import type { RelationalAlgebraNode } from "../algebra/types";
import { RelationalAlgebraOptimizer } from "./RelationalAlgebraOptimizer";
import { OptimizationHeuristic } from "./types";

describe("RelationalAlgebraOptimizer", () => {
	describe("Heuristic selection", () => {
		it("should apply all heuristics when none specified", () => {
			const input: RelationalAlgebraNode = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Projection",
					attributes: ["name"],
					input: {
						type: "Relation",
						name: "users",
					},
				},
			};

			const optimizer = new RelationalAlgebraOptimizer();
			// Not passing heuristics - should apply all
			const result = optimizer.optimize(input);

			// Should apply push-down selections
			expect(result.optimized.type).toBe("Projection");
		});

		it("should apply only specified heuristics", () => {
			const input: RelationalAlgebraNode = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Projection",
					attributes: ["name"],
					input: {
						type: "Relation",
						name: "users",
					},
				},
			};

			const optimizer = new RelationalAlgebraOptimizer();
			// Explicitly passing PUSH_DOWN_SELECTIONS
			const result = optimizer.optimize(input, [
				OptimizationHeuristic.PUSH_DOWN_SELECTIONS,
			]);

			// Should apply push-down selections
			expect(result.optimized.type).toBe("Projection");
			expect((result.optimized as any).input.type).toBe("Selection");
		});

		it("should not apply optimizations when empty array is passed", () => {
			const input: RelationalAlgebraNode = {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Projection",
					attributes: ["name"],
					input: {
						type: "Relation",
						name: "users",
					},
				},
			};

			const optimizer = new RelationalAlgebraOptimizer();
			// Passing empty array - no optimization should be applied
			const result = optimizer.optimize(input, []);

			// Should NOT optimize - structure should remain the same
			expect(result.optimized.type).toBe("Selection");
			expect((result.optimized as any).input.type).toBe("Projection");
			expect(result.appliedRules).toHaveLength(0);
		});
	});
});
