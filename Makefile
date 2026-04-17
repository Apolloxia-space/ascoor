# ascoor Makefile - Local Development

.PHONY: help install clean build test lint format typecheck \
    prisma-generate prisma-revision prisma-upgrade prisma-reset prisma-downgrade prisma-diff prisma-seed \
    local-dev local-dev-stop local-dev-status \
    docker-up docker-down docker-rebuild docker-rebuild-verbose docker-logs docker-ps \
    gcp-ready gcp-auth gcp-docker-auth gcp-use-prod gcp-use-dev gcp-show-project \
    gcp-docker-build gcp-docker-build-api gcp-docker-build-worker gcp-docker-build-web gcp-docker-build-ai-agent \
    gcp-docker-push gcp-docker-push-api gcp-docker-push-worker gcp-docker-push-web gcp-docker-push-ai-agent \
    gcp-local-build gcp-local-build-api gcp-local-build-worker gcp-local-build-web gcp-local-build-ai-agent \
    gcp-local-push gcp-local-push-api gcp-local-push-worker gcp-local-push-web gcp-local-push-ai-agent \
    gcp-local-image-up gcp-local-image-up-api gcp-local-image-up-worker gcp-local-image-up-web gcp-local-image-up-ai-agent \
    gcp-cloud-build gcp-cloud-build-api gcp-cloud-build-worker gcp-cloud-build-web gcp-cloud-build-ai-agent \
    gcp-cloud-image-up gcp-cloud-image-up-api gcp-cloud-image-up-worker gcp-cloud-image-up-web gcp-cloud-image-up-ai-agent \
    gcp-image-up gcp-image-up-api gcp-image-up-worker gcp-image-up-web gcp-image-up-ai-agent gcp-image-up-and-apply \
    gcp-cloudsql-proxy gcp-api-migrate gcp-api-deploy \
    gcp-terraform-init gcp-terraform-plan gcp-terraform-apply gcp-terraform-force-unlock gcp-prisma-upgrade gcp-prisma-seed \
    db-dev-proxy db-prod-proxy db-dev-prisma-upgrade db-prod-prisma-upgrade db-dev-prisma-seed db-prod-prisma-seed \
       ai-agent-lint ai-agent-check ai-agent-typecheck ai-agent-studio



SHELL := /bin/bash
.DEFAULT_GOAL := help

NPM := npm
COMPOSE := docker compose
APP_NAME ?= ascoor
SQL_PROXY_PORT ?= 5432

# Load optional version overrides
-include versions.mk

GCP_PROJECT_ID ?= $(if $(filter $(GCP_ENV),prod),ascoor,ascoor-dev)
GCP_REGION ?= asia-northeast1
GCP_ENV ?= prod
WEB_APP_ENV ?= $(if $(filter $(GCP_ENV),prod),production,development)
TERRAFORM_DIR ?= infrastructure/terraform/$(GCP_ENV)
REGISTRY_URL ?= $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT_ID)/ascoor-$(GCP_ENV)
TERRAFORM ?= terraform
CLOUD_BUILD_MACHINE_TYPE ?= E2_HIGHCPU_8

CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m

# ==================== Versioning ====================
.PHONY: version-show
version-show:
	@echo "API_VERSION=$(API_VERSION)" \
		"WORKER_VERSION=$(WORKER_VERSION)" \
		"WEB_VERSION=$(WEB_VERSION)" \
		"AI_AGENT_VERSION=$(AI_AGENT_VERSION)"

# ==================== Help ====================
help: ## Show this help message
	@echo '${CYAN}ascoor Makefile${NC}'
	@echo ''
	@echo 'Usage:'
	@echo '  ${GREEN}make${NC} ${YELLOW}<target>${NC}'
	@echo ''
	@echo '${YELLOW}Common Targets:${NC}'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${GREEN}%-20s${NC} %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ==================== Node.js Tooling ====================
install: ## Install dependencies
	$(NPM) install --prefix api
	$(NPM) install --prefix web
	$(NPM) install --prefix ai-agents

clean: ## Remove build artifacts and node_modules
	@if [ -f package.json ]; then \
		$(NPM) run clean; \
	else \
		echo "${YELLOW}No root package.json; skipping npm clean step.${NC}"; \
	fi
	rm -rf node_modules api/node_modules web/node_modules ai-agents/node_modules

build: ## Build API と Web アプリをまとめてビルド
	$(NPM) run build --prefix api
	$(NPM) run build --prefix web
	$(NPM) run build --prefix ai-agents

test: ## Run the full test suite (none defined yet)
	@:

