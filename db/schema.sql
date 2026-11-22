-- Esquema do banco de dados da Alma & Aroma.

-- Remove as tabelas existentes para recriá-las.

DROP TABLE IF EXISTS itens_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS contatos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- Tabela responsável por armazenar os clientes.
CREATE TABLE clientes (
    id        SERIAL PRIMARY KEY,
    nome      VARCHAR(100) NOT NULL,
    email     VARCHAR(150) NOT NULL UNIQUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela que armazena os produtos da perfumaria.
CREATE TABLE produtos (
    id        SERIAL PRIMARY KEY,
    nome      VARCHAR(100) NOT NULL UNIQUE,
    tipo      VARCHAR(30)  NOT NULL,
    descricao TEXT         NOT NULL,
    preco     NUMERIC(10,2) NOT NULL CHECK (preco > 0),
    ml        INTEGER      NOT NULL CHECK (ml > 0),
    estoque   INTEGER      NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    ativo     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Armazena as mensagens enviadas pelos clientes.
CREATE TABLE contatos (
    id         SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
    assunto    VARCHAR(150) NOT NULL,
    mensagem   TEXT NOT NULL,
    criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Registra os pedidos realizados pelos clientes.
CREATE TABLE pedidos (
    id         SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    status     VARCHAR(20) NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
    total      NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Relaciona os pedidos aos produtos, armazenando
-- a quantidade e o preço de cada item.
CREATE TABLE itens_pedido (
    pedido_id      INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id     INTEGER NOT NULL REFERENCES produtos(id),
    quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario > 0),
    PRIMARY KEY (pedido_id, produto_id)
);

-- O índice idx_pedidos_cliente_data está em db/indice.sql.
