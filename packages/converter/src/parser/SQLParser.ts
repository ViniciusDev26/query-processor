import { CstParser } from "chevrotain";
import {
	allTokens,
	And,
	As,
	Comma,
	Equals,
	From,
	GreaterThan,
	GreaterThanOrEqual,
	Identifier,
	LessThan,
	LessThanOrEqual,
	NotEquals,
	NumberLiteral,
	Or,
	Select,
	Star,
	StringLiteral,
	Where,
} from "../lexer/SQLLexer";

export class SQLParser extends CstParser {
	constructor() {
		super(allTokens);
		this.performSelfAnalysis();
	}

	// SELECT column1, column2, ... FROM table [AS alias] [WHERE condition]
	public selectStatement = this.RULE("selectStatement", () => {
		this.CONSUME(Select);
		this.SUBRULE(this.columnList);
		this.CONSUME(From);
		this.CONSUME(Identifier);
		this.OPTION(() => {
			this.OR([
				{
					ALT: () => {
						this.CONSUME(As);
						this.CONSUME2(Identifier);
					},
				},
				{ ALT: () => this.CONSUME3(Identifier) },
			]);
		});
		this.OPTION2(() => {
			this.SUBRULE(this.whereClause);
		});
	});

	// column1, column2, ... | *
	private columnList = this.RULE("columnList", () => {
		this.OR([
			{
				ALT: () => {
					this.CONSUME(Star);
				},
			},
			{
				ALT: () => {
					this.CONSUME(Identifier);
					this.MANY(() => {
						this.CONSUME(Comma);
						this.CONSUME2(Identifier);
					});
				},
			},
		]);
	});

	// WHERE condition
	private whereClause = this.RULE("whereClause", () => {
		this.CONSUME(Where);
		this.SUBRULE(this.orExpression);
	});

	// expression OR expression
	private orExpression = this.RULE("orExpression", () => {
		this.SUBRULE(this.andExpression);
		this.MANY(() => {
			this.CONSUME(Or);
			this.SUBRULE2(this.andExpression);
		});
	});

	// expression AND expression
	private andExpression = this.RULE("andExpression", () => {
		this.SUBRULE(this.comparisonExpression);
		this.MANY(() => {
			this.CONSUME(And);
			this.SUBRULE2(this.comparisonExpression);
		});
	});

	// operand operator operand
	private comparisonExpression = this.RULE("comparisonExpression", () => {
		this.SUBRULE(this.operand);
		this.SUBRULE(this.comparisonOperator);
		this.SUBRULE2(this.operand);
	});

	// =, !=, <>, <, <=, >, >=
	private comparisonOperator = this.RULE("comparisonOperator", () => {
		this.OR([
			{ ALT: () => this.CONSUME(Equals) },
			{ ALT: () => this.CONSUME(NotEquals) },
			{ ALT: () => this.CONSUME(LessThan) },
			{ ALT: () => this.CONSUME(LessThanOrEqual) },
			{ ALT: () => this.CONSUME(GreaterThan) },
			{ ALT: () => this.CONSUME(GreaterThanOrEqual) },
		]);
	});

	// identifier | number | string
	private operand = this.RULE("operand", () => {
		this.OR([
			{ ALT: () => this.CONSUME(Identifier) },
			{ ALT: () => this.CONSUME(NumberLiteral) },
			{ ALT: () => this.CONSUME(StringLiteral) },
		]);
	});
}
