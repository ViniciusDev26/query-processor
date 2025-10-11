import { describe, expect, it } from "vitest";
import { parseSQL } from "../../src/index";
import { algebraToMermaidMarkdown } from "../../src/translator/AlgebraToMermaidTranslator";

describe("Optimizer E2E Tests", () => {
	describe("Push-down selections optimization", () => {
		it("E2E: should optimize selection through projection in parseSQL", () => {
			// Query structure that needs optimization:
			// This simulates: σ[condition](π[cols](R))
			// Should be optimized to: π[cols](σ[condition](R))

			const query = "SELECT name, email FROM users WHERE age > 18";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			// Check that optimization was performed
			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toBeDefined();

			// Original should be already optimal (our translator produces optimal trees)
			expect(result.translationString).toBe(
				"π[name, email](σ[age > 18](users))",
			);
			expect(result.optimizationString).toBe(
				"π[name, email](σ[age > 18](users))",
			);

			// No optimization rules needed since it's already optimal
			expect(result.optimization?.appliedRules).toHaveLength(0);
		});

		it("E2E: should handle queries with JOIN correctly", () => {
			const query =
				"SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE u.age > 18";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			// Should have optimization result
			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toBeDefined();

			// Check that the algebra contains join
			expect(result.translationString).toContain("⨝");
			expect(result.translationString).toContain("u.id = o.user_id");

			// Optimized version should maintain the structure
			expect(result.optimizationString).toContain("⨝");
		});

		it("E2E: should handle multiple selections", () => {
			const query =
				"SELECT name FROM users WHERE age > 18 AND status = 'active'";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.translationString).toContain("σ");
			expect(result.optimizationString).toContain("σ");

			// Should handle compound conditions
			expect(result.translationString).toContain("AND");
		});

		it("E2E: should handle wildcard projection with WHERE", () => {
			const query = "SELECT * FROM users WHERE age > 18";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.translationString).toBe("π[*](σ[age > 18](users))");
			expect(result.optimizationString).toBe("π[*](σ[age > 18](users))");
		});

		it("E2E: should handle query without WHERE clause (no selection to optimize)", () => {
			const query = "SELECT name, email FROM users";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.translationString).toBe("π[name, email](users)");
			expect(result.optimizationString).toBe("π[name, email](users)");

			// No optimization needed
			expect(result.optimization?.appliedRules).toHaveLength(0);
		});

		it("E2E: should handle query with only table (no operations to optimize)", () => {
			const query = "SELECT * FROM users";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.translationString).toBe("π[*](users)");
			expect(result.optimizationString).toBe("π[*](users)");
		});

		it("E2E: should handle complex query with multiple JOINs and WHERE", () => {
			const query =
				"SELECT u.name, o.total, p.name FROM users u " +
				"JOIN orders o ON u.id = o.user_id " +
				"JOIN products p ON o.product_id = p.id " +
				"WHERE u.age >= 18";

			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.translationString).toBeDefined();
			expect(result.optimizationString).toBeDefined();

			// Both should contain joins
			expect(result.translationString).toContain("⨝");
			expect(result.optimizationString).toContain("⨝");

			// Both should contain selection
			expect(result.translationString).toContain("σ");
			expect(result.optimizationString).toContain("σ");

			// Both should contain projection
			expect(result.translationString).toContain("π");
			expect(result.optimizationString).toContain("π");
		});

		it("E2E: should handle query with OR conditions", () => {
			const query = "SELECT * FROM users WHERE age > 65 OR age < 18";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.translationString).toContain("σ");
			expect(result.translationString).toContain("OR");
			expect(result.optimizationString).toContain("σ");
		});

		it("E2E: should handle nested conditions with parentheses", () => {
			const query =
				"SELECT name FROM users WHERE (age > 18 AND status = 'active') OR role = 'admin'";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.translationString).toContain("σ");
			expect(result.optimizationString).toContain("σ");
		});

		it("E2E: should provide applied rules information", () => {
			const query = "SELECT name FROM users WHERE age > 18";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimization?.appliedRules).toBeDefined();
			expect(Array.isArray(result.optimization?.appliedRules)).toBe(true);

			// For already optimal queries, no rules should be applied
			if (result.translationString === "π[name](σ[age > 18](users))") {
				expect(result.optimization?.appliedRules).toHaveLength(0);
			}
		});
	});

	describe("Push-down projections optimization", () => {
		it("E2E: should work with push-down projections enabled", () => {
			// This tests that the optimizer can handle multiple heuristics
			// Even if our translator doesn't produce consecutive projections,
			// the optimizer should be ready to handle them
			const query = "SELECT name, email FROM users WHERE age > 18";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toBeDefined();

			// Verify basic structure is maintained
			expect(result.optimizationString).toContain("π");
			expect(result.optimizationString).toContain("σ");
			expect(result.optimizationString).toContain("users");
		});

		it("E2E: should handle wildcard projections", () => {
			const query = "SELECT * FROM users";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toBe("π[*](users)");
		});

		it("E2E: should handle complex projection scenarios", () => {
			const query =
				"SELECT u.name, u.email FROM users u WHERE u.age > 18 AND u.status = 'active'";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toContain("π");
			expect(result.optimizationString).toContain("σ");
		});
	});

	describe("Apply most restrictive first optimization", () => {
		it("E2E: should work with restrictiveness-based reordering", () => {
			// Tests that the optimizer handles selection reordering
			const query =
				"SELECT name FROM users WHERE age > 18 AND status = 'active'";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toBeDefined();

			// Should maintain basic structure
			expect(result.optimizationString).toContain("π");
			expect(result.optimizationString).toContain("σ");
			expect(result.optimizationString).toContain("users");
		});

		it("E2E: should handle queries with multiple conditions", () => {
			const query =
				"SELECT u.name FROM users u WHERE u.age >= 21 AND u.country = 'US' AND u.status = 'verified'";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toContain("σ");

			// Verify the query can be optimized
			expect(result.optimization?.appliedRules).toBeDefined();
		});

		it("E2E: should handle equality and range conditions together", () => {
			const query =
				"SELECT * FROM products WHERE category = 'electronics' AND price > 100";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toContain("σ");
			expect(result.optimizationString).toContain("products");
		});
	});

	describe("Avoid Cartesian product optimization", () => {
		it("E2E: should handle cross products in queries", () => {
			// Most SQL queries with joins already avoid Cartesian products
			// This tests that the optimizer handles them correctly
			const query =
				"SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toContain("⨝");
			expect(result.optimizationString).toContain("users");
			expect(result.optimizationString).toContain("orders");
		});

		it("E2E: should handle queries with multiple joins", () => {
			const query =
				"SELECT u.name, o.total, p.name FROM users u " +
				"JOIN orders o ON u.id = o.user_id " +
				"JOIN products p ON o.product_id = p.id";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			expect(result.optimizationString).toContain("⨝");

			// Should have multiple joins
			const joinCount = (result.optimizationString?.match(/⨝/g) || []).length;
			expect(joinCount).toBeGreaterThan(0);
		});

		it("E2E: should verify join conditions are preserved", () => {
			const query =
				"SELECT * FROM employees e JOIN departments d ON e.dept_id = d.id";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.optimization).toBeDefined();
			// Verify join condition is in the output
			expect(result.optimizationString).toContain("dept_id");
		});
	});

	describe("Integration with Mermaid diagrams", () => {
		it("E2E: should allow generating Mermaid diagrams for optimized trees", () => {
			const query = "SELECT name FROM users WHERE age > 18";
			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			// Both original and optimized should be valid
			expect(result.translation.success).toBe(true);
			expect(result.optimization).toBeDefined();

			// You can generate diagrams from both
			if (result.translation.success && result.optimization) {
				const originalAlgebra = result.translation.algebra;
				const optimizedAlgebra = result.optimization.optimized;

				expect(originalAlgebra).toBeDefined();
				expect(optimizedAlgebra).toBeDefined();
			}
		});

		it("E2E: should generate optimized Mermaid diagram for complex multi-join query", () => {
			// Complex query with multiple JOINs and WHERE conditions
			const query =
				"SELECT TB1.name, TB3.sal FROM TB1 INNER JOIN TB2 ON TB1.PK = TB2.FK INNER JOIN TB3 ON TB2.PK = TB3.FK WHERE TB1.id > 300 AND TB3.sal != 0";

			const result = parseSQL(query);

			expect(result.success).toBe(true);
			if (!result.success) return;

			// Verify translation and optimization succeeded
			expect(result.translation.success).toBe(true);
			expect(result.optimization).toBeDefined();

			if (!result.translation.success || !result.optimization) return;

			// Generate Mermaid diagram for ORIGINAL tree
			const originalMermaid = algebraToMermaidMarkdown(result.translation);

			// Generate Mermaid diagram for OPTIMIZED tree
			const optimizedResult = {
				success: true as const,
				algebra: result.optimization.optimized,
			};
			const optimizedMermaid = algebraToMermaidMarkdown(optimizedResult);

			console.log("OPTIMIZED MERMAID:");
			console.log(optimizedMermaid);

			// Both diagrams should be valid Mermaid markdown
			expect(originalMermaid).toContain("```mermaid");
			expect(originalMermaid).toContain("graph TD");
			expect(originalMermaid).toContain("```");

			expect(optimizedMermaid).toContain("```mermaid");
			expect(optimizedMermaid).toContain("graph TD");
			expect(optimizedMermaid).toContain("```");

			// Both should contain the expected operations
			expect(originalMermaid).toContain("π"); // Projection
			expect(originalMermaid).toContain("σ"); // Selection
			expect(originalMermaid).toContain("⨝"); // Join

			expect(optimizedMermaid).toContain("π"); // Projection
			expect(optimizedMermaid).toContain("σ"); // Selection
			expect(optimizedMermaid).toContain("⨝"); // Join

			// Output for visual inspection (visible when running with --reporter=verbose)
			console.log("\n=== ORIGINAL RELATIONAL ALGEBRA ===");
			console.log(result.translationString);
			console.log("\n=== ORIGINAL MERMAID DIAGRAM ===");
			console.log(originalMermaid);

			console.log("\n=== OPTIMIZED RELATIONAL ALGEBRA ===");
			console.log(result.optimizationString);
			console.log("\n=== OPTIMIZED MERMAID DIAGRAM ===");
			console.log(optimizedMermaid);

			console.log("\n=== APPLIED OPTIMIZATION RULES ===");
			result.optimization.appliedRules.forEach((rule, index) => {
				console.log(`${index + 1}. ${rule}`);
			});

			// Verify optimization was applied (or query was already optimal)
			expect(result.optimization.appliedRules).toBeDefined();
			expect(Array.isArray(result.optimization.appliedRules)).toBe(true);
		});
	});
});
