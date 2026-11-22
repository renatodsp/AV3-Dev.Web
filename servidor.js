require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const chave = process.env.GEMINI_API_KEY;
const porta = process.env.PORT || 3000;

const contexto = "Você é Lia, assistente virtual da perfumaria Alma & Aroma. " +
    "Responda em português, de modo curto, simpático e sempre sobre os perfumes ou o site. " +
    "Produtos: Flor de Aurora, floral, R$ 129,00; Bosque Sereno, amadeirado, R$ 149,00; " +
    "Luz Cítrica, cítrico, R$ 119,00. Todos os perfumes têm 50 ml. " +
    "Ajude a escolher um aroma. Para comprar, oriente o cliente a adicionar o perfume ao carrinho e finalizar o pedido. " +
    "Para dúvidas sobre pedidos, ele pode usar o formulário de contato; a equipe retorna por e-mail. " +
    "Não invente estoque, prazos de entrega, formas de pagamento, promoções ou informações desconhecidas; " +
    "nesses casos, diga que a equipe pode ajudar pelo formulário de contato.";

function enviarJSON(res, codigo, dados) {
    res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(dados));
}

async function conversar(mensagem, res) {
    if (!chave) {
        enviarJSON(res, 503, { erro: "A Lia está indisponível no momento. Tente novamente mais tarde." });
        return;
    }
    try {
        const retorno = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: contexto }] },
                contents: [{ parts: [{ text: mensagem }] }]
            })
        });
        const dados = await retorno.json();
        if (!retorno.ok || !dados.candidates || !dados.candidates[0] || !dados.candidates[0].content || !dados.candidates[0].content.parts || !dados.candidates[0].content.parts[0] || !dados.candidates[0].content.parts[0].text) {
            enviarJSON(res, 502, { erro: "A Lia não conseguiu responder. Confira sua chave e a disponibilidade da API." });
            return;
        }
        enviarJSON(res, 200, { resposta: dados.candidates[0].content.parts[0].text });
    } catch (erro) {
        enviarJSON(res, 502, { erro: "Não foi possível conectar à IA." });
    }
}

// Conexão com o banco (pool pequeno, para uso na Vercel).
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const app = express();
app.use(express.json({ limit: "10kb" }));

// Arquivos do site (pasta public/).
app.use(express.static(__dirname + "/public"));

// Trata erros das rotas e devolve erro 500.
function rota(fn) {
    return function (req, res) {
        fn(req, res).catch(function (erro) {
            console.error(erro);
            enviarJSON(res, 500, { erro: "Erro interno ao acessar o banco de dados." });
        });
    };
}

const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function textoValido(v, max) { return typeof v === "string" && v.trim() !== "" && v.trim().length <= max; }

// Cria o cliente, se ainda não existir, e devolve o id.
async function obterCliente(db, nome, email) {
    const r = await db.query(
        "INSERT INTO clientes (nome, email) VALUES ($1, $2) " +
        "ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome RETURNING id",
        [nome.trim(), email.trim().toLowerCase()]
    );
    return r.rows[0].id;
}

// --- Login por e-mail ---
app.post("/api/login", rota(async function (req, res) {
    const email = String((req.body || {}).email || "").trim().toLowerCase();
    if (!regexEmail.test(email) || email.length > 150) { return enviarJSON(res, 400, { erro: "Digite um e-mail válido." }); }
    const r = await pool.query("SELECT nome FROM clientes WHERE email = $1", [email]);
    enviarJSON(res, 200, { email: email, nome: r.rows.length ? r.rows[0].nome : null });
}));

// --- Produtos ---
app.get("/api/produtos", rota(async function (req, res) {
    const r = await pool.query("SELECT id, nome, tipo, descricao, preco, ml, estoque FROM produtos WHERE ativo ORDER BY id");
    enviarJSON(res, 200, r.rows);
}));

// --- Contatos ---
app.post("/api/contatos", rota(async function (req, res) {
    const { nome, email, assunto, mensagem, produto_id } = req.body || {};
    if (!textoValido(nome, 100) || !textoValido(assunto, 150) || !textoValido(mensagem, 1000) ||
        !textoValido(email, 150) || !regexEmail.test(email.trim())) {
        return enviarJSON(res, 400, { erro: "Preencha nome, e-mail válido, assunto e mensagem." });
    }
    let produto = null;
    if (produto_id !== undefined && produto_id !== null && produto_id !== "") {
        if (!Number.isInteger(produto_id)) { return enviarJSON(res, 400, { erro: "Produto inválido." }); }
        produto = produto_id;
    }
    const clienteId = await obterCliente(pool, nome, email);
    try {
        const r = await pool.query(
            "INSERT INTO contatos (cliente_id, produto_id, assunto, mensagem) VALUES ($1, $2, $3, $4) RETURNING id",
            [clienteId, produto, assunto.trim(), mensagem.trim()]
        );
        enviarJSON(res, 201, { id: r.rows[0].id });
    } catch (erro) {
        if (erro.code === "23503") { return enviarJSON(res, 400, { erro: "Produto inexistente." }); }
        throw erro;
    }
}));

app.get("/api/contatos", rota(async function (req, res) {
    const r = await pool.query(
        "SELECT ct.id, c.nome, ct.assunto, ct.mensagem, ct.criado_em FROM contatos ct " +
        "JOIN clientes c ON c.id = ct.cliente_id ORDER BY ct.criado_em DESC LIMIT 10"
    );
    enviarJSON(res, 200, r.rows);
}));

