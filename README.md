# Ascoor

Web-based 3D Design Studio.

## Repo at a glance
- `web/` – Next.js front-end 3D design studio
- `api/` – Hono + Prisma backend
- `ai-agents/` – TypeScript AI agent + server-side three.js design runtime
- `docs/` – Architecture notes
- `infrastructure/` – Terraform for GCP / Cloud Run
- `docker-compose.yml` – Local stack (Postgres + API + Web)

## Quick start (Docker Compose)
```bash
cp api/.env.example api/.env
cp web/.env.example web/.env  # set PORT=3000 when using Compose
docker compose up --build
```
Apps: Web http://localhost:3000, API http://localhost:3100, DB postgres://ascoor:ascoor@localhost:5432/ascoor

## Without Docker
```bash
# API
npm install --prefix api
npm run dev --prefix api   # http://localhost:3100

# Web
npm install --prefix web
npm run dev --prefix web   # http://localhost:3000

# AI agent (three.js code design)
npm install --prefix ai-agents
npm run dev --prefix ai-agents   # http://localhost:8080
```

## AI agent (three.js code design)
The `ai-agents/` service is implemented in TypeScript (Hono + Zod) and exposes design/prompt endpoints.
Design uses the official OpenAI Node SDK (`openai`) with the Responses API as the primary model call, then applies deterministic fixes.

All generated modeling code should be TypeScript/JavaScript with three.js.
The Web app is responsible for rendering preview assets.
Legacy Python compatibility is out of scope.

Run locally:
```bash
npm install --prefix ai-agents
npm run dev --prefix ai-agents   # http://localhost:8080
```

Key environment variables:
- `AI_AGENT_PRIMARY_MODEL` (default: `gpt-5.4-nano`)
- `AI_AGENT_PRIMARY_MODEL_TEMPERATURE` (default: `0.2`)
- `AI_AGENT_SECONDARY_MODEL` (default: `gpt-4o-mini`, used for title design)
- `AI_AGENT_SECONDARY_MODEL_TEMPERATURE` (default: `0.2`)
- `OPENAI_API_KEY` (required)

## Contract-first code design
1. Update the shared OpenAPI contract in `openapi/openapi.yaml`.
2. Regenerate the backend's Orval-powered Hono router and validators:
   ```bash
   npm run generate --prefix api
   ```
3. Regenerate the Orval React Query client for the web app:
   ```bash
   npm run generate --prefix web
   ```

The generated TypeScript lives in `api/src/generated/` (server router + OpenAPI types) and `web/shared/api/generated/` (React Query hooks + schemas). Commit both the contract and generated output so other developers stay in sync.

## Notes
- Root-level `package.json` was removed; use per-package scripts or `--prefix`.
- Makefile targets expecting root npm scripts may no longer apply.
