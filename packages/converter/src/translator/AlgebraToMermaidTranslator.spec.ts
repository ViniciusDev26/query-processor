import { describe, expect, it } from "vitest";
import {
	AlgebraToMermaidTranslator,
	algebraToMermaidMarkdown,
} from "./AlgebraToMermaidTranslator";
import type { TranslationResult } from "./types";

describe("AlgebraToMermaidTranslator", () => {
	it("should translate simple Relation", () => {
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Relation",
				name: "users",
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		expect(mermaid).toContain("graph BT");
		expect(mermaid).toContain("users");
	});

	it("should translate Projection over Relation", () => {
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Projection",
				attributes: ["id", "name"],
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		expect(mermaid).toContain("graph BT");
		expect(mermaid).toContain("π");
		expect(mermaid).toContain("id, name");
		expect(mermaid).toContain("users");
	});

	it("should translate Projection with * (all columns)", () => {
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Projection",
				attributes: ["*"],
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		expect(mermaid).toContain("π");
		expect(mermaid).toContain("\\*");
	});

	it("should translate Selection over Relation", () => {
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Selection",
				condition: "age > 18",
				input: {
					type: "Relation",
					name: "users",
				},
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		expect(mermaid).toContain("graph BT");
		expect(mermaid).toContain("σ");
		expect(mermaid).toContain("age > 18");
		expect(mermaid).toContain("users");
	});

	it("should translate Projection over Selection over Relation", () => {
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Projection",
				attributes: ["name", "email"],
				input: {
					type: "Selection",
					condition: "age >= 18",
					input: {
						type: "Relation",
						name: "users",
					},
				},
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		expect(mermaid).toContain("graph BT");
		expect(mermaid).toContain("π");
		expect(mermaid).toContain("name, email");
		expect(mermaid).toContain("σ");
		expect(mermaid).toContain("age >= 18");
		expect(mermaid).toContain("users");
	});

	it("should handle translation error", () => {
		const result: TranslationResult = {
			success: false,
			error: "Invalid query",
			details: ["Missing FROM clause"],
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		expect(mermaid).toContain("Error: Invalid query");
	});

	it("should wrap in markdown code block", () => {
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Relation",
				name: "users",
			},
		};

		const markdown = algebraToMermaidMarkdown(result);

		expect(markdown).toMatch(/^```mermaid\n/);
		expect(markdown).toMatch(/\n```$/);
		expect(markdown).toContain("graph BT");
	});

	it("should translate complex query with multiple JOINs and WHERE", () => {
		// Simulating: SELECT u.name, o.total FROM users u
		//             INNER JOIN orders o ON u.id = o.user_id
		//             INNER JOIN products p ON o.product_id = p.id
		//             WHERE u.age >= 18 AND o.status = 'completed' AND p.price > 100
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Projection",
				attributes: ["u.name", "o.total"],
				input: {
					type: "Selection",
					condition:
						"((u.age >= 18 AND o.status = 'completed') AND p.price > 100)",
					input: {
						type: "Selection",
						condition: "o.product_id = p.id",
						input: {
							type: "Relation",
							name: "((users × orders) × products)",
						},
					},
				},
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		// Verify structure
		expect(mermaid).toContain("graph BT");
		expect(mermaid).toContain("π");
		expect(mermaid).toContain("u.name, o.total");
		expect(mermaid).toContain("σ");
		expect(mermaid).toContain("u.age >= 18");
		expect(mermaid).toContain("o.status = 'completed'");
		expect(mermaid).toContain("p.price > 100");
		expect(mermaid).toContain("o.product_id = p.id");
		expect(mermaid).toContain("users");
		expect(mermaid).toContain("orders");
		expect(mermaid).toContain("products");
	});

	it("should translate tree with multiple branches (JOINs)", () => {
		// Query: SELECT u.name, o.total, p.name
		//        FROM users u
		//        JOIN orders o ON u.id = o.user_id
		//        JOIN products p ON o.product_id = p.id
		//        WHERE u.age >= 18
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Projection",
				attributes: ["u.name", "o.total", "p.name"],
				input: {
					type: "Selection",
					condition: "u.age >= 18",
					input: {
						type: "Join",
						condition: "o.product_id = p.id",
						left: {
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
						right: {
							type: "Relation",
							name: "products",
						},
					},
				},
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		// Verify structure
		expect(mermaid).toContain("graph BT");
		expect(mermaid).toContain("π");
		expect(mermaid).toContain("σ");
		expect(mermaid).toContain("⨝"); // Join symbol
		expect(mermaid).toContain("u.id = o.user_id");
		expect(mermaid).toContain("o.product_id = p.id");
		expect(mermaid).toContain("users");
		expect(mermaid).toContain("orders");
		expect(mermaid).toContain("products");

		// Verify connections (multiple branches)
		expect(mermaid).toContain("left");
		expect(mermaid).toContain("right");
	});

	it("should translate specific SQL: SELECT TB1.name, TB3.sal FROM TB1 JOIN TB2 JOIN TB3 WHERE ...", () => {
		// SQL: SELECT TB1.name, TB3.sal
		//      FROM TB1
		//      JOIN TB2 ON TB1.PK = TB2.FK
		//      JOIN TB3 ON TB2.PK = TB3.FK
		//      WHERE TB1.id > 300 AND TB3.sal <> 0
		const result: TranslationResult = {
			success: true,
			algebra: {
				type: "Projection",
				attributes: ["TB1.name", "TB3.sal"],
				input: {
					type: "Selection",
					condition: "(TB1.id > 300 AND TB3.sal <> 0)",
					input: {
						type: "Join",
						condition: "TB2.PK = TB3.FK",
						left: {
							type: "Join",
							condition: "TB1.PK = TB2.FK",
							left: {
								type: "Relation",
								name: "TB1",
							},
							right: {
								type: "Relation",
								name: "TB2",
							},
						},
						right: {
							type: "Relation",
							name: "TB3",
						},
					},
				},
			},
		};

		const translator = new AlgebraToMermaidTranslator();
		const mermaid = translator.translate(result);

		// Verify structure
		expect(mermaid).toContain("graph BT");

		// Verify projection
		expect(mermaid).toContain("π");
		expect(mermaid).toContain("TB1.name, TB3.sal");

		// Verify selection (WHERE clause)
		expect(mermaid).toContain("σ");
		expect(mermaid).toContain("TB1.id > 300");
		expect(mermaid).toContain("TB3.sal <> 0");

		// Verify joins
		expect(mermaid).toContain("⨝");
		expect(mermaid).toContain("TB1.PK = TB2.FK");
		expect(mermaid).toContain("TB2.PK = TB3.FK");

		// Verify relations (tables)
		expect(mermaid).toContain("TB1");
		expect(mermaid).toContain("TB2");
		expect(mermaid).toContain("TB3");

		// Verify tree structure (multiple branches)
		expect(mermaid).toContain("left");
		expect(mermaid).toContain("right");
	});
});
