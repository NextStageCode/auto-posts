const sodium = require("libsodium-wrappers");

const REPO = "nextstagecode/auto-posts";
const GITHUB_API = `https://api.github.com/repos/${REPO}`;
const ADMIN_PAT = process.env.ADMIN_PAT;

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REFRESH_TOKEN_ATUAL = process.env.TIKTOK_REFRESH_TOKEN;

async function atualizarSecret(nome, valor) {
  await sodium.ready;

  const { key, key_id } = await fetch(`${GITHUB_API}/actions/secrets/public-key`, {
    headers: { Authorization: `Bearer ${ADMIN_PAT}` },
  }).then((r) => r.json());

  const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const binval = sodium.from_string(valor);
  const encBytes = sodium.crypto_box_seal(binval, binkey);
  const encrypted_value = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  await fetch(`${GITHUB_API}/actions/secrets/${nome}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ADMIN_PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ encrypted_value, key_id }),
  });
}

async function main() {
  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: REFRESH_TOKEN_ATUAL,
  });

  const resposta = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  }).then((r) => r.json());

  if (!resposta.access_token) {
    console.error("Falha ao renovar o token do TikTok:", resposta);
    process.exit(1);
  }

  console.log("Novo access_token do TikTok obtido, válido por", resposta.expires_in, "segundos");
  await atualizarSecret("TIKTOK_ACCESS_TOKEN", resposta.access_token);
  await atualizarSecret("TIKTOK_REFRESH_TOKEN", resposta.refresh_token);
  console.log("✅ Secrets do TikTok atualizados no repositório");
}

main();