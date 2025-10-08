import Editor, { type OnMount } from "@monaco-editor/react";
import type { DatabaseSchema } from "@query-processor/converter";
import { Play } from "lucide-react";
import { createSqlCompletionProvider } from "../utils/sqlCompletionProvider";

interface SqlEditorProps {
	value: string;
	onChange: (value: string) => void;
	onExecute: () => void;
	schema?: DatabaseSchema;
}

export function SqlEditor({
	value,
	onChange,
	onExecute,
	schema,
}: SqlEditorProps) {
	const handleEditorDidMount: OnMount = (editor, monaco) => {
		// Register custom SQL completion provider if schema is provided
		if (schema) {
			monaco.languages.registerCompletionItemProvider(
				"sql",
				createSqlCompletionProvider(schema),
			);
		}

		// Optional: Configure editor options
		editor.updateOptions({
			minimap: { enabled: false },
			fontSize: 14,
			lineNumbers: "on",
			roundedSelection: false,
			scrollBeyondLastLine: false,
			automaticLayout: true,
			quickSuggestions: {
				other: true,
				comments: false,
				strings: false,
			},
			suggestOnTriggerCharacters: true,
			acceptSuggestionOnEnter: "on",
		});
	};

	return (
		<div className="w-full">
			<div className="w-full flex justify-between items-center mb-4">
				<h1 className="text-2xl font-bold text-gray-100">SQL Editor</h1>
				<button
					type="button"
					className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
					onClick={onExecute}
					title="Execute Query (Ctrl+Enter)"
				>
					<Play className="w-5 h-5" />
					Run
				</button>
			</div>
			<Editor
				height="50vh"
				theme="vs-dark"
				language="sql"
				value={value}
				onChange={onChange}
				onMount={handleEditorDidMount}
			/>
		</div>
	);
}
