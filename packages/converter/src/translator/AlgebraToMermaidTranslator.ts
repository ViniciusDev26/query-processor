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
 * Translates Relational Algebra into Mermaid diagram syntax for visualization
 */
export class AlgebraToMermaidTranslator {
	private nodeCounter = 0;
	private executionOrder = 0;
	private lines: string[] = [];

	/**
	 * Translates a TranslationResult into Mermaid flowchart syntax
	 *
	 * @param result - The translation result containing relational algebra
	 * @returns Mermaid diagram code as a string, or error message
	 */
	translate(result: TranslationResult): string {
		this.nodeCounter = 0;
		this.executionOrder = 0;
		this.lines = [];

		// Start Mermaid flowchart (top to bottom for execution order visualization)
		this.lines.push("graph TD");

		if (!result.success) {
			// Show error in diagram
			const errorId = this.getNodeId();
			this.addNode(errorId, `Error: ${result.error}`, "rect");
			return this.lines.join("\n");
		}

		// Translate the algebra tree
		this.translateAlgebraNode(result.algebra);

		return this.lines.join("\n");
	}

	private getNodeId(): string {
		return `node${this.nodeCounter++}`;
	}

	private getExecutionOrder(): number {
		return ++this.executionOrder;
	}

	private escapeLabel(label: string): string {
		// Escape special characters within labels
		return label
			.replace(/\\/g, "\\\\") // Escape backslashes first
			.replace(/"/g, '\\"') // Escape quotes
			.replace(/\*/g, "\\*"); // Escape asterisks (markdown list)
	}

	private addNode(
		id: string,
		label: string,
		shape: "rect" | "round" | "hexagon" = "rect",
		executionOrder?: number,
	): void {
		const shapeMap = {
			rect: ['["', '"]'],
			round: ['("', '")'],
			hexagon: ['{{"', '"}}'],
		};
		const [open, close] = shapeMap[shape];
		const escapedLabel = this.escapeLabel(label);
		const labelWithOrder =
			executionOrder !== undefined
				? `${executionOrder}. ${escapedLabel}`
				: escapedLabel;
		this.lines.push(`    ${id}${open}${labelWithOrder}${close}`);
	}

	private addEdge(from: string, to: string, label?: string): void {
		if (label) {
			this.lines.push(`    ${from} -->|"${label}"| ${to}`);
		} else {
			this.lines.push(`    ${from} --> ${to}`);
		}
	}

	private translateAlgebraNode(node: RelationalAlgebraNode): string {
		switch (node.type) {
			case "Projection":
				return this.translateProjection(node);
			case "Selection":
				return this.translateSelection(node);
			case "Relation":
				return this.translateRelation(node);
			case "Join":
				return this.translateJoin(node);
			case "CrossProduct":
				return this.translateCrossProduct(node);
		}
	}

	private translateProjection(node: Projection): string {
		const projId = this.getNodeId();

		// Translate input first (bottom-up execution)
		const inputId = this.translateAlgebraNode(node.input);

		// Format attributes
		const attrs =
			node.attributes.length === 0 || node.attributes.includes("*")
				? "\\*"
				: node.attributes.join(", ");

		// Add projection node with execution order
		const order = this.getExecutionOrder();
		this.addNode(projId, `π [${attrs}]`, "hexagon", order);

		// Connect to input
		this.addEdge(projId, inputId);

		return projId;
	}

	private translateSelection(node: Selection): string {
		const selId = this.getNodeId();

		// Translate input first (bottom-up execution)
		const inputId = this.translateAlgebraNode(node.input);

		// Format condition
		const condition = node.condition;

		// Add selection node with execution order
		const order = this.getExecutionOrder();
		this.addNode(selId, `σ [${condition}]`, "hexagon", order);

		// Connect to input
		this.addEdge(selId, inputId);

		return selId;
	}

	private translateRelation(node: Relation): string {
		const relId = this.getNodeId();
		// Relations are executed first (they are leaf nodes)
		const order = this.getExecutionOrder();
		this.addNode(relId, node.name, "round", order);
		return relId;
	}

	private translateJoin(node: Join): string {
		const joinId = this.getNodeId();

		// Translate left and right inputs first (bottom-up execution)
		const leftId = this.translateAlgebraNode(node.left);
		const rightId = this.translateAlgebraNode(node.right);

		// Format: ⨝ [condition]
		// Join is executed after both inputs are ready
		const order = this.getExecutionOrder();
		this.addNode(joinId, `⨝ [${node.condition}]`, "hexagon", order);

		// Connect both inputs to the join
		this.addEdge(joinId, leftId, "left");
		this.addEdge(joinId, rightId, "right");

		return joinId;
	}

	private translateCrossProduct(node: CrossProduct): string {
		const crossId = this.getNodeId();

		// Translate left and right inputs first (bottom-up execution)
		const leftId = this.translateAlgebraNode(node.left);
		const rightId = this.translateAlgebraNode(node.right);

		// Format: ×
		// Cross product is executed after both inputs are ready
		const order = this.getExecutionOrder();
		this.addNode(crossId, "×", "hexagon", order);

		// Connect both inputs to the cross product
		this.addEdge(crossId, leftId, "left");
		this.addEdge(crossId, rightId, "right");

		return crossId;
	}
}

/**
 * Helper function to translate Relational Algebra to Mermaid and wrap in markdown code block
 */
export function algebraToMermaidMarkdown(result: TranslationResult): string {
	const translator = new AlgebraToMermaidTranslator();
	const mermaidCode = translator.translate(result);
	return `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
}
