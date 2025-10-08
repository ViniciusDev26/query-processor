// Translator Types

import type { RelationalAlgebraNode } from "../algebra/types";

/**
 * Result of a translation operation
 */
export interface TranslationSuccess {
	success: true;
	algebra: RelationalAlgebraNode;
}

export interface TranslationError {
	success: false;
	error: string;
	details: string[];
}

export type TranslationResult = TranslationSuccess | TranslationError;

/**
 * Translation context for maintaining state during translation
 */
export interface TranslationContext {
	aliases: Map<string, string>; // Table aliases
	availableColumns: Map<string, string[]>; // Table -> columns mapping
}
