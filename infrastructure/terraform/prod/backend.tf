terraform {
  backend "gcs" {
    bucket = "ascoor-terraform-state-prod"
    prefix = "terraform/state/prod"
  }
}
