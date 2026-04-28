resource "google_cloud_tasks_queue" "pack_generation_jobs" {
  name     = "${local.resource_prefix}-pack-generation-jobs"
  location = local.region

  rate_limits {
    max_concurrent_dispatches = 2
    max_dispatches_per_second = 1
  }

  retry_config {
    max_attempts       = 2
    max_retry_duration = "180s"
    min_backoff        = "15s"
    max_backoff        = "60s"
    max_doublings      = 2
  }
}
