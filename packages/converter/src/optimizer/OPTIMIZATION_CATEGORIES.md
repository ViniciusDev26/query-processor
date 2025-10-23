# Categorias de Otimização: Logical vs Heuristic vs Cost-Based

## 📚 As Três Categorias

```typescript
export type OptimizationCategory = 'logical' | 'heuristic' | 'cost-based';
```

Existem três tipos principais de otimização em bancos de dados:

1. **Logical** (Lógica) - Baseada em equivalências matemáticas
2. **Heuristic** (Heurística) - Baseada em regras gerais "que sempre funcionam"
3. **Cost-Based** (Baseada em Custo) - Baseada em estatísticas reais dos dados

---

## 1️⃣ Logical Optimization (Otimização Lógica)

### 🎯 Definição

Transformações baseadas em **equivalências lógicas** da álgebra relacional. São matematicamente corretas e **sempre** produzem o mesmo resultado.

### 🔑 Características

- ✅ **Seguras**: Sempre corretas
- ✅ **Determinísticas**: Sempre produzem o mesmo resultado
- ✅ **Independentes dos dados**: Não precisam de estatísticas
- ✅ **Baseadas em lógica matemática**

### 📝 Exemplos

#### Exemplo 1: Simplificação de Expressões Booleanas

```sql
-- Original
WHERE NOT (age < 18)

-- Otimizado (equivalência lógica)
WHERE age >= 18
```

**Implementação:**
```typescript
function simplifyNotExpression(condition: string): string {
  // NOT (x < y) ≡ x >= y
  // NOT (x > y) ≡ x <= y
  // NOT (x = y) ≡ x != y

  if (condition.startsWith('NOT (') && condition.endsWith(')')) {
    const inner = condition.slice(5, -1);

    if (inner.includes(' < ')) {
      return inner.replace(' < ', ' >= ');
    }
    if (inner.includes(' > ')) {
      return inner.replace(' > ', ' <= ');
    }
    if (inner.includes(' = ')) {
      return inner.replace(' = ', ' != ');
    }
  }

  return condition;
}
```

#### Exemplo 2: Eliminação de Dupla Negação

```sql
-- Original
WHERE NOT (NOT (age > 18))

-- Otimizado (lei da dupla negação)
WHERE age > 18
```

#### Exemplo 3: Leis de De Morgan

```sql
-- Original
WHERE NOT (age > 18 AND city = 'NY')

-- Otimizado (De Morgan)
WHERE age <= 18 OR city != 'NY'
```

**Implementação:**
```typescript
function applyDeMorgan(condition: string): string {
  // NOT (A AND B) ≡ (NOT A) OR (NOT B)
  // NOT (A OR B) ≡ (NOT A) AND (NOT B)

  if (condition.startsWith('NOT (') && condition.includes(' AND ')) {
    // Implementar transformação
  }

  return condition;
}
```

#### Exemplo 4: Constant Folding (Dobramento de Constantes)

```sql
-- Original
WHERE age > (10 + 8)

-- Otimizado
WHERE age > 18
```

```typescript
function foldConstants(condition: string): string {
  // Avaliar expressões aritméticas em tempo de compilação
  // (10 + 8) → 18
  // (5 * 4) → 20
  // ('Hello' || ' World') → 'Hello World'

  return condition.replace(/\((\d+)\s*\+\s*(\d+)\)/g, (match, a, b) => {
    return String(Number(a) + Number(b));
  });
}
```

#### Exemplo 5: Eliminação de Predicados Redundantes

```sql
-- Original
WHERE age > 18 AND age > 10

-- Otimizado (age > 18 implica age > 10)
WHERE age > 18
```

#### Exemplo 6: Detecção de Contradições

```sql
-- Original
WHERE age > 18 AND age < 10

-- Otimizado (detecta impossibilidade)
WHERE FALSE  -- ou retorna conjunto vazio
```

### 🎓 Regras de Equivalência Algébrica

Todas baseadas em **álgebra relacional**:

```
1. Comutatividade de σ:
   σ[c1](σ[c2](R)) ≡ σ[c2](σ[c1](R))

2. Combinação de σ:
   σ[c1](σ[c2](R)) ≡ σ[c1 AND c2](R)

3. Comutatividade de π (com cuidado):
   π[A](π[A,B](R)) ≡ π[A](R)

4. Comutatividade de ×:
   R × S ≡ S × R

5. Associatividade de ⋈:
   (R ⋈ S) ⋈ T ≡ R ⋈ (S ⋈ T)
```

### 📦 Implementação de Regra Lógica

