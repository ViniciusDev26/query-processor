import type { ValidationError } from "./types";

/**
 * Custom error class for schema validation errors
 */
export class SchemaValidationError extends Error {
	public readonly errors: ValidationError[];

	constructor(errors: ValidationError[]) {
		const message = SchemaValidationError.formatErrors(errors);
		super(message);
		this.name = "SchemaValidationError";
		this.errors = errors;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, SchemaValidationError);
		}
	}

	private static formatErrors(errors: ValidationError[]): string {
		if (errors.length === 0) {
			return "Schema validation failed";
		}

		if (errors.length === 1) {
			return `Schema validation failed: ${errors[0].message}`;
		}

		const errorList = errors.map((err, idx) => `  ${idx + 1}. ${err.message}`).join("\n");
		return `Schema validation failed with ${errors.length} errors:\n${errorList}`;
	}

	/**
	 * Get detailed information about all validation errors
	 */
	public getDetails(): ValidationError[] {
		return this.errors;
	}

	/**
	 * Check if a specific error type exists
	 */
	public hasErrorType(type: ValidationError["type"]): boolean {
		return this.errors.some((err) => err.type === type);
	}
}