// --- Pedidos ---
app.post("/api/pedidos", rota(async function (req, res) {
    const { nome, email, itens } = req.body || {};
    if (!textoValido(nome, 100) || !textoValido(email, 150) || !regexEmail.test(email.trim())) {
        return enviarJSON(res, 400, { erro: "Informe nome e e-mail válido." });
    }
    if (!Array.isArray(itens) || itens.length === 0 || itens.length > 20 ||
        !itens.every(function (i) { return Number.isInteger(i.produto_id) && Number.isInteger(i.quantidade) && i.quantidade > 0 && i.quantidade <= 10; })) {
        return enviarJSON(res, 400, { erro: "Carrinho inválido." });
    }
    const ids = itens.map(function (i) { return i.produto_id; });
    if (new Set(ids).size !== ids.length) { return enviarJSON(res, 400, { erro: "Produto repetido no carrinho." }); }

    const db = await pool.connect();
    try {
        await db.query("BEGIN");
        // O preço vem do banco; FOR UPDATE trava o estoque.
        const prods = await db.query(
            "SELECT id, nome, preco, estoque FROM produtos WHERE id = ANY($1) AND ativo ORDER BY id FOR UPDATE", [ids]
        );
        if (prods.rows.length !== ids.length) { throw { cliente: "Produto indisponível." }; }
        let total = 0;
        const mapa = {};
        prods.rows.forEach(function (p) { mapa[p.id] = p; });
        for (const i of itens) {
            const p = mapa[i.produto_id];
            if (p.estoque < i.quantidade) { throw { cliente: "Estoque insuficiente para " + p.nome + "." }; }
            total += Number(p.preco) * i.quantidade;
        }
        const clienteId = await obterCliente(db, nome, email);
        const ped = await db.query("INSERT INTO pedidos (cliente_id, total) VALUES ($1, $2) RETURNING id", [clienteId, total.toFixed(2)]);
        for (const i of itens) {
            await db.query("INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)",
                [ped.rows[0].id, i.produto_id, i.quantidade, mapa[i.produto_id].preco]);
            await db.query("UPDATE produtos SET estoque = estoque - $1 WHERE id = $2", [i.quantidade, i.produto_id]);
        }
        await db.query("COMMIT");
        enviarJSON(res, 201, { id: ped.rows[0].id, total: total.toFixed(2) });
    } catch (erro) {
        await db.query("ROLLBACK");
        if (erro && erro.cliente) { return enviarJSON(res, 400, { erro: erro.cliente }); }
        throw erro;
    } finally {
        db.release();
    }
}));

app.get("/api/pedidos", rota(async function (req, res) {
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!regexEmail.test(email)) { return enviarJSON(res, 400, { erro: "Informe um e-mail válido." }); }
    // Consulta com JOIN (ver db/consultas.sql)
    const r = await pool.query(
        "SELECT p.id AS pedido, p.status, p.total, p.criado_em, pr.nome AS produto, i.quantidade, i.preco_unitario " +
        "FROM pedidos p JOIN clientes c ON c.id = p.cliente_id " +
        "JOIN itens_pedido i ON i.pedido_id = p.id JOIN produtos pr ON pr.id = i.produto_id " +
        "WHERE c.email = $1 ORDER BY p.criado_em DESC, p.id DESC", [email]
    );
    enviarJSON(res, 200, r.rows);
}));

// Cancela o pedido pendente e devolve o estoque.
app.patch("/api/pedidos/:id/cancelar", rota(async function (req, res) {
    const id = Number(req.params.id);
    const email = String((req.body || {}).email || "").trim().toLowerCase();
    if (!Number.isInteger(id) || !regexEmail.test(email)) { return enviarJSON(res, 400, { erro: "Dados inválidos." }); }
    const db = await pool.connect();
    try {
        await db.query("BEGIN");
        const r = await db.query(
            "UPDATE pedidos SET status = 'cancelado' WHERE id = $1 AND status = 'pendente' " +
            "AND cliente_id = (SELECT id FROM clientes WHERE email = $2) RETURNING id", [id, email]
        );
        if (r.rowCount === 0) {
            await db.query("ROLLBACK");
            return enviarJSON(res, 404, { erro: "Pedido pendente não encontrado para este e-mail." });
        }
        await db.query(
            "UPDATE produtos SET estoque = estoque + i.quantidade FROM itens_pedido i " +
            "WHERE i.pedido_id = $1 AND produtos.id = i.produto_id", [id]
        );
        await db.query("COMMIT");
        enviarJSON(res, 200, { id: id, status: "cancelado" });
    } catch (erro) {
        await db.query("ROLLBACK");
        throw erro;
    } finally {
        db.release();
    }
}));

// --- Chat da Lia ---
app.post("/api/chat", function (req, res) {
    const mensagem = (req.body || {}).mensagem;
    if (typeof mensagem !== "string" || mensagem.trim() === "" || mensagem.length > 600) {
        return enviarJSON(res, 400, { erro: "Envie uma pergunta com até 600 caracteres." });
    }
    conversar(mensagem.trim(), res);
});

app.use(function (req, res) { enviarJSON(res, 404, { erro: "Página não encontrada." }); });
app.use(function (erro, req, res, next) { enviarJSON(res, 400, { erro: "Requisição inválida." }); });

// Inicia o servidor (na Vercel o app é apenas exportado).
if (require.main === module) {
    app.listen(porta, function () {
        console.log("Alma & Aroma em http://localhost:" + porta);
        if (!chave) { console.log("Configure GEMINI_API_KEY para usar a Lia."); }
        if (!process.env.DATABASE_URL) { console.log("Configure DATABASE_URL para usar o banco (veja .env.example)."); }
    });
}

module.exports = app;
