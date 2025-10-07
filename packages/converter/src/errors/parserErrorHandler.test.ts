import { describe, expect, it } from "vitest";
import type { IRecognitionException } from "chevrotain";
import { handleParserErrors } from "./parserErrorHandler";
import { SQLParseError } from "./SQLParseError";

describe("handleParserErrors", () => {
	it("should not throw when no errors", () => {
		expect(() => handleParserErrors([])).not.toThrow();
	});

	it("should throw SQLParseError with single parser error", () => {
		const parserError: IRecognitionException = {
			name: "MismatchedTokenException",
			message: "Expecting token of type SELECT",
			token: {} as any,
			resyncedTokens: [],
			context: {} as any,
		};

		expect(() => handleParserErrors([parserError])).toThrow(SQLParseError);
		expect(() => handleParserErrors([parserError])).toThrow(
			"Parser errors: Expecting token of type SELECT",
		);
	});

	it("should throw SQLParseError with multiple parser errors", () => {
		const errors: IRecognitionException[] = [
			{
				name: "Error1",
				message: "Parser error 1",
				token: {} as any,
				resyncedTokens: [],
				context: {} as any,
			},
			{
				name: "Error2",
				message: "Parser error 2",
				token: {} as any,
				resyncedTokens: [],
				context: {} as any,
			},
		];

		expect(() => handleParserErrors(errors)).toThrow(
			"Parser errors: Parser error 1, Parser error 2",
		);
	});

	it("should include correct stage and details in error", () => {
		const parserError: IRecognitionException = {
			name: "TestError",
			message: "Test parser error",
			token: {} as any,
			resyncedTokens: [],
			context: {} as any,
		};

		try {
			handleParserErrors([parserError]);
		} catch (error) {
			expect(error).toBeInstanceOf(SQLParseError);
			const sqlError = error as SQLParseError;
			expect(sqlError.stage).toBe("parser");
			expect(sqlError.details).toEqual(["Test parser error"]);
		}
	});
});
