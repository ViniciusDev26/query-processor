import Editor from "@monaco-editor/react";
import {
	parseSQL,
	type ValidationError,
	validateSQL,
} from "@query-processor/converter";
import { Play } from "lucide-react";
import { useState } from "react";
import { databaseSchema } from "./schema";

function App() {
	const [sqlQuery, setSqlQuery] = useState("");
	const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
		[],
	);

	function handleSqlSubmit() {
		console.log("SQL Query submitted:", sqlQuery);

		// Clear previous errors
		setValidationErrors([]);

		const ast = parseSQL(sqlQuery);

		// Validate against schema
		const errors = validateSQL(sqlQuery, databaseSchema);

		if (errors.length > 0) {
			console.error("Validation errors:", errors);
			setValidationErrors(errors);
		}

		console.log("Generated AST:", ast);
	}

	return (
		<div className="flex flex-col items-center w-9/12 mx-auto my-10 border-gray-700 border-2 p-4 rounded-lg bg-gray-800">
			<div className="w-full flex justify-between items-center mb-4">
				<h1 className="text-2xl font-bold text-gray-100">SQL Editor</h1>
				<button
					type="button"
					className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
					onClick={handleSqlSubmit}
					title="Execute Query"
				>
					<Play className="w-5 h-5" />
					Run
				</button>
			</div>
			<Editor
				height="50vh"
				theme="vs-dark"
				language="sql"
				value={sqlQuery}
				onChange={setSqlQuery}
			/>
			<section className="w-full mt-4">
				<h2 className="text-xl font-semibold mt-6 mb-2 text-gray-100">
					Database Schema
				</h2>
				<pre className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto max-h-64">
					{JSON.stringify(databaseSchema, null, 2)}
				</pre>

				{validationErrors.length > 0 && (
					<>
						<h2 className="text-xl font-semibold mt-6 mb-2 text-red-400">
							Validation Errors ({validationErrors.length})
						</h2>
						<div className="bg-gray-900 text-red-300 p-4 rounded-lg space-y-2">
							{validationErrors.map((error) => (
								<div
									key={`${error.type}-${error.table}-${error.column}-${error.message}`}
									className="border-l-4 border-red-500 pl-3"
								>
									<div className="font-semibold text-red-400">{error.type}</div>
									<div className="text-sm">{error.message}</div>
									{error.table && (
										<div className="text-xs text-gray-400">
											Table: {error.table}
										</div>
									)}
									{error.column && (
										<div className="text-xs text-gray-400">
											Column: {error.column}
										</div>
									)}
								</div>
							))}
						</div>
					</>
				)}
			</section>
		</div>
	);
}

export default App;
