resource "google_cloud_tasks_queue" "pack_generation_jobs" {
  name     = "${local.resource_prefix}-pack-generation-jobs"
  location = local.region

  rate_limits {
    max_concurrent_dispatches = 8
    max_dispatches_per_second = 8
  }

  retry_config {
    max_attempts       = 2
    max_retry_duration = "300s"
    min_backoff        = "20s"
    max_backoff        = "90s"
    max_doublings      = 2
  }
}