lint: ## Run Biome checks
	$(NPM) run lint --prefix api
	$(NPM) run lint --prefix web
	$(NPM) run lint --prefix ai-agents

format: ## Format codebase with Biome
	$(NPM) run format --prefix api
	$(NPM) run format --prefix web
	$(NPM) run format --prefix ai-agents

typecheck: ## Run TypeScript type checking
	$(NPM) run typecheck --prefix api
	$(NPM) run typecheck --prefix web
	$(NPM) run typecheck --prefix ai-agents

generate: ## Regenerate OpenAPI types and SDKs (API + Web)
	$(NPM) run generate --prefix api
	$(NPM) run generate --prefix web

# ==================== ai-agent (TypeScript) ====================
ai-agent-lint: ## Run ai-agent lint
	$(NPM) run lint --prefix ai-agents

ai-agent-check: ## Run ai-agent tests
	$(NPM) run test --prefix ai-agents

ai-agent-typecheck: ## Run ai-agent static type checking
	$(NPM) run typecheck --prefix ai-agents

ai-agent-studio: ## Run ai-agent dev server
	cd ai-agents && npm run dev


# ==================== Prisma ====================
PRISMA_MIGRATION_NAME ?=

prisma-generate: ## Generate Prisma Client for the API package
	@cd api && $(NPM) exec -- prisma generate --schema prisma/schema.prisma

prisma-revision: ## Create a new Prisma migration (use PRISMA_MIGRATION_NAME=<name>)
	@if [ -z "$(PRISMA_MIGRATION_NAME)" ]; then exit 1; fi
	@$(COMPOSE) exec -T api npx prisma migrate dev --create-only --name $(PRISMA_MIGRATION_NAME)

prisma-upgrade: ## Apply pending Prisma migrations to the database
	@$(COMPOSE) exec -T api npx prisma migrate deploy

prisma-seed: ## Seed database data via Prisma (uses GCP_ENV=dev|prod)
	@$(COMPOSE) exec -T -e GCP_ENV=$(GCP_ENV) api npx prisma db seed

prisma-reset: ## Reset database schema (DANGER: drops and reapplies migrations)
	@$(COMPOSE) exec -T api npx prisma migrate reset --force

prisma-diff: ## Show diff between current database schema and prisma/schema.prisma
	@$(COMPOSE) exec -T api sh -lc 'npx prisma migrate diff --from-url "$${DATABASE_URL:?DATABASE_URL is required}" --to-schema-datamodel prisma/schema.prisma'

prisma-downgrade: ## Roll back the latest migration (drops DB and reapplies previous migrations)
	@LATEST=$$(ls -1 api/prisma/migrations | grep -v migration_lock.toml | sort | tail -n 1); \
	test -n "$$LATEST"; \
	rm -rf "api/prisma/migrations/$$LATEST"; \
	$(COMPOSE) exec -T api npx prisma migrate reset --force --skip-seed >/dev/null

# ==================== Docker Compose ====================
SERVICE ?=

docker-up:
	$(COMPOSE) up -d

docker-rebuild:
	@echo "Rebuilding containers (quiet mode). Use 'make docker-rebuild-verbose' to see progress."
	$(COMPOSE) --progress=plain build >/dev/null
	@./scripts/dev-up.sh --skip-build >/dev/null

docker-rebuild-verbose:
	$(COMPOSE) --progress=plain build
	./scripts/dev-up.sh --skip-build

docker-down:
	$(COMPOSE) down --remove-orphans

docker-logs:
	@if [ -n "$(SERVICE)" ]; then \
		$(COMPOSE) logs -f $(SERVICE); \
	else \
		$(COMPOSE) logs -f; \
	fi

docker-ps:
	$(COMPOSE) ps

# ==================== GCP Utilities ====================
gcp-ready: gcp-auth gcp-docker-auth gcp-cloudsql-proxy ## Authenticate, configure Docker, and start Cloud SQL Proxy

gcp-auth: ## Authenticate with Google Cloud and set project (idempotent)
	@gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
	@gcloud auth application-default print-access-token >/dev/null 2>&1 || gcloud auth application-default login
	@gcloud config set project $(GCP_PROJECT_ID) >/dev/null

gcp-use-prod: ## Switch gcloud to prod project (ascoor)
	$(MAKE) gcp-use GCP_ENV=prod

gcp-use-dev: ## Switch gcloud to dev project (ascoor-dev)
	$(MAKE) gcp-use GCP_ENV=dev

