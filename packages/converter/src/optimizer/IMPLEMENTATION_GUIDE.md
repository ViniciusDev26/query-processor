# Guia de Implementação das Heurísticas de Otimização

Este documento descreve as três novas heurísticas que foram estruturadas mas ainda precisam ser implementadas.

## 📋 Status das Regras

| Regra | Status | Arquivo | Prioridade |
|-------|--------|---------|-----------|
| Selection Pushdown | ✅ **Implementada** | `selectionPushdown.ts` | Alta |
| Projection Pushdown | 🏗️ **Estruturada** | `projectionPushdown.ts` | Média |
| Restrictive Ordering | 🏗️ **Estruturada** | `restrictiveOrderingRule.ts` | Média |
| Cross Product Elimination | 🏗️ **Estruturada** | `crossProductElimination.ts` | Baixa* |

\* Baixa prioridade pois atualmente não há tipo `Join` ou `CrossProduct` na álgebra.

---

## 1. Projection Pushdown

### 🎯 Objetivo

Reduzir o número de atributos (colunas) processados empurrando projeções para mais perto das relações base.

### 📊 Benefícios

- Reduz uso de memória
- Diminui I/O
- Melhora cache locality
- Acelera operações subsequentes

### 🔄 Transformações

```
Antes:  π[x](π[x, y, z](R))
Depois: π[x](R)

Antes:  π[x, y](σ[x > 10](R))
Depois: σ[x > 10](π[x, y](R))  (se σ só usa x e y)
```

### 📝 Tarefas de Implementação

#### Tarefa 1: Merge de Projeções Consecutivas

**Arquivo**: `projectionPushdown.ts` → função `optimizeProjection`

**Objetivo**: Eliminar projeções redundantes.

```typescript
// Implementar em optimizeProjection():
if (projection.input.type === 'Projection') {
  // Caso: π[a, b](π[a, b, c, d](R))
  // Solução: π[a, b](R)

  // 1. Verificar se os atributos da projeção externa
  //    são um subconjunto da projeção interna
  // 2. Se sim, manter apenas a projeção externa
  //    mas aplicar diretamente sobre R

  return {
    type: 'Projection',
    attributes: projection.attributes,
    input: applProjectionPushdown(projection.input.input)
  };
}
```

**Teste sugerido**:
```typescript
it("should merge consecutive projections", () => {
  const input = π[a, b](π[a, b, c](R));
  const result = projectionPushdownRule.apply(input);
  expect(result).toEqual(π[a, b](R));
});
```

#### Tarefa 2: Eliminar Projeções Redundantes

**Objetivo**: Remover projeções que não reduzem atributos.

```typescript
// Implementar em optimizeProjection():
if (projection.attributes.includes('*') ||
    projection.attributes.length === 0) {
  // Caso: π[*](R)
  // Solução: R
  return applyProjectionPushdown(projection.input);
}
```

#### Tarefa 3: Análise de Dependências

**Objetivo**: Implementar `extractAttributesFromCondition()`.

Esta função deve analisar uma string de condição e extrair os nomes de atributos usados.

**Exemplos**:
- `"age > 18"` → `["age"]`
- `"age > 18 AND city = 'NY'"` → `["age", "city"]`
- `"users.age > 18"` → `["users.age"]` ou `["age"]`

**Abordagens**:

1. **Regex simples** (início):
```typescript
function extractAttributesFromCondition(condition: string): string[] {
  // Remover strings entre aspas
  const withoutStrings = condition.replace(/'[^']*'/g, '');

  // Encontrar identificadores (palavras que não são keywords SQL)
  const keywords = new Set(['AND', 'OR', 'NOT', 'LIKE', 'IN', 'BETWEEN']);
  const tokens = withoutStrings.split(/\s+|[()=<>!,]/);

  return tokens.filter(t =>
    t && !keywords.has(t.toUpperCase()) && isNaN(Number(t))
  );
}
```

2. **Parser completo** (ideal):
   - Usar um parser de expressões SQL
   - Construir AST da condição
   - Extrair identificadores do AST

#### Tarefa 4: Push Through Selection

**Objetivo**: Empurrar projeção através de seleção quando seguro.

```typescript
// Cenário: π[a, b](σ[a > 10](R))
// Só é seguro se a condição (a > 10) só usa atributos projetados (a, b)

function canPushProjectionThroughSelection(
  projAttrs: string[],
  condition: string
): boolean {
  const usedAttrs = extractAttributesFromCondition(condition);
  return usedAttrs.every(attr => projAttrs.includes(attr));
}
```

---

## 2. Restrictive Ordering Rule

### 🎯 Objetivo

Reordenar seleções e junções para aplicar as mais restritivas primeiro, reduzindo dados intermediários.

### 📊 Heurísticas de Seletividade

| Tipo de Condição | Seletividade Estimada | Exemplo |
|------------------|----------------------|---------|
| Igualdade em chave | 0.001 (muito restritiva) | `id = 123` |
| Igualdade em atributo | 0.1 (restritiva) | `status = 'active'` |
| Range/BETWEEN | 0.3 (moderada) | `age BETWEEN 18 AND 25` |
| Desigualdade | 0.5 (pouco restritiva) | `age > 18` |
| LIKE com wildcard | 0.8 (não restritiva) | `name LIKE '%son'` |

