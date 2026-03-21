output "web_lb_ip" {
  description = "Global IP address for dev web load balancer"
  value       = google_compute_global_address.web_lb_ip.address
}

output "api_lb_ip" {
  description = "Global IP address for dev API load balancer"
  value       = google_compute_global_address.api_lb_ip.address
}

output "ai_agent_service_uri" {
  description = "Cloud Run Service URI for ai-agent (dev)"
  value       = google_cloud_run_v2_service.ai_agent.uri
}

output "user_files_bucket_name" {
  description = "GCS bucket for storing user-uploaded files (dev)"
  value       = google_storage_bucket.user_files.name
}
