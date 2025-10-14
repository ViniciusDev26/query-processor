import React, { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import type { Node, Edge, Connection } from "reactflow";
import "reactflow/dist/style.css";

interface OperatorNode {
  id: string;
  type: string;
  name?: string;
  attributes?: string[];
  details?: string;
  condition?: string;
  inputs?: string[];
}

interface OperatorGraph {
  nodes: OperatorNode[];
  edges: { from: string; to: string }[];
}

interface Props {
  graph: OperatorGraph;
}

// Cores por tipo de operador
const operatorColors: Record<string, string> = {
  relation: "#10b981", // verde
  projection: "#3b82f6", // azul
  selection: "#f59e0b", // amarelo
  join: "#8b5cf6", // roxo
  aggregation: "#ec4899", // rosa
  default: "#94a3b8", // cinza
};

export const OperatorGraphView: React.FC<Props> = ({ graph }) => {
  const initialNodes: Node[] = graph.nodes.map((node) => {
    const color = operatorColors[node.type] || operatorColors.default;

    // Monta label descritivo
    const extraInfo =
      node.details ||
      node.condition ||
      (node.attributes ? node.attributes.join(", ") : node.name || "");

    return {
      id: node.id,
      data: {
        label: `${node.type.toUpperCase()}${
          extraInfo ? `\n(${extraInfo})` : ""
        }`,
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      style: {
        background: "#0f172a",
        color: "#f1f5f9",
        border: `2px solid ${color}`,
        borderRadius: 12,
        padding: 10,
        fontSize: 12,
        whiteSpace: "pre-line",
        textAlign: "center",
      },
    };
  });

  const initialEdges: Edge[] = graph.edges.map((edge) => ({
    id: `${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    animated: true,
    style: { stroke: "#38bdf8" },
  }));

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background color="#334155" gap={12} />
        <MiniMap nodeColor={(n: { data: { label: string; }; }) => operatorColors[n.data?.label?.split("\n")[0].toLowerCase()] || "#38bdf8"} />
        <Controls />
      </ReactFlow>
    </div>
  );
};
