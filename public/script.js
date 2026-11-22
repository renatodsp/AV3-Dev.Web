console.log("JavaScript da Alma & Aroma conectado!");

let assunto = document.getElementById("assunto");
let mensagem = document.getElementById("mensagem");
let produtoSelecionado = null;
let produtos = [];
let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]"); // só guarda {id, qtd}; o preço vem do banco

function dinheiro(v) {
    return "R$ " + Number(v).toFixed(2).replace(".", ",");
}

function escapar(t) {
    let d = document.createElement("div");
    d.innerText = t;
    return d.innerHTML;
}

async function carregarProdutos() {
    let lista = document.getElementById("lista-produtos");
    try {
        let retorno = await fetch("/api/produtos");
        produtos = await retorno.json();
        if (!retorno.ok) { throw new Error(); }
    } catch (erro) {
        lista.innerText = "Não foi possível carregar os perfumes. Confira o servidor e o banco de dados.";
        return;
    }
    lista.innerHTML = "";
    produtos.forEach(function (p) {
        let classe = { "Floral": "foto-floral", "Amadeirado": "foto-bosque", "Cítrico": "foto-citrica" }[p.tipo] || "";
        let card = document.createElement("div");
        card.className = "card";
        card.innerHTML = '<div class="foto-produto ' + classe + '"></div>' +
            '<p class="tipo">' + escapar(p.tipo.toUpperCase()) + '</p>' +
            '<h3>' + escapar(p.nome) + '</h3>' +
            '<p>' + escapar(p.descricao) + '</p>' +
            '<span class="preco">' + dinheiro(p.preco) + ' · ' + p.ml + ' ml</span>' +
            '<p class="estoque">' + (p.estoque > 0 ? p.estoque + ' em estoque' : 'Esgotado') + '</p>' +
            '<button class="btn adicionar"' + (p.estoque > 0 ? '' : ' disabled') + '>Adicionar ao carrinho</button> ' +
            '<a class="btn interesse" href="#contato">Tenho interesse</a>';
        card.querySelector(".interesse").addEventListener("click", function () {
            produtoSelecionado = p.id;
            assunto.value = "Interesse no perfume " + p.nome;
            mensagem.value = "Olá! Gostaria de saber mais sobre o perfume " + p.nome + ".";
        });
        card.querySelector(".adicionar").addEventListener("click", function () { adicionarAoCarrinho(p.id); });
        lista.appendChild(card);
    });
    desenharCarrinho();
}

function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    desenharCarrinho();
}

function adicionarAoCarrinho(id) {
    let item = carrinho.find(function (i) { return i.id === id; });
    if (item) { if (item.qtd < 10) { item.qtd++; } } else { carrinho.push({ id: id, qtd: 1 }); }
    salvarCarrinho();
    document.getElementById("resultado-pedido").innerText = "";
    preencherDadosPedido();
    abrirModal("modal-carrinho");
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(function (i) { return i.id !== id; });
    salvarCarrinho();
}

function desenharCarrinho() {
    let area = document.getElementById("itens-carrinho");
    carrinho = carrinho.filter(function (i) { return produtos.some(function (p) { return p.id === i.id; }); });
    document.getElementById("qtd-carrinho").innerText = carrinho.reduce(function (s, i) { return s + i.qtd; }, 0);
    if (carrinho.length === 0) { area.innerText = "Seu carrinho está vazio."; return; }
    let total = 0;
    area.innerHTML = "";
    carrinho.forEach(function (i) {
        let p = produtos.find(function (x) { return x.id === i.id; });
        total += Number(p.preco) * i.qtd;
        let linha = document.createElement("p");
        linha.innerText = i.qtd + "x " + p.nome + " — " + dinheiro(p.preco * i.qtd) + "  ";
        let remover = document.createElement("button");
        remover.className = "btn";
        remover.innerText = "Remover";
        remover.addEventListener("click", function () { removerDoCarrinho(i.id); });
        linha.appendChild(remover);
        area.appendChild(linha);
    });
    let t = document.createElement("p");
    t.innerHTML = "<strong>Total: " + dinheiro(total) + "</strong>";
    area.appendChild(t);
}

// ---------- Janelas (popups) ----------
function abrirModal(id) { document.getElementById(id).hidden = false; }
function fecharModais() {
    document.querySelectorAll(".modal").forEach(function (m) { m.hidden = true; });
}
document.querySelectorAll(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m) { fecharModais(); } });
    m.querySelector(".fechar").addEventListener("click", fecharModais);
});
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { fecharModais(); menuConta.hidden = true; }
});