```typescript
// optimizer/rules/logicalSimplification.ts

function applyLogicalSimplification(node: RelationalAlgebraNode): RelationalAlgebraNode {
  switch (node.type) {
    case 'Selection':
      // Simplificar a condição
      const simplified = simplifyCondition(node.condition);

      // Detectar condições sempre falsas
      if (simplified === 'FALSE') {
        // Retornar relação vazia
        return { type: 'EmptyRelation' };
      }

      // Detectar condições sempre verdadeiras
      if (simplified === 'TRUE') {
        // Eliminar a seleção
        return applyLogicalSimplification(node.input);
      }

      return {
        type: 'Selection',
        condition: simplified,
        input: applyLogicalSimplification(node.input)
      };

    case 'Projection':
      // Eliminar projeções redundantes
      if (node.input.type === 'Projection') {
        // π[A](π[A,B,C](R)) → π[A](R)
        return {
          type: 'Projection',
          attributes: node.attributes,
          input: applyLogicalSimplification(node.input.input)
        };
      }
      return node;

    default:
      return node;
  }
}

export const logicalSimplificationRule: OptimizationRuleMetadata = {
  name: 'logical-simplification',
  description: 'Applies logical equivalences to simplify expressions',
  category: 'logical',
  apply: applyLogicalSimplification
};
```

---

## 2️⃣ Heuristic Optimization (Otimização Heurística)

### 🎯 Definição

Regras baseadas em **experiência prática** que "quase sempre" melhoram o desempenho, independente dos dados específicos.

### 🔑 Características

- ✅ **Regras gerais**: Funcionam na maioria dos casos
- ✅ **Não precisam de estatísticas**: Independentes dos dados
- ⚠️ **Nem sempre são ótimas**: Mas são "boas o suficiente"
- ⚡ **Rápidas de aplicar**: Não exigem análise complexa

### 📝 Exemplos (o que implementamos!)

```typescript
// Todos são HEURISTIC:

1. selectionPushdownRule        // ← "Empurre seleções para baixo"
2. projectionPushdownRule       // ← "Empurre projeções para baixo"
3. restrictiveOrderingRule      // ← "Mais restritivo primeiro"
4. crossProductEliminationRule  // ← "Evite produtos cartesianos"
```

### 🎓 Por que são heurísticas?

**Exemplo:**

```sql
SELECT * FROM users WHERE age > 18
```

**Heurística diz:** "Empurre a seleção para baixo"

```
Antes:  π[*](σ[age > 18](users))
Depois: σ[age > 18](π[*](users))  ← Melhor (geralmente)
```

**Mas:** Se a tabela tiver apenas 10 linhas e 100 colunas, pode não fazer diferença!

A heurística não sabe disso - ela apenas aplica a regra cegamente, e **na maioria das vezes** isso funciona bem.

---

## 3️⃣ Cost-Based Optimization (Otimização Baseada em Custo)

### 🎯 Definição

Usa **estatísticas reais** dos dados para escolher o melhor plano de execução estimando o custo de cada alternativa.

### 🔑 Características

- 📊 **Baseada em estatísticas**: Precisa de metadados
- 🎯 **Específica para os dados**: Depende do tamanho, distribuição, índices
- 🧮 **Calcula custos**: Estima tempo de execução
- ✅ **Produz planos ótimos**: Escolhe o melhor dentre várias opções

### 📊 Estatísticas Necessárias

Para fazer otimização baseada em custo, você precisa conhecer:

```typescript
interface TableStatistics {
  // Número de tuplas (linhas)
  cardinality: number;  // ex: 1.000.000 linhas

  // Número de páginas em disco
  pages: number;  // ex: 10.000 páginas

  // Por coluna:
  columnStats: {
    [column: string]: {
      // Número de valores distintos
      distinctValues: number;  // ex: 'country' tem 50 valores distintos

      // Valor mínimo e máximo
      min: any;
      max: any;

      // Distribuição (histograma)
      histogram?: number[];

      // Porcentagem de valores nulos
      nullPercentage: number;
    }
  };

  // Índices disponíveis
  indexes: {
    name: string;
    columns: string[];
    type: 'btree' | 'hash' | 'bitmap';
    height: number;  // Altura da árvore B+
  }[];
}
```

### 🧮 Modelos de Custo

#### Modelo Básico de I/O

```typescript
function estimateCost(node: RelationalAlgebraNode, stats: Statistics): number {
  switch (node.type) {
    case 'Relation':
      // Custo de ler a tabela inteira
      return stats.tables[node.name].pages;

    case 'Selection':
      const inputCost = estimateCost(node.input, stats);
      const selectivity = estimateSelectivity(node.condition, stats);

      // Custo de ler + custo de filtrar
      return inputCost + (selectivity * inputCost);

    case 'Join':
      const leftCost = estimateCost(node.left, stats);
      const rightCost = estimateCost(node.right, stats);

      // Custo depende do algoritmo de join
      if (hasIndex(node.right, node.condition)) {
        // Index nested loop join
        return leftCost + (leftCardinality * indexLookupCost);
      } else {
        // Hash join
        return leftCost + rightCost + (leftCardinality * rightCardinality * hashCost);
      }
  }
}
```

