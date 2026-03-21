terraform {
  backend "gcs" {
    bucket = "ascoor-terraform-state-dns"
    prefix = "terraform/state/dns"
  }
}
