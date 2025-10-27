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
import { MermaidGraphView } from './components/MermaidGraphView'; 
function App() {
    const [sqlQuery, setSqlQuery] = useState("");
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
        [],
    );
    const [mermaidOriginal, setMermaidOriginal] = useState<string | null>(null);
    const [mermaidOptimized, setMermaidOptimized] = useState<string | null>(null);

    function handleSqlSubmit() {
        // Clear previous errors and graphs
        setValidationErrors([]);
        setMermaidOriginal(null);
        setMermaidOptimized(null);

        console.log("SQL Query submitted:", sqlQuery);

        // Parse SQL to AST
        const result = parseSQL(sqlQuery);

        if (!result.success) {
            console.error("Parse error:", result.error, result.details);
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
            console.error("Validation errors:", errors);
            setValidationErrors(errors);
            return;
        }

        console.log("Generated AST:", result.ast);
        console.log("Relational Algebra:", result.translation);
        console.log("Relational Algebra String:", result.translationString);
        console.log("Optimized Algebra:", result.optimizedAlgebra);
        console.log("Optimized Algebra String:", result.optimizedAlgebraString);
        console.log("Mermaid Original:", result.mermaidOriginal);
        console.log("Mermaid Optimized:", result.mermaidOptimized);

        // Set Mermaid diagrams for visualization
        if (result.mermaidOriginal) {
            setMermaidOriginal(result.mermaidOriginal);
        }

        if (result.mermaidOptimized) {
            setMermaidOptimized(result.mermaidOptimized);
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
                <CodeViewer
                    title="Database Schema"
                    code={JSON.stringify(databaseSchema, null, 2)}
                />
                <ValidationErrors errors={validationErrors} />
                {mermaidOriginal && (
                    <div className="mt-6">
                        <MermaidGraphView
                            mermaidOriginal={mermaidOriginal}
                            mermaidOptimized={mermaidOptimized}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}

export default App;
