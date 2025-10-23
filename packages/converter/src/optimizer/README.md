# Query Optimizer

Este módulo implementa otimizações de álgebra relacional usando uma arquitetura extensível baseada em **regras de otimização**.

## Arquitetura

O otimizador é composto por:

- **Tipos** (`types.ts`): Define as interfaces para regras de otimização
- **Regras** (`rules/`): Implementações individuais de cada otimização
- **Index** (`index.ts`): Função principal que aplica as regras em sequência

**Estrutura de diretórios:**
```
packages/converter/src/optimizer/
├── index.ts                    # API principal do otimizador
├── index.test.ts               # Testes de integração
├── types.ts                    # Tipos e interfaces
├── README.md                   # Documentação completa
└── rules/
    ├── index.ts                # Registro de regras
    ├── selectionPushdown.ts    # Implementação da regra
    └── selectionPushdown.test.ts # Testes da regra
```

## Otimizações Implementadas

### 1. Selection Pushdown (Heurística)

**Arquivo**: `rules/selectionPushdown.ts`

**Objetivo**: Empurrar operações de seleção (σ) para mais perto das relações base, reduzindo o número de tuplas processadas em operações subsequentes.

**Exemplos**:

```
Original:  σ[age > 18](π[name, age](users))
Otimizado: π[name, age](σ[age > 18](users))
```

**Benefício**: Reduz o número de tuplas antes de operações custosas como projeções e junções.

## Como Adicionar uma Nova Otimização

Siga estes passos para adicionar uma nova regra de otimização:

### 1. Crie um novo arquivo na pasta `rules/`

Exemplo: `rules/projectionPushdown.ts`

```typescript
import type { RelationalAlgebraNode } from '../../algebra/types';
import type { OptimizationRuleMetadata } from '../types';

/**
 * Implementa a otimização de projection pushdown.
 *
 * Objetivo: Reduzir o número de colunas processadas empurrando
 * projeções para mais perto das relações base.
 */
function applyProjectionPushdown(node: RelationalAlgebraNode): RelationalAlgebraNode {
  // Implemente sua lógica aqui

  switch (node.type) {
    case 'Relation':
      return node;

    case 'Projection':
      // Sua lógica de otimização
      return node;

    case 'Selection':
      // Recursivamente otimize a entrada
      return {
        ...node,
        input: applyProjectionPushdown(node.input)
      };

    default:
      return node;
  }
}

export const projectionPushdownRule: OptimizationRuleMetadata = {
  name: 'projection-pushdown',
  description: 'Pushes projection operations closer to base relations to reduce column count',
  category: 'heuristic',
  apply: applyProjectionPushdown
};
```

### 2. Exporte a regra em `rules/index.ts`

```typescript
export { selectionPushdownRule } from './selectionPushdown';
export { projectionPushdownRule } from './projectionPushdown'; // Nova regra

import { selectionPushdownRule } from './selectionPushdown';
import { projectionPushdownRule } from './projectionPushdown'; // Nova regra

export const DEFAULT_OPTIMIZATION_RULES: OptimizationRuleMetadata[] = [
  selectionPushdownRule,
  projectionPushdownRule, // Adicione aqui
];
```

### 3. (Opcional) Crie testes

Crie `rules/projectionPushdown.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { projectionPushdownRule } from "./projectionPushdown";

describe("projectionPushdownRule", () => {
  it("should push projection closer to base relation", () => {
    const input = { /* ... */ };
    const result = projectionPushdownRule.apply(input);

    expect(result).toEqual({ /* expected output */ });
  });
});
```

## Ordem das Otimizações

A ordem em que as regras são aplicadas é importante! Algumas otimizações podem habilitar outras.

**Ordem recomendada**:

1. **Otimizações Lógicas**: Simplificação de expressões, eliminação de redundâncias
2. **Otimizações Heurísticas**: Selection pushdown, projection pushdown, join reordering
3. **Otimizações Baseadas em Custo**: Escolha de algoritmos de join, índices

## Categorias de Otimização

### `heuristic` (Heurística)

Baseadas em regras gerais que quase sempre melhoram o desempenho, independente dos dados.

**Exemplos**:
- Selection pushdown
- Projection pushdown
- Eliminação de subqueries redundantes

### `logical` (Lógica)

Simplificações lógicas que produzem expressões equivalentes mais simples.

**Exemplos**:
- Eliminação de dupla negação
- Simplificação de expressões booleanas
- Constant folding

### `cost-based` (Baseada em Custo)

Otimizações que requerem estatísticas sobre os dados para tomar decisões.

**Exemplos**:
- Join reordering baseado em cardinalidade
- Escolha de algoritmo de join (nested loop, hash, merge)
- Uso de índices

## Uso

### Uso Básico

```typescript
import { optimizeQuery } from './optimizer';

const algebra = /* ... sua árvore de álgebra relacional ... */;
const optimized = optimizeQuery(algebra);
```

### Uso com Regras Customizadas

```typescript
import { optimizeQuery, selectionPushdownRule, projectionPushdownRule } from './optimizer';

const customRules = [
  selectionPushdownRule,
  projectionPushdownRule,
  // suas regras customizadas
];

const optimized = optimizeQuery(algebra, customRules);
```

### Aplicar Apenas Uma Regra

```typescript
import { applyOptimizationRule, selectionPushdownRule } from './optimizer';

const optimized = applyOptimizationRule(algebra, selectionPushdownRule.apply);
```

## Próximas Otimizações Sugeridas

1. **Projection Pushdown**: Reduzir colunas processadas
2. **Join Reordering**: Reordenar joins para reduzir produtos intermediários
3. **Predicate Pushdown**: Empurrar predicados através de joins
4. **Constant Folding**: Avaliar expressões constantes em tempo de compilação
5. **Subquery Unnesting**: Transformar subqueries em joins quando possível

## Referências

- "Database System Concepts" - Silberschatz, Korth, Sudarshan (Capítulo sobre Query Optimization)
- "Database Management Systems" - Ramakrishnan, Gehrke (Capítulo sobre Query Optimization)
- Papers clássicos sobre otimização de queries relacionais
