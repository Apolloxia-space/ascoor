output "web_lb_ip" {
  description = "Global IP address for prod web load balancer"
  value       = google_compute_global_address.web_lb_ip.address
}

output "api_lb_ip" {
  description = "Global IP address for prod API load balancer"
  value       = google_compute_global_address.api_lb_ip.address
}

output "ai_agent_service_uri" {
  description = "Cloud Run Service URI for ai-agent (prod)"
  value       = google_cloud_run_v2_service.ai_agent.uri
}

output "user_files_bucket_name" {
  description = "GCS bucket for storing user-uploaded files (prod)"
  value       = google_storage_bucket.user_files.name
}

output "billing_export_dataset_id" {
  description = "BigQuery dataset ID for Cloud Billing detailed usage export (prod)"
  value       = google_bigquery_dataset.billing_export.dataset_id
}

output "billing_export_dataset_location" {
  description = "BigQuery dataset location for Cloud Billing detailed usage export (prod)"
  value       = google_bigquery_dataset.billing_export.location
}
