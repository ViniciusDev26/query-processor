export class SQLParseError extends Error {
	constructor(
		message: string,
		public readonly stage: "lexer" | "parser",
		public readonly details: string[],
	) {
		super(message);
		this.name = "SQLParseError";
	}
}