### 📝 Exemplos

#### Exemplo 1: Escolha de Algoritmo de Join

```sql
SELECT * FROM users JOIN orders ON users.id = orders.user_id
```

**Opções:**

1. **Nested Loop Join** (sem índice):
   - Custo: |users| × |orders| = 1.000 × 100.000 = 100.000.000 operações

2. **Hash Join**:
   - Custo: |users| + |orders| + hash_overhead = 1.000 + 100.000 + 10.000 = 111.000 operações

3. **Index Nested Loop Join** (com índice em orders.user_id):
   - Custo: |users| + (|users| × index_lookup) = 1.000 + (1.000 × 3) = 4.000 operações

**Escolha:** Index Nested Loop (4.000) é o melhor! ✅

#### Exemplo 2: Ordem de Joins

```sql
SELECT * FROM A JOIN B JOIN C
```

**Estatísticas:**
- |A| = 1.000 linhas
- |B| = 100 linhas
- |C| = 10 linhas

**Opções:**

1. **(A ⋈ B) ⋈ C**:
   - A ⋈ B = 1.000 × 100 = 100.000
   - Resultado ⋈ C = 100.000 × 10 = 1.000.000
   - **Total: 1.100.000**

2. **(B ⋈ C) ⋈ A**:
   - B ⋈ C = 100 × 10 = 1.000
   - Resultado ⋈ A = 1.000 × 1.000 = 1.000.000
   - **Total: 1.001.000** ✅ Melhor!

3. **(A ⋈ C) ⋈ B**:
   - A ⋈ C = 1.000 × 10 = 10.000
   - Resultado ⋈ B = 10.000 × 100 = 1.000.000
   - **Total: 1.010.000**

**Escolha:** Opção 2 (B ⋈ C) ⋈ A é a melhor! ✅

#### Exemplo 3: Uso de Índices

```sql
SELECT * FROM users WHERE age > 18 AND country = 'Brazil'
```

**Estatísticas:**
- |users| = 1.000.000
- Índice em 'age': B-tree
- Índice em 'country': Hash
- Seletividade(age > 18) = 0.8 (80%)
- Seletividade(country = 'Brazil') = 0.15 (15%)

**Opções:**

1. **Full table scan + filtro**:
   - Ler 1.000.000 linhas
   - Filtrar tudo em memória
   - **Custo: 10.000 páginas**

2. **Usar índice de 'age'**:
   - B-tree scan de age > 18
   - Filtrar country em memória
   - Retorna 800.000 linhas, filtra para 150.000
   - **Custo: ~8.000 páginas**

3. **Usar índice de 'country'**:
   - Hash lookup de country = 'Brazil'
   - Filtrar age em memória
   - Retorna 150.000 linhas, filtra para 150.000
   - **Custo: ~1.500 páginas** ✅ Melhor!

**Escolha:** Usar índice de 'country' primeiro! ✅

### 📦 Implementação de Regra Cost-Based

```typescript
// optimizer/rules/joinReordering.ts

interface JoinOrderingOptions {
  // Estatísticas do banco
  statistics: DatabaseStatistics;
}

function applyJoinReordering(
  node: RelationalAlgebraNode,
  options: JoinOrderingOptions
): RelationalAlgebraNode {
  // Identificar joins
  const joins = extractJoins(node);

  if (joins.length < 2) {
    return node; // Nada para reordenar
  }

  // Gerar todas as ordens possíveis (ou usar algoritmo de busca)
  const possibleOrders = generateJoinOrders(joins);

  // Calcular custo de cada ordem
  const costsWithOrders = possibleOrders.map(order => ({
    order,
    cost: estimateJoinCost(order, options.statistics)
  }));

  // Escolher a ordem com menor custo
  const bestOrder = costsWithOrders.reduce((best, current) =>
    current.cost < best.cost ? current : best
  );

  // Reconstruir a árvore com a melhor ordem
  return buildJoinTree(bestOrder.order);
}

function estimateJoinCost(
  joins: Join[],
  stats: DatabaseStatistics
): number {
  let totalCost = 0;
  let currentCardinality = 1;

  for (const join of joins) {
    const leftCard = getCardinality(join.left, stats);
    const rightCard = getCardinality(join.right, stats);

    // Estimar resultado do join
    const resultCard = estimateJoinCardinality(join, stats);

    // Custo depende do algoritmo escolhido
    const joinCost = chooseJoinAlgorithm(join, leftCard, rightCard, stats);

    totalCost += joinCost;
    currentCardinality = resultCard;
  }

  return totalCost;
}

export const joinReorderingRule: OptimizationRuleMetadata = {
  name: 'join-reordering',
  description: 'Reorders joins based on estimated cost using statistics',
  category: 'cost-based',  // ← COST-BASED!
  apply: applyJoinReordering
};
```

