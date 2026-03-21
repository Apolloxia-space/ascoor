resource "google_cloud_scheduler_job" "design_stale_reaper" {
  name      = "${local.resource_prefix}-design-stale-reaper"
  region    = local.region
  schedule  = "0 0 * * *"
  time_zone = "Etc/UTC"

  http_target {
    uri         = "${google_cloud_run_v2_service.worker.uri}/internal/designs/reap-stale?limit=50"
    http_method = "POST"

    oidc_token {
      service_account_email = google_service_account.cloud_run_api.email
      audience              = google_cloud_run_v2_service.worker.uri
    }
  }
}

resource "google_cloud_scheduler_job" "account_cleanup_reaper" {
  name      = "${local.resource_prefix}-account-cleanup-reaper"
  region    = local.region
  schedule  = "0 0 * * *"
  time_zone = "Etc/UTC"

  http_target {
    uri         = "${google_cloud_run_v2_service.worker.uri}/internal/users/cleanup?limit=100"
    http_method = "POST"

    oidc_token {
      service_account_email = google_service_account.cloud_run_api.email
      audience              = google_cloud_run_v2_service.worker.uri
    }
  }
}
