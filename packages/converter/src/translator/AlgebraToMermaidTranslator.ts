import type {
	CrossProduct,
	Join,
	Projection,
	Relation,
	RelationalAlgebraNode,
	Selection,
} from "../algebra/types";
import type { TranslationResult } from "./types";

/**
 * Context for building Mermaid diagram
 */
type MermaidContext = {
	nodeCounter: number;
	executionOrder: number;
	lines: string[];
};

/**
 * Shape types for Mermaid nodes
 */
type NodeShape = "rect" | "round" | "hexagon";

/**
 * Result of translating a node, containing the node ID and updated context
 */
type TranslationOutput = {
	nodeId: string;
	context: MermaidContext;
};

/**
 * Creates a new empty Mermaid context
 */
const createContext = (): MermaidContext => ({
	nodeCounter: 0,
	executionOrder: 0,
	lines: ["graph TD"],
});

/**
 * Generates a unique node ID and updates the counter
 */
const generateNodeId = (context: MermaidContext): TranslationOutput => ({
	nodeId: `node${context.nodeCounter}`,
	context: { ...context, nodeCounter: context.nodeCounter + 1 },
});

/**
 * Increments and returns the execution order
 */
const nextExecutionOrder = (context: MermaidContext): { order: number; context: MermaidContext } => ({
	order: context.executionOrder + 1,
	context: { ...context, executionOrder: context.executionOrder + 1 },
});

/**
 * Escapes special characters in labels for Mermaid
 */
