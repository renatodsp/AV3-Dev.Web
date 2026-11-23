# Como funciona o projeto Alma & Aroma

Guia para quem entrou agora no projeto. Explica a arquitetura, o banco de dados, o que acontece em cada
ação do site e como rodar. Para a instalação resumida, veja também o `README.md`.

## 1. Visão geral

O site é uma perfumaria com catálogo, carrinho, pedidos, formulário de contato e uma assistente de IA (Lia).
Antes, os produtos ficavam escritos direto no HTML e o formulário só validava na tela. Agora tudo que o
usuário faz é **gravado em um banco PostgreSQL hospedado no Neon**.

```
Navegador (index.html + script.js)
        │  fetch() com JSON
        ▼
Servidor Node.js + Express (servidor.js)   ──►  API Gemini (chat da Lia)
        │  consultas SQL parametrizadas (biblioteca pg)
        ▼
Banco PostgreSQL no Neon
```

- **Front-end** (pasta `public/`: `index.html`, `style.css`, `script.js`): mostra a página, monta os cards com os dados que
  vêm da API, controla o carrinho (popup) e o login por e-mail.
- **Back-end** (`servidor.js`): recebe as requisições, valida os dados, conversa com o banco e devolve JSON.
- **Banco** (pasta `db/`): guarda clientes, produtos, contatos e pedidos de forma permanente.

### Por que Node.js e Express?
- **Node.js** executa JavaScript fora do navegador. Assim, front e back usam a mesma linguagem.
- **Express** é uma biblioteca do Node que facilita criar rotas de API. Cada rota é uma função
  (por exemplo, `app.get("/api/produtos", ...)`). O PDF da AV3 aceita Node/Express como tecnologia de backend.

## 2. O banco de dados

### 2.1 Tabelas

| Tabela | Função | Colunas principais |
|---|---|---|
| `clientes` | Quem compra ou entra em contato | `id` (PK), `nome`, `email` (único), `criado_em` |
| `produtos` | Catálogo de perfumes | `id` (PK), `nome` (único), `tipo`, `descricao`, `preco`, `ml`, `estoque`, `ativo` |
| `contatos` | Formulário "Fale com a gente" / "Tenho interesse" | `id` (PK), `cliente_id` (FK), `produto_id` (FK, opcional), `assunto`, `mensagem`, `criado_em` |
| `pedidos` | Cabeçalho de uma compra | `id` (PK), `cliente_id` (FK), `status`, `total`, `criado_em` |
| `itens_pedido` | Perfumes dentro de cada pedido | `pedido_id` + `produto_id` (PK composta, ambas FK), `quantidade`, `preco_unitario` |

O diagrama está em `db/der.png` (imagem), `db/der.svg` (vetor) e `db/der.md` (Mermaid, que o GitHub desenha).

### 2.2 Relacionamentos (chaves estrangeiras)

- `clientes` 1 → N `contatos` (apagar o cliente apaga seus contatos: `ON DELETE CASCADE`)
- `produtos` 1 → N `contatos` (opcional; se o produto sumir, o contato fica sem produto: `ON DELETE SET NULL`)
- `clientes` 1 → N `pedidos` (não dá para apagar um cliente que tenha pedidos)
- `pedidos` 1 → N `itens_pedido` (apagar o pedido apaga os itens: `ON DELETE CASCADE`)
- `produtos` 1 → N `itens_pedido` (não dá para apagar um produto já vendido)

`itens_pedido` existe porque um pedido tem vários perfumes e um perfume aparece em vários pedidos
(relação muitos-para-muitos). O `preco_unitario` guarda o preço **no momento da compra**, assim, se o preço do
produto mudar depois, o pedido antigo continua correto.

### 2.3 Restrições de integridade

O próprio banco impede dados inválidos, mesmo que o servidor tenha uma falha:

- `NOT NULL` nos campos obrigatórios.
- `UNIQUE` em `clientes.email` e `produtos.nome`.
- `CHECK`: `preco > 0`, `ml > 0`, `estoque >= 0`, `quantidade > 0`, `total >= 0` e
  `status IN ('pendente', 'confirmado', 'cancelado')`.

### 2.4 Índice adicional

`idx_pedidos_cliente_data` em `pedidos (cliente_id, criado_em DESC)`.

Por quê: a tela "Meus pedidos" busca os pedidos de **um cliente**, do mais novo para o mais antigo. O PostgreSQL
não cria índice automático em chave estrangeira, então sem ele a busca lê a tabela inteira.

