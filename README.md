# Query Processor

> O que o seu banco de dados faz por baixo dos panos quando você roda um `SELECT` — só que visível, editável e explicado passo a passo.

**SQL → AST → Álgebra Relacional → Álgebra Relacional Otimizada.** Um parser de SQL escrito do zero em TypeScript, acoplado a um editor web que mostra, lado a lado, a árvore de execução de uma query antes e depois de passar pelas mesmas heurísticas de otimização que um SGBD de verdade (PostgreSQL, MySQL...) aplicaria internamente.

```sql
SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE users.age > 18 AND orders.total > 100
```

Isso não vira só um resultado — vira uma árvore de álgebra relacional:

```
π(users.name, orders.total)
  └── ⋈(users.id = orders.user_id)
        ├── σ(users.age > 18)(users)
        └── σ(orders.total > 100)(orders)
```

com as seleções e projeções já empurradas para o mais perto possível das tabelas base, exatamente como um otimizador de query real faria antes de decidir o plano de execução.

## Por que isso existe

Todo banco de dados relacional traduz o SQL que você escreve em uma **árvore de álgebra relacional** e depois reescreve essa árvore para rodar mais rápido — sem mudar o resultado. Esse processo normalmente é uma caixa-preta escondida dentro do otimizador de query do banco.

Este projeto expõe esse processo: um lexer e parser de SQL construídos do zero (sem depender de nenhuma lib de parsing de SQL pronta), um tradutor para álgebra relacional formal, e um otimizador heurístico que aplica, na ordem certa, as mesmas transformações clássicas de um livro de banco de dados. Serve tanto para estudar teoria de banco de dados na prática quanto como base para experimentar novas regras de otimização.

## O que ele já sabe fazer

- **Parsing completo de `SELECT`**: `WHERE` com `AND`/`OR`/parênteses, `INNER JOIN` e `CROSS JOIN` com colunas qualificadas (`tabela.coluna`), subqueries no `FROM`
- **Tradução para álgebra relacional formal**: projeção (`π`), seleção (`σ`), junção (`⋈`) e produto cartesiano (`×`)
- **Otimizador com 4 heurísticas aplicadas em cascata**, cada uma assumindo o resultado da anterior:
  1. *Push-down de seleções* — filtra o mais cedo possível, perto dos dados
  2. *Push-down de projeções* — descarta colunas desnecessárias antes das junções
  3. *Condições mais restritivas primeiro* — reordena seleções e junções por seletividade estimada
  4. *Eliminação de produto cartesiano* — converte `×` em `⋈` sempre que uma condição permitir
- **Validação semântica** contra um schema de banco (tabelas/colunas case-insensitive, compatibilidade de tipos em comparações, detecção de condições de `JOIN` inválidas)
- **Nunca lança exceção**: toda a API é baseada em resultado (`{ success, ... }`), com mensagens de erro detalhadas em cada etapa (lexer, parser, tradutor, validador)
- **Editor web** com Monaco, autocomplete ciente do schema, e diagramas Mermaid comparando a árvore original com a otimizada — incluindo a lista de regras aplicadas em cada query

**SQL suportado hoje:**
```sql
-- Consultas básicas
SELECT * FROM users
SELECT id, name FROM users
SELECT * FROM users WHERE age > 18

-- Condições complexas
SELECT * FROM users WHERE age >= 18 AND status = 'active'
SELECT * FROM users WHERE age < 18 OR age > 65
SELECT * FROM users WHERE (age > 18 AND status = 'active') OR premium = true

-- INNER JOIN com colunas qualificadas
SELECT users.id, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id

-- CROSS JOIN
SELECT * FROM users CROSS JOIN orders

-- Subqueries no FROM
SELECT * FROM (SELECT id, name FROM users) AS active_users
```

## Estrutura do monorepo

```
query-processor/
├── packages/
│   ├── converter/   # Lexer, parser, AST, tradutor, otimizador e validador de schema
│   └── web/          # Editor SQL interativo (Monaco) com visualização em Mermaid
└── package.json      # Configuração raiz do monorepo (npm workspaces)
```

### `@query-processor/converter`

Biblioteca TypeScript publicável isoladamente, com o pipeline completo: **Lexer → Parser (CST, via [Chevrotain](https://chevrotain.io/)) → AST → Álgebra Relacional → Otimizador**.

**Stack:** TypeScript, Chevrotain, Vitest

### `web`

Editor SQL interativo para ver o pipeline do converter em ação: tema escuro, validação em tempo real contra um schema de banco, visualizador de schema, e comparação visual (Mermaid) entre a árvore original e a otimizada.

**Stack:** React 19, Monaco Editor, Vite, Tailwind CSS 4, Mermaid

Veja [`packages/web/src/utils/README.md`](packages/web/src/utils/README.md) para detalhes de como o autocomplete de SQL é conectado ao Monaco.

## Começando

### Instalar dependências

```bash
npm install
```

### Build de todos os pacotes

```bash
npm run build
```

### Rodar os testes

```bash
# Todos os testes
npm test

# Só o converter
npm run test:converter

# Watch mode
cd packages/converter
npm run test:watch
```

### Desenvolvimento

```bash
# Editor web
cd packages/web
npm run dev

# Build do converter
cd packages/converter
npm run build
```

### Usando o converter como biblioteca

```typescript
import { parseSQL, validateSQL } from '@query-processor/converter';

// Parseia SQL e já retorna AST, tradução para álgebra e versão otimizada
const result = parseSQL('SELECT * FROM users WHERE age > 18');

if (!result.success) {
  console.error('Parse error:', result.error, result.details);
  return;
}

console.log('AST:', result.ast);
console.log('Álgebra relacional:', result.translationString);
console.log('Álgebra otimizada:', result.optimizationString);

// Valida SQL contra um schema
const schema = {
  tables: {
    users: {
      columns: {
        id: { type: 'integer' },
        name: { type: 'text' },
        age: { type: 'integer' }
      }
    }
  }
};

const errors = validateSQL('SELECT * FROM users WHERE age > 18', schema);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

## Licença

ISC
