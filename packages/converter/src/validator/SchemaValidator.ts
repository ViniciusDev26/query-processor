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
	private availableTables: Map<string, string> = new Map(); // alias -> tableName

	constructor(schema: DatabaseSchema) {
		this.schema = schema;
	}

	/**
	 * Validate a SELECT statement against the schema
	 */
	public validate(ast: SelectStatement): ValidationError[] {
		this.errors = [];
		this.currentTable = undefined;
		this.availableTables.clear();

		// Validate FROM clause source
		if (ast.from.source.type === "TableSource") {
			const tableName = ast.from.source.table;
			this.validateTable(tableName);
			if (this.errors.length > 0) {
				return this.errors; // Stop if table doesn't exist
			}

			// Use the actual table name from schema (case-insensitive match)
			const actualTableName = this.findTableName(tableName);
			this.currentTable = actualTableName || tableName;

			// Register FROM table with its alias
			const fromAlias = ast.from.alias || this.currentTable;
			this.availableTables.set(fromAlias.toLowerCase(), this.currentTable);
		} else {
			// Subquery - validate it recursively
			const subqueryErrors = this.validate(ast.from.source.subquery);
			if (subqueryErrors.length > 0) {
				this.errors.push(...subqueryErrors);
				return this.errors;
			}

			// For subqueries, we need an alias to reference it
			if (!ast.from.alias) {
				this.errors.push({
					type: "INVALID_COMPARISON",
					message: "Subquery in FROM clause must have an alias",
				});
				return this.errors;
			}

			// Register the subquery alias (we can't validate columns from it for now)
			this.availableTables.set(ast.from.alias.toLowerCase(), ast.from.alias);
		}

		// Validate JOIN clauses
		if (ast.joins) {
			for (const join of ast.joins) {
				this.validateTable(join.table);
				const actualJoinTableName = this.findTableName(join.table);
				if (actualJoinTableName) {
					const joinAlias = join.alias || actualJoinTableName;
					this.availableTables.set(joinAlias.toLowerCase(), actualJoinTableName);
				}

				// Validate ON condition (if present - not required for CROSS JOIN)
				if (join.on) {
					this.validateExpression(join.on);
				}
			}
		}

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
	 * Supports qualified column names (table.column or alias.column)
	 */
	private validateColumnExists(column: NamedColumn): void {
		// Check if it's a qualified column reference (table.column)
		const parts = column.name.split(".");
		let tableName: string;
		let actualColumnName: string;

		if (parts.length === 2) {
			// Qualified reference: table.column or alias.column
			const tableOrAlias = parts[0];
			actualColumnName = parts[1];

			// Try to find table by alias first
			const resolvedTable = this.availableTables.get(tableOrAlias.toLowerCase());
			if (!resolvedTable) {
				this.errors.push({
					type: "UNKNOWN_TABLE",
					message: `Table or alias '${tableOrAlias}' does not exist`,
					table: tableOrAlias,
				});
				return;
			}
			tableName = resolvedTable;
		} else {
			// Unqualified reference: just column name
			actualColumnName = column.name;

			// If we have multiple tables (JOINs), column reference is ambiguous
			if (this.availableTables.size > 1) {
				// Try to find the column in any of the available tables
				let foundInTables: string[] = [];
				for (const [, tblName] of this.availableTables) {
					const actualTblName = this.findTableName(tblName);
					if (!actualTblName) continue;

					const table = this.schema.tables[actualTblName];
					const foundColumn = this.findColumnName(table, actualColumnName);
					if (foundColumn) {
						foundInTables.push(actualTblName);
					}
				}

				if (foundInTables.length === 0) {
					this.errors.push({
						type: "UNKNOWN_COLUMN",
						message: `Column '${column.name}' does not exist in any joined table`,
						column: column.name,
					});
					return;
				}

				if (foundInTables.length > 1) {
					this.errors.push({
						type: "INVALID_COMPARISON",
						message: `Column '${column.name}' is ambiguous (found in tables: ${foundInTables.join(", ")})`,
						column: column.name,
					});
					return;
				}

				// Found in exactly one table - OK
				return;
			}

			// Single table case
			if (!this.currentTable) return;
			tableName = this.currentTable;
		}

		// Validate the column exists in the resolved table
		const actualTableName = this.findTableName(tableName);
		if (!actualTableName) return;

		const table = this.schema.tables[actualTableName];
		const foundColumnName = this.findColumnName(table, actualColumnName);

		if (!foundColumnName) {
			this.errors.push({
				type: "UNKNOWN_COLUMN",
				message: `Column '${actualColumnName}' does not exist in table '${tableName}'`,
				table: tableName,
				column: actualColumnName,
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
	 * Supports qualified column names (table.column or alias.column)
	 */
	private getColumnType(columnName: string): ColumnType | null {
		// Check if it's a qualified column reference (table.column)
		const parts = columnName.split(".");
		let tableName: string;
		let actualColumnName: string;

		if (parts.length === 2) {
			// Qualified reference: table.column or alias.column
			const tableOrAlias = parts[0];
			actualColumnName = parts[1];

			// Try to find table by alias first
			const resolvedTable = this.availableTables.get(tableOrAlias.toLowerCase());
			if (!resolvedTable) {
				this.errors.push({
					type: "UNKNOWN_TABLE",
					message: `Table or alias '${tableOrAlias}' does not exist`,
					table: tableOrAlias,
				});
				return null;
			}
			tableName = resolvedTable;
		} else {
			// Unqualified reference: just column name
			actualColumnName = columnName;

			// If we have multiple tables (JOINs), we need to search in all
			if (this.availableTables.size > 1) {
				// Try to find the column in any of the available tables
				for (const [, tblName] of this.availableTables) {
					const actualTblName = this.findTableName(tblName);
					if (!actualTblName) continue;

					const table = this.schema.tables[actualTblName];
					const foundColumn = this.findColumnName(table, actualColumnName);
					if (foundColumn) {
						return table.columns[foundColumn].type;
					}
				}

				// Column not found in any table
				this.errors.push({
					type: "UNKNOWN_COLUMN",
					message: `Column '${columnName}' is ambiguous or does not exist in any joined table`,
					column: columnName,
				});
				return null;
			}

			// Single table case
			if (!this.currentTable) return null;
			tableName = this.currentTable;
		}

		const actualTableName = this.findTableName(tableName);
		if (!actualTableName) return null;

		const table = this.schema.tables[actualTableName];
		const foundColumnName = this.findColumnName(table, actualColumnName);

		if (!foundColumnName) {
			// Report unknown column if not already reported
			if (!this.errors.some((err) => err.column === actualColumnName)) {
				this.errors.push({
					type: "UNKNOWN_COLUMN",
					message: `Column '${actualColumnName}' does not exist in table '${tableName}'`,
					table: tableName,
					column: actualColumnName,
				});
			}
			return null;
		}

		return table.columns[foundColumnName].type;
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
