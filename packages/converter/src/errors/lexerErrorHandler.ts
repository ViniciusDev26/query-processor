import type { ILexingError } from "chevrotain";
import { SQLParseError } from "./SQLParseError";

export function handleLexerErrors(errors: ILexingError[]): void {
	if (errors.length === 0) return;

	const details = errors.map((e) => e.message);
	throw new SQLParseError(
		`Lexer errors: ${details.join(", ")}`,
		"lexer",
		details,
	);
}
