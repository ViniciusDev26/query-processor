import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

interface Props {
	mermaidOriginal: string;
	mermaidOptimized: string | null;
}

export const MermaidGraphView: React.FC<Props> = ({
	mermaidOriginal,
	mermaidOptimized,
}) => {
	const [activeTab, setActiveTab] = useState<"original" | "optimized">(
		"original",
	);
	const originalRef = useRef<HTMLDivElement>(null);
	const optimizedRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		mermaid.initialize({
			startOnLoad: true,
			theme: "dark",
			securityLevel: "loose",
			flowchart: {
				useMaxWidth: true,
				htmlLabels: true,
				curve: "basis",
			},
		});
	}, []);

	useEffect(() => {
		const renderDiagram = async () => {
			if (activeTab === "original" && originalRef.current && mermaidOriginal) {
				originalRef.current.innerHTML = "";
				const { svg } = await mermaid.render("original-graph", mermaidOriginal);
				originalRef.current.innerHTML = svg;
			} else if (
				activeTab === "optimized" &&
				mermaidOptimized &&
				optimizedRef.current
			) {
				optimizedRef.current.innerHTML = "";
				const { svg } = await mermaid.render(
					"optimized-graph",
					mermaidOptimized,
				);
				optimizedRef.current.innerHTML = svg;
			}
		};

		renderDiagram();
	}, [activeTab, mermaidOriginal, mermaidOptimized]);

	return (
		<div className="w-full border-2 border-gray-700 rounded-lg bg-gray-800 p-4">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-bold text-white">Query Execution Plan</h3>
				{mermaidOptimized && (
					<div className="flex gap-2">
						<button
							onClick={() => setActiveTab("original")}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								activeTab === "original"
									? "bg-blue-600 text-white"
									: "bg-gray-700 text-gray-300 hover:bg-gray-600"
							}`}
						>
							Original
						</button>
						<button
							onClick={() => setActiveTab("optimized")}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								activeTab === "optimized"
									? "bg-green-600 text-white"
									: "bg-gray-700 text-gray-300 hover:bg-gray-600"
							}`}
						>
							Optimized
						</button>
					</div>
				)}
			</div>

			<div className="bg-gray-900 rounded-lg p-6 overflow-auto">
				{activeTab === "original" && (
					<div ref={originalRef} className="mermaid-container" />
				)}
				{activeTab === "optimized" && mermaidOptimized && (
					<div ref={optimizedRef} className="mermaid-container" />
				)}
				{activeTab === "optimized" && !mermaidOptimized && (
					<div className="text-gray-400 text-center py-8">
						No optimization was applied to this query.
					</div>
				)}
			</div>
		</div>
	);
};
