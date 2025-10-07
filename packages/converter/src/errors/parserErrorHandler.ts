import type { IRecognitionException } from "chevrotain";
import { SQLParseError } from "./SQLParseError";

export function handleParserErrors(errors: IRecognitionException[]): void {
	if (errors.length === 0) return;

	const details = errors.map((e) => e.message);
	throw new SQLParseError(
		`Parser errors: ${details.join(", ")}`,
		"parser",
		details,
	);
}