const escapeLabel = (label: string): string =>
	label
		.replace(/\\/g, "\\\\") // Escape backslashes first
		.replace(/"/g, '\\"') // Escape quotes
		.replace(/\*/g, "\\*"); // Escape asterisks (markdown list)

/**
 * Formats a node definition with shape and optional execution order
 */
const formatNode = (
	id: string,
	label: string,
	shape: NodeShape = "rect",
	executionOrder?: number,
): string => {
	const shapeMap: Record<NodeShape, [string, string]> = {
		rect: ['["', '"]'],
		round: ['("', '")'],
		hexagon: ['{{"', '"}}'],
	};

	const [open, close] = shapeMap[shape];
	const escapedLabel = escapeLabel(label);
	const labelWithOrder = executionOrder !== undefined
		? `${executionOrder}. ${escapedLabel}`
		: escapedLabel;

	return `    ${id}${open}${labelWithOrder}${close}`;
};

/**
 * Formats an edge connection between two nodes
 */
const formatEdge = (from: string, to: string, label?: string): string =>
	label
		? `    ${from} -->|"${label}"| ${to}`
		: `    ${from} --> ${to}`;

/**
 * Adds a node to the context
 */
const addNode = (
	context: MermaidContext,
	id: string,
	label: string,
	shape: NodeShape = "rect",
	executionOrder?: number,
): MermaidContext => ({
	...context,
	lines: [...context.lines, formatNode(id, label, shape, executionOrder)],
});

/**
 * Adds an edge to the context
 */
const addEdge = (
	context: MermaidContext,
	from: string,
	to: string,
	label?: string,
): MermaidContext => ({
	...context,
	lines: [...context.lines, formatEdge(from, to, label)],
});

/**
 * Translates a Relation node
 */
const translateRelation = (
	node: Relation,
	context: MermaidContext,
): TranslationOutput => {
	const { nodeId, context: ctx1 } = generateNodeId(context);
	const { order, context: ctx2 } = nextExecutionOrder(ctx1);
	const ctx3 = addNode(ctx2, nodeId, node.name, "round", order);

	return { nodeId, context: ctx3 };
};

/**
 * Translates a Projection node
 */
const translateProjection = (
	node: Projection,
	context: MermaidContext,
): TranslationOutput => {
	const { nodeId: projId, context: ctx1 } = generateNodeId(context);

	// Translate input first (bottom-up execution)
	const { nodeId: inputId, context: ctx2 } = translateAlgebraNode(node.input, ctx1);

	// Format attributes
	const attrs = node.attributes.length === 0 || node.attributes.includes("*")
		? "\\*"
		: node.attributes.join(", ");

	// Add projection node with execution order
	const { order, context: ctx3 } = nextExecutionOrder(ctx2);
	const ctx4 = addNode(ctx3, projId, `π [${attrs}]`, "hexagon", order);

	// Connect to input
	const ctx5 = addEdge(ctx4, projId, inputId);

	return { nodeId: projId, context: ctx5 };
};

/**
 * Translates a Selection node
 */
const translateSelection = (
	node: Selection,
	context: MermaidContext,
): TranslationOutput => {
	const { nodeId: selId, context: ctx1 } = generateNodeId(context);

	// Translate input first (bottom-up execution)
	const { nodeId: inputId, context: ctx2 } = translateAlgebraNode(node.input, ctx1);

	// Add selection node with execution order
	const { order, context: ctx3 } = nextExecutionOrder(ctx2);
	const ctx4 = addNode(ctx3, selId, `σ [${node.condition}]`, "hexagon", order);

	// Connect to input
	const ctx5 = addEdge(ctx4, selId, inputId);

	return { nodeId: selId, context: ctx5 };
};

/**
 * Translates a Join node
 */
const translateJoin = (
	node: Join,
	context: MermaidContext,
): TranslationOutput => {
	const { nodeId: joinId, context: ctx1 } = generateNodeId(context);

	// Translate left and right inputs first (bottom-up execution)
	const { nodeId: leftId, context: ctx2 } = translateAlgebraNode(node.left, ctx1);
	const { nodeId: rightId, context: ctx3 } = translateAlgebraNode(node.right, ctx2);

	// Add join node with execution order
	const { order, context: ctx4 } = nextExecutionOrder(ctx3);
	const ctx5 = addNode(ctx4, joinId, `⨝ [${node.condition}]`, "hexagon", order);

	// Connect both inputs to the join
	const ctx6 = addEdge(ctx5, joinId, leftId, "left");
	const ctx7 = addEdge(ctx6, joinId, rightId, "right");

	return { nodeId: joinId, context: ctx7 };
};

/**
 * Translates a CrossProduct node
 */
const translateCrossProduct = (
	node: CrossProduct,
	context: MermaidContext,
): TranslationOutput => {
	const { nodeId: crossId, context: ctx1 } = generateNodeId(context);

	// Translate left and right inputs first (bottom-up execution)
	const { nodeId: leftId, context: ctx2 } = translateAlgebraNode(node.left, ctx1);
	const { nodeId: rightId, context: ctx3 } = translateAlgebraNode(node.right, ctx2);

	// Add cross product node with execution order
	const { order, context: ctx4 } = nextExecutionOrder(ctx3);
	const ctx5 = addNode(ctx4, crossId, "×", "hexagon", order);

	// Connect both inputs to the cross product
	const ctx6 = addEdge(ctx5, crossId, leftId, "left");
	const ctx7 = addEdge(ctx6, crossId, rightId, "right");

	return { nodeId: crossId, context: ctx7 };
};

/**
 * Translates a RelationalAlgebraNode recursively
 */
const translateAlgebraNode = (
	node: RelationalAlgebraNode,
	context: MermaidContext,
): TranslationOutput => {
	switch (node.type) {
		case "Projection":
			return translateProjection(node, context);
		case "Selection":
			return translateSelection(node, context);
		case "Relation":
			return translateRelation(node, context);
		case "Join":
			return translateJoin(node, context);
		case "CrossProduct":
			return translateCrossProduct(node, context);
	}
};

/**
 * Translates Relational Algebra into Mermaid diagram syntax for visualization
 *
 * @param result - The translation result containing relational algebra
 * @returns Mermaid diagram code as a string
 */
export const algebraToMermaid = (result: TranslationResult): string => {
	const context = createContext();

	if (!result.success) {
		// Show error in diagram
		const { nodeId: errorId, context: ctx1 } = generateNodeId(context);
		const ctx2 = addNode(ctx1, errorId, `Error: ${result.error}`, "rect");
		return ctx2.lines.join("\n");
	}

	// Translate the algebra tree
	const { context: finalContext } = translateAlgebraNode(result.algebra, context);

	return finalContext.lines.join("\n");
};

/**
 * Helper function to translate Relational Algebra to Mermaid and wrap in markdown code block
 */
export const algebraToMermaidMarkdown = (result: TranslationResult): string => {
	const mermaidCode = algebraToMermaid(result);
	return `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
};
