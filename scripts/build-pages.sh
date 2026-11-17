#!/usr/bin/env bash
# Build único para o GitHub Pages: host na raiz de SITE_URL e cada remote em mfe/<app>/.
# Mesma origem para todos, então não há CORS. Sem VITE_*_API_URL, os remotes sobem em modo demo.
set -euo pipefail

: "${SITE_URL:?defina SITE_URL, ex.: https://wesleyplago.github.io/portfolio}"
SITE_URL="${SITE_URL%/}"
BASE_PATH="$(node -e 'console.log(new URL(process.argv[1]).pathname.replace(/\/?$/, "/"))' "$SITE_URL")"
OUT="$(pwd)/_site"
REMOTES=(payops rag lagoski-catalog lagoski-checkout lagoski-orders lagoski-inspector vitrine)

# .env.local (gitignored) entraria no bundle com URLs e chaves de API: só existe na máquina local.
if compgen -G "apps/*/.env.local" > /dev/null; then
  echo "aviso: há .env.local em apps/*; este build vai incorporá-los. Não publique este _site." >&2
fi

rm -rf "$OUT"

# 1) Host primeiro (limpa o _site). As URLs dos remotes apontam para o próprio site.
VITE_PAYOPS_REMOTE_URL="$SITE_URL/mfe/payops/remoteEntry.js" \
VITE_RAG_REMOTE_URL="$SITE_URL/mfe/rag/remoteEntry.js" \
VITE_LAGOSKI_CATALOG_REMOTE_URL="$SITE_URL/mfe/lagoski-catalog/remoteEntry.js" \
VITE_LAGOSKI_CHECKOUT_REMOTE_URL="$SITE_URL/mfe/lagoski-checkout/remoteEntry.js" \
VITE_LAGOSKI_ORDERS_REMOTE_URL="$SITE_URL/mfe/lagoski-orders/remoteEntry.js" \
VITE_LAGOSKI_INSPECTOR_REMOTE_URL="$SITE_URL/mfe/lagoski-inspector/remoteEntry.js" \
VITE_VITRINE_REMOTE_URL="$SITE_URL/mfe/vitrine/remoteEntry.js" \
  pnpm --filter ./apps/portfolio exec vite build --base "$BASE_PATH" --outDir "$OUT" --emptyOutDir

# 2) Remotes, cada um na sua subpasta.
for app in "${REMOTES[@]}"; do
  pnpm --filter "./apps/$app" exec vite build \
    --base "${BASE_PATH}mfe/$app/" --outDir "$OUT/mfe/$app" --emptyOutDir
done

# 3) Fallback de SPA (o Pages serve 404.html em rotas desconhecidas) e sem Jekyll.
cp "$OUT/index.html" "$OUT/404.html"
touch "$OUT/.nojekyll"
