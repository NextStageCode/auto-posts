const fs = require("fs");

const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const API = "https://graph.instagram.com/v21.0";

async function publicarInstagram(videoUrl, caption) {
  // 1. cria o container de mídia (Reels)
  const create = await fetch(`${API}/${IG_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: IG_TOKEN,
    }),
  }).then((r) => r.json());

  if (!create.id) {
    console.error("Erro ao criar o container:", create);
    return;
  }
  const creationId = create.id;

  // 2. espera o vídeo terminar de processar (pode levar alguns minutos)
  let status = "IN_PROGRESS";
  while (status === "IN_PROGRESS") {
    await new Promise((r) => setTimeout(r, 10000));
    const check = await fetch(
      `${API}/${creationId}?fields=status_code&access_token=${IG_TOKEN}`
    ).then((r) => r.json());
    status = check.status_code;
    console.log("Status do processamento:", status);
  }

  if (status !== "FINISHED") {
    console.error("Processamento falhou, status final:", status);
    return;
  }

  // 3. publica de fato
  const publish = await fetch(`${API}/${IG_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: IG_TOKEN }),
  }).then((r) => r.json());

  console.log("Publicado:", publish);
}

async function main() {
  const schedule = JSON.parse(fs.readFileSync("schedule.json"));
  const agora = new Date();

  for (const post of schedule) {
    if (post.posted) continue;
    if (new Date(post.datetime) > agora) continue;
    if (!post.platforms.includes("instagram")) continue;

    // O repositório (ou a pasta /videos) precisa ser PÚBLICO
    // para o Instagram conseguir baixar o arquivo por essa URL.
    const videoUrl = `https://raw.githubusercontent.com/nextstagecode/auto-posts/main/${post.file}`;

    console.log("Publicando:", post.file);
    await publicarInstagram(videoUrl, post.caption);

    post.posted = true;
  }

  fs.writeFileSync("schedule.json", JSON.stringify(schedule, null, 2));
}

main();