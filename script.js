console.log("JavaScript da Alma & Aroma conectado!");

let cards = document.querySelectorAll(".card");
let assunto = document.getElementById("assunto");
let mensagem = document.getElementById("mensagem");

cards.forEach(function (card) {
    let nomeProduto = card.querySelector("h3").innerText;
    let botaoInteresse = card.querySelector(".interesse");

    botaoInteresse.addEventListener("click", function () {
        assunto.value = "Interesse no perfume " + nomeProduto;
        mensagem.value = "Olá! Gostaria de saber mais sobre o perfume " + nomeProduto + ".";
        console.log("Perfume selecionado:", nomeProduto);
    });
});

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

    resultadoContato.innerText = "Obrigada, " + textoNome + "! Seu interesse em " + textoAssunto + " foi registrado apenas nesta tela. Nenhuma mensagem foi enviada ou salva.";
    console.log("Formulário demonstrativo preenchido.");
}

