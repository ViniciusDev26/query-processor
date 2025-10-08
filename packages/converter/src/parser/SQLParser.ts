import { CstParser } from "chevrotain";
import {
	allTokens,
	And,
	As,
	Comma,
	Dot,
	Equals,
	From,
	GreaterThan,
	GreaterThanOrEqual,
	Identifier,
	Inner,
	Join,
	LessThan,
	LessThanOrEqual,
	LParen,
	NotEquals,
	NumberLiteral,
	On,
	Or,
	RParen,
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

	// SELECT column1, column2, ... FROM table [AS alias] [JOIN ...] [WHERE condition]
	public selectStatement = this.RULE("selectStatement", () => {
		this.CONSUME(Select);
		this.SUBRULE(this.columnList);
		this.CONSUME(From);
		this.OR([
			{ ALT: () => this.CONSUME(Identifier) },
			{ ALT: () => this.CONSUME(StringLiteral) },
		]);
		this.OPTION(() => {
			this.OR2([
				{
					ALT: () => {
						this.CONSUME(As);
						this.CONSUME2(Identifier);
					},
				},
				{ ALT: () => this.CONSUME3(Identifier) },
			]);
		});
		this.MANY(() => {
			this.SUBRULE(this.joinClause);
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

	// [INNER] JOIN table [AS alias] ON condition
	private joinClause = this.RULE("joinClause", () => {
		this.OPTION(() => {
			this.CONSUME(Inner);
		});
		this.CONSUME(Join);
		this.OR([
			{ ALT: () => this.CONSUME(Identifier) },
			{ ALT: () => this.CONSUME(StringLiteral) },
		]);
		this.OPTION2(() => {
			this.OR2([
				{
					ALT: () => {
						this.CONSUME(As);
						this.CONSUME2(Identifier);
					},
				},
				{ ALT: () => this.CONSUME3(Identifier) },
			]);
		});
		this.CONSUME(On);
		this.SUBRULE(this.orExpression);
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
		this.SUBRULE(this.primaryExpression);
		this.MANY(() => {
			this.CONSUME(And);
			this.SUBRULE2(this.primaryExpression);
		});
	});

	// ( expression ) | comparisonExpression
	private primaryExpression = this.RULE("primaryExpression", () => {
		this.OR([
			{
				ALT: () => {
					this.CONSUME(LParen);
					this.SUBRULE(this.orExpression);
					this.CONSUME(RParen);
				},
			},
			{ ALT: () => this.SUBRULE(this.comparisonExpression) },
		]);
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

	// identifier | table.column | number | string
	private operand = this.RULE("operand", () => {
		this.OR([
			{
				ALT: () => {
					this.CONSUME(Identifier);
					this.OPTION(() => {
						this.CONSUME(Dot);
						this.CONSUME2(Identifier);
					});
				},
			},
			{ ALT: () => this.CONSUME(NumberLiteral) },
			{ ALT: () => this.CONSUME(StringLiteral) },
		]);
	});
}