### 🔄 Transformações

```
Antes:  σ[age > 18](σ[id = 123](R))
Depois: σ[id = 123](σ[age > 18](R))
(id = 123 é mais restritivo que age > 18)
```

### 📝 Tarefas de Implementação

#### Tarefa 1: Melhorar Estimativa de Seletividade

**Arquivo**: `restrictiveOrderingRule.ts` → função `estimateSelectivity`

**Objetivo**: Refinar a estimativa de seletividade.

```typescript
function estimateSelectivity(condition: string): number {
  const lower = condition.toLowerCase();

  // 1. Analisar tipo de operador
  if (lower.includes(' = ')) {
    // Igualdade: verificar se é em chave primária
    if (lower.includes('id =') || lower.includes('_id =')) {
      return 0.001; // Muito seletivo
    }
    return 0.1; // Seletivo
  }

  // 2. Range queries
  if (lower.includes(' between ')) {
    // Analisar o tamanho do range
    // Range pequeno: mais seletivo
    // Range grande: menos seletivo
    return 0.3;
  }

  // 3. Operadores de comparação
  if (lower.includes(' > ') || lower.includes(' < ')) {
    return 0.5;
  }

  // 4. LIKE patterns
  if (lower.includes(' like ')) {
    if (lower.includes("'%")) {
      return 0.8; // Leading wildcard: não seletivo
    }
    return 0.3; // Sem leading wildcard: mais seletivo
  }

  // 5. IN operator
  if (lower.includes(' in (')) {
    // Contar elementos na lista
    const match = condition.match(/in\s*\(([^)]+)\)/i);
    if (match) {
      const elements = match[1].split(',').length;
      return 0.05 * elements; // Proporcional ao tamanho da lista
    }
  }

  return 0.5; // Default
}
```

#### Tarefa 2: Coletar e Reordenar Seleções

**Objetivo**: Implementar a lógica de reordenação em `optimizeSelectionOrder`.

```typescript
function optimizeSelectionOrder(selection: Selection): RelationalAlgebraNode {
  // 1. Coletar todas as seleções consecutivas
  const selections: Selection[] = [];
  let current: RelationalAlgebraNode = selection;

  while (current.type === 'Selection') {
    selections.push(current);
    current = current.input;
  }

  // 2. Se há múltiplas seleções, reordená-las
  if (selections.length > 1) {
    // Ordenar por seletividade (mais restritiva primeiro)
    const sorted = sortBySelectivity(selections);

    // 3. Reconstruir a cadeia de seleções
    const optimizedBase = applyRestrictiveOrdering(current);

    return sorted.reduceRight((acc, sel) => ({
      type: 'Selection',
      condition: sel.condition,
      input: acc
    }), optimizedBase);
  }

  // Seleção única: apenas otimizar a entrada
  return {
    type: 'Selection',
    condition: selection.condition,
    input: applyRestrictiveOrdering(current)
  };
}
```

**Teste sugerido**:
```typescript
it("should reorder selections by selectivity", () => {
  // age > 18 é menos restritivo (0.5)
  // id = 123 é muito restritivo (0.001)
  const input = σ[age > 18](σ[id = 123](R));
  const result = restrictiveOrderingRule.apply(input);

  // Deve manter id = 123 primeiro (mais restritivo)
  expect(result).toEqual(σ[id = 123](σ[age > 18](R)));
});
```

#### Tarefa 3: Extensão para Joins (Futuro)

Quando o tipo `Join` for adicionado à álgebra:

```typescript
function reorderJoins(joins: Join[]): Join[] {
  // Estimar cardinalidade de cada join
  const withEstimates = joins.map(j => ({
    join: j,
    estimatedSize: estimateJoinSize(j)
  }));

  // Ordenar: joins menores primeiro
  withEstimates.sort((a, b) => a.estimatedSize - b.estimatedSize);

  return withEstimates.map(x => x.join);
}
```

---

## 3. Cross Product Elimination

### 🎯 Objetivo

Detectar e eliminar produtos cartesianos desnecessários, convertendo-os em joins.

### ⚠️ Por que produtos cartesianos são ruins?

- **Explosão de dados**: |R| × |S| linhas
- Exemplo: R (1000 linhas) × S (1000 linhas) = 1.000.000 linhas
- Extremamente custoso em CPU, memória e I/O

### 🔄 Transformações

```
Antes:  σ[R.id = S.ref_id](R × S)
Depois: R ⋈[id=ref_id] S

Antes:  σ[R.id = S.ref AND R.x > 10](R × S)
Depois: σ[R.x > 10](R ⋈[id=ref] S)
```

### 📝 Tarefas de Implementação

#### Pré-requisito: Adicionar Tipos Join e CrossProduct

**Arquivo**: `packages/converter/src/algebra/types.ts`

