import type { CstNode, IToken } from "chevrotain";

export function isCstNodeArray(
	value: CstNode[] | IToken[] | undefined,
): value is CstNode[] {
	if (!value || value.length === 0) return false;
	return "name" in value[0] && "children" in value[0];
}
