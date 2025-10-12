import { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
	chart: string;
	title: string;
}

// Initialize mermaid once
mermaid.initialize({
	startOnLoad: false,
	theme: "dark",
	themeVariables: {
		darkMode: true,
		background: "#1f2937",
		primaryColor: "#3b82f6",
		primaryTextColor: "#e5e7eb",
		primaryBorderColor: "#60a5fa",
		lineColor: "#9ca3af",
		secondaryColor: "#6366f1",
		tertiaryColor: "#8b5cf6",
		fontSize: "12px",
		fontFamily: "ui-monospace, monospace",
	},
	flowchart: {
		htmlLabels: true,
		curve: "basis",
		padding: 15,
		nodeSpacing: 50,
		rankSpacing: 50,
		useMaxWidth: true,
		wrappingWidth: 300, // Increase wrapping width
	},
	maxTextSize: 90000, // Increase max text size
	wrap: true,
	securityLevel: "loose",
});

export function MermaidDiagram({ chart, title }: MermaidDiagramProps) {
	const elementRef = useRef<HTMLDivElement>(null);
	const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

	useEffect(() => {
		if (elementRef.current && chart) {
			// Extract mermaid code from markdown code block
			const mermaidCode = chart
				.replace(/```mermaid\n?/g, "")
				.replace(/```\n?/g, "")
				.trim();

			// Clear previous content
			elementRef.current.innerHTML = "";

			// Render new diagram
			mermaid
				.render(idRef.current, mermaidCode)
				.then(({ svg }) => {
					if (elementRef.current) {
						elementRef.current.innerHTML = svg;

						// Apply CSS to ensure text is not clipped
						const svgElement = elementRef.current.querySelector("svg");
						if (svgElement) {
							svgElement.style.maxWidth = "100%";
							svgElement.style.height = "auto";
							svgElement.style.display = "block";

							// Ensure all text elements are visible
							const textElements = svgElement.querySelectorAll("text, tspan");
							textElements.forEach((el) => {
								(el as HTMLElement).style.overflow = "visible";
							});

							// Ensure nodes don't clip text
							const nodeElements = svgElement.querySelectorAll(".node rect, .node polygon, .node circle");
							nodeElements.forEach((el) => {
								(el as HTMLElement).style.overflow = "visible";
							});
						}
					}
				})
				.catch((error) => {
					console.error("Mermaid rendering error:", error);
					if (elementRef.current) {
						elementRef.current.innerHTML = `<div class="text-red-400 p-4">Error rendering diagram: ${error.message}</div>`;
					}
				});
		}
	}, [chart]);

	return (
		<div className="flex flex-col w-full">
			<h3 className="text-lg font-semibold mb-2 text-gray-100">{title}</h3>
			<div
				ref={elementRef}
				className="bg-gray-900 p-6 rounded-lg overflow-auto min-h-[400px] max-h-[800px] flex items-start justify-center"
				style={{
					// Ensure SVG scales properly without cutting content
					maxWidth: "100%",
				}}
			/>
		</div>
	);
}
