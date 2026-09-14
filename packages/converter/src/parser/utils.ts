import type { CstNode, IToken } from "chevrotain";

export function isCstNodeArray(
	value: CstNode[] | IToken[] | undefined,
): value is CstNode[] {
	if (!value || value.length === 0) return false;
	return "name" in value[0] && "children" in value[0];
}

/**
 * Converts a raw StringLiteral token image (quotes included, e.g. "'O\\'Brien'")
 * into its actual string value ("O'Brien"). The lexer's StringLiteral pattern
 * accepts any "\<char>" escape sequence, so this strips the surrounding quotes
 * and resolves each escape to the character it escapes.
 */
export function unescapeStringLiteral(rawValue: string): string {
	const withoutQuotes = rawValue.slice(1, -1);
	return withoutQuotes.replace(/\\(.)/g, "$1");
}
