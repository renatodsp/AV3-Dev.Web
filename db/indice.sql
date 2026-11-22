-- Índice para a consulta dos pedidos de um cliente (Meus pedidos).
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);