gcp-use: gcp-auth ## Switch gcloud project/region based on GCP_ENV (dev|prod)
	gcloud config set project $(GCP_PROJECT_ID)
	gcloud auth application-default set-quota-project $(GCP_PROJECT_ID)
	gcloud config set compute/region asia-northeast1
	@echo "Switched to $(GCP_PROJECT_ID) (env=$(GCP_ENV))"

gcp-show-project: ## Show current gcloud core/project and active config
	gcloud config list core/project
	gcloud config configurations list

gcp-docker-auth: ## Configure Docker to push to Artifact Registry
	gcloud auth configure-docker $(GCP_REGION)-docker.pkg.dev

# ==================== GCP Image Build/Push (Local Docker) ====================
gcp-docker-build: gcp-docker-build-api gcp-docker-build-worker gcp-docker-build-web gcp-docker-build-ai-agent
	@echo "All GCP images built (api/worker/web/ai-agent)."

gcp-docker-build-api: ## Build API image locally for Cloud Run deployment (Docker)
	docker build --platform linux/amd64 -f api/Dockerfile -t $(REGISTRY_URL)/api:$(API_VERSION) -t $(REGISTRY_URL)/api:latest .

gcp-docker-build-worker: ## Build worker image locally for Cloud Run deployment (Docker)
	docker build --platform linux/amd64 -f api/Dockerfile.worker -t $(REGISTRY_URL)/worker:$(WORKER_VERSION) -t $(REGISTRY_URL)/worker:latest .

gcp-docker-build-web: ## Build Web image locally for Cloud Run deployment (Docker)
	docker build --platform linux/amd64 --build-arg APP_ENV=$(WEB_APP_ENV) -f web/Dockerfile -t $(REGISTRY_URL)/web:$(WEB_VERSION) -t $(REGISTRY_URL)/web:latest .


gcp-docker-build-ai-agent: ## Build ai-agent image locally for Cloud Run deployment (Docker)
	docker build --platform linux/amd64 -f ai-agents/Dockerfile -t $(REGISTRY_URL)/ai-agent:$(AI_AGENT_VERSION) -t $(REGISTRY_URL)/ai-agent:latest .

gcp-docker-push: gcp-docker-push-api gcp-docker-push-worker gcp-docker-push-web gcp-docker-push-ai-agent
	@echo "All GCP images pushed (api/worker/web/ai-agent)."

gcp-docker-push-api: ## Push API image to Artifact Registry (local Docker)
	docker push $(REGISTRY_URL)/api:$(API_VERSION)
	docker push $(REGISTRY_URL)/api:latest

gcp-docker-push-worker: ## Push worker image to Artifact Registry (local Docker)
	docker push $(REGISTRY_URL)/worker:$(WORKER_VERSION)
	docker push $(REGISTRY_URL)/worker:latest

gcp-docker-push-web: ## Push Web image to Artifact Registry (local Docker)
	docker push $(REGISTRY_URL)/web:$(WEB_VERSION)
	docker push $(REGISTRY_URL)/web:latest


gcp-docker-push-ai-agent: ## Push ai-agent image to Artifact Registry (local Docker)
	docker push $(REGISTRY_URL)/ai-agent:$(AI_AGENT_VERSION)
	docker push $(REGISTRY_URL)/ai-agent:latest

gcp-local-build: gcp-docker-build ## Alias: local Docker build (all images)
	@echo "Local Docker build completed (all images)."

gcp-local-build-api: gcp-docker-build-api ## Alias: local Docker build (api)
	@echo "Local Docker build completed (api)."

gcp-local-build-worker: gcp-docker-build-worker ## Alias: local Docker build (worker)
	@echo "Local Docker build completed (worker)."

gcp-local-build-web: gcp-docker-build-web ## Alias: local Docker build (web)
	@echo "Local Docker build completed (web)."


gcp-local-build-ai-agent: gcp-docker-build-ai-agent ## Alias: local Docker build (ai-agent)
	@echo "Local Docker build completed (ai-agent)."

gcp-local-push: gcp-docker-push ## Alias: local Docker push (all images)
	@echo "Local Docker push completed (all images)."

gcp-local-push-api: gcp-docker-push-api ## Alias: local Docker push (api)
	@echo "Local Docker push completed (api)."

gcp-local-push-worker: gcp-docker-push-worker ## Alias: local Docker push (worker)
	@echo "Local Docker push completed (worker)."

gcp-local-push-web: gcp-docker-push-web ## Alias: local Docker push (web)
	@echo "Local Docker push completed (web)."


gcp-local-push-ai-agent: gcp-docker-push-ai-agent ## Alias: local Docker push (ai-agent)
	@echo "Local Docker push completed (ai-agent)."

gcp-local-image-up: gcp-docker-build gcp-docker-push ## Local build + push (all images)
	@echo "Local Docker build + push completed (all images)."

