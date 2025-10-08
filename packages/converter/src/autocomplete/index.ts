/**
 * Autocomplete module
 * Provides autocomplete suggestions based on the SQL grammar and schema
 */

import { allTokens } from "../lexer/tokens";
import type { DatabaseSchema } from "../validator/types";
import { parseSQL, type SelectStatement, type TableSource } from "../index";

export interface AutocompleteSuggestion {
	label: string;
	kind: SuggestionKind;
	insertText: string;
	detail?: string;
	documentation?: string;
	sortText?: string;
}

export enum SuggestionKind {
	Keyword = 14,
	Table = 7,
	Column = 5,
	Function = 3,
	Operator = 24,
}

export interface AutocompleteContext {
	/** SQL text up to cursor position */
	sqlText: string;
	/** Database schema for table/column suggestions */
	schema?: DatabaseSchema;
}

export interface AutocompleteResult {
	suggestions: AutocompleteSuggestion[];
	/** Context information for debugging */
	context?: {
		isAfterFrom: boolean;
		isAfterJoin: boolean;
		isAfterSelect: boolean;
		isAfterWhere: boolean;
		availableTables: string[];
	};
}

/**
 * Get SQL keywords from the lexer tokens
 */
export function getSqlKeywords(): string[] {
	const keywords: string[] = [];

	for (const token of allTokens) {
		// Keywords have patterns and are not WhiteSpace or Identifier
		if (
			token.name !== "WhiteSpace" &&
			token.name !== "Identifier" &&
			token.name !== "NumberLiteral" &&
			token.name !== "StringLiteral" &&
			!token.name.includes("LParen") &&
			!token.name.includes("RParen") &&
			!token.name.includes("Comma") &&
			!token.name.includes("Dot") &&
			!token.name.includes("Star")
		) {
			// Extract the keyword from the token pattern
			const pattern = token.PATTERN;
			if (pattern instanceof RegExp) {
				const match = pattern.source.match(/^([A-Z\s]+)(?:\$|\/i)?$/);
				if (match) {
					keywords.push(match[1].replace(/\\/g, ""));
				}
			}
		}
	}

	return keywords;
}

/**
 * Get comparison operators from the lexer tokens
 */
export function getComparisonOperators(): string[] {
	return ["=", "!=", "<", ">", "<=", ">="];
}

/**
 * Analyzes SQL context using the parser AST
 */
function analyzeContext(sqlText: string) {
	const context = {
		isAfterFrom: false,
		isAfterJoin: false,
		isAfterSelect: false,
		isAfterWhere: false,
		availableTables: [] as string[],
	};

	// Try to parse to get available tables
	const parseResult = parseSQL(sqlText);
	if (parseResult.success && parseResult.ast.type === "SelectStatement") {
		const ast = parseResult.ast as SelectStatement;

		// Extract table from FROM clause
		if (ast.from?.source.type === "TableSource") {
			context.availableTables.push((ast.from.source as TableSource).table);
		}

		// Extract tables from JOINs
		if (ast.joins) {
			for (const join of ast.joins) {
				context.availableTables.push(join.table);
			}
		}
	}

	// Detect context using regex for incomplete queries
	context.isAfterSelect = /\bSELECT\s*$/i.test(sqlText);
	context.isAfterFrom = /\bFROM\s*$/i.test(sqlText);
	context.isAfterJoin = /\b(?:JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN)\s*$/i.test(
		sqlText,
	);
	context.isAfterWhere = /\bWHERE\s+(?:\w+\s+)?$/i.test(sqlText);

	// Try to extract table from incomplete FROM
	const fromMatch = sqlText.match(/\bFROM\s+(\w+)/i);
	if (fromMatch && context.availableTables.length === 0) {
		context.availableTables.push(fromMatch[1]);
	}

	return context;
}

/**
 * Get autocomplete suggestions based on context and schema
 */
export function getAutocompleteSuggestions(
	input: AutocompleteContext,
): AutocompleteResult {
	const suggestions: AutocompleteSuggestion[] = [];
	const context = analyzeContext(input.sqlText);

	// 1. Add SQL keywords
	const keywords = getSqlKeywords();
	for (const keyword of keywords) {
		suggestions.push({
			label: keyword,
			kind: SuggestionKind.Keyword,
			insertText: keyword,
			detail: "SQL Keyword",
			sortText: `9_${keyword}`, // Lower priority
		});
	}

	// 2. Add operators
	const operators = getComparisonOperators();
	for (const op of operators) {
		suggestions.push({
			label: op,
			kind: SuggestionKind.Operator,
			insertText: op,
			detail: "Comparison Operator",
			sortText: `8_${op}`,
		});
	}

	if (!input.schema) {
		return { suggestions, context };
	}

	// 3. Add tables (when after FROM or JOIN)
	if (context.isAfterFrom || context.isAfterJoin) {
		for (const [tableName, table] of Object.entries(input.schema.tables)) {
			const columnCount = Object.keys(table.columns).length;
			const primaryKey = Object.entries(table.columns).find(
				([_, col]) => col.primaryKey,
			)?.[0];

			suggestions.push({
				label: tableName,
				kind: SuggestionKind.Table,
				insertText: tableName,
				detail: `Table (${columnCount} columns)`,
				documentation: `Primary Key: ${primaryKey || "none"}\n\nColumns: ${Object.keys(table.columns).join(", ")}`,
				sortText: `0_${tableName}`, // High priority
			});
		}
	}

	// 4. Add columns based on available tables
	if (context.availableTables.length > 0) {
		// Suggest columns from tables in the current query
		for (const tableName of context.availableTables) {
			const tableEntry = Object.entries(input.schema.tables).find(
				([name]) => name.toLowerCase() === tableName.toLowerCase(),
			);

			if (tableEntry) {
				const [actualTableName, table] = tableEntry;
				for (const [columnName, columnDef] of Object.entries(table.columns)) {
					// Unqualified column name
					suggestions.push({
						label: columnName,
						kind: SuggestionKind.Column,
						insertText: columnName,
						detail: `${actualTableName}.${columnName} - ${columnDef.type}${columnDef.length ? `(${columnDef.length})` : ""}`,
						documentation: `Column from table '${actualTableName}'${columnDef.primaryKey ? " (Primary Key)" : ""}`,
						sortText: `1_${columnName}`,
					});

					// Qualified column name
					suggestions.push({
						label: `${actualTableName}.${columnName}`,
						kind: SuggestionKind.Column,
						insertText: `${actualTableName}.${columnName}`,
						detail: `${columnDef.type}${columnDef.length ? `(${columnDef.length})` : ""}`,
						documentation: `Column from table '${actualTableName}'${columnDef.primaryKey ? " (Primary Key)" : ""}`,
						sortText: `2_${actualTableName}_${columnName}`,
					});
				}
			}
		}
	} else {
		// No specific tables - suggest all columns with table prefix
		for (const [tableName, table] of Object.entries(input.schema.tables)) {
			for (const [columnName, columnDef] of Object.entries(table.columns)) {
				suggestions.push({
					label: `${tableName}.${columnName}`,
					kind: SuggestionKind.Column,
					insertText: `${tableName}.${columnName}`,
					detail: `${columnDef.type}${columnDef.length ? `(${columnDef.length})` : ""}`,
					documentation: `Column from table '${tableName}'${columnDef.primaryKey ? " (Primary Key)" : ""}`,
					sortText: `3_${tableName}_${columnName}`,
				});
			}
		}
	}

	return { suggestions, context };
}
