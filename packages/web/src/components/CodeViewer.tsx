interface CodeViewerProps {
	title: string;
	code: string;
}

export function CodeViewer({ title, code }: CodeViewerProps) {
	return (
		<div className="w-full">
			<h2 className="text-xl font-semibold mt-6 mb-2 text-gray-100">
				{title}
			</h2>
			<pre className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto max-h-64">
				{code}
			</pre>
		</div>
	);
}
