import {
	parseSQL,
	type ValidationError,
	validateSQL,
} from "@query-processor/converter";
import { useState } from "react";
import { CodeViewer } from "./components/CodeViewer";
import { SqlEditor } from "./components/SqlEditor";
import { ValidationErrors } from "./components/ValidationErrors";
import { databaseSchema } from "./schema";

function App() {
	const [sqlQuery, setSqlQuery] = useState("");
	const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
		[],
	);

	function handleSqlSubmit() {
		// Clear previous errors
		setValidationErrors([]);

		console.log("SQL Query submitted:", sqlQuery);
		const ast = parseSQL(sqlQuery);

		// Validate against schema
		const errors = validateSQL(sqlQuery, databaseSchema);

		if (errors.length > 0) {
			console.error("Validation errors:", errors);
			setValidationErrors(errors);
			return;
		}

		console.log("Generated AST:", ast);
	}

	return (
		<div className="flex flex-col items-center w-9/12 mx-auto my-10 border-gray-700 border-2 p-4 rounded-lg bg-gray-800">
			<SqlEditor
				value={sqlQuery}
				onChange={setSqlQuery}
				onExecute={handleSqlSubmit}
			/>
			<section className="w-full mt-4">
				<CodeViewer
					title="Database Schema"
					code={JSON.stringify(databaseSchema, null, 2)}
				/>
				<ValidationErrors errors={validationErrors} />
			</section>
		</div>
	);
}

export default App;
