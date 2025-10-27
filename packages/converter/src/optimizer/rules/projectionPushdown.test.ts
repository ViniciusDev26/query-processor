import { describe, expect, it } from "vitest";
import type { Projection, Relation, Selection } from "../../algebra/types";
import { projectionPushdownRule } from "./projectionPushdown";

describe("projectionPushdownRule", () => {
	it("should merge consecutive projections", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Projection",
				attributes: ["name", "age", "email"],
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Projection;

		expect(result).toEqual({
			type: "Projection",
			attributes: ["name"],
			input: relation,
		});
	});

	it("should remove redundant wildcard projections", () => {
		const relation: Relation = {
			type: "Relation",
			name: "orders",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["*"],
			input: relation,
		};

		const result = projectionPushdownRule.apply(input);

		expect(result).toEqual(relation);
	});

	it("should push projection below selection when safe", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name", "age"],
			input: {
				type: "Selection",
				condition: "age > 18",
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Selection;

		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("age > 18");
			expect(result.input).toEqual({
				type: "Projection",
				attributes: ["name", "age"],
				input: relation,
			});
		}
	});

	it("should keep projection above selection when attributes are missing", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Projection = {
			type: "Projection",
			attributes: ["name"],
			input: {
				type: "Selection",
				condition: "age > 18",
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Projection;

		expect(result.type).toBe("Projection");
		if (result.type === "Projection") {
			expect(result.attributes).toEqual(["name"]);
			expect(result.input).toEqual({
				type: "Selection",
				condition: "age > 18",
				input: relation,
			});
		}
	});

	it("should ensure projection below selection keeps required attributes", () => {
		const relation: Relation = {
			type: "Relation",
			name: "users",
		};

		const input: Selection = {
			type: "Selection",
			condition: "age > 18",
			input: {
				type: "Projection",
				attributes: ["name"],
				input: relation,
			},
		};

		const result = projectionPushdownRule.apply(input) as Selection;

		expect(result.type).toBe("Selection");
		if (result.type === "Selection") {
			expect(result.condition).toBe("age > 18");
			expect(result.input.type).toBe("Projection");
			if (result.input.type === "Projection") {
				expect(result.input.attributes).toEqual(["name", "age"]);
				expect(result.input.input).toEqual(relation);
			}
		}
	});
});
