// Cria as tabelas, o índice e os dados de teste no banco (DATABASE_URL).
// Uso: npm run migrar (apaga e recria as tabelas).
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("Defina DATABASE_URL no arquivo .env (veja .env.example).");
        process.exit(1);
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    for (const arquivo of ["schema.sql", "indice.sql", "seed.sql"]) {
        await pool.query(fs.readFileSync(path.join(__dirname, arquivo), "utf8"));
        console.log("Executado:", arquivo);
    }
    await pool.end();
    console.log("Banco pronto!");
}

main().catch(function (erro) {
    console.error("Erro na migração:", erro.message);
    process.exit(1);
});
