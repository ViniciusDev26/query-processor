import { MermaidDiagram } from "./MermaidDiagram";

interface MermaidComparisonProps {
	originalDiagram: string;
	optimizedDiagram: string;
	originalAlgebra: string;
	optimizedAlgebra: string;
	appliedRules: string[];
}

export function MermaidComparison({
	originalDiagram,
	optimizedDiagram,
	originalAlgebra,
	optimizedAlgebra,
	appliedRules,
}: MermaidComparisonProps) {
	return (
		<div className="w-full mt-6">
			<h2 className="text-xl font-semibold mb-4 text-gray-100">
				Query Execution Plans
			</h2>

			{/* Relational Algebra notation */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div className="bg-gray-900 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-gray-100">
						Original Algebra
					</h3>
					<code className="text-blue-400 text-sm break-all">
						{originalAlgebra}
					</code>
				</div>
				<div className="bg-gray-900 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-gray-100">
						Optimized Algebra
					</h3>
					<code className="text-green-400 text-sm break-all">
						{optimizedAlgebra}
					</code>
				</div>
			</div>

			{/* Applied optimization rules */}
			{appliedRules.length > 0 && (
				<div className="bg-gray-900 p-4 rounded-lg mb-6">
					<h3 className="text-lg font-semibold mb-2 text-gray-100">
						Applied Optimizations
					</h3>
					<ul className="list-disc list-inside text-gray-300 space-y-1">
						{appliedRules.map((rule, index) => (
							<li key={index} className="text-sm">
								{rule}
							</li>
						))}
					</ul>
				</div>
			)}

			{appliedRules.length === 0 && (
				<div className="bg-gray-900 p-4 rounded-lg mb-6">
					<p className="text-gray-400 text-sm">
						✓ Query is already optimal - no optimizations needed
					</p>
				</div>
			)}

			{/* Mermaid diagrams side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<MermaidDiagram chart={originalDiagram} title="Original Plan" />
				<MermaidDiagram chart={optimizedDiagram} title="Optimized Plan" />
			</div>
		</div>
	);
}
