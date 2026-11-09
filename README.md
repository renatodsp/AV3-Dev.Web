# Alma & Aroma

## 1. Nome do projeto e descrição geral

**Alma & Aroma** é um site acadêmico de uma perfumaria fictícia, desenvolvido para apresentar fragrâncias e permitir que visitantes demonstrem interesse nos produtos. O projeto foi criado para a disciplina de Desenvolvimento Web para IA. Os produtos e preços são ilustrativos, não há compras ou pagamentos reais.

## 2. Integrantes do grupo

- Integrante 1: Renato dos Santos Patrocinio
- Integrante 2: Victor Hugo de Sousa Gonçalves
- Integrante 3: Pedro Henrique de Sousa Bastos

## 3. Tecnologias utilizadas

- **HTML5:** estrutura das páginas e dos campos de contato.
- **CSS3:** cores, organização do layout, cards, Flexbox e Grid.
- **JavaScript:** interações com os produtos, validação dos campos e interface do chatbot.
- **Node.js:** servidor local para executar o site e comunicar-se com a API.
- **API Gemini:** serviço de inteligência artificial utilizado pela assistente Lia.

## 4. Instruções de instalação e execução

1. Instale o **Node.js 18 ou superior**.
2. Baixe o projeto e abra um terminal na pasta que contém `servidor.js`.
3. Para usar a assistente Lia, obtenha uma chave da API Gemini no [Google AI Studio](https://aistudio.google.com/apikey).
4. No **PowerShell (Windows)**, configure a chave e inicie o servidor:

   ```powershell
   $env:GEMINI_API_KEY="SUA_CHAVE_AQUI"
   node servidor.js
   ```

   No **Linux ou macOS**, use:

   ```bash
   export GEMINI_API_KEY="SUA_CHAVE_AQUI"
   node servidor.js
   ```

5. Abra **http://localhost:3000** no navegador.

O site pode ser visualizado sem uma chave de API, mas a Lia só poderá responder por IA quando a chave estiver configurada. **Nunca publique sua chave no GitHub.**

## 5. Principais funcionalidades

- Menu com acesso às seções Início, Sobre, Produtos, Contato e Assistente.
- Exibição de três perfumes em cards, com descrições e preços fictícios.
- Botão **Tenho interesse**, que preenche os campos de contato com o perfume escolhido.
- Formulário demonstrativo com verificação dos campos e mensagem de confirmação na tela, sem envio de dados.
- Assistente virtual **Lia**, voltada a dúvidas sobre fragrâncias e sobre o site.
- Layout adaptável a diferentes tamanhos de tela.

## 6. Integração com Inteligência Artificial

A **Lia** é a assistente virtual da Alma & Aroma. O arquivo `script.js` envia a pergunta do visitante ao servidor `servidor.js`, que utiliza a API Gemini para gerar uma resposta. A assistente recebe instruções para conversar em português e manter as respostas relacionadas à perfumaria e aos produtos apresentados. A chave da API fica configurada no ambiente do servidor, e não no código do navegador.

## 7. Estrutura de pastas e arquivos

```text
Trabalho_AV3/
├── index.html      # Conteúdo e estrutura do site
├── style.css       # Aparência e organização visual
├── script.js       # Interações da página e interface da Lia
├── servidor.js     # Servidor e integração com a API Gemini
├── README.md       # Documentação do projeto
└── .gitignore      # Arquivos que não devem ser enviados ao GitHub
```
