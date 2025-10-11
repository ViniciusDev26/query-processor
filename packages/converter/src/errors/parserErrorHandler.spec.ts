import type {
	IRecognitionException,
	IRecognizerContext,
	IToken,
} from "chevrotain";
import { describe, expect, it } from "vitest";
import { handleParserErrors } from "./parserErrorHandler";
import { SQLParseError } from "./SQLParseError";

describe("handleParserErrors", () => {
	const createMockToken = (): IToken => ({
		image: "",
		startOffset: 0,
		startLine: 1,
		startColumn: 1,
		endOffset: 0,
		endLine: 1,
		endColumn: 1,
		tokenType: { name: "Mock", PATTERN: /mock/ },
		tokenTypeIdx: 0,
	});

	const createMockContext = (): IRecognizerContext => ({
		ruleStack: [],
		ruleOccurrenceStack: [],
	});

	it("should not throw when no errors", () => {
		expect(() => handleParserErrors([])).not.toThrow();
	});

	it("should throw SQLParseError with single parser error", () => {
		const parserError: IRecognitionException = {
			name: "MismatchedTokenException",
			message: "Expecting token of type SELECT",
			token: createMockToken(),
			resyncedTokens: [],
			context: createMockContext(),
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
				token: createMockToken(),
				resyncedTokens: [],
				context: createMockContext(),
			},
			{
				name: "Error2",
				message: "Parser error 2",
				token: createMockToken(),
				resyncedTokens: [],
				context: createMockContext(),
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
			token: createMockToken(),
			resyncedTokens: [],
			context: createMockContext(),
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
