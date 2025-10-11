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
	private lines: string[] = [];

	/**
	 * Translates a TranslationResult into Mermaid flowchart syntax
	 *
	 * @param result - The translation result containing relational algebra
	 * @returns Mermaid diagram code as a string, or error message
	 */
	translate(result: TranslationResult): string {
		this.nodeCounter = 0;
		this.lines = [];

		// Start Mermaid flowchart (bottom to top for better algebra tree visualization)
		this.lines.push("graph BT");

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
	): void {
		const shapeMap = {
			rect: ['["', '"]'],
			round: ['("', '")'],
			hexagon: ['{{"', '"}}'],
		};
		const [open, close] = shapeMap[shape];
		const escapedLabel = this.escapeLabel(label);
		this.lines.push(`    ${id}${open}${escapedLabel}${close}`);
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

		// Format attributes
		const attrs =
			node.attributes.length === 0 || node.attributes.includes("*")
				? "\\*"
				: node.attributes.join(", ");

		this.addNode(projId, `π [${attrs}]`, "hexagon");

		// Translate input and connect
		const inputId = this.translateAlgebraNode(node.input);
		this.addEdge(projId, inputId);

		return projId;
	}

	private translateSelection(node: Selection): string {
		const selId = this.getNodeId();

		// Format condition
		const condition = node.condition;

		this.addNode(selId, `σ [${condition}]`, "hexagon");

		// Translate input and connect
		const inputId = this.translateAlgebraNode(node.input);
		this.addEdge(selId, inputId);

		return selId;
	}

	private translateRelation(node: Relation): string {
		const relId = this.getNodeId();
		this.addNode(relId, node.name, "round");
		return relId;
	}

	private translateJoin(node: Join): string {
		const joinId = this.getNodeId();

		// Format: ⨝ [condition]
		this.addNode(joinId, `⨝ [${node.condition}]`, "hexagon");

		// Translate left and right inputs
		const leftId = this.translateAlgebraNode(node.left);
		const rightId = this.translateAlgebraNode(node.right);

		// Connect both inputs to the join
		this.addEdge(joinId, leftId, "left");
		this.addEdge(joinId, rightId, "right");

		return joinId;
	}

	private translateCrossProduct(node: CrossProduct): string {
		const crossId = this.getNodeId();

		// Format: ×
		this.addNode(crossId, "×", "hexagon");

		// Translate left and right inputs
		const leftId = this.translateAlgebraNode(node.left);
		const rightId = this.translateAlgebraNode(node.right);

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
