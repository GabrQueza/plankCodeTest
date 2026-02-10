import axios from "axios";
import { parse } from "csv-parse";

// URL do CSV
const CSV_URL =
  "https://cdn.prod.website-files.com/634d5c356b8adeff5a7c6393/6884a1f50007bdc0d663422c_activities.csv";

export interface Activity {
  user_id: number;
  timestamp: number;
  action: string;
  metadata: Record<string, any>;
}

export let memoryDB: Activity[] = [];

export async function loadRemoteCSV(): Promise<void> {
  console.log(`[CSV Loader] Baixando dados de: ${CSV_URL}...`);
  const tempStorage: Activity[] = [];

  try {
    const response = await axios.get(CSV_URL, { responseType: "stream" });

    const parser = response.data.pipe(
      parse({
        delimiter: ",",
        from_line: 2, // Pula a linha do cabeçalho (header) manualmente

        // A MÁGICA ACONTECE AQUI:
        quote: false, // Desativa interpretação de aspas. Trata " como caractere comum.
        relax_column_count: true, // Aceita que a linha pareça ter mais colunas (devido às vírgulas no JSON)
        trim: true,
      }),
    );

    // O parser vai retornar Arrays de strings (ex: ['1', 'data', 'login', '{json_pt1', 'json_pt2'])
    for await (const row of parser) {
      try {
        // row[0] -> user_id
        // row[1] -> timestamp
        // row[2] -> action
        // row[3] em diante -> O JSON que foi fatiado nas vírgulas

        if (row.length < 4) continue; // Ignora linhas incompletas

        // Reconstrói o JSON juntando todas as colunas do índice 3 até o fim
        const metadataRaw = row.slice(3).join(",");

        const activity: Activity = {
          user_id: Number(row[0]),
          timestamp: new Date(row[1]).getTime(),
          action: row[2],
          metadata: parseMetadata(metadataRaw),
        };

        if (!isNaN(activity.user_id) && !isNaN(activity.timestamp)) {
          tempStorage.push(activity);
        }
      } catch (err) {
        console.warn(`[CSV Loader] Erro na linha:`, row, err);
      }
    }

    memoryDB = tempStorage;
    console.log(
      `[CSV Loader] Sucesso! ${memoryDB.length} registros carregados.`,
    );
  } catch (error) {
    console.error("[CSV Loader] Erro fatal:", error);
  }
}

function parseMetadata(jsonString: string): any {
  if (!jsonString) return {};
  try {
    // Tenta parsear direto
    return JSON.parse(jsonString);
  } catch (e) {
    // Fallback: Se o JSON vier sujo ou mal formatado, retorna vazio para não quebrar a API
    // console.warn("JSON inválido detectado:", jsonString);
    return {};
  }
}
