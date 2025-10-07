import type { Statement } from "./ast/types";
import { handleLexerErrors, handleParserErrors } from "./errors";
import { SQLLexer } from "./lexer/SQLLexer";
import { createASTBuilder } from "./parser/ASTBuilder";
import { SQLParser } from "./parser/SQLParser";

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
	const ast = astBuilder.visit(cst);

	return ast;
}
