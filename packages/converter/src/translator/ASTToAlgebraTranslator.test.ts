import { describe, expect, it } from "vitest";
import type { SelectStatement } from "../ast/types";
import { ASTToAlgebraTranslator } from "./ASTToAlgebraTranslator";

describe("ASTToAlgebraTranslator", () => {
	const translator = new ASTToAlgebraTranslator();

	describe("translate", () => {
		it("should translate simple SELECT * query", () => {
			const ast: SelectStatement = {
				type: "SelectStatement",
				columns: [{ type: "StarColumn" }],
				from: {
					type: "FromClause",
					source: {
						type: "TableSource",
						table: "users",
					},
				},
			};

			const result = translator.translate(ast);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.algebra).toEqual({
					type: "Projection",
					attributes: ["*"],
					input: {
						type: "Relation",
						name: "users",
					},
				});
			}
		});

		// TODO: Add tests for translation logic when implemented
		// Examples:
		//
		// it("should translate simple SELECT * query", () => {
		//   const ast: SelectStatement = { ... };
		//   const result = translator.translate(ast);
		//   expect(result.success).toBe(true);
		//   if (result.success) {
		//     expect(result.algebra).toEqual({
		//       type: "Projection",
		//       attributes: ["*"],
		//       input: {
		//         type: "Relation",
		//         name: "users"
		//       }
		//     });
		//   }
		// });
		//
		// it("should translate SELECT with WHERE clause", () => { ... });
		// it("should translate SELECT with JOIN", () => { ... });
		// it("should translate SELECT with subquery", () => { ... });
	});
});
