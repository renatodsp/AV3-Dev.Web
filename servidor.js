const http = require("http");
const fs = require("fs");
const chave = process.env.GEMINI_API_KEY;
const porta = process.env.PORT || 3000;

const contexto = "Você é Lia, assistente virtual da perfumaria Alma & Aroma. " +
    "Responda em português, de modo curto, simpático e sempre sobre os perfumes ou o site. " +
    "Produtos: Flor de Aurora, floral, R$ 129,00; Bosque Sereno, amadeirado, R$ 149,00; " +
    "Luz Cítrica, cítrico, R$ 119,00. Todos os perfumes têm 50 ml. " +
    "Ajude a escolher um aroma. Para comprar ou tirar dúvidas sobre pedidos, oriente o cliente a clicar em " +
    "Tenho interesse e preencher o formulário de contato; a equipe retorna por e-mail. " +
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

http.createServer(function (req, res) {
    // Servimos somente os três arquivos públicos da página.
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html" || req.url === "/style.css" || req.url === "/script.js")) {
        let arquivo = "index.html";
        let tipo = "text/html";
        if (req.url === "/style.css") { arquivo = "style.css"; tipo = "text/css"; }
        if (req.url === "/script.js") { arquivo = "script.js"; tipo = "text/javascript"; }
        fs.readFile(__dirname + "/" + arquivo, function (erro, conteudo) {
            if (erro) { enviarJSON(res, 500, { erro: "Erro ao abrir arquivo." }); return; }
            res.writeHead(200, { "Content-Type": tipo + "; charset=utf-8" });
            res.end(conteudo);
        });
        return;
    }
    if (req.method === "POST" && req.url === "/api/chat") {
        let corpo = "";
        req.on("data", function (pedaco) {
            corpo += pedaco;
            if (corpo.length > 3000) { req.destroy(); }
        });
        req.on("end", function () {
            try {
                let dados = JSON.parse(corpo);
                if (typeof dados.mensagem !== "string" || dados.mensagem.trim() === "" || dados.mensagem.length > 600) {
                    enviarJSON(res, 400, { erro: "Envie uma pergunta com até 600 caracteres." });
                    return;
                }
                conversar(dados.mensagem.trim(), res);
            } catch (erro) {
                enviarJSON(res, 400, { erro: "Mensagem inválida." });
            }
        });
        return;
    }
    enviarJSON(res, 404, { erro: "Página não encontrada." });
}).listen(porta, function () {
    console.log("Alma & Aroma em http://localhost:" + porta);
    if (!chave) { console.log("Configure GEMINI_API_KEY para usar a Lia."); }
});
