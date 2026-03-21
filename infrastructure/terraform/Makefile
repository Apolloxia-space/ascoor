.PHONY: help \
	init-dev plan-dev apply-dev destroy-dev output-dev \
	init-prod plan-prod apply-prod destroy-prod output-prod \
	init-dns plan-dns apply-dns destroy-dns output-dns

TERRAFORM ?= terraform
TFVARS := terraform.tfvars

define TF_CMD
@TFVARS_OPT=""; \
if [ -f $(1)/$(TFVARS) ]; then \
	TFVARS_OPT="-var-file=$(TFVARS)"; \
fi; \
$(TERRAFORM) -chdir=$(1) $(2) $$TFVARS_OPT
endef

define TF_CMD_DNS
@if [ -z "$$${CLOUDFLARE_API_TOKEN:-$$${TF_VAR_cloudflare_api_token:-}}" ]; then \
	echo "error: dnsターゲットを実行するには CLOUDFLARE_API_TOKEN または TF_VAR_cloudflare_api_token を設定してください"; \
	exit 1; \
fi; \
TFVARS_OPT=""; \
if [ -f $(1)/$(TFVARS) ]; then \
	TFVARS_OPT="-var-file=$(TFVARS)"; \
fi; \
$(TERRAFORM) -chdir=$(1) $(2) $$TFVARS_OPT
endef

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Dev環境:"
	@echo "  init-dev     Terraform初期化"
	@echo "  plan-dev     変更プラン表示"
	@echo "  apply-dev    変更適用 (-auto-approve無し)"
	@echo "  destroy-dev  リソース削除確認付き"
	@echo "  output-dev   出力確認"
	@echo ""
	@echo "Prod環境:"
	@echo "  init-prod    Terraform初期化"
	@echo "  plan-prod    変更プラン表示"
	@echo "  apply-prod   変更適用 (-auto-approve無し)"
	@echo "  destroy-prod リソース削除確認付き"
	@echo "  output-prod  出力確認"
	@echo ""
	@echo "DNS (Cloudflare):"
	@echo "  init-dns     Terraform初期化"
	@echo "  plan-dns     変更プラン表示 (要 CLOUDFLARE_API_TOKEN または TF_VAR_cloudflare_api_token)"
	@echo "  apply-dns    変更適用 (-auto-approve無し)"
	@echo "  destroy-dns  リソース削除確認付き"
	@echo "  output-dns   出力確認"

init-dev:
	$(call TF_CMD,dev,init)

plan-dev:
	$(call TF_CMD,dev,plan)

apply-dev:
	$(call TF_CMD,dev,apply)

destroy-dev:
	$(call TF_CMD,dev,destroy)

output-dev:
	@$(TERRAFORM) -chdir=dev output

init-prod:
	$(call TF_CMD,prod,init)

plan-prod:
	$(call TF_CMD,prod,plan)

apply-prod:
	$(call TF_CMD,prod,apply)

destroy-prod:
	$(call TF_CMD,prod,destroy)

output-prod:
	@$(TERRAFORM) -chdir=prod output

init-dns:
	$(call TF_CMD,dns,init)

plan-dns:
	$(call TF_CMD_DNS,dns,plan)

apply-dns:
	$(call TF_CMD_DNS,dns,apply)

destroy-dns:
	$(call TF_CMD_DNS,dns,destroy)

output-dns:
	@$(TERRAFORM) -chdir=dns output
