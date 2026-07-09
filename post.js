const fs = require("fs");

const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const API = "https://graph.instagram.com/v21.0";

const TIKTOK_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
const TIKTOK_API = "https://open.tiktokapis.com/v2";

async function publicarTikTok(videoUrl, caption) {
  // 1. baixa os bytes do vídeo (que estão no GitHub) pra reenviar pro TikTok
  const videoResp = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResp.arrayBuffer());
  const tamanho = videoBuffer.length;

  // 2. inicia a publicação, avisando o tamanho do arquivo
  const init = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TIKTOK_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: "SELF_ONLY", // troque para PUBLIC_TO_EVERYONE só depois que o app for auditado
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: tamanho,
        chunk_size: tamanho,
        total_chunk_count: 1,
      },
    }),
  }).then((r) => r.json());

  if (!init.data || !init.data.upload_url) {
    console.error("Erro ao iniciar publicação no TikTok:", init);
    return false;
  }

  // 3. envia os bytes do vídeo pra URL que o TikTok forneceu
  const upload = await fetch(init.data.upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${tamanho - 1}/${tamanho}`,
    },
    body: videoBuffer,
  });

  if (!upload.ok) {
    console.error("Erro ao enviar vídeo para o TikTok:", upload.status);
    return false;
  }

  console.log("Vídeo enviado ao TikTok, publish_id:", init.data.publish_id);
  return true;
}

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
    return false;
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
    return false;
  }

  // 3. publica de fato
  const publish = await fetch(`${API}/${IG_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: IG_TOKEN }),
  }).then((r) => r.json());

  console.log("Publicado:", publish);
  return !!publish.id;
}

async function main() {
  const schedule = JSON.parse(fs.readFileSync("schedule.json"));
  const agora = new Date();

  for (const post of schedule) {
    if (post.posted) continue;
    if (new Date(post.datetime) > agora) continue;

    const videoUrl = encodeURI(
      `https://raw.githubusercontent.com/nextstagecode/auto-posts/main/${post.file}`
    );

    let todasOk = true;

    if (post.platforms.includes("instagram")) {
      console.log("Publicando no Instagram:", post.file);
      const ok = await publicarInstagram(videoUrl, post.caption);
      if (!ok) todasOk = false;
    }

    if (post.platforms.includes("tiktok")) {
      console.log("Publicando no TikTok:", post.file);
      const ok = await publicarTikTok(videoUrl, post.caption);
      if (!ok) todasOk = false;
    }

    if (todasOk) {
      post.posted = true;
      console.log("✅ Marcado como publicado:", post.file);
    } else {
      console.error("❌ Alguma plataforma falhou, mantendo posted=false:", post.file);
    }
  }

  fs.writeFileSync("schedule.json", JSON.stringify(schedule, null, 2));
}

main();