gcp-local-image-up-api: gcp-docker-build-api gcp-docker-push-api ## Local build + push (api)
	@echo "Local Docker build + push completed (api)."

gcp-local-image-up-worker: gcp-docker-build-worker gcp-docker-push-worker ## Local build + push (worker)
	@echo "Local Docker build + push completed (worker)."

gcp-local-image-up-web: gcp-docker-build-web gcp-docker-push-web ## Local build + push (web)
	@echo "Local Docker build + push completed (web)."


gcp-local-image-up-ai-agent: gcp-docker-build-ai-agent gcp-docker-push-ai-agent ## Local build + push (ai-agent)
	@echo "Local Docker build + push completed (ai-agent)."

# ==================== GCP Image Build/Push (Cloud Build) ====================
gcp-cloud-build: ## Build and push all images with Cloud Build (no local docker push)
	gcloud builds submit --project $(GCP_PROJECT_ID) --machine-type $(CLOUD_BUILD_MACHINE_TYPE) --config infrastructure/cloudbuild/cloudbuild.yaml --substitutions=_REGISTRY_URL=$(REGISTRY_URL),_API_VERSION=$(API_VERSION),_WORKER_VERSION=$(WORKER_VERSION),_WEB_VERSION=$(WEB_VERSION),_APP_ENV=$(WEB_APP_ENV),_AI_AGENT_VERSION=$(AI_AGENT_VERSION) .

gcp-cloud-build-api: ## Build and push API image with Cloud Build
	gcloud builds submit --project $(GCP_PROJECT_ID) --machine-type $(CLOUD_BUILD_MACHINE_TYPE) --config infrastructure/cloudbuild/cloudbuild.api.yaml --substitutions=_REGISTRY_URL=$(REGISTRY_URL),_API_VERSION=$(API_VERSION) .

gcp-cloud-build-worker: ## Build and push worker image with Cloud Build
	gcloud builds submit --project $(GCP_PROJECT_ID) --machine-type $(CLOUD_BUILD_MACHINE_TYPE) --config infrastructure/cloudbuild/cloudbuild.worker.yaml --substitutions=_REGISTRY_URL=$(REGISTRY_URL),_WORKER_VERSION=$(WORKER_VERSION) .

gcp-cloud-build-web: ## Build and push Web image with Cloud Build
	gcloud builds submit --project $(GCP_PROJECT_ID) --machine-type $(CLOUD_BUILD_MACHINE_TYPE) --config infrastructure/cloudbuild/cloudbuild.web.yaml --substitutions=_REGISTRY_URL=$(REGISTRY_URL),_WEB_VERSION=$(WEB_VERSION),_APP_ENV=$(WEB_APP_ENV) .


gcp-cloud-build-ai-agent: ## Build and push ai-agent image with Cloud Build
	gcloud builds submit --project $(GCP_PROJECT_ID) --machine-type $(CLOUD_BUILD_MACHINE_TYPE) --config infrastructure/cloudbuild/cloudbuild.ai-agent.yaml --substitutions=_REGISTRY_URL=$(REGISTRY_URL),_AI_AGENT_VERSION=$(AI_AGENT_VERSION) .

gcp-cloud-image-up: gcp-cloud-build ## Cloud Build build + push (all images)
	@echo "All images built and pushed via Cloud Build."

gcp-cloud-image-up-api: gcp-cloud-build-api ## Cloud Build build + push (api)
	@echo "API image built and pushed via Cloud Build."

gcp-cloud-image-up-worker: gcp-cloud-build-worker ## Cloud Build build + push (worker)
	@echo "worker image built and pushed via Cloud Build."

gcp-cloud-image-up-web: gcp-cloud-build-web ## Cloud Build build + push (web)
	@echo "Web image built and pushed via Cloud Build."


gcp-cloud-image-up-ai-agent: gcp-cloud-build-ai-agent ## Cloud Build build + push (ai-agent)
	@echo "ai-agent image built and pushed via Cloud Build."

gcp-image-up: gcp-cloud-image-up ## Build and push all images via Cloud Build

gcp-image-up-api: gcp-cloud-image-up-api ## Build and push API image via Cloud Build

gcp-image-up-worker: gcp-cloud-image-up-worker ## Build and push worker image via Cloud Build

gcp-image-up-web: gcp-cloud-image-up-web ## Build and push Web image via Cloud Build


gcp-image-up-ai-agent: gcp-cloud-image-up-ai-agent ## Build and push ai-agent image via Cloud Build

