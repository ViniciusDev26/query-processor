import { Maximize2, X } from "lucide-react";
import mermaid from "mermaid";
import { useCallback, useEffect, useRef, useState } from "react";

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
	const fullscreenRef = useRef<HTMLDivElement>(null);
	const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
	const fullscreenIdRef = useRef(
		`mermaid-fullscreen-${Math.random().toString(36).substr(2, 9)}`,
	);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const renderDiagram = useCallback(
		(container: HTMLDivElement, id: string, chartContent: string) => {
			// Extract mermaid code from markdown code block
			const mermaidCode = chartContent
				.replace(/```mermaid\n?/g, "")
				.replace(/```\n?/g, "")
				.trim();

			// Clear previous content
			container.innerHTML = "";

			// Render new diagram
			mermaid
				.render(id, mermaidCode)
				.then(({ svg }) => {
					container.innerHTML = svg;

					// Apply CSS to ensure text is not clipped
					const svgElement = container.querySelector("svg");
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
						const nodeElements = svgElement.querySelectorAll(
							".node rect, .node polygon, .node circle",
						);
						nodeElements.forEach((el) => {
							(el as HTMLElement).style.overflow = "visible";
						});
					}
				})
				.catch((error) => {
					console.error("Mermaid rendering error:", error);
					container.innerHTML = `<div class="text-red-400 p-4">Error rendering diagram: ${error.message}</div>`;
				});
		},
		[],
	);

	useEffect(() => {
		if (elementRef.current && chart) {
			renderDiagram(elementRef.current, idRef.current, chart);
		}
	}, [chart, renderDiagram]);

	useEffect(() => {
		if (isFullscreen && fullscreenRef.current && chart) {
			renderDiagram(fullscreenRef.current, fullscreenIdRef.current, chart);
		}
	}, [isFullscreen, chart, renderDiagram]);

	return (
		<>
			<div className="flex flex-col w-full">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-lg font-semibold text-gray-100">{title}</h3>
					<button
						onClick={() => setIsFullscreen(true)}
						className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
						title="View fullscreen"
						type="button"
					>
						<Maximize2 size={16} />
						<span className="hidden sm:inline">Fullscreen</span>
					</button>
				</div>
				<div
					ref={elementRef}
					className="bg-gray-900 p-6 rounded-lg overflow-auto min-h-[400px] max-h-[800px] flex items-start justify-center"
					style={{
						// Ensure SVG scales properly without cutting content
						maxWidth: "100%",
					}}
				/>
			</div>

			{/* Fullscreen Modal */}
			{isFullscreen && (
				<div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-gray-700">
						<h2 className="text-xl font-semibold text-gray-100">{title}</h2>
						<button
							onClick={() => setIsFullscreen(false)}
							className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
							title="Close fullscreen"
							type="button"
						>
							<X size={20} />
							<span>Close</span>
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-auto p-8">
						<div
							ref={fullscreenRef}
							className="flex items-center justify-center min-h-full"
							style={{
								maxWidth: "100%",
							}}
						/>
					</div>
				</div>
			)}
		</>
	);
}
