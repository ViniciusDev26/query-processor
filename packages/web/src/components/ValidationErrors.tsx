import type { ValidationError } from "@query-processor/converter";

interface ValidationErrorsProps {
	errors: ValidationError[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
	if (errors.length === 0) return null;

	return (
		<div className="w-full">
			<h2 className="text-xl font-semibold mt-6 mb-2 text-red-400">
				Validation Errors ({errors.length})
			</h2>
			<div className="bg-gray-900 text-red-300 p-4 rounded-lg space-y-2">
				{errors.map((error) => (
					<div
						key={`${error.type}-${error.table}-${error.column}-${error.message}`}
						className="border-l-4 border-red-500 pl-3"
					>
						<div className="font-semibold text-red-400">{error.type}</div>
						<div className="text-sm">{error.message}</div>
						{error.table && (
							<div className="text-xs text-gray-400">Table: {error.table}</div>
						)}
						{error.column && (
							<div className="text-xs text-gray-400">
								Column: {error.column}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