gcp-image-up-and-apply: gcp-image-up gcp-terraform-apply ## Build/push images via Cloud Build, then apply Terraform
	@echo "Cloud Build completed and Terraform applied."

gcp-cloudsql-proxy: ## Cloud SQL Auth Proxy を起動（ローカルから接続）
	@$(MAKE) gcp-cloudsql-proxy-stop
	cloud-sql-proxy \
	  --address 127.0.0.1 \
	  --port $(SQL_PROXY_PORT) \
	  $(GCP_PROJECT_ID):$(GCP_REGION):ascoor-$(GCP_ENV)-db

gcp-cloudsql-proxy-stop: ## Cloud SQL Auth Proxy を停止
	@pkill -f "cloud-sql-proxy" 2>/dev/null || echo "cloud-sql-proxy is not running"

# ==================== DB (Cloud SQL by env) ====================
db-dev-proxy: ## Start Cloud SQL Proxy (dev)
	$(MAKE) gcp-cloudsql-proxy GCP_ENV=dev

db-prod-proxy: ## Start Cloud SQL Proxy (prod)
	$(MAKE) gcp-cloudsql-proxy GCP_ENV=prod

db-dev-prisma-upgrade: ## Apply Prisma migrations to Cloud SQL (dev)
	$(MAKE) gcp-prisma-upgrade GCP_ENV=dev

db-prod-prisma-upgrade: ## Apply Prisma migrations to Cloud SQL (prod)
	$(MAKE) gcp-prisma-upgrade GCP_ENV=prod

db-dev-prisma-seed: ## Seed Cloud SQL via Prisma (dev)
	$(MAKE) gcp-prisma-seed GCP_ENV=dev

db-prod-prisma-seed: ## Seed Cloud SQL via Prisma (prod)
	$(MAKE) gcp-prisma-seed GCP_ENV=prod

gcp-terraform-init: ## Terraform を初期化
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) init -input=false

gcp-terraform-plan: gcp-terraform-init ## Terraform の変更を確認 (no apply)
	@tfvars_opt=""; \
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) plan \
		$$tfvars_opt \
		-var="api_image_tag=$(API_VERSION)" \
		-var="worker_image_tag=$(WORKER_VERSION)" \
		-var="web_image_tag=$(WEB_VERSION)" \
		-var="ai_agent_image_tag=$(AI_AGENT_VERSION)"

gcp-terraform-apply: gcp-terraform-init ## Terraform で Cloud Run を更新
	@tfvars_opt=""; \
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) apply \
		-auto-approve \
		$$tfvars_opt \
		-var="api_image_tag=$(API_VERSION)" \
		-var="worker_image_tag=$(WORKER_VERSION)" \
		-var="web_image_tag=$(WEB_VERSION)" \
		-var="ai_agent_image_tag=$(AI_AGENT_VERSION)"

gcp-terraform-force-unlock: gcp-terraform-init ## Terraform state lock を強制解除 (LOCK_ID=<id> 必須)
	@if [ -z "$(LOCK_ID)" ]; then \
		echo "Usage: make gcp-terraform-force-unlock GCP_ENV=$(GCP_ENV) LOCK_ID=<lock-id>"; \
		exit 1; \
	fi
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) force-unlock -force $(LOCK_ID)

gcp-prisma-upgrade: ## Apply Prisma migrations to Cloud SQL (requires DATABASE_URL/Cloud SQL Proxy)
	@DB_PASSWORD=$$(gcloud secrets versions access latest --project $(GCP_PROJECT_ID) --secret $(APP_NAME)-$(GCP_ENV)-api-db-password); \
	DATABASE_URL="postgresql://$(APP_NAME)-app:$${DB_PASSWORD}@127.0.0.1:$(SQL_PROXY_PORT)/$(APP_NAME)?schema=public"; \
	cd api && DATABASE_URL="$$DATABASE_URL" $(NPM) exec -- prisma migrate deploy --schema prisma/schema.prisma

gcp-prisma-seed: ## Seed Cloud SQL via Prisma (requires DATABASE_URL/Cloud SQL Proxy)
	@DB_PASSWORD=$$(gcloud secrets versions access latest --project $(GCP_PROJECT_ID) --secret $(APP_NAME)-$(GCP_ENV)-api-db-password); \
	DATABASE_URL="postgresql://$(APP_NAME)-app:$${DB_PASSWORD}@127.0.0.1:$(SQL_PROXY_PORT)/$(APP_NAME)?schema=public"; \
	cd api && GCP_ENV=$(GCP_ENV) DATABASE_URL="$$DATABASE_URL" $(NPM) exec -- prisma db seed --schema prisma/schema.prisma
