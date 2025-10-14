export type OperatorType = 'Projection' | 'Selection' | 'Join' | 'TableScan';

export interface OperatorNode {
  id: string;
  type: OperatorType;
  label: string;
  children: string[]; // IDs of child nodes
}

export interface OperatorGraph {
  nodes: OperatorNode[];
  edges: { from: string; to: string }[];
  rootId: string;
}