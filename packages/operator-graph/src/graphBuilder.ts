import type { OperatorGraph } from "./types";

interface AlgebraNode {
  type: string;
  name?: string;
  attributes?: string[];
  condition?: string;
  left?: AlgebraNode;
  right?: AlgebraNode;
  input?: AlgebraNode;
}

export function buildOperatorGraph(algebra: AlgebraNode): OperatorGraph {
  const nodes: any[] = [];
  const edges: any[] = [];
  let counter = 0;
  let rootId: string | null = null;

  function traverse(node: AlgebraNode, parentId?: string): string {
    const id = `n${counter++}`;
    if (!parentId) rootId = id; // o primeiro nó visitado é a raiz

    const labelParts = [];

    // Monta rótulo descritivo e legível
    labelParts.push(node.type.toUpperCase());
    if (node.name) labelParts.push(`(${node.name})`);
    if (node.attributes?.length)
      labelParts.push(`\nCols: ${node.attributes.join(", ")}`);
    if (node.condition) labelParts.push(`\nCond: ${node.condition}`);

    const fullLabel = labelParts.join(" ");

    nodes.push({
      id,
      type: node.type,
      label: fullLabel,
      name: node.name,
      attributes: node.attributes,
      condition: node.condition,
    });

    // cria conexão filho → pai (mantendo hierarquia)
    if (parentId) {
      edges.push({ from: id, to: parentId });
    }

    // percorre recursivamente as subárvores
    if (node.left) traverse(node.left, id);
    if (node.right) traverse(node.right, id);
    if (node.input) traverse(node.input, id);

    return id;
  }

  traverse(algebra);

  if (!rootId) throw new Error("Erro: grafo sem raiz detectada.");

  return { nodes, edges, rootId };
}
