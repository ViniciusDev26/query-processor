// Re-export all tokens from their respective files
export * from "./literals";
export * from "./operators";
export * from "./keywords";

import { Identifier, NumberLiteral, StringLiteral, WhiteSpace } from "./literals";
import {
	Comma,
	Equals,
	GreaterThan,
	GreaterThanOrEqual,
	LessThan,
	LessThanOrEqual,
	NotEquals,
	Star,
} from "./operators";
import { And, From, Or, Select, Where } from "./keywords";

// Token order matters! Keywords must come before Identifier
// Comparison operators with multiple characters must come before single characters
export const allTokens = [
	WhiteSpace,
	// Keywords (must be before Identifier)
	Select,
	From,
	Where,
	And,
	Or,
	// Literals
	NumberLiteral,
	StringLiteral,
	// Identifiers
	Identifier,
	// Operators (multi-char before single-char)
	LessThanOrEqual,
	GreaterThanOrEqual,
	NotEquals,
	Equals,
	LessThan,
	GreaterThan,
	Star,
	Comma,
];
