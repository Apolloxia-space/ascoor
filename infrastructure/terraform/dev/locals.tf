locals {
  project_id      = "ascoor-dev"
  region          = "asia-northeast1"
  zone            = "asia-northeast1-a"
  environment     = "dev"
  app_name        = "ascoor"
  domain_name     = "ascoor.app"
  resource_prefix = "${local.app_name}-${local.environment}"
}
