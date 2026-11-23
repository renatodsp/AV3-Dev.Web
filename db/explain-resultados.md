# EXPLAIN ANALYZE: índice `idx_pedidos_cliente_data`

Consulta: `SELECT * FROM pedidos WHERE cliente_id = 1 ORDER BY criado_em DESC;`

Teste feito no Neon (PostgreSQL) com 20.000 pedidos de demonstração distribuídos entre 200 clientes
(inseridos dentro de uma transação e desfeitos com ROLLBACK). Refaça no SQL Editor do Neon e tire os prints.

## Antes (sem índice)
```
Sort (cost=401.00..401.23 rows=91) (actual time=0.848..0.851 rows=50)
  Sort Key: criado_em DESC
  -> Seq Scan on pedidos (cost=0.00..398.04 rows=91) (actual time=0.010..0.837 rows=50)
       Filter: (cliente_id = 1)
       Rows Removed by Filter: 19953
       Buffers: shared hit=148
Execution Time: 0.873 ms
```

## Depois (CREATE INDEX idx_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC))
```
Sort (cost=144.67..144.90 rows=91) (actual time=0.089..0.092 rows=50)
  Sort Key: criado_em DESC
  -> Bitmap Heap Scan on pedidos (cost=4.99..141.71 rows=91) (actual time=0.032..0.078 rows=50)
       Recheck Cond: (cliente_id = 1)
       Heap Blocks: exact=42
       -> Bitmap Index Scan on idx_pedidos_cliente_data (cost=0.00..4.97 rows=91)
            Index Cond: (cliente_id = 1)
Execution Time: 0.116 ms
```

## Interpretação
- Antes: o banco lia a tabela inteira (`Seq Scan`) e descartava 19.953 linhas para achar as 50 do cliente.
- Depois: o `Bitmap Index Scan` usa o índice para ir direto às linhas do cliente; o custo estimado caiu
  de ~398 para ~141 e as páginas lidas de 148 para ~44.
- O `Sort` continua no plano, pois o otimizador escolheu o Bitmap Scan, que não devolve as linhas ordenadas.
- Com poucas linhas (como nos dados iniciais) o PostgreSQL continua preferindo `Seq Scan`, porque é mais barato.
- Os tempos variam de execução para execução; a comparação mais confiável é o plano e o custo, não o tempo.
