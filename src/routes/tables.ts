import express, { Request, Response } from "express";
import databaseFunctions from "../Utils/databaseFunctions";
import * as sqlite3 from "sqlite3";
import sqlGenerator from "../Utils/sqlGenerator";

const router = express.Router();

function tableRoutes(db: sqlite3.Database) {
  router.get("/", async (req: Request, res: Response) => {
    try {
      const tables = await databaseFunctions.fetchAllTables(db);
      res.status(200).json(tables);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/local/query", async (req: Request, res: Response) => {
    try {
      await databaseFunctions.InitializeDB(db);
      const queries = await databaseFunctions.fetchQueries(db);
      res.status(200).json(queries);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/local/query", async (req: Request, res: Response) => {
    try {
      await databaseFunctions.InitializeDB(db);
      const { name, sqlStatement } = req.body;
      const response = await databaseFunctions.insertQuery(
        db,
        name,
        sqlStatement
      );
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/:name", async (req: Request, res: Response) => {
    const { name } = req.params;
    try {
      const response = await databaseFunctions.fetchTable(db, name);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/infos/:name", async (req: Request, res: Response) => {
    const { name } = req.params;
    try {
      const response = await databaseFunctions.fetchTableInfo(db, name);
      const fk = await databaseFunctions.fetchTableForeignKeys(db, name);

      if (fk.bool && fk.data !== undefined) {
        const fkPromises = fk.data.map((element) =>
            databaseFunctions.fetchFK(db, element.table, element.to)
        );

        const fkResponses = await Promise.all(fkPromises);

        fk.data.forEach((element, index) => {
          if (response.data !== undefined) {
            response.data.forEach((item) => {
              if (item.field === element.from) {
                item.fk = fkResponses[index].data.map((obj) => obj[element.to]);
              }
            });
          }
        });
      }

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/all/infos/:name", async (req: Request, res: Response) => {
    const { name } = req.params;
    try {
      const response = await databaseFunctions.fetchAllTableInfo(db, name);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/insert", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray } = req.body;
      const sql = await sqlGenerator.generateInsertSQL(
        db,
        tablename,
        dataArray
      );
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/generate/insert", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray } = req.body;
      const sql = await sqlGenerator.generateInsertSQL(
        db,
        tablename,
        dataArray
      );
      res.status(200).json(sql);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/query", async (req: Request, res: Response) => {
    try {
      const startTime = performance.now();
      const { sqlQuery } = req.body;
      const lowersqlQuery = sqlGenerator.generateSelectSQL(sqlQuery);
      if (lowersqlQuery.startsWith("select")) {
        const response = await databaseFunctions.runSelectQuery(
          db,
          lowersqlQuery
        );

        if (lowersqlQuery.startsWith("select count(*)")) {
          if (response.data !== undefined) {
            res.status(200).json({
              type: "string",
              data: "Count result is " + response.data[0]["count(*)"],
            });
          } else {
            res.status(500).json({
              type: "string",
              data: "Database error",
            });
          }
        } else {
          const time = performance.now() - startTime;
          let executionTime = "\n Tempo de execução: " + time?.toFixed(2) + "ms";
          let message = "Query executada com sucesso!" + executionTime;
          if (response.data?.length == 0) {
            res.status(200).json({ type: "table", data: response.data, message: "Nenhuma linha encontrada." + executionTime});
          }
          res.status(200).json({ type: "table", data: response.data, message});
        }
      } else {
        await databaseFunctions.runQuery(db, sqlQuery);
        const time = performance.now() - startTime;
        let message = "Query executada com sucesso!\n Tempo de execução: " + time?.toFixed(2) + "ms";
        res.status(200).json({ type: "table", data: [], message });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/create", async (req: Request, res: Response) => {
    try {
      const { tableName, data } = req.body;
      const sql = sqlGenerator.generateCreateTableSQL(tableName, data);
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/generate/create", async (req: Request, res: Response) => {
    try {
      const { tableName, data } = req.body;
      const sql = sqlGenerator.generateCreateTableSQL(tableName, data);
      res.status(200).json(sql);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/update", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray, userId, id_label } = req.body;
      const sql = sqlGenerator.generateUpdateSQL(
        tablename,
        dataArray,
        userId,
        id_label
      );
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/generate/update", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray, userId, id_label } = req.body;
      const sql = sqlGenerator.generateUpdateSQL(
        tablename,
        dataArray,
        userId,
        id_label
      );
      res.status(200).json(sql);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get(
    "/getrecord/:tablename/:label/:id",
    async (req: Request, res: Response) => {
      try {
        const { tablename, label, id } = req.params;
        const response = await databaseFunctions.fetchRecord(
          db,
          tablename,
          label,
          Number(id)
        );
        res.status(200).json(response);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  router.post("/delete", async (req: Request, res: Response) => {
    try {
      const { tablename, id } = req.body;
      const response = await databaseFunctions.deleteFromTable(
        db,
        tablename,
        id
      );
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/table/delete", async (req: Request, res: Response) => {
    try {
      const { tablename } = req.body;
      const sql = `DROP TABLE ${tablename};`;
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/explain", async (req: Request, res: Response) => {
    try {
      const { sqlQuery } = req.body;
      const explainQuery = `EXPLAIN QUERY PLAN ${sqlQuery}`;
      const response = await databaseFunctions.runSelectQuery(db, explainQuery);
      res.status(200).json({ data: response.data });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return router;
}

export default tableRoutes;
