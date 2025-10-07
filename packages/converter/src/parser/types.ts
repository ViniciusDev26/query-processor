import type { CstNode, IToken } from "chevrotain";

export interface CstContext {
	[key: string]: CstNode[] | IToken[] | undefined;
}
