import Editor from "@monaco-editor/react";
import { parseSQL } from "@query-processor/converter";
import { useState } from "react";

function App() {
	const [sqlQuery, setSqlQuery] = useState("");

	function handleSqlSubmit() {
		console.log("SQL Query submitted:", sqlQuery);

		const ast = parseSQL(sqlQuery);
		console.log("Generated AST:", ast);
	}

	return (
		<div className="flex flex-col items-center w-9/12 mx-auto my-10 border-gray-700 border-2 p-4 rounded-lg bg-gray-800">
			<h1 className="text-2xl font-bold mb-4 text-gray-100">SQL Editor</h1>
			<Editor
				height="50vh"
				theme="vs-dark"
				language="sql"
				value={sqlQuery}
				onChange={setSqlQuery}
			/>
			<button
				type="button"
				className="cursor-pointer mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
				onClick={handleSqlSubmit}
			>
				Execute Query
			</button>
		</div>
	);
}

export default App;
