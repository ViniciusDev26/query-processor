import { createToken, Lexer } from "chevrotain";

// Identifiers
export const Identifier = createToken({
	name: "Identifier",
	pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

// Literals
export const NumberLiteral = createToken({
	name: "NumberLiteral",
	pattern: /\d+(\.\d+)?/,
});

export const StringLiteral = createToken({
	name: "StringLiteral",
	pattern: /'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/,
});

// Whitespace (skipped)
export const WhiteSpace = createToken({
	name: "WhiteSpace",
	pattern: /\s+/,
	group: Lexer.SKIPPED,
});
