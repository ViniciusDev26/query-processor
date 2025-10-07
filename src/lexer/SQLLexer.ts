import { Lexer } from "chevrotain";
import { allTokens } from "./tokens/index";

// Re-export all tokens for convenience
export * from "./tokens/index";

export const SQLLexer = new Lexer(allTokens);
