import { describe, expect, it } from "vitest";
import { SQLParseError } from "./SQLParseError";

describe("SQLParseError", () => {
	it("should create error with correct properties", () => {
		const error = new SQLParseError(
			"Test error",
			"lexer",
			["detail 1", "detail 2"],
		);

		expect(error.message).toBe("Test error");
		expect(error.name).toBe("SQLParseError");
		expect(error.stage).toBe("lexer");
		expect(error.details).toEqual(["detail 1", "detail 2"]);
	});

	it("should be instance of Error", () => {
		const error = new SQLParseError("Test error", "parser", []);
		expect(error).toBeInstanceOf(Error);
	});

	it("should create error with parser stage", () => {
		const error = new SQLParseError("Parser error", "parser", ["detail"]);
		expect(error.stage).toBe("parser");
	});
});
