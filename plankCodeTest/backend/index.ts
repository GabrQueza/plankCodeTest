import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import { parse } from "csv-parse/sync";
import { loadRemoteCSV, memoryDB, Activity } from "./csvLoader";

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

function getMostFrequent(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts: Record<string, number> = {};
  let maxCount = 0;
  let mostFrequent: string | null = null;

  for (const item of arr) {
    if (!item) continue;
    counts[item] = (counts[item] || 0) + 1;
    if (counts[item] > maxCount) {
      maxCount = counts[item];
      mostFrequent = item;
    }
  }
  return mostFrequent;
}

/**
 * Baixa um CSV remoto, processa streams e converte tipos.
 * Realiza "Atomic Swap" para garantir integridade dos dados na memória.
 */
app.get("/summary", (req: Request, res: Response) => {
  try {
    const { user_id, start_time, end_time } = req.query;

    // 1. Validação
    if (!user_id || !start_time || !end_time) {
      return res
        .status(400)
        .json({ error: "Faltam parâmetros: user_id, start_time, end_time" });
    }

    const targetId = Number(user_id);
    const startMs = new Date(start_time as string).getTime();
    const endMs = new Date(end_time as string).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      return res.status(400).json({ error: "Datas inválidas. Use ISO 8601." });
    }

    // 2. Filtragem e Agregação
    const actions: string[] = [];
    const pages: string[] = [];
    let totalDuration = 0;
    let durationCount = 0;
    let matchCount = 0;

    // Loop único para performance (O(n))
    for (const act of memoryDB) {
      // Filtro
      if (
        act.user_id === targetId &&
        act.timestamp >= startMs &&
        act.timestamp <= endMs
      ) {
        matchCount++;
        actions.push(act.action);

        if (act.metadata?.page) {
          pages.push(String(act.metadata.page));
        }

        if (typeof act.metadata?.duration === "number") {
          totalDuration += act.metadata.duration;
          durationCount++;
        }
      }
    }

    // 3. Resposta
    res.json({
      user_id: targetId,
      total_actions: matchCount,
      most_frequent_action: getMostFrequent(actions),
      avg_duration:
        durationCount > 0
          ? Number((totalDuration / durationCount).toFixed(2))
          : 0,
      most_frequent_page: getMostFrequent(pages),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.get("/action_trends", (req: Request, res: Response) => {
  try {
    const { start_time, end_time } = req.query;

    if (!start_time || !end_time) {
      return res
        .status(400)
        .json({ error: "Faltam parâmetros: start_time, end_time" });
    }

    const startMs = new Date(start_time as string).getTime();
    const endMs = new Date(end_time as string).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      return res.status(400).json({ error: "Datas inválidas. Use ISO 8601." });
    }

    // 1. HashMap para contagem O(N)
    // Chave composta: "userID|action" -> Valor: count
    const trendMap = new Map<string, number>();

    // Scan único no array memoryDB
    for (const act of memoryDB) {
      // Filtro de tempo
      if (act.timestamp >= startMs && act.timestamp <= endMs) {
        // Cria uma chave única para o par
        const key = `${act.user_id}|${act.action}`;

        // Incrementa o contador no Map
        const currentCount = trendMap.get(key) || 0;
        trendMap.set(key, currentCount + 1);
      }
    }

    // 2. Transformar Map em Array de Objetos
    const results = [];
    for (const [key, count] of trendMap.entries()) {
      const [userIdStr, actionName] = key.split("|");
      results.push({
        user_id: Number(userIdStr),
        action: actionName,
        count: count,
      });
    }

    // 3. Ordenar (Decrescente pelo count) e pegar Top 3
    // O sort é rápido pois opera apenas sobre os pares únicos, não sobre todo o DB
    results.sort((a, b) => b.count - a.count);

    const top3 = results.slice(0, 3);

    return res.json(top3);
  } catch (error) {
    console.error("Erro em /action_trends:", error);
    res.status(500).json({ error: "Erro interno ao processar trends." });
  }
});

const PORT = 3000;

loadRemoteCSV()
  .then(() => {
    app.get("/debug-data", (req, res) => {
      if (memoryDB.length === 0) return res.json({ error: "Banco vazio" });

      // Pega o primeiro item para inspecionar
      const firstItem = memoryDB[0];

      res.json({
        total: memoryDB.length,
        sample: firstItem,
        // Verifique se isso é um número válido ou NaN
        timestamp_sample: firstItem.timestamp,
        // Verifique se a data humana bate com o esperado
        date_human: new Date(firstItem.timestamp).toISOString(),
      });
    });
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`Endpoints disponíveis:`);
      console.log(`- GET /summary?user_id=...&start_time=...&end_time=...`);
      console.log(`- GET /action_trends?start_time=...&end_time=...`);
    });
  })
  .catch((err) => {
    console.error("Falha ao iniciar.", err);
  });
