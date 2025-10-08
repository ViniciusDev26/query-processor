import Editor from "@monaco-editor/react";
import { Play } from "lucide-react";

interface SqlEditorProps {
	value: string;
	onChange: (value: string) => void;
	onExecute: () => void;
}

export function SqlEditor({ value, onChange, onExecute }: SqlEditorProps) {
	return (
		<div className="w-full">
			<div className="w-full flex justify-between items-center mb-4">
				<h1 className="text-2xl font-bold text-gray-100">SQL Editor</h1>
				<button
					type="button"
					className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
					onClick={onExecute}
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
				value={value}
				onChange={onChange}
			/>
		</div>
	);
}