document.getElementById("btn-carrinho").addEventListener("click", function () {
    document.getElementById("resultado-pedido").innerText = "";
    preencherDadosPedido();
    abrirModal("modal-carrinho");
});

// ---------- Login por e-mail (menu flutuante) ----------
let menuConta = document.getElementById("menu-conta");
let usuario = null;
try { usuario = JSON.parse(localStorage.getItem("usuario")); } catch (e) { usuario = null; }

document.getElementById("btn-conta").addEventListener("click", function (e) {
    e.stopPropagation();
    menuConta.hidden = !menuConta.hidden;
});
menuConta.addEventListener("click", function (e) { e.stopPropagation(); });
document.addEventListener("click", function () { menuConta.hidden = true; });

function desenharConta() {
    document.getElementById("conta-deslogado").hidden = usuario !== null;
    document.getElementById("conta-logado").hidden = usuario === null;
    document.getElementById("btn-conta").innerText = usuario ? "Minha conta" : "Entrar";
    if (usuario) { document.getElementById("conta-nome").innerText = usuario.nome || usuario.email; }
}

function preencherDadosPedido() {
    // Logado: usa o e-mail do login (campo escondido) e só pede o nome se ainda não for conhecido.
    document.getElementById("pedido-conta").hidden = usuario === null;
    document.getElementById("pedido-campo-email").hidden = usuario !== null;
    document.getElementById("pedido-campo-nome").hidden = usuario !== null && !!usuario.nome;
    if (!usuario) { return; }
    document.getElementById("pedido-conta-email").innerText = usuario.email;
    document.getElementById("pedido-email").value = usuario.email;
    if (usuario.nome) { document.getElementById("pedido-nome").value = usuario.nome; }
}

document.getElementById("btn-login").addEventListener("click", async function () {
    let erro = document.getElementById("login-erro");
    let emailL = document.getElementById("login-email").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailL)) { erro.innerText = "Digite um e-mail válido."; return; }
    try {
        let retorno = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailL })
        });
        let dados = await retorno.json();
        if (!retorno.ok) { erro.innerText = dados.erro; return; }
        usuario = { email: dados.email, nome: dados.nome };
        localStorage.setItem("usuario", JSON.stringify(usuario));
        erro.innerText = "";
        desenharConta();
        preencherDadosPedido();
    } catch (e) {
        erro.innerText = "Não foi possível entrar agora.";
    }
});

function sair() {
    usuario = null;
    localStorage.removeItem("usuario");
    menuConta.hidden = true;
    document.getElementById("pedido-nome").value = "";
    document.getElementById("pedido-email").value = "";
    document.getElementById("resultado-pedido").innerText = "";
    desenharConta();
    preencherDadosPedido();
    fecharModais();
}
document.getElementById("btn-sair").addEventListener("click", sair);
document.getElementById("btn-sair-carrinho").addEventListener("click", sair);

document.getElementById("btn-meus-pedidos").addEventListener("click", function () {
    menuConta.hidden = true;
    abrirModal("modal-pedidos");
    listarPedidos();
});

// ---------- Finalizar pedido ----------
document.getElementById("btn-pedido").addEventListener("click", async function () {
    let saida = document.getElementById("resultado-pedido");
    let nomeP = document.getElementById("pedido-nome").value.trim();
    let emailP = usuario ? usuario.email : document.getElementById("pedido-email").value.trim();
    if (carrinho.length === 0) { saida.innerText = "Adicione perfumes ao carrinho primeiro!"; return; }
    if (nomeP === "" || emailP === "") { saida.innerText = "Preencha nome e e-mail!"; return; }
    try {
        let retorno = await fetch("/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: nomeP, email: emailP, itens: carrinho.map(function (i) { return { produto_id: i.id, quantidade: i.qtd }; }) })
        });
        let dados = await retorno.json();
        if (!retorno.ok) { saida.innerText = dados.erro; return; }
        if (usuario && !usuario.nome) {
            usuario.nome = nomeP;
            localStorage.setItem("usuario", JSON.stringify(usuario));
            desenharConta();
            preencherDadosPedido();
        }
        carrinho = [];
        salvarCarrinho();
        carregarProdutos();
        saida.innerText = "Pedido #" + dados.id + " registrado! Total: " + dinheiro(dados.total) + ".";
    } catch (erro) {
        saida.innerText = "Não foi possível enviar o pedido.";
    }
});

