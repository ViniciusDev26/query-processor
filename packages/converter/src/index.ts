import type { SelectStatement, Statement } from "./ast/types";
import { handleLexerErrors, handleParserErrors } from "./errors";
import { SQLLexer } from "./lexer/SQLLexer";
import { createASTBuilder } from "./parser/ASTBuilder";
import { SQLParser } from "./parser/SQLParser";
import { SchemaValidationError } from "./validator/SchemaValidationError";
import { SchemaValidator } from "./validator/SchemaValidator";
import type { DatabaseSchema } from "./validator/types";

// Re-export types
export type * from "./ast/types";
export type * from "./validator/types";
export { SchemaValidationError } from "./validator/SchemaValidationError";
export { SQLParseError } from "./errors";

export function parseSQL(input: string): Statement {
	// Step 1: Tokenize
	const lexResult = SQLLexer.tokenize(input);
	handleLexerErrors(lexResult.errors);

	// Step 2: Parse to CST
	const sqlParser = new SQLParser();
	sqlParser.input = lexResult.tokens;
	const cst = sqlParser.selectStatement();
	handleParserErrors(sqlParser.errors);

	// Step 3: Build AST from CST
	const astBuilder = createASTBuilder(sqlParser);
	const ast = astBuilder.visit(cst) as Statement;

	return ast;
}

export function validateSQL(input: string, schema: DatabaseSchema): void {
	// Parse SQL to AST
	const ast = parseSQL(input);

	// Only SELECT statements are supported for validation
	if (ast.type !== "SelectStatement") {
		throw new Error("Only SELECT statements are currently supported for validation");
	}

	// Validate against schema
	const validator = new SchemaValidator(schema);
	const errors = validator.validate(ast as SelectStatement);

	// Throw if validation errors found
	if (errors.length > 0) {
		throw new SchemaValidationError(errors);
	}
}
