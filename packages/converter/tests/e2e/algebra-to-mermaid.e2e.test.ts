import { describe, expect, it } from "vitest";
import { parseSQL } from "../../src/index";
import { algebraToMermaidMarkdown } from "../../src/translator/AlgebraToMermaidTranslator";

describe("AlgebraToMermaidTranslator E2E", () => {
	it("E2E: should translate full SQL query to Mermaid diagram", () => {
		const sql =
			"SELECT TB1.name, TB3.sal FROM TB1 INNER JOIN TB2 ON TB1.PK = TB2.FK INNER JOIN TB3 ON TB2.PK = TB3.FK WHERE TB1.id > 300 AND TB3.sal != 0";

		// Parse SQL
		const parseResult = parseSQL(sql);

		expect(parseResult.success).toBe(true);

		if (!parseResult.success) return;

		// Generate Mermaid diagram
		const mermaidMarkdown = algebraToMermaidMarkdown(parseResult.translation);

		// Verify Mermaid output
		expect(mermaidMarkdown).toContain("```mermaid");
		expect(mermaidMarkdown).toContain("graph TD");
		expect(mermaidMarkdown).toContain("```");

		// Note: Current algebra representation uses cross product notation
		// Once ASTToAlgebraTranslator is updated to generate Join nodes,
		// we can verify the actual tree structure here
	});

	it("E2E: simple SELECT with WHERE", () => {
		const sql = "SELECT name, email FROM users WHERE age > 18";

		const parseResult = parseSQL(sql);

		expect(parseResult.success).toBe(true);

		if (!parseResult.success) return;

		const mermaidMarkdown = algebraToMermaidMarkdown(parseResult.translation);

		expect(mermaidMarkdown).toContain("```mermaid");
		expect(mermaidMarkdown).toContain("π");
		expect(mermaidMarkdown).toContain("σ");
		expect(mermaidMarkdown).toContain("users");
	});

	it("E2E: complex query with multiple JOINs and WHERE", () => {
		const sql = `
			SELECT u.name, o.total, p.name
			FROM users u
			INNER JOIN orders o ON u.id = o.user_id
			INNER JOIN products p ON o.product_id = p.id
			WHERE u.age >= 18 AND o.status = 'completed'
		`;

		const parseResult = parseSQL(sql);

		expect(parseResult.success).toBe(true);

		if (!parseResult.success) return;

		const mermaidMarkdown = algebraToMermaidMarkdown(parseResult.translation);

		expect(mermaidMarkdown).toContain("```mermaid");
		expect(mermaidMarkdown).toContain("π");
		expect(mermaidMarkdown).toContain("σ");
		expect(mermaidMarkdown).toContain("users");
		expect(mermaidMarkdown).toContain("orders");
		expect(mermaidMarkdown).toContain("products");
	});
});
