import type { ILexingError } from "chevrotain";
import { describe, expect, it } from "vitest";
import { handleLexerErrors } from "./lexerErrorHandler";
import { SQLParseError } from "./SQLParseError";

describe("handleLexerErrors", () => {
	it("should not throw when no errors", () => {
		expect(() => handleLexerErrors([])).not.toThrow();
	});

	it("should throw SQLParseError with single lexer error", () => {
		const lexerError: ILexingError = {
			message: "Unexpected character",
			offset: 10,
			length: 1,
			line: 1,
			column: 11,
		};

		expect(() => handleLexerErrors([lexerError])).toThrow(SQLParseError);
		expect(() => handleLexerErrors([lexerError])).toThrow(
			"Lexer errors: Unexpected character",
		);
	});

	it("should throw SQLParseError with multiple lexer errors", () => {
		const errors: ILexingError[] = [
			{
				message: "Error 1",
				offset: 5,
				length: 1,
				line: 1,
				column: 6,
			},
			{
				message: "Error 2",
				offset: 10,
				length: 1,
				line: 1,
				column: 11,
			},
		];

		expect(() => handleLexerErrors(errors)).toThrow(
			"Lexer errors: Error 1, Error 2",
		);
	});

	it("should include correct stage and details in error", () => {
		const lexerError: ILexingError = {
			message: "Test error",
			offset: 0,
			length: 1,
			line: 1,
			column: 1,
		};

		try {
			handleLexerErrors([lexerError]);
		} catch (error) {
			expect(error).toBeInstanceOf(SQLParseError);
			const sqlError = error as SQLParseError;
			expect(sqlError.stage).toBe("lexer");
			expect(sqlError.details).toEqual(["Test error"]);
		}
	});
});
