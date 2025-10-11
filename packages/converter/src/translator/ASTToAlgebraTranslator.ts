import type { RelationalAlgebraNode } from "../algebra/types";
import type {
	SelectStatement,
	Column,
	Expression,
	BinaryExpression,
	LogicalExpression,
	Operand,
	TableSource,
	SubquerySource,
	JoinClause,
} from "../ast/types";
import type { TranslationResult } from "./types";

/**
 * Translates SQL AST to Relational Algebra
 *
 * This class converts parsed SQL Abstract Syntax Trees into
 * Relational Algebra expressions that can be used for query
 * optimization and execution planning.
 *
 * @example
 * ```typescript
 * const translator = new ASTToAlgebraTranslator();
 * const result = translator.translate(ast);
 *
 * if (result.success) {
 *   console.log('Relational Algebra:', result.algebra);
 * }
 * ```
 */
export class ASTToAlgebraTranslator {
	/**
	 * Translates a SELECT statement AST into Relational Algebra
	 *
	 * @param ast - The SELECT statement AST to translate
	 * @returns Translation result with algebra expression or error details
	 */
	translate(ast: SelectStatement): TranslationResult {
		try {
			// 1. Start with base relation(s) from FROM clause
			let algebra: RelationalAlgebraNode = this.translateFromClause(ast.from);

			// 2. Apply JOIN operations if present
			if (ast.joins && ast.joins.length > 0) {
				algebra = this.applyJoins(algebra, ast.joins);
			}

			// 3. Apply WHERE clause as Selection operation
			if (ast.where) {
				const condition = this.buildConditionString(ast.where.condition);
				algebra = {
					type: "Selection",
					condition,
					input: algebra,
				};
			}

			// 4. Apply SELECT columns as Projection operation
			const columnNames = this.extractColumnNames(ast.columns);
			algebra = {
				type: "Projection",
				attributes: columnNames,
				input: algebra,
			};

			return {
				success: true,
				algebra,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				details: [
					error instanceof Error ? error.stack || error.message : String(error),
				],
			};
		}
	}

	/**
	 * Translates the FROM clause into a base relation
	 *
	 * @param from - The FROM clause to translate
	 * @returns Relational Algebra node representing the FROM clause
	 */
	private translateFromClause(
		from: SelectStatement["from"],
	): RelationalAlgebraNode {
		if (from.source.type === "TableSource") {
			return {
				type: "Relation",
				name: (from.source as TableSource).table,
			};
		} else if (from.source.type === "SubquerySource") {
			return this.translateSubquery((from.source as SubquerySource).subquery);
		}

		throw new Error(`Unknown FROM source type: ${(from.source as any).type}`);
	}

	/**
	 * Applies JOIN operations to the base relation
	 *
	 * @param base - The base relational algebra node
	 * @param joins - Array of JOIN clauses to apply
	 * @returns Relational Algebra node with JOINs applied
	 */
	private applyJoins(
		base: RelationalAlgebraNode,
		joins: JoinClause[],
	): RelationalAlgebraNode {
		let result = base;

		for (const join of joins) {
			// Build the condition string for the JOIN
			const condition = this.buildConditionString(join.on);

			// Create a Join node with left (current result) and right (join table)
			result = {
				type: "Join",
				condition,
				left: result,
				right: {
					type: "Relation",
					name: join.table,
				},
			};
		}

		return result;
	}

	/**
	 * Converts a relational algebra node to a string representation
	 *
	 * @param node - The node to convert
	 * @returns String representation of the node
	 */
	private nodeToString(node: RelationalAlgebraNode): string {
		if (node.type === "Relation") {
			return node.name;
		} else if (node.type === "Selection") {
			return `σ[${node.condition}](${this.nodeToString(node.input)})`;
		} else if (node.type === "Projection") {
			const attrs = node.attributes.join(", ");
			return `π[${attrs}](${this.nodeToString(node.input)})`;
		} else if (node.type === "Join") {
			return `⨝[${node.condition}](${this.nodeToString(node.left)}, ${this.nodeToString(node.right)})`;
		} else if (node.type === "CrossProduct") {
			return `(${this.nodeToString(node.left)} × ${this.nodeToString(node.right)})`;
		}
		return "unknown";
	}

	/**
	 * Translates a subquery into a Relational Algebra node
	 *
	 * @param subquery - The subquery SELECT statement
	 * @returns Relational Algebra node representing the subquery
	 */
	private translateSubquery(subquery: SelectStatement): RelationalAlgebraNode {
		const result = this.translate(subquery);
		if (!result.success) {
			throw new Error(`Subquery translation failed: ${result.error}`);
		}
		return result.algebra;
	}

	/**
	 * Builds a condition string from an expression AST
	 *
	 * @param expression - The expression to convert
	 * @returns String representation of the condition
	 */
	private buildConditionString(expression: Expression): string {
		if (expression.type === "BinaryExpression") {
			const bin = expression as BinaryExpression;
			const left = this.operandToString(bin.left);
			const right = this.operandToString(bin.right);
			return `${left} ${bin.operator} ${right}`;
		} else if (expression.type === "LogicalExpression") {
			const log = expression as LogicalExpression;
			const left = this.buildConditionString(log.left);
			const right = this.buildConditionString(log.right);
			return `(${left} ${log.operator} ${right})`;
		}

		throw new Error(`Unknown expression type: ${(expression as any).type}`);
	}

	/**
	 * Converts an operand to a string representation
	 *
	 * @param operand - The operand to convert
	 * @returns String representation of the operand
	 */
	private operandToString(operand: Operand): string {
		if (operand.type === "ColumnReference") {
			return operand.name;
		} else if (operand.type === "NumberLiteral") {
			return String(operand.value);
		} else if (operand.type === "StringLiteral") {
			return `'${operand.value}'`;
		}

		throw new Error(`Unknown operand type: ${(operand as any).type}`);
	}

	/**
	 * Extracts column names from SELECT clause
	 *
	 * @param columns - Array of column definitions
	 * @returns Array of column name strings
	 */
	private extractColumnNames(columns: Column[]): string[] {
		const result: string[] = [];

		for (const col of columns) {
			if (col.type === "StarColumn") {
				result.push("*");
			} else if (col.type === "NamedColumn") {
				result.push(col.name);
			}
		}

		return result;
	}

	/**
	 * Converts a relational algebra node to a readable string representation
	 * Uses standard relational algebra notation with Greek symbols
	 *
	 * @param node - The relational algebra node to convert
	 * @returns String representation in relational algebra notation
	 */
	algebraToString(node: RelationalAlgebraNode): string {
		return this.nodeToString(node);
	}
}

/**
 * Converts a TranslationResult to a display string
 *
 * @param result - The translation result to convert
 * @returns Formatted string for display
 */
export function translationResultToString(result: TranslationResult): string {
	if (result.success) {
		const translator = new ASTToAlgebraTranslator();
		return translator.algebraToString(result.algebra);
	} else {
		return `Error: ${result.error}\nDetails:\n${result.details.join("\n")}`;
	}
}
