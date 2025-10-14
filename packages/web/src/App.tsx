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
import { buildOperatorGraph } from 'operator-graph';
import { OperatorGraphView } from './components/OperatorGraph';
import type { OperatorGraph } from 'operator-graph'; 
function App() {
    const [sqlQuery, setSqlQuery] = useState("");
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
        [],
    );
    const [operatorGraph, setOperatorGraph] = useState<OperatorGraph | null>(null);

    function handleSqlSubmit() {
        // Clear previous errors
        setValidationErrors([]);
        setOperatorGraph(null); // Limpa o grafo anterior

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

        // Gera o grafo de operadores a partir do plano algébrico
        if (
            result.translation &&
            typeof result.translation === "object" &&
            "algebra" in result.translation
        ) {
            // Now TypeScript knows algebra exists
            console.log("Plano algébrico para o grafo:", result.translation.algebra);
            const graph = buildOperatorGraph((result.translation as any).algebra);
            console.log("Grafo gerado:", graph);
            setOperatorGraph(graph);
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
                {operatorGraph && (
                    <div className="mt-6">
                        <OperatorGraphView graph={operatorGraph} />
                    </div>
                )}
            </section>
        </div>
    );
}

export default App;
