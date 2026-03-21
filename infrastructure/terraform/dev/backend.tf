terraform {
  backend "gcs" {
    bucket = "ascoor-dev-terraform-state"
    prefix = "terraform/state/dev"
  }
}
