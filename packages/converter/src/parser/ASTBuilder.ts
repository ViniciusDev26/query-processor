import type { CstNode, IToken } from "chevrotain";
import type {
	BinaryExpression,
	Column,
	ColumnReference,
	ComparisonOperator,
	Expression,
	FromClause,
	JoinClause,
	LogicalExpression,
	NamedColumn,
	NumberLiteral,
	Operand,
	SelectStatement,
	StarColumn,
	StringLiteral,
	SubquerySource,
	TableSource,
	WhereClause,
} from "../ast/types";
import type { SQLParser } from "./SQLParser";
import type { CstContext } from "./types";
import { isCstNodeArray } from "./utils";

export function createASTBuilder(parser: SQLParser) {
	const BaseSQLVisitor = parser.getBaseCstVisitorConstructor();

	class ASTBuilder extends BaseSQLVisitor {
		constructor() {
			super();
			this.validateVisitor();
		}

		selectStatement(ctx: CstContext): SelectStatement {
			if (!ctx.columnList) {
				throw new Error("Missing columnList in selectStatement");
			}

			const columnListNodes = ctx.columnList;
			if (!isCstNodeArray(columnListNodes)) {
				throw new Error("columnList is not a CstNode array");
			}

			const columns = this.visit(columnListNodes) as Column[];

			// Process FROM source (table or subquery)
			if (!ctx.fromSource) {
				throw new Error("Missing fromSource in selectStatement");
			}

			const fromSourceNodes = ctx.fromSource;
			if (!isCstNodeArray(fromSourceNodes)) {
				throw new Error("fromSource is not a CstNode array");
			}

			const source = this.visit(fromSourceNodes) as TableSource | SubquerySource;

			const from: FromClause = {
				type: "FromClause",
				source,
			};

			// Handle alias: either "AS alias" or implicit "alias"
			if (ctx.Identifier) {
				const identifierTokens = ctx.Identifier as IToken[];
				// The first identifier is the alias (could be after AS or implicit)
				from.alias = identifierTokens[0].image;
			}

			const statement: SelectStatement = {
				type: "SelectStatement",
				columns,
				from,
			};

			// Handle joins
			if (ctx.joinClause) {
				const joinClauseNodes = ctx.joinClause;
				if (isCstNodeArray(joinClauseNodes)) {
					statement.joins = (joinClauseNodes as CstNode[]).map((node) =>
						this.visit(node),
					) as JoinClause[];
				}
			}

			if (ctx.whereClause) {
				const whereClauseNodes = ctx.whereClause;
				if (isCstNodeArray(whereClauseNodes)) {
					statement.where = this.visit(whereClauseNodes) as WhereClause;
				}
			}

			return statement;
		}

		fromSource(ctx: CstContext): TableSource | SubquerySource {
			// Check if it's a subquery (has selectStatement)
			if (ctx.selectStatement) {
				const selectStatementNodes = ctx.selectStatement;
				if (!isCstNodeArray(selectStatementNodes)) {
					throw new Error("selectStatement is not a CstNode array");
				}

				const subquery = this.visit(selectStatementNodes) as SelectStatement;
				return {
					type: "SubquerySource",
					subquery,
				};
			}

			// Otherwise it's a table name
			let tableName: string;
			if (ctx.Identifier) {
				const identifierTokens = ctx.Identifier as IToken[];
				tableName = identifierTokens[0].image;
			} else if (ctx.StringLiteral) {
				const stringTokens = ctx.StringLiteral as IToken[];
				const rawValue = stringTokens[0].image;
				tableName = rawValue.slice(1, -1); // Remove quotes
			} else {
				throw new Error("Missing table name in fromSource");
			}

			return {
				type: "TableSource",
				table: tableName,
			};
		}

		columnList(ctx: CstContext): Column[] {
			if (ctx.Star) {
				const starColumn: StarColumn = {
					type: "StarColumn",
				};
				return [starColumn];
			}

			// Process column references (which may be qualified)
			if (ctx.columnReference) {
				const columnRefNodes = ctx.columnReference as CstNode[];
				return columnRefNodes.map((node) => this.visit(node) as Column);
			}

			throw new Error("Unknown column list format");
		}

		columnReference(ctx: CstContext): NamedColumn {
			const identifierTokens = ctx.Identifier as IToken[];
			let columnName = identifierTokens[0].image;

			// Check for qualified column reference (table.column)
			if (identifierTokens.length > 1) {
				columnName = `${identifierTokens[0].image}.${identifierTokens[1].image}`;
			}

			return {
				type: "NamedColumn",
				name: columnName,
			};
		}

		joinClause(ctx: CstContext): JoinClause {
			// Determine join type
			let joinType: "INNER" | "CROSS" = "INNER";
			if (ctx.Cross) {
				joinType = "CROSS";
			}

			// Table name can be either Identifier or StringLiteral
			let tableName: string;
			if (ctx.Identifier) {
				const identifierTokens = ctx.Identifier as IToken[];
				tableName = identifierTokens[0].image;
			} else if (ctx.StringLiteral) {
				const stringTokens = ctx.StringLiteral as IToken[];
				const rawValue = stringTokens[0].image;
				tableName = rawValue.slice(1, -1); // Remove quotes
			} else {
				throw new Error("Missing table name in joinClause");
			}

			const join: JoinClause = {
				type: "JoinClause",
				joinType,
				table: tableName,
				on: {} as Expression, // Will be set below for INNER JOIN
			};

			// Handle alias: either "AS alias" or implicit "alias"
			if (ctx.Identifier) {
				const identifierTokens = ctx.Identifier as IToken[];
				if (identifierTokens.length > 1) {
					join.alias = identifierTokens[1].image;
				}
			}

			// Handle ON condition (required for INNER JOIN, optional for CROSS JOIN)
			if (ctx.orExpression) {
				const orExpressionNodes = ctx.orExpression;
				if (!isCstNodeArray(orExpressionNodes)) {
					throw new Error("orExpression is not a CstNode array");
				}
				join.on = this.visit(orExpressionNodes) as Expression;
			} else if (joinType === "INNER") {
				throw new Error("Missing ON condition in INNER JOIN");
			}

			return join;
		}

		whereClause(ctx: CstContext): WhereClause {
			if (!ctx.orExpression) {
				throw new Error("Missing orExpression in whereClause");
			}

			const orExpressionNodes = ctx.orExpression;
			if (!isCstNodeArray(orExpressionNodes)) {
				throw new Error("orExpression is not a CstNode array");
			}

			const condition = this.visit(orExpressionNodes) as Expression;
			return {
				type: "WhereClause",
				condition,
			};
		}

		orExpression(ctx: CstContext): Expression {
			if (!ctx.andExpression) {
				throw new Error("Missing andExpression in orExpression");
			}

			const andExpressions = ctx.andExpression as CstNode[];
			let left: Expression = this.visit(andExpressions[0]) as Expression;

			if (ctx.Or) {
				const orTokens = ctx.Or as IToken[];
				for (let i = 0; i < orTokens.length; i++) {
					const right: Expression = this.visit(
						andExpressions[i + 1],
					) as Expression;
					const logicalExpr: LogicalExpression = {
						type: "LogicalExpression",
						left,
						operator: "OR",
						right,
					};
					left = logicalExpr;
				}
			}

			return left;
		}

		andExpression(ctx: CstContext): Expression {
			if (!ctx.primaryExpression) {
				throw new Error("Missing primaryExpression in andExpression");
			}

			const primaryExpressions = ctx.primaryExpression as CstNode[];
			let left: Expression = this.visit(primaryExpressions[0]) as Expression;

			if (ctx.And) {
				const andTokens = ctx.And as IToken[];
				for (let i = 0; i < andTokens.length; i++) {
					const right: Expression = this.visit(
						primaryExpressions[i + 1],
					) as Expression;
					const logicalExpr: LogicalExpression = {
						type: "LogicalExpression",
						left,
						operator: "AND",
						right,
					};
					left = logicalExpr;
				}
			}

			return left;
		}

		primaryExpression(ctx: CstContext): Expression {
			// If it's a parenthesized expression
			if (ctx.orExpression) {
				const orExpressionNodes = ctx.orExpression;
				if (!isCstNodeArray(orExpressionNodes)) {
					throw new Error("orExpression is not a CstNode array");
				}
				return this.visit(orExpressionNodes) as Expression;
			}

			// Otherwise it's a comparison expression
			if (ctx.comparisonExpression) {
				const comparisonExpressionNodes = ctx.comparisonExpression;
				if (!isCstNodeArray(comparisonExpressionNodes)) {
					throw new Error("comparisonExpression is not a CstNode array");
				}
				return this.visit(comparisonExpressionNodes) as Expression;
			}

			throw new Error("Unknown primary expression type");
		}

		comparisonExpression(ctx: CstContext): BinaryExpression {
			if (!ctx.operand) {
				throw new Error("Missing operand in comparisonExpression");
			}
			if (!ctx.comparisonOperator) {
				throw new Error("Missing comparisonOperator in comparisonExpression");
			}

			const operands = ctx.operand as CstNode[];
			const left = this.visit(operands[0]) as Operand;

			const comparisonOperatorNodes = ctx.comparisonOperator as CstNode[];
			const operator = this.visit(
				comparisonOperatorNodes[0],
			) as ComparisonOperator;

			const right = this.visit(operands[1]) as Operand;

			return {
				type: "BinaryExpression",
				left,
				operator,
				right,
			};
		}

		comparisonOperator(ctx: CstContext): ComparisonOperator {
			if (ctx.Equals) return "=";
			if (ctx.NotEquals) return "!=";
			if (ctx.LessThan) return "<";
			if (ctx.LessThanOrEqual) return "<=";
			if (ctx.GreaterThan) return ">";
			if (ctx.GreaterThanOrEqual) return ">=";
			throw new Error("Unknown comparison operator");
		}

		operand(ctx: CstContext): Operand {
			if (ctx.Identifier) {
				const identifierTokens = ctx.Identifier as IToken[];
				let columnName = identifierTokens[0].image;

				// Check for qualified column reference (table.column)
				if (identifierTokens.length > 1) {
					columnName = `${identifierTokens[0].image}.${identifierTokens[1].image}`;
				}

				const columnRef: ColumnReference = {
					type: "ColumnReference",
					name: columnName,
				};
				return columnRef;
			}

			if (ctx.NumberLiteral) {
				const numberTokens = ctx.NumberLiteral as IToken[];
				const numLiteral: NumberLiteral = {
					type: "NumberLiteral",
					value: Number.parseFloat(numberTokens[0].image),
				};
				return numLiteral;
			}

			if (ctx.StringLiteral) {
				const stringTokens = ctx.StringLiteral as IToken[];
				// Remove quotes from string literal
				const rawValue = stringTokens[0].image;
				const value = rawValue.slice(1, -1); // Remove surrounding quotes
				const strLiteral: StringLiteral = {
					type: "StringLiteral",
					value,
				};
				return strLiteral;
			}

			throw new Error("Unknown operand type");
		}
	}

	return new ASTBuilder();
}
