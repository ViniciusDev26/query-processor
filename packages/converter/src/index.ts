import type { SelectStatement, Statement } from "./ast/types";
import { SQLLexer } from "./lexer/SQLLexer";
import { RelationalAlgebraOptimizer } from "./optimizer/RelationalAlgebraOptimizer";
import type { OptimizationResult } from "./optimizer/types";
import { createASTBuilder } from "./parser/ASTBuilder";
import { SQLParser } from "./parser/SQLParser";
import {
	ASTToAlgebraTranslator,
	translationResultToString,
} from "./translator";
import type { TranslationResult } from "./translator/types";
import { SchemaValidator } from "./validator/SchemaValidator";
import type { DatabaseSchema, ValidationError } from "./validator/types";

// Re-export types
export type * from "./ast/types";
export type * from "./autocomplete";
// Re-export autocomplete functions
export {
	getAutocompleteSuggestions,
	getComparisonOperators,
	getSqlKeywords,
	SuggestionKind,
} from "./autocomplete";
export { SQLParseError } from "./errors";
export { RelationalAlgebraOptimizer } from "./optimizer";
export type * from "./optimizer/types";
export {
	ASTToAlgebraTranslator,
	translationResultToString,
	AlgebraToMermaidTranslator,
	algebraToMermaidMarkdown,
} from "./translator";
export type * from "./translator/types";
export { SchemaValidationError } from "./validator/SchemaValidationError";
export type * from "./validator/types";

export interface ParseSuccess {
	success: true;
	ast: Statement;
	translation: TranslationResult;
	translationString: string;
	optimization: OptimizationResult;
	optimizationString: string;
}

export interface ParseError {
	success: false;
	error: string;
	details: string[];
}

export type ParseResult = ParseSuccess | ParseError;

export function parseSQL(input: string): ParseResult {
	// Step 1: Tokenize
	const lexResult = SQLLexer.tokenize(input);
	if (lexResult.errors.length > 0) {
		return {
			success: false,
			error: "Lexer errors",
			details: lexResult.errors.map((e) => e.message),
		};
	}

	// Step 2: Parse to CST
	const sqlParser = new SQLParser();
	sqlParser.input = lexResult.tokens;
	const cst = sqlParser.selectStatement();
	if (sqlParser.errors.length > 0) {
		return {
			success: false,
			error: "Parser errors",
			details: sqlParser.errors.map((e) => e.message),
		};
	}

	// Step 3: Build AST from CST
	const astBuilder = createASTBuilder(sqlParser);
	const ast = astBuilder.visit(cst) as Statement;

	// Step 4: Translate to Relational Algebra (only for SELECT statements)
	if (ast.type !== "SelectStatement") {
		return {
			success: false,
			error: "Translation not supported",
			details: [
				`Translation is only supported for SELECT statements, got ${ast.type}`,
			],
		};
	}

	const translator = new ASTToAlgebraTranslator();
	const translation = translator.translate(ast as SelectStatement);

	// If translation failed, return error
	if (!translation.success) {
		return {
			success: false,
			error: translation.error,
			details: translation.details,
		};
	}

	// Step 5: Optimize the relational algebra tree
	const optimizer = new RelationalAlgebraOptimizer();
	const optimization = optimizer.optimize(translation.algebra);
	const optimizationString = translationResultToString({
		success: true,
		algebra: optimization.optimized,
	});
	const translationString = translationResultToString(translation);

	return {
		success: true,
		ast,
		translation,
		translationString,
		optimization,
		optimizationString,
	};
}

export function validateSQL(
	input: string,
	schema: DatabaseSchema,
): ValidationError[] {
	// Parse SQL to AST
	const parseResult = parseSQL(input);

	// Handle parse errors
	if (!parseResult.success) {
		return [
			{
				type: "INVALID_COMPARISON",
				message: parseResult.error,
			},
		];
	}

	// Only SELECT statements are supported for validation
	if (parseResult.ast.type !== "SelectStatement") {
		return [
			{
				type: "INVALID_COMPARISON",
				message:
					"Only SELECT statements are currently supported for validation",
			},
		];
	}

	// Validate against schema
	const validator = new SchemaValidator(schema);
	return validator.validate(parseResult.ast as SelectStatement);
}
