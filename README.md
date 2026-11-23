# Alma & Aroma

## 1. Nome do projeto e descrição geral

**Alma & Aroma** é o site de uma perfumaria, desenvolvido para apresentar fragrâncias e permitir que visitantes demonstrem interesse nos produtos. O projeto foi criado para a disciplina de Desenvolvimento Web para IA.

## 2. Integrantes do grupo

- Integrante 1: Renato dos Santos Patrocinio
- Integrante 2: Victor Hugo de Sousa Gonçalves
- Integrante 3: Pedro Henrique de Sousa Bastos

## 3. Tecnologias utilizadas

- **HTML5:** estrutura das páginas e dos campos de contato.
- **CSS3:** cores, organização do layout, cards, Flexbox e Grid.
- **JavaScript:** interações com os produtos, validação dos campos e interface do chatbot.
- **Node.js + Express:** servidor e API REST.
- **PostgreSQL (Neon):** banco relacional persistente, acessado com o driver `pg` e consultas parametrizadas.
- **API Gemini:** serviço de inteligência artificial utilizado pela assistente Lia.

## 4. Instruções de instalação e execução

1. Instale o **Node.js 18 ou superior**.
2. Crie um projeto gratuito em [neon.tech](https://neon.tech) e copie a *connection string*.
3. Instale as dependências: `npm install`
4. Copie `.env.example` para `.env` e preencha `DATABASE_URL` (e `GEMINI_API_KEY`, para a Lia).
5. Crie as tabelas, o índice e os dados de demonstração: `npm run migrar` (apaga e recria as tabelas).
6. Inicie: `npm start` e abra **http://localhost:3000**.

O arquivo `.env` está no `.gitignore`. **Nunca publique chaves ou strings de conexão no GitHub.**

## 5. Principais funcionalidades

- Menu com acesso às seções Início, Sobre, Produtos, Contato e Assistente.
- Exibição de três perfumes em cards, com descrições e preços.
- Botão **Tenho interesse**, que preenche os campos de contato com o perfume escolhido.
- Produtos carregados do banco (`GET /api/produtos`).
- Formulário de contato/interesse validado no servidor e gravado no banco (`POST /api/contatos`).
- Carrinho em janela popup (abre ao adicionar um perfume ou pelo botão do topo) e pedido, com transação, preço e estoque conferidos no servidor (`POST /api/pedidos`).
- Login apenas com e-mail, em menu flutuante no topo (`POST /api/login`), que libera a janela **Meus pedidos**.
- Consulta de pedidos por e-mail (JOIN) e cancelamento de pedido pendente, devolvendo o estoque (`PATCH /api/pedidos/:id/cancelar`).
- Assistente virtual **Lia**, voltada a dúvidas sobre fragrâncias e sobre o site.
- Layout adaptável a diferentes tamanhos de tela.

## 6. Integração com Inteligência Artificial

A **Lia** é a assistente virtual da Alma & Aroma. O arquivo `script.js` envia a pergunta do visitante ao servidor `servidor.js`, que utiliza a API Gemini para gerar uma resposta. A assistente recebe instruções para conversar em português e manter as respostas relacionadas à perfumaria e aos produtos apresentados. A chave da API fica configurada no ambiente do servidor, e não no código do navegador.

## Publicação na Vercel

1. Suba o repositório no GitHub e importe-o em vercel.com (Add New Project).
2. Em *Environment Variables*, cadastre `DATABASE_URL` (de preferência a string com `-pooler` do Neon) e `GEMINI_API_KEY`.
3. Rode `npm run migrar` uma vez no seu computador para criar as tabelas no Neon.

## 7. Banco de dados

Tabelas: `clientes`, `produtos`, `contatos`, `pedidos`, `itens_pedido` (chaves primárias em todas; chaves estrangeiras: contatos→clientes, contatos→produtos, pedidos→clientes, itens_pedido→pedidos e →produtos; restrições NOT NULL, UNIQUE e CHECK). Diagrama em `db/der.md` (Mermaid) e `db/der.png`. Seis consultas documentadas e roteiro do índice `idx_pedidos_cliente_data` com EXPLAIN antes/depois em `db/consultas.sql`.

## 8. Estrutura de pastas e arquivos

```text
AV3-Dev.Web/
├── public/
│   ├── index.html  # Conteúdo e estrutura do site
│   ├── style.css   # Aparência e organização visual
│   └── script.js   # Interações, carrinho, chamadas à API e interface da Lia
├── api/index.js    # Entrada da Vercel (exporta o app)
├── vercel.json     # Direciona /api/* para a função da Vercel
├── servidor.js     # Servidor Express, rotas da API, banco e Gemini
├── package.json
├── .env.example    # Modelo de variáveis (sem segredos)
├── db/
│   ├── schema.sql     # Criação das tabelas
│   ├── indice.sql     # Índice adicional
│   ├── seed.sql       # Dados de demonstração
│   ├── consultas.sql  # 6 consultas (filtro, JOIN, agregação) e roteiro do EXPLAIN
│   ├── der.md / der.svg / der.png  # Diagrama entidade-relacionamento
│   ├── explain-resultados.md  # Planos antes/depois do índice
│   └── migrar.js      # Executa os três scripts acima
├── README.md
└── .gitignore
```
