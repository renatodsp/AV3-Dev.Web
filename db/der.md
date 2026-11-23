# Diagrama Entidade-Relacionamento (DER)

Imagem para o relatório: [`der.svg`](der.svg). A versão abaixo em Mermaid renderiza direto no GitHub.

```mermaid
erDiagram
    CLIENTES ||--o{ CONTATOS : "envia"
    PRODUTOS ||--o{ CONTATOS : "motiva (opcional)"
    CLIENTES ||--o{ PEDIDOS : "faz"
    PEDIDOS  ||--|{ ITENS_PEDIDO : "contém"
    PRODUTOS ||--o{ ITENS_PEDIDO : "é vendido em"

    CLIENTES {
        int id PK
        varchar nome "NOT NULL"
        varchar email "UNIQUE, NOT NULL"
        timestamp criado_em
    }
    PRODUTOS {
        int id PK
        varchar nome "UNIQUE, NOT NULL"
        varchar tipo "NOT NULL"
        text descricao "NOT NULL"
        numeric preco "CHECK > 0"
        int ml "CHECK > 0"
        int estoque "CHECK >= 0"
        boolean ativo
    }
    CONTATOS {
        int id PK
        int cliente_id FK
        int produto_id FK "opcional"
        varchar assunto "NOT NULL"
        text mensagem "NOT NULL"
        timestamp criado_em
    }
    PEDIDOS {
        int id PK
        int cliente_id FK
        varchar status "pendente, confirmado, cancelado"
        numeric total "CHECK >= 0"
        timestamp criado_em
    }
    ITENS_PEDIDO {
        int pedido_id PK, FK
        int produto_id PK, FK
        int quantidade "CHECK > 0"
        numeric preco_unitario "CHECK > 0"
    }
```

## Relacionamentos
| Relação | Cardinalidade | Regra |
|---|---|---|
| clientes → contatos | 1:N | Apagar o cliente apaga os contatos (`ON DELETE CASCADE`) |
| produtos → contatos | 1:N (opcional) | Se o produto for apagado, o contato fica sem produto (`ON DELETE SET NULL`) |
| clientes → pedidos | 1:N | Não é possível apagar cliente com pedidos |
| pedidos → itens_pedido | 1:N | Apagar o pedido apaga os itens (`ON DELETE CASCADE`) |
| produtos → itens_pedido | 1:N | Não é possível apagar produto já vendido |

`itens_pedido` resolve a relação muitos-para-muitos entre pedidos e produtos (um pedido tem vários perfumes e um perfume está em vários pedidos). O `preco_unitario` guarda o preço no momento da compra.
