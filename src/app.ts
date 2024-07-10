import Server from "./server"
import * as sqlite3 from "sqlite3";

const db = new sqlite3.Database("db/app.db");

Server(db, 3000).catch((err: any) => {
  console.error("Erro ao iniciar a aplicacao:", err);
});