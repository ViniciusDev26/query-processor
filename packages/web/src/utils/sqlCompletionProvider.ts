import {
	getAutocompleteSuggestions,
	type DatabaseSchema,
} from "@query-processor/converter";
import type { languages } from "monaco-editor";

/**
 * Creates a completion provider for SQL that suggests tables and columns
 * based on the database schema and parser/lexer rules from the converter package
 */
export function createSqlCompletionProvider(
	schema: DatabaseSchema,
): languages.CompletionItemProvider {
	return {
		provideCompletionItems: (model, position) => {
			const word = model.getWordUntilPosition(position);
			const range = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: word.startColumn,
				endColumn: word.endColumn,
			};

			const textUntilPosition = model.getValueInRange({
				startLineNumber: 1,
				startColumn: 1,
				endLineNumber: position.lineNumber,
				endColumn: position.column,
			});

			// Use the converter's autocomplete function
			const result = getAutocompleteSuggestions({
				sqlText: textUntilPosition,
				schema,
			});

			// Convert converter suggestions to Monaco suggestions
			const monacoSuggestions: languages.CompletionItem[] =
				result.suggestions.map((suggestion) => ({
					label: suggestion.label,
					kind: suggestion.kind as unknown as languages.CompletionItemKind,
					insertText: suggestion.insertText,
					range: range,
					detail: suggestion.detail,
					documentation: suggestion.documentation,
					sortText: suggestion.sortText,
				}));

			return { suggestions: monacoSuggestions };
		},
	};
}
