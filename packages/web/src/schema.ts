import type { DatabaseSchema } from "@query-processor/converter";

export const databaseSchema: DatabaseSchema = {
	tables: {
		endereco: {
			columns: {
				idEndereco: { type: "INT", primaryKey: true },
				EnderecoPadrao: { type: "TINYINT" },
				Logradouro: { type: "VARCHAR", length: 45 },
				Numero: { type: "VARCHAR", length: 45 },
				Complemento: { type: "VARCHAR", length: 45 },
				Bairro: { type: "VARCHAR", length: 45 },
				Cidade: { type: "VARCHAR", length: 45 },
				UF: { type: "VARCHAR", length: 2 },
				CEP: { type: "VARCHAR", length: 8 },
				TipoEndereco_idTipoEndereco: { type: "INT" },
				Cliente_idCliente: { type: "INT" },
			},
		},

		tipoendereco: {
			columns: {
				idTipoEndereco: { type: "INT", primaryKey: true },
				Descricao: { type: "VARCHAR", length: 45 },
			},
		},

		cliente: {
			columns: {
				idCliente: { type: "INT", primaryKey: true },
				Nome: { type: "VARCHAR", length: 45 },
				Email: { type: "VARCHAR", length: 100 },
				Nascimento: { type: "DATETIME" },
				Senha: { type: "VARCHAR", length: 200 },
				TipoCliente_idTipoCliente: { type: "INT" },
				DataRegistro: { type: "DATETIME" },
			},
		},

		tipocliente: {
			columns: {
				idTipoCliente: { type: "INT", primaryKey: true },
				Descricao: { type: "VARCHAR", length: 45 },
			},
		},

		telefone: {
			columns: {
				Numero: { type: "VARCHAR", length: 42 },
				Cliente_idCliente: { type: "INT" },
			},
		},

		pedido: {
			columns: {
				idPedido: { type: "INT", primaryKey: true },
				Status_idStatus: { type: "INT" },
				DataPedido: { type: "DATETIME" },
				ValorTotalPedido: { type: "DECIMAL", precision: 18, scale: 2 },
				Cliente_idCliente: { type: "INT" },
			},
		},

		status: {
			columns: {
				idStatus: { type: "INT", primaryKey: true },
				Descricao: { type: "VARCHAR", length: 45 },
			},
		},

		produto: {
			columns: {
				idProduto: { type: "INT", primaryKey: true },
				Nome: { type: "VARCHAR", length: 45 },
				Descrição: { type: "VARCHAR", length: 200 },
				Preco: { type: "DECIMAL", precision: 18, scale: 2 },
				QuantEstoque: { type: "DECIMAL", precision: 10, scale: 2 },
				Categoria_idCategoria: { type: "INT" },
			},
		},

		categoria: {
			columns: {
				idCategoria: { type: "INT", primaryKey: true },
				Descricao: { type: "VARCHAR", length: 45 },
			},
		},

		pedido_has_produto: {
			columns: {
				idPedidoProduto: { type: "INT", primaryKey: true },
				Pedido_idPedido: { type: "INT" },
				Produto_idProduto: { type: "INT" },
				Quantidade: { type: "DECIMAL", precision: 10, scale: 2 },
				PrecoUnitario: { type: "DECIMAL", precision: 18, scale: 2 },
			},
		},
	},
};
