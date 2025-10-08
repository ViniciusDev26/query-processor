import { createToken } from "chevrotain";
import { Identifier } from "./literals";

// SQL Keywords (must be defined after Identifier is imported)
export const Select = createToken({
	name: "Select",
	pattern: /SELECT/i,
	longer_alt: Identifier,
});
export const From = createToken({
	name: "From",
	pattern: /FROM/i,
	longer_alt: Identifier,
});
export const Where = createToken({
	name: "Where",
	pattern: /WHERE/i,
	longer_alt: Identifier,
});
export const And = createToken({
	name: "And",
	pattern: /AND/i,
	longer_alt: Identifier,
});
export const Or = createToken({
	name: "Or",
	pattern: /OR/i,
	longer_alt: Identifier,
});
export const As = createToken({
	name: "As",
	pattern: /AS/i,
	longer_alt: Identifier,
});
export const Join = createToken({
	name: "Join",
	pattern: /JOIN/i,
	longer_alt: Identifier,
});
export const Inner = createToken({
	name: "Inner",
	pattern: /INNER/i,
	longer_alt: Identifier,
});
export const On = createToken({
	name: "On",
	pattern: /ON/i,
	longer_alt: Identifier,
});
