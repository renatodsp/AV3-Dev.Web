-- Consultas do projeto Alma & Aroma.

-- Consulta 1: perfumes disponíveis, do mais barato ao mais caro.
SELECT nome, tipo, preco, estoque
FROM produtos
WHERE ativo
ORDER BY preco;

-- Consulta 2: produtos com estoque baixo.
SELECT nome, estoque
FROM produtos
WHERE estoque < 10
ORDER BY estoque;

-- Consulta 3 (JOIN)
-- Consulta os pedidos e seus respectivos produtos
-- de um cliente específico.
SELECT
    p.id AS pedido,
    p.status,
    p.criado_em,
    c.nome AS cliente,
    pr.nome AS produto,
    i.quantidade,
    i.preco_unitario
FROM pedidos p
JOIN clientes c
    ON c.id = p.cliente_id
JOIN itens_pedido i
    ON i.pedido_id = p.id
JOIN produtos pr
    ON pr.id = i.produto_id
WHERE c.email = 'maria@exemplo.com'
ORDER BY p.criado_em DESC;

-- Consulta 4 (JOIN): itens de um pedido, com o nome do perfume.
SELECT pr.nome AS perfume, i.quantidade, i.preco_unitario
FROM itens_pedido i
JOIN produtos pr ON pr.id = i.produto_id
WHERE i.pedido_id = 1;

-- Consulta 5 (COUNT): quantidade de pedidos por status.
SELECT status, COUNT(*) AS pedidos
FROM pedidos
GROUP BY status;

-- Consulta 6 (JOIN e SUM)
-- Calcula as unidades vendidas e o faturamento
-- de cada produto, desconsiderando pedidos cancelados.
SELECT
    pr.nome,
    SUM(i.quantidade) AS unidades,
    SUM(i.quantidade * i.preco_unitario) AS faturamento
FROM itens_pedido i
JOIN pedidos p
    ON p.id = i.pedido_id
JOIN produtos pr
    ON pr.id = i.produto_id
WHERE p.status <> 'cancelado'
GROUP BY pr.nome
ORDER BY faturamento DESC;

-- Índice idx_pedidos_cliente_data (db/indice.sql): teste antes e depois com EXPLAIN.
-- 1. Remover o índice, caso já exista,
-- para realizar o primeiro teste sem ele.
DROP INDEX IF EXISTS idx_pedidos_cliente_data;

-- 2. Executar a consulta antes da criação do índice.
EXPLAIN ANALYZE
SELECT *
FROM pedidos
WHERE cliente_id = 1
ORDER BY criado_em DESC;

-- 3. Criar o índice nas colunas utilizadas
-- no filtro e na ordenação.
CREATE INDEX idx_pedidos_cliente_data
ON pedidos (cliente_id, criado_em DESC);

-- 4. Executar exatamente a mesma consulta
-- depois da criação do índice.
EXPLAIN ANALYZE
SELECT *
FROM pedidos
WHERE cliente_id = 1
ORDER BY criado_em DESC;
