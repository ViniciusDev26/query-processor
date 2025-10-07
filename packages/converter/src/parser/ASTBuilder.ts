import type { CstNode, IToken } from "chevrotain";
import type {
	BinaryExpression,
	Column,
	ColumnReference,
	ComparisonOperator,
	Expression,
	FromClause,
	LogicalExpression,
	NamedColumn,
	NumberLiteral,
	Operand,
	SelectStatement,
	StarColumn,
	StringLiteral,
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
			if (!ctx.Identifier) {
				throw new Error("Missing Identifier in selectStatement");
			}

			const columnListNodes = ctx.columnList;
			if (!isCstNodeArray(columnListNodes)) {
				throw new Error("columnList is not a CstNode array");
			}

			const columns = this.visit(columnListNodes) as Column[];
			const identifierTokens = ctx.Identifier as IToken[];
			const tableName = identifierTokens[0].image;
			const from: FromClause = {
				type: "FromClause",
				table: tableName,
			};

			// Handle alias: either "AS alias" or implicit "alias"
			if (identifierTokens.length > 1) {
				from.alias = identifierTokens[1].image;
			}

			const statement: SelectStatement = {
				type: "SelectStatement",
				columns,
				from,
			};

			if (ctx.whereClause) {
				const whereClauseNodes = ctx.whereClause;
				if (isCstNodeArray(whereClauseNodes)) {
					statement.where = this.visit(whereClauseNodes) as WhereClause;
				}
			}

			return statement;
		}

		columnList(ctx: CstContext): Column[] {
			if (ctx.Star) {
				const starColumn: StarColumn = {
					type: "StarColumn",
				};
				return [starColumn];
			}

			const identifierTokens = ctx.Identifier as IToken[];
			const columns: NamedColumn[] = identifierTokens.map((token: IToken) => ({
				type: "NamedColumn" as const,
				name: token.image,
			}));

			return columns;
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
			if (!ctx.comparisonExpression) {
				throw new Error("Missing comparisonExpression in andExpression");
			}

			const comparisonExpressions = ctx.comparisonExpression as CstNode[];
			let left: Expression = this.visit(comparisonExpressions[0]) as Expression;

			if (ctx.And) {
				const andTokens = ctx.And as IToken[];
				for (let i = 0; i < andTokens.length; i++) {
					const right: Expression = this.visit(
						comparisonExpressions[i + 1],
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
				const columnRef: ColumnReference = {
					type: "ColumnReference",
					name: identifierTokens[0].image,
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