```typescript
export interface Join {
  type: "Join";
  joinType: "INNER" | "LEFT" | "RIGHT" | "FULL";
  left: RelationalAlgebraNode;
  right: RelationalAlgebraNode;
  condition: string;
}

export interface CrossProduct {
  type: "CrossProduct";
  left: RelationalAlgebraNode;
  right: RelationalAlgebraNode;
}

export type RelationalAlgebraNode =
  | Projection
  | Selection
  | Relation
  | Join
  | CrossProduct;
```

#### Tarefa 1: Detectar Produtos Cartesianos

```typescript
function detectCrossProducts(node: RelationalAlgebraNode): CrossProduct[] {
  const crossProducts: CrossProduct[] = [];

  function traverse(n: RelationalAlgebraNode) {
    if (n.type === 'CrossProduct') {
      crossProducts.push(n);
    }

    // Recursivamente visitar filhos
    if ('input' in n) traverse(n.input);
    if ('left' in n) traverse(n.left);
    if ('right' in n) traverse(n.right);
  }

  traverse(node);
  return crossProducts;
}
```

#### Tarefa 2: Extrair Predicados de Join

**Objetivo**: Separar condições que relacionam tabelas de condições de filtro.

```typescript
function extractJoinPredicates(condition: string): string[] {
  // Procurar padrões como: table1.col = table2.col
  const joinPattern = /(\w+\.\w+)\s*=\s*(\w+\.\w+)/g;
  const matches = condition.matchAll(joinPattern);

  const joinPreds: string[] = [];
  for (const match of matches) {
    // Verificar se os prefixos (nomes de tabela) são diferentes
    const left = match[1].split('.')[0];
    const right = match[2].split('.')[0];

    if (left !== right) {
      joinPreds.push(match[0]);
    }
  }

  return joinPreds;
}
```

#### Tarefa 3: Converter Cross Product em Join

```typescript
function convertToJoin(
  selection: Selection,
  crossProduct: CrossProduct
): RelationalAlgebraNode {
  const joinPreds = extractJoinPredicates(selection.condition);
  const filterPreds = extractFilterPredicates(selection.condition);

  if (joinPreds.length === 0) {
    // Não é possível converter: ainda é um cross product
    console.warn('Unavoidable cross product detected!');
    return selection;
  }

  // Criar join
  const join: Join = {
    type: 'Join',
    joinType: 'INNER',
    left: crossProduct.left,
    right: crossProduct.right,
    condition: joinPreds.join(' AND ')
  };

  // Aplicar filtros restantes
  if (filterPreds.length > 0) {
    return {
      type: 'Selection',
      condition: filterPreds.join(' AND '),
      input: join
    };
  }

  return join;
}
```

#### Tarefa 4: Atualizar Tradutor AST

Quando `FROM R, S WHERE R.id = S.id` for encontrado:

**Arquivo**: `translator/ASTToAlgebraTranslator.ts`

```typescript
// Detectar se há múltiplas tabelas no FROM sem JOIN explícito
if (fromTables.length > 1 && !hasExplicitJoins) {
  // Criar cross product inicial
  let result = { type: 'CrossProduct', left: ..., right: ... };

  // Se há condição WHERE, aplicar
  if (whereClause) {
    result = { type: 'Selection', condition: ..., input: result };
  }

  // A regra de otimização converterá para JOIN depois
}
```

---

## 🎯 Ordem Recomendada de Implementação

### Fase 1: Projection Pushdown (Mais Simples)
1. ✅ Merge de projeções consecutivas
2. ✅ Eliminar projeções redundantes (π[*])
3. ⚠️ Implementar `extractAttributesFromCondition`

**Tempo estimado**: 2-4 horas

### Fase 2: Restrictive Ordering (Média Complexidade)
1. ✅ Melhorar `estimateSelectivity` com mais casos
2. ✅ Implementar reordenação de seleções
3. ⚠️ Adicionar métricas de custo

**Tempo estimado**: 3-5 horas

### Fase 3: Cross Product Elimination (Mais Complexa)
1. ⚠️ Adicionar tipos `Join` e `CrossProduct` à álgebra
2. ⚠️ Atualizar tradutor AST para gerar cross products
3. ✅ Implementar detecção de cross products
4. ✅ Implementar extração de predicados de join
5. ✅ Converter cross product + selection em join

**Tempo estimado**: 6-10 horas

---

## 🧪 Checklist de Testes

Para cada regra implementada:

- [ ] Teste: caso base (não deve modificar)
- [ ] Teste: transformação simples
- [ ] Teste: transformação complexa (aninhada)
- [ ] Teste: caso edge (valores vazios, wildcards)
- [ ] Teste de integração: com outras regras

---

## 📚 Referências

- **Database System Concepts** (Silberschatz et al.)
  - Capítulo 13: Query Optimization
  - Seção 13.3: Heuristic Optimization

- **Database Management Systems** (Ramakrishnan & Gehrke)
  - Capítulo 15: Query Optimization
  - Seção 15.2: Relational Algebra Equivalences

- **Papers Clássicos**:
  - "Access Path Selection in a Relational DBMS" (Selinger et al., 1979)
  - "Query Optimization in Database Systems" (Jarke & Koch, 1984)
