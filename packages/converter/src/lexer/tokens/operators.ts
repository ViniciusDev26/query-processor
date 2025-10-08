import { createToken } from "chevrotain";

// Comparison Operators
export const Equals = createToken({ name: "Equals", pattern: /=/ });
export const NotEquals = createToken({ name: "NotEquals", pattern: /(<>|!=)/ });
export const LessThan = createToken({ name: "LessThan", pattern: /</ });
export const LessThanOrEqual = createToken({
	name: "LessThanOrEqual",
	pattern: /<=/,
});
export const GreaterThan = createToken({ name: "GreaterThan", pattern: />/ });
export const GreaterThanOrEqual = createToken({
	name: "GreaterThanOrEqual",
	pattern: />=/,
});

// Other Operators
export const Star = createToken({ name: "Star", pattern: /\*/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const Dot = createToken({ name: "Dot", pattern: /\./ });
