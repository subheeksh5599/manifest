# Deploy

Frontend deploys to Vercel from the `app/` directory. Server-side reads the
committed `data/registry.json` and calls the public mainnet RPC with a browser
User-Agent.

## Vercel (recommended)

```bash
cd app
vercel link           # link to the komasubheeksh-2507 account
vercel --prod         # deploy production
```

## Environment

Set these on the Vercel project (or copy from `.env.example`):

- `RPC_URL` public mainnet RPC (default: https://api.mainnet-beta.solana.com)
- `RPC_URL_FALLBACK` optional secondary endpoint
- `RPC_USER_AGENT` browser UA. Default is a real Chrome UA.

## Post-deploy checks

```bash
curl -s https://<url>/api/registry | jq '.entries | length'
curl -s -X POST https://<url>/api/preflight \
  -H 'content-type: application/json' \
  -d @docs/refusals/accept-baseline.json
```