// ---------- Meus pedidos ----------
async function listarPedidos() {
    let area = document.getElementById("lista-pedidos");
    if (!usuario) { area.innerText = "Entre com seu e-mail para ver seus pedidos."; return; }
    try {
        let retorno = await fetch("/api/pedidos?email=" + encodeURIComponent(usuario.email));
        let dados = await retorno.json();
        if (!retorno.ok) { area.innerText = dados.erro; return; }
        if (dados.length === 0) { area.innerText = "Você ainda não fez pedidos."; return; }
        let pedidos = {};
        dados.forEach(function (l) {
            if (!pedidos[l.pedido]) { pedidos[l.pedido] = { status: l.status, total: l.total, itens: [] }; }
            pedidos[l.pedido].itens.push(l.quantidade + "x " + l.produto);
        });
        area.innerHTML = "";
        Object.keys(pedidos).sort(function (a, b) { return b - a; }).forEach(function (id) {
            let p = pedidos[id];
            let linha = document.createElement("p");
            linha.innerText = "Pedido #" + id + " [" + p.status + "] " + p.itens.join(", ") + " — " + dinheiro(p.total) + "  ";
            if (p.status === "pendente") {
                let cancelar = document.createElement("button");
                cancelar.className = "btn";
                cancelar.innerText = "Cancelar";
                cancelar.addEventListener("click", async function () {
                    await fetch("/api/pedidos/" + id + "/cancelar", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: usuario.email })
                    });
                    carregarProdutos();
                    listarPedidos();
                });
                linha.appendChild(cancelar);
            }
            area.appendChild(linha);
        });
    } catch (erro) {
        area.innerText = "Não foi possível consultar os pedidos.";
    }
}

desenharConta();
carregarProdutos();

let nome = document.getElementById("nome");
let email = document.getElementById("email");
let resultadoContato = document.getElementById("resultado-contato");
let botaoContato = document.getElementById("btn-contato");

botaoContato.addEventListener("click", registrarInteresse);

function registrarInteresse() {
    let textoNome = nome.value.trim();
    let textoEmail = email.value.trim();
    let textoAssunto = assunto.value.trim();
    let textoMensagem = mensagem.value.trim();

    if (textoNome === "" || textoEmail === "" || textoAssunto === "" || textoMensagem === "") {
        resultadoContato.innerText = "Preencha todos os campos antes de continuar!";
        return;
    }

    if (textoEmail.includes("@") === false || textoEmail.includes(".") === false) {
        resultadoContato.innerText = "Digite um e-mail válido para continuar!";
        return;
    }

    fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: textoNome, email: textoEmail, assunto: textoAssunto, mensagem: textoMensagem, produto_id: produtoSelecionado })
    }).then(function (retorno) {
        return retorno.json().then(function (dados) {
            if (!retorno.ok) { resultadoContato.innerText = dados.erro; return; }
            resultadoContato.innerText = "Obrigada, " + textoNome + "! Seu interesse em " + textoAssunto + " foi registrado (protocolo #" + dados.id + "). Em breve nossa equipe entrará em contato pelo e-mail " + textoEmail + ".";
            produtoSelecionado = null;
        });
    }).catch(function () {
        resultadoContato.innerText = "Não foi possível registrar agora. Tente novamente.";
    });
}

let inputChat = document.getElementById("input");
let enviar = document.getElementById("enviar");
let msgUsuario = document.getElementById("msg-usuario");
let chatBox = document.getElementById("chat-box");

enviar.addEventListener("click", enviarMensagem);
inputChat.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        enviarMensagem();
    }
});

async function enviarMensagem() {
    let texto = inputChat.value.trim();
    if (texto === "") {
        chatBox.innerText = "Digite sua pergunta antes de enviar!";
        return;
    }

    msgUsuario.innerText = "Você: " + texto;
    chatBox.innerText = "Lia está pensando...";
    inputChat.value = "";
    enviar.disabled = true;

    try {
        let retorno = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem: texto })
        });
        let dados = await retorno.json();
        if (retorno.ok) {
            chatBox.innerText = dados.resposta;
        } else {
            chatBox.innerText = dados.erro;
        }
    } catch (erro) {
        console.log("Erro da Lia:", erro);
        chatBox.innerText = "Não foi possível conversar com a Lia. Confira o servidor e sua conexão.";
    }

    enviar.disabled = false;
}