Os planos de execução (`EXPLAIN ANALYZE`) antes e depois estão em `db/explain-resultados.md`. Resumo do teste com
20.000 pedidos: antes, `Seq Scan` descartando 19.953 linhas; depois, `Bitmap Index Scan` usando o índice.
Com poucas linhas (como nos dados de demonstração) o PostgreSQL continua escolhendo `Seq Scan`, porque é mais
barato. Isso é normal.

### 2.5 Consultas documentadas

O arquivo `db/consultas.sql` tem 6 consultas simples, cada uma com um cabeçalho dizendo o que mostra, quem a executa (o site ou você, no SQL Editor do Neon) e como testar:

| # | O que mostra | Tipo | Quem executa |
|---|---|---|---|
| 1 | Perfumes disponíveis, do mais barato ao mais caro | Filtro + ordenação | O site (versão parecida) |
| 2 | Produtos com estoque baixo (`estoque < 10`) | Filtro + ordenação | Você, no Neon |
| 3 | Pedidos de um cliente, do mais novo ao mais antigo | JOIN | O site (versão parecida); é a que o índice acelera |
| 4 | Itens de um pedido, com o nome do perfume | JOIN | O site (versão parecida) |
| 5 | Quantos pedidos há em cada status | Agregação (`COUNT`) | Você, no Neon |
| 6 | Unidades pedidas de cada perfume | JOIN + agregação (`SUM`) | Você, no Neon |

O site **não** executa as consultas 2, 5 e 6: são relatórios para rodar no SQL Editor do Neon (cole uma por vez e clique em Run).
As consultas só **leem** o estoque; quem o altera é o site (pedido diminui, cancelamento devolve). Por isso a consulta 2 vem vazia no
início; para testá-la, rode `UPDATE produtos SET estoque = 5 WHERE nome = 'Bosque Sereno';` e execute a consulta de novo.

### 2.6 Arquivos da pasta `db/`

| Arquivo | O que faz |
|---|---|
| `schema.sql` | Apaga e recria as 5 tabelas com chaves e restrições |
| `indice.sql` | Cria o índice adicional (separado para poder mostrar o "antes") |
| `seed.sql` | Insere 3 perfumes, 2 clientes, 1 contato e 2 pedidos de demonstração |
| `migrar.js` | Executa os três arquivos acima, na ordem, usando a `DATABASE_URL` do `.env` |
| `consultas.sql` | As 6 consultas e o roteiro do EXPLAIN |
| `explain-resultados.md` | Planos antes/depois do índice, com interpretação |
| `der.png` / `der.svg` / `der.md` | Diagrama entidade-relacionamento |

## 3. O que acontece em cada ação do site

| Ação do usuário | Rota da API | O que o servidor faz no banco |
|---|---|---|
| Abrir o site | `GET /api/produtos` | `SELECT` dos produtos ativos; o front monta os cards |
| Enviar o formulário de contato ou "Tenho interesse" | `POST /api/contatos` | Valida; cria o cliente se o e-mail for novo (ou atualiza o nome); `INSERT` em `contatos` |
| Finalizar o pedido no carrinho | `POST /api/pedidos` | Transação (veja 3.1) |
| Entrar com o e-mail | `POST /api/login` | `SELECT` do cliente; devolve o nome, se existir |
| Abrir "Meus pedidos" | `GET /api/pedidos?email=` | `SELECT` com JOIN de pedidos, clientes, itens e produtos |
| Cancelar um pedido pendente | `PATCH /api/pedidos/:id/cancelar` | Transação: muda o status e devolve o estoque |
| Perguntar à Lia | `POST /api/chat` | Não usa o banco; chama a API Gemini |

### 3.1 Como o pedido é gravado (transação)

Ao finalizar um pedido, o servidor faz tudo dentro de uma **transação** (`BEGIN` ... `COMMIT`):

1. Lê os produtos com `SELECT ... FOR UPDATE`, que trava as linhas para duas compras simultâneas não
   venderem além do estoque.
2. Confere o estoque de cada item.
3. Calcula o total usando o **preço que está no banco**, e não o que o navegador mandou.
4. Cria (ou reaproveita) o cliente e insere o pedido e os itens.
5. Diminui o estoque.
6. Se qualquer passo falhar, faz `ROLLBACK` e nada é gravado.

O cancelamento segue a mesma ideia: só cancela pedidos **pendentes** do **próprio e-mail** e devolve o estoque
na mesma transação.

