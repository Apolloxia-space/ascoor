resource "google_bigquery_dataset" "billing_export" {
  project                    = local.project_id
  dataset_id                 = "billing_export"
  location                   = "asia-northeast1"
  friendly_name              = "Billing export"
  description                = "Detailed Cloud Billing export dataset for Ascoor environments"
  delete_contents_on_destroy = false

  labels = {
    environment = local.environment
    purpose     = "billing_export"
  }

  depends_on = [google_project_service.apis["bigquery.googleapis.com"]]
}
