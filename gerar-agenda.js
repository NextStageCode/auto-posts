/*
⚠️ **Limite importante da Meta:** a API do Instagram permite no máximo **25 publicações por conta a cada 24 horas**. Programar 100 vídeos de uma vez funciona, mas eles precisam ficar espalhados ao longo de vários dias (por exemplo, uns 4-5 por dia, pra sobrar folga e não bater no limite caso você poste algo manualmente também).

Em vez de escrever o `schedule.json` na mão pra 100 vídeos, use este script auxiliar **uma única vez no seu computador** (não faz parte do GitHub Actions) pra gerar o arquivo inteiro automaticamente.

(rode localmente com `node gerar-agenda.js`)
*/


const fs = require("fs");
const path = require("path");

// ==== CONFIGURAÇÕES — ajuste aqui ====
const PASTA_VIDEOS = "./videos";
const POSTS_POR_DIA = 5;              // quantos posts por dia (máx recomendado: 20, limite da API é 25)
const HORARIOS = ["08:00", "11:30", "15:00", "18:00", "21:00"]; // um horário pra cada post do dia (mesmo tamanho de POSTS_POR_DIA)
const DATA_INICIO = "2026-07-07";     // primeiro dia de postagem (AAAA-MM-DD)
const FUSO = "-03:00";                // horário de Brasília
const LEGENDA_PADRAO = `Siga para não perder os melhores memes da semana! 😂👇
  👉 @tiozaodapiada
  👉 @tiozaodapiada
  👉 @tiozaodapiada

O melhor feed de humor para o seu dia. Ative as notificações! 🔔

💡 Gostou?
💬 Deixe seu comentário
✈️ Compartilhe com um amigo que precisa rir disso
📌 Salve para ver mais tarde



#memes #memesbr #engracado #humor #comedia #explorar #reels #zueira #rindomuito #resenha #videoengracado #memestagram`; // legenda usada se não houver uma personalizada
// =======================================

const arquivos = fs
  .readdirSync(PASTA_VIDEOS)
  .filter((f) => f.toLowerCase().endsWith(".mp4"))
  .sort(); // ordem alfabética — renomeie os arquivos tipo 01.mp4, 02.mp4 se quiser controlar a ordem

const agenda = [];
let dia = new Date(DATA_INICIO + "T00:00:00" + FUSO);

arquivos.forEach((arquivo, i) => {
  const indiceNoDia = i % POSTS_POR_DIA;
  if (indiceNoDia === 0 && i !== 0) {
    dia.setDate(dia.getDate() + 1); // avança pro próximo dia
  }

  const [hora, minuto] = HORARIOS[indiceNoDia].split(":");
  const dataStr = dia.toISOString().split("T")[0];
  const datetime = `${dataStr}T${hora}:${minuto}:00${FUSO}`;

  agenda.push({
    file: `videos/${arquivo}`,
    caption: LEGENDA_PADRAO,
    platforms: ["instagram"],
    datetime,
    posted: false,
  });
});

fs.writeFileSync("schedule.json", JSON.stringify(agenda, null, 2));
console.log(`✅ Agenda gerada com ${agenda.length} posts em schedule.json`);
