import { describe, expect, it } from "vitest";
import {
	And,
	Comma,
	Equals,
	From,
	GreaterThan,
	GreaterThanOrEqual,
	Identifier,
	LessThan,
	LessThanOrEqual,
	NotEquals,
	NumberLiteral,
	Or,
	Select,
	SQLLexer,
	Star,
	StringLiteral,
	Where,
} from "./SQLLexer";

describe("SQLLexer", () => {
	it("should tokenize SELECT keyword", () => {
		const result = SQLLexer.tokenize("SELECT");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].tokenType).toBe(Select);
	});

	it("should tokenize FROM keyword", () => {
		const result = SQLLexer.tokenize("FROM");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].tokenType).toBe(From);
	});

	it("should tokenize keywords case-insensitively", () => {
		const result = SQLLexer.tokenize("select from");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(2);
		expect(result.tokens[0].tokenType).toBe(Select);
		expect(result.tokens[1].tokenType).toBe(From);
	});

	it("should tokenize identifiers", () => {
		const result = SQLLexer.tokenize("users id name");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(3);
		expect(result.tokens[0].tokenType).toBe(Identifier);
		expect(result.tokens[0].image).toBe("users");
		expect(result.tokens[1].image).toBe("id");
		expect(result.tokens[2].image).toBe("name");
	});

	it("should tokenize star operator", () => {
		const result = SQLLexer.tokenize("*");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].tokenType).toBe(Star);
	});

	it("should tokenize comma separator", () => {
		const result = SQLLexer.tokenize("id, name");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(3);
		expect(result.tokens[0].tokenType).toBe(Identifier);
		expect(result.tokens[1].tokenType).toBe(Comma);
		expect(result.tokens[2].tokenType).toBe(Identifier);
	});

	it("should tokenize complete SELECT statement with star", () => {
		const result = SQLLexer.tokenize("SELECT * FROM users");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(4);
		expect(result.tokens[0].tokenType).toBe(Select);
		expect(result.tokens[1].tokenType).toBe(Star);
		expect(result.tokens[2].tokenType).toBe(From);
		expect(result.tokens[3].tokenType).toBe(Identifier);
	});

	it("should tokenize complete SELECT statement with columns", () => {
		const result = SQLLexer.tokenize("SELECT id, name FROM users");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(6);
		expect(result.tokens[0].tokenType).toBe(Select);
		expect(result.tokens[1].tokenType).toBe(Identifier);
		expect(result.tokens[2].tokenType).toBe(Comma);
		expect(result.tokens[3].tokenType).toBe(Identifier);
		expect(result.tokens[4].tokenType).toBe(From);
		expect(result.tokens[5].tokenType).toBe(Identifier);
	});

	it("should skip whitespace", () => {
		const result = SQLLexer.tokenize("  SELECT   *   FROM   users  ");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(4);
		// Whitespace tokens should not be in the result
		expect(result.tokens.every((token) => token.image.trim() !== "")).toBe(
			true,
		);
	});

	it("should handle invalid characters", () => {
		const result = SQLLexer.tokenize("SELECT @ FROM users");
		expect(result.errors).toHaveLength(1);
	});

	it("should tokenize WHERE keyword", () => {
		const result = SQLLexer.tokenize("WHERE");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].tokenType).toBe(Where);
	});

	it("should tokenize AND and OR keywords", () => {
		const result = SQLLexer.tokenize("AND OR");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(2);
		expect(result.tokens[0].tokenType).toBe(And);
		expect(result.tokens[1].tokenType).toBe(Or);
	});

	it("should tokenize comparison operators", () => {
		const result = SQLLexer.tokenize("= != <> < <= > >=");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(7);
		expect(result.tokens[0].tokenType).toBe(Equals);
		expect(result.tokens[1].tokenType).toBe(NotEquals);
		expect(result.tokens[2].tokenType).toBe(NotEquals);
		expect(result.tokens[3].tokenType).toBe(LessThan);
		expect(result.tokens[4].tokenType).toBe(LessThanOrEqual);
		expect(result.tokens[5].tokenType).toBe(GreaterThan);
		expect(result.tokens[6].tokenType).toBe(GreaterThanOrEqual);
	});

	it("should tokenize number literals", () => {
		const result = SQLLexer.tokenize("42 3.14 0");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(3);
		expect(result.tokens[0].tokenType).toBe(NumberLiteral);
		expect(result.tokens[0].image).toBe("42");
		expect(result.tokens[1].tokenType).toBe(NumberLiteral);
		expect(result.tokens[1].image).toBe("3.14");
		expect(result.tokens[2].tokenType).toBe(NumberLiteral);
		expect(result.tokens[2].image).toBe("0");
	});

	it("should tokenize string literals", () => {
		const result = SQLLexer.tokenize("'hello' 'world'");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(2);
		expect(result.tokens[0].tokenType).toBe(StringLiteral);
		expect(result.tokens[0].image).toBe("'hello'");
		expect(result.tokens[1].tokenType).toBe(StringLiteral);
		expect(result.tokens[1].image).toBe("'world'");
	});

	it("should tokenize SELECT with WHERE clause", () => {
		const result = SQLLexer.tokenize("SELECT * FROM users WHERE age > 18");
		expect(result.errors).toHaveLength(0);
		expect(result.tokens).toHaveLength(8);
		expect(result.tokens[0].tokenType).toBe(Select);
		expect(result.tokens[1].tokenType).toBe(Star);
		expect(result.tokens[2].tokenType).toBe(From);
		expect(result.tokens[3].tokenType).toBe(Identifier);
		expect(result.tokens[4].tokenType).toBe(Where);
		expect(result.tokens[5].tokenType).toBe(Identifier);
		expect(result.tokens[6].tokenType).toBe(GreaterThan);
		expect(result.tokens[7].tokenType).toBe(NumberLiteral);
	});

	it("should tokenize complex WHERE with AND/OR", () => {
		const result = SQLLexer.tokenize(
			"SELECT * FROM users WHERE age >= 18 AND name = 'John' OR id < 100",
		);
		expect(result.errors).toHaveLength(0);
		// Verify that WHERE, AND, and OR keywords are present
		const tokenTypes = result.tokens.map((t) => t.tokenType);
		expect(tokenTypes).toContain(Where);
		expect(tokenTypes).toContain(And);
		expect(tokenTypes).toContain(Or);
	});
});