---

## 📊 Comparação Lado a Lado

| Aspecto | Logical | Heuristic | Cost-Based |
|---------|---------|-----------|------------|
| **Base** | Equivalências matemáticas | Regras gerais | Estatísticas reais |
| **Precisa de stats?** | ❌ Não | ❌ Não | ✅ Sim |
| **Sempre correto?** | ✅ Sempre | ⚠️ Quase sempre | ✅ Ótimo para os dados |
| **Custo computacional** | Baixo | Baixo | Alto |
| **Exemplo** | NOT (x < 5) → x >= 5 | Empurre seleções | Join pequeno primeiro |
| **Quando aplicar** | Sempre | Quando não tem stats | Quando tem stats |

---

## 🎯 Pipeline Completo de Otimização

```typescript
export const COMPLETE_OPTIMIZATION_PIPELINE = [
  // FASE 1: LOGICAL (sempre primeiro)
  logicalSimplificationRule,     // Simplifica expressões
  constantFoldingRule,           // Avalia constantes
  redundancyEliminationRule,     // Remove redundâncias

  // FASE 2: HEURISTIC (regras gerais)
  crossProductEliminationRule,
  selectionPushdownRule,
  restrictiveOrderingRule,
  projectionPushdownRule,

  // FASE 3: COST-BASED (se estatísticas disponíveis)
  joinReorderingRule,            // Reordena joins por custo
  indexSelectionRule,            // Escolhe índices
  joinAlgorithmSelectionRule,    // Escolhe algoritmo
];
```

---

## 🔧 Exemplo Completo: Uma Query Passando Pelas 3 Fases

```sql
SELECT name, age
FROM users
WHERE age > (10 + 8) AND NOT (age < 25)
```

### FASE 1: LOGICAL

```
Entrada:
π[name, age](σ[age > (10 + 8) AND NOT (age < 25)](users))

Após constant folding:
π[name, age](σ[age > 18 AND NOT (age < 25)](users))

Após simplification:
π[name, age](σ[age > 18 AND age >= 25](users))

Após redundancy elimination (age >= 25 implica age > 18):
π[name, age](σ[age >= 25](users))
```

### FASE 2: HEURISTIC

```
Após selection pushdown:
σ[age >= 25](π[name, age](users))

Após projection pushdown:
π[name, age](σ[age >= 25](users))
```

### FASE 3: COST-BASED

```
Decisões baseadas em stats:

Stats: |users| = 1.000.000
       Índice B-tree em 'age'
       Seletividade(age >= 25) ≈ 0.6

Opção 1: Table scan
  Custo: 10.000 páginas

Opção 2: Index scan
  Custo: altura_índice + (0.6 × 10.000) = 3 + 6.000 = 6.003 páginas

Escolha: Index scan! ✅

Plano final:
IndexScan[users, age >= 25] → π[name, age]
```

---

## 💡 Quando Usar Cada Uma?

### Use LOGICAL quando:
- ✅ Quer garantir correção matemática
- ✅ Simplificar expressões
- ✅ Não tem estatísticas disponíveis

### Use HEURISTIC quando:
- ✅ Quer otimização rápida e "boa o suficiente"
- ✅ Não tem estatísticas (ou são imprecisas)
- ✅ Quer resultados previsíveis

### Use COST-BASED quando:
- ✅ Tem estatísticas confiáveis
- ✅ Performance é crítica
- ✅ Pode arcar com o custo de planejamento
- ✅ Dados mudam frequentemente (stats atualizadas)

---

## 🎓 O Que Temos Atualmente?

**Status atual do projeto:**

```typescript
// ✅ Implementado
selectionPushdownRule (HEURISTIC)

// 🏗️ Estruturado (passthrough)
projectionPushdownRule (HEURISTIC)
restrictiveOrderingRule (HEURISTIC)
crossProductEliminationRule (HEURISTIC)

// ❌ Não implementado ainda
// LOGICAL:
- logicalSimplificationRule
- constantFoldingRule
- redundancyEliminationRule

// COST-BASED:
- joinReorderingRule
- indexSelectionRule
- joinAlgorithmSelectionRule
```

---

## 📚 Referências

- **Selinger et al. (1979)**: Primeiro sistema cost-based (System R)
- **Graefe & McKenna (1993)**: "The Volcano Optimizer Generator"
- **Ioannidis (1996)**: "Query Optimization"
- **Chaudhuri (1998)**: "An Overview of Query Optimization in Relational Systems"
