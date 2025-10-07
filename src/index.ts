import type { SelectStatement } from "./ast/types";
import { SQLLexer } from "./lexer/SQLLexer";
import { createASTBuilder } from "./parser/ASTBuilder";
import { SQLParser } from "./parser/SQLParser";

export function parseSQL(input: string): SelectStatement {
	// Step 1: Tokenize
	const lexResult = SQLLexer.tokenize(input);

	if (lexResult.errors.length > 0) {
		throw new Error(
			`Lexer errors: ${lexResult.errors.map((e) => e.message).join(", ")}`,
		);
	}

	// Step 2: Parse to CST
	const sqlParser = new SQLParser();
	sqlParser.input = lexResult.tokens;
	const cst = sqlParser.selectStatement();

	if (sqlParser.errors.length > 0) {
		throw new Error(
			`Parser errors: ${sqlParser.errors.map((e) => e.message).join(", ")}`,
		);
	}

	// Step 3: Build AST from CST
	const astBuilder = createASTBuilder(sqlParser);
	const ast = astBuilder.visit(cst);

	return ast;
}
