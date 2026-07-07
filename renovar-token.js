const sodium = require("libsodium-wrappers");

const REPO = "nextstagecode/auto-posts";
const GITHUB_API = `https://api.github.com/repos/${REPO}`;
const ADMIN_PAT = process.env.ADMIN_PAT;
const IG_TOKEN_ATUAL = process.env.IG_ACCESS_TOKEN;

async function atualizarSecret(nome, valor) {
  await sodium.ready;

  // 1. pega a chave pública do repositório (necessária pra criptografar o novo valor)
  const { key, key_id } = await fetch(`${GITHUB_API}/actions/secrets/public-key`, {
    headers: { Authorization: `Bearer ${ADMIN_PAT}` },
  }).then((r) => r.json());

  // 2. criptografa o novo valor com essa chave
  const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const binval = sodium.from_string(valor);
  const encBytes = sodium.crypto_box_seal(binval, binkey);
  const encrypted_value = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  // 3. envia o valor criptografado pra atualizar o secret
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
  const resposta = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${IG_TOKEN_ATUAL}`
  ).then((r) => r.json());

  if (!resposta.access_token) {
    console.error("Falha ao renovar o token:", resposta);
    process.exit(1);
  }

  console.log("Novo token obtido, válido por mais", resposta.expires_in, "segundos");
  await atualizarSecret("IG_ACCESS_TOKEN", resposta.access_token);
  console.log("✅ Secret IG_ACCESS_TOKEN atualizado no repositório");
}

main();