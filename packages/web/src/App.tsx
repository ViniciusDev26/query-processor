import {
	parseSQL,
	type ValidationError,
	validateSQL,
	algebraToMermaidMarkdown,
} from "@query-processor/converter";
import { useState } from "react";
import { CodeViewer } from "./components/CodeViewer";
import { SqlEditor } from "./components/SqlEditor";
import { ValidationErrors } from "./components/ValidationErrors";
import { MermaidComparison } from "./components/MermaidComparison";
import { databaseSchema } from "./schema";

interface QueryResult {
	originalAlgebra: string;
	optimizedAlgebra: string;
	originalDiagram: string;
	optimizedDiagram: string;
	appliedRules: string[];
}

const DEFAULT_QUERY = `SELECT cliente.Nome, pedido.ValorTotalPedido, produto.Nome
FROM cliente
INNER JOIN pedido ON cliente.idCliente = pedido.Cliente_idCliente
INNER JOIN pedido_has_produto ON pedido.idPedido = pedido_has_produto.Pedido_idPedido
INNER JOIN produto ON pedido_has_produto.Produto_idProduto = produto.idProduto
WHERE pedido.ValorTotalPedido > 100 AND produto.Preco > 50`;

function App() {
	const [sqlQuery, setSqlQuery] = useState(DEFAULT_QUERY);
	const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
		[],
	);
	const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

	function handleSqlSubmit() {
		// Clear previous errors and results
		setValidationErrors([]);
		setQueryResult(null);

		// Parse SQL to AST
		const result = parseSQL(sqlQuery);

		if (!result.success) {
			setValidationErrors([
				{
					type: "INVALID_COMPARISON",
					message: `${result.error}: ${result.details.join(", ")}`,
				},
			]);
			return;
		}

		// Validate against schema
		const errors = validateSQL(sqlQuery, databaseSchema);

		if (errors.length > 0) {
			setValidationErrors(errors);
			return;
		}

		// Generate Mermaid diagrams
		if (result.translation.success && result.optimization) {
			const originalDiagram = algebraToMermaidMarkdown(result.translation);
			const optimizedDiagram = algebraToMermaidMarkdown({
				success: true,
				algebra: result.optimization.optimized,
			});

			setQueryResult({
				originalAlgebra: result.translationString || "",
				optimizedAlgebra: result.optimizationString || "",
				originalDiagram,
				optimizedDiagram,
				appliedRules: result.optimization.appliedRules,
			});
		}
	}

	return (
		<div className="flex flex-col items-center w-9/12 mx-auto my-10 border-gray-700 border-2 p-4 rounded-lg bg-gray-800">
			<SqlEditor
				value={sqlQuery}
				onChange={setSqlQuery}
				onExecute={handleSqlSubmit}
				schema={databaseSchema}
			/>
			<section className="w-full mt-4">
				{/* Show Mermaid diagrams if query was successful */}
				{queryResult && (
					<MermaidComparison
						originalDiagram={queryResult.originalDiagram}
						optimizedDiagram={queryResult.optimizedDiagram}
						originalAlgebra={queryResult.originalAlgebra}
						optimizedAlgebra={queryResult.optimizedAlgebra}
						appliedRules={queryResult.appliedRules}
					/>
				)}

				{/* Show validation errors if any */}
				<ValidationErrors errors={validationErrors} />

				{/* Show database schema */}
				<CodeViewer
					title="Database Schema"
					code={JSON.stringify(databaseSchema, null, 2)}
				/>
			</section>
		</div>
	);
}

export default App;