### 3.2 Carrinho e login no navegador

- O **carrinho** fica no `localStorage` do navegador (só guarda `id` e quantidade, nunca o preço). Ele só
  vira registro no banco quando o pedido é finalizado.
- O **login** pede apenas o e-mail, conforme o escopo do trabalho. O e-mail fica salvo no navegador para
  liberar o "Meus pedidos" e preencher os dados do pedido.

## 4. Segurança

- **Consultas parametrizadas** (`$1`, `$2`, ...) em todas as chamadas ao banco: protege contra injeção de SQL.
- **Validação no servidor** de campos obrigatórios, tamanho, formato do e-mail e tipos (números inteiros).
- **Preço e total** vêm sempre do banco.
- **Erros genéricos**: o usuário nunca vê mensagens internas do banco.
- **Segredos fora do código**: a string de conexão e a chave do Gemini ficam no arquivo `.env`, que está no
  `.gitignore`. O `.env.example` mostra o formato sem segredos.
- **Texto na tela**: o `script.js` escapa os textos vindos do banco antes de colocá-los no HTML.

### Limitações conhecidas (vale citar no relatório)
- O login só com e-mail não tem senha: quem souber o e-mail de alguém consegue ver seus pedidos. Foi escolhido
  por simplicidade, e o PDF não exige login complexo.
- Não há pagamento: o pedido apenas é registrado.
- Não há painel de administração para cadastrar produtos pela tela; produtos novos entram por SQL.

## 5. Como rodar

1. Instale o Node.js 18 ou superior.
2. Crie um projeto gratuito em https://neon.tech e copie a *connection string*.
3. Na pasta do projeto, instale as dependências:
   ```bash
   npm install
   ```
4. Copie `.env.example` para `.env` e preencha `DATABASE_URL` (e `GEMINI_API_KEY`, para a Lia):
   ```bash
   cp .env.example .env
   ```
5. Crie as tabelas, o índice e os dados de demonstração (**apaga e recria as tabelas**):
   ```bash
   npm run migrar
   ```
6. Inicie o servidor e abra http://localhost:3000:
   ```bash
   npm start
   ```

**Atenção ao trabalhar em grupo:** se todos usarem o mesmo banco do Neon, quem rodar `npm run migrar`
apaga os dados dos outros. Combinem antes, ou cada um crie o próprio projeto no Neon (é gratuito).
Nunca envie o `.env` por GitHub; passe a string de conexão por mensagem privada.

## 6. Mapa dos arquivos

```text
AV3-Dev.Web/
├── public/             # Front-end
│   ├── index.html      # Estrutura da página, popups do carrinho e de pedidos, menu de login
│   ├── style.css       # Aparência (inclui popups e menu flutuante)
│   └── script.js       # Cards, carrinho, login, pedidos, formulário e chat
├── api/index.js        # Entrada da Vercel (exporta o app Express)
├── vercel.json         # Regra que manda /api/* para a função da Vercel
├── servidor.js         # Express: rotas, validações, banco e Gemini
├── package.json        # Dependências: express, pg, dotenv
├── .env.example        # Modelo das variáveis (sem segredos)
├── README.md           # Documentação exigida pelo PDF
├── COMO-FUNCIONA.md    # Este guia
└── db/                 # Tudo do banco de dados (seção 2.6)
```

## 7. Para a apresentação

Sugestão do que cada integrante domina (o PDF diz que todos devem saber responder perguntas):

- **Banco:** as 5 tabelas, as chaves estrangeiras, uma consulta com JOIN, o índice e o EXPLAIN.
- **Back-end:** o que é o Express, uma rota (por exemplo `POST /api/pedidos`), a transação e a validação.
- **Front-end e IA:** como os cards são montados com `fetch`, o carrinho, o contexto e a persona da Lia.

Demonstração sugerida: criar um pedido pelo site, mostrar a linha nova no SQL Editor do Neon, recarregar a
página (os dados continuam) e cancelar o pedido, mostrando o estoque voltando.

## 8. Publicação na Vercel

O `servidor.js` só liga a porta quando rodado com `npm start`; na Vercel ele é apenas exportado e `api/index.js` o entrega como função. Os arquivos de `public/` são servidos direto pela Vercel. Passos: importar o repositório, cadastrar `DATABASE_URL` e `GEMINI_API_KEY` em *Environment Variables* e rodar `npm run migrar` uma vez localmente. Como o site fica público, lembre das limitações da seção 4 (login só por e-mail e chat sem limite de uso).
