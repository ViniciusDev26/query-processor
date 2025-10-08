/**
 * Column data types supported in the schema definition
 */
export type ColumnType =
	| "INT"
	| "TINYINT"
	| "VARCHAR"
	| "DATETIME"
	| "DECIMAL"
	| "BOOLEAN";

/**
 * Column definition in a table schema
 */
export interface ColumnDefinition {
	/** Data type of the column */
	type: ColumnType;
	/** Maximum length for VARCHAR type (e.g., 45, 255) */
	length?: number;
	/** Precision for DECIMAL type (total number of digits, e.g., 10) */
	precision?: number;
	/** Scale for DECIMAL type (number of digits after decimal point, e.g., 2) */
	scale?: number;
	/** Whether the column can be null */
	nullable?: boolean;
	/** Whether the column is a primary key */
	primaryKey?: boolean;
	/** Whether the column is unique */
	unique?: boolean;
}

/**
 * Table schema definition
 */
export interface TableSchema {
	/** Map of column names to their definitions */
	columns: Record<string, ColumnDefinition>;
}

/**
 * Database schema containing all table definitions
 */
export interface DatabaseSchema {
	/** Map of table names to their schemas */
	tables: Record<string, TableSchema>;
}

/**
 * Validation error details
 */
export interface ValidationError {
	/** Error type */
	type:
		| "UNKNOWN_TABLE"
		| "UNKNOWN_COLUMN"
		| "TYPE_MISMATCH"
		| "INVALID_COMPARISON"
		| "AMBIGUOUS_COLUMN";
	/** Error message */
	message: string;
	/** Table name if applicable */
	table?: string;
	/** Column name if applicable */
	column?: string;
}
