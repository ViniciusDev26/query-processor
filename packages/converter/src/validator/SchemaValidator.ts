import type {
	BinaryExpression,
	ColumnReference,
	Expression,
	Literal,
	LogicalExpression,
	NamedColumn,
	Operand,
	SelectStatement,
} from "../ast/types";
import type {
	ColumnType,
	DatabaseSchema,
	TableSchema,
	ValidationError,
} from "./types";

/**
 * Validates SQL queries against a database schema
 */
export class SchemaValidator {
	private schema: DatabaseSchema;
	private errors: ValidationError[] = [];
	private currentTable?: string;

	constructor(schema: DatabaseSchema) {
		this.schema = schema;
	}

	/**
	 * Validate a SELECT statement against the schema
	 */
	public validate(ast: SelectStatement): ValidationError[] {
		this.errors = [];
		this.currentTable = undefined;

		// Validate FROM clause
		this.validateTable(ast.from.table);
		if (this.errors.length > 0) {
			return this.errors; // Stop if table doesn't exist
		}

		// Use the actual table name from schema (case-insensitive match)
		const actualTableName = this.findTableName(ast.from.table);
		this.currentTable = actualTableName || ast.from.table;

		// Validate columns
		this.validateColumns(ast.columns);

		// Validate WHERE clause
		if (ast.where) {
			this.validateExpression(ast.where.condition);
		}

		return this.errors;
	}

	/**
	 * Validate that a table exists in the schema (case-insensitive)
	 */
	private validateTable(tableName: string): void {
		const actualTableName = this.findTableName(tableName);
		if (!actualTableName) {
			this.errors.push({
				type: "UNKNOWN_TABLE",
				message: `Table '${tableName}' does not exist in the schema`,
				table: tableName,
			});
		}
	}

	/**
	 * Find the actual table name in the schema (case-insensitive lookup)
	 */
	private findTableName(tableName: string): string | undefined {
		const lowerTableName = tableName.toLowerCase();
		return Object.keys(this.schema.tables).find(
			(name) => name.toLowerCase() === lowerTableName,
		);
	}

	/**
	 * Validate columns in SELECT clause
	 */
	private validateColumns(columns: SelectStatement["columns"]): void {
		if (!this.currentTable) return;

		for (const column of columns) {
			if (column.type === "StarColumn") {
				continue; // * is always valid
			}

			if (column.type === "NamedColumn") {
				this.validateColumnExists(column as NamedColumn);
			}
		}
	}

	/**
	 * Validate that a column exists in the current table (case-insensitive)
	 */
	private validateColumnExists(column: NamedColumn): void {
		if (!this.currentTable) return;

		const actualTableName = this.findTableName(this.currentTable);
		if (!actualTableName) return;

		const table = this.schema.tables[actualTableName];
		const actualColumnName = this.findColumnName(table, column.name);

		if (!actualColumnName) {
			this.errors.push({
				type: "UNKNOWN_COLUMN",
				message: `Column '${column.name}' does not exist in table '${this.currentTable}'`,
				table: this.currentTable,
				column: column.name,
			});
		}
	}

	/**
	 * Find the actual column name in a table (case-insensitive lookup)
	 */
	private findColumnName(table: TableSchema, columnName: string): string | undefined {
		const lowerColumnName = columnName.toLowerCase();
		return Object.keys(table.columns).find(
			(name) => name.toLowerCase() === lowerColumnName,
		);
	}

	/**
	 * Validate an expression (recursive for logical expressions)
	 */
	private validateExpression(expression: Expression): void {
		if (expression.type === "BinaryExpression") {
			this.validateBinaryExpression(expression);
		} else if (expression.type === "LogicalExpression") {
			this.validateLogicalExpression(expression);
		}
	}

	/**
	 * Validate a binary comparison expression
	 */
	private validateBinaryExpression(expression: BinaryExpression): void {
		const leftType = this.getOperandType(expression.left);
		const rightType = this.getOperandType(expression.right);

		if (!leftType || !rightType) {
			return; // Column doesn't exist, already reported
		}

		// Check type compatibility
		if (!this.areTypesCompatible(leftType, rightType, expression.operator)) {
			const leftDesc = this.getOperandDescription(expression.left);
			const rightDesc = this.getOperandDescription(expression.right);

			this.errors.push({
				type: "TYPE_MISMATCH",
				message: `Type mismatch: cannot compare ${leftDesc} (${leftType}) ${expression.operator} ${rightDesc} (${rightType})`,
			});
		}
	}

	/**
	 * Validate a logical expression (AND/OR)
	 */
	private validateLogicalExpression(expression: LogicalExpression): void {
		this.validateExpression(expression.left);
		this.validateExpression(expression.right);
	}

	/**
	 * Get the type of an operand
	 */
	private getOperandType(operand: Operand): ColumnType | null {
		if (operand.type === "ColumnReference") {
			return this.getColumnType((operand as ColumnReference).name);
		}

		if (operand.type === "NumberLiteral") {
			return "DECIMAL"; // Numbers map to DECIMAL
		}

		if (operand.type === "StringLiteral") {
			return "VARCHAR"; // Strings map to VARCHAR
		}

		return null;
	}

	/**
	 * Get the type of a column from the schema (case-insensitive)
	 */
	private getColumnType(columnName: string): ColumnType | null {
		if (!this.currentTable) return null;

		const actualTableName = this.findTableName(this.currentTable);
		if (!actualTableName) return null;

		const table = this.schema.tables[actualTableName];
		const actualColumnName = this.findColumnName(table, columnName);

		if (!actualColumnName) {
			// Report unknown column if not already reported
			if (!this.errors.some((err) => err.column === columnName)) {
				this.errors.push({
					type: "UNKNOWN_COLUMN",
					message: `Column '${columnName}' does not exist in table '${this.currentTable}'`,
					table: this.currentTable,
					column: columnName,
				});
			}
			return null;
		}

		return table.columns[actualColumnName].type;
	}

	/**
	 * Check if two types are compatible for comparison
	 */
	private areTypesCompatible(
		leftType: ColumnType,
		rightType: ColumnType,
		operator: string,
	): boolean {
		// Numeric types
		const numericTypes: ColumnType[] = ["INT", "TINYINT", "DECIMAL"];
		const isLeftNumeric = numericTypes.includes(leftType);
		const isRightNumeric = numericTypes.includes(rightType);

		// Both numeric - always compatible
		if (isLeftNumeric && isRightNumeric) {
			return true;
		}

		// String types - VARCHAR can compare with VARCHAR
		if (leftType === "VARCHAR" && rightType === "VARCHAR") {
			// Ordering comparisons on strings
			return true;
		}

		// DATETIME comparisons
		if (leftType === "DATETIME" && rightType === "DATETIME") {
			return true;
		}

		// BOOLEAN comparisons (only equality)
		if (leftType === "BOOLEAN" && rightType === "BOOLEAN") {
			return operator === "=" || operator === "!=" || operator === "<>";
		}

		// Mixed types are incompatible
		return false;
	}

	/**
	 * Get a human-readable description of an operand
	 */
	private getOperandDescription(operand: Operand): string {
		if (operand.type === "ColumnReference") {
			return `column '${(operand as ColumnReference).name}'`;
		}
		if (operand.type === "NumberLiteral") {
			return `number ${(operand as Literal & { value: number }).value}`;
		}
		if (operand.type === "StringLiteral") {
			return `string '${(operand as Literal & { value: string }).value}'`;
		}
		return "unknown";
	}
}
