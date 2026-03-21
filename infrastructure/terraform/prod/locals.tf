locals {
  project_id      = "ascoor"
  region          = "asia-northeast1"
  zone            = "asia-northeast1-a"
  environment     = "prod"
  app_name        = "ascoor"
  domain_name     = "ascoor.app"
  resource_prefix = "${local.app_name}-${local.environment}"
}
