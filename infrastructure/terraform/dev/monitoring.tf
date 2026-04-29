resource "google_monitoring_notification_channel" "primary_email" {
  display_name = "[${upper(local.environment)}] Primary Email"
  type         = "email"

  labels = {
    email_address = "nishida@apolloxia.com"
  }
}

resource "google_monitoring_alert_policy" "api_http_5xx_ratio" {
  count        = var.monitoring_alerts_enabled ? 1 : 0
  display_name = "[${upper(local.environment)}] API HTTP 5xx ratio > 5% (15m)"
  combiner     = "AND"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Cloud Run API request 5xx ratio exceeded 5% for at least 15 minutes."
  }

  conditions {
    display_name = "api-http-5xx-ratio"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      duration        = "900s"

      filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.api.name}\" metric.label.\"response_code_class\"=\"5xx\""

      denominator_filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.api.name}\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      denominator_aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "api-http-5xx-count"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 2
      duration        = "0s"

      filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.api.name}\" metric.label.\"response_code_class\"=\"5xx\""

      aggregations {
        alignment_period     = "900s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = var.monitoring_notification_channel_ids
}

resource "google_monitoring_alert_policy" "ai_agent_http_5xx_ratio" {
  count        = var.monitoring_alerts_enabled ? 1 : 0
  display_name = "[${upper(local.environment)}] AI Agent HTTP 5xx ratio > 5% (15m)"
  combiner     = "AND"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Cloud Run ai-agent request 5xx ratio exceeded 5% for at least 15 minutes."
  }

  conditions {
    display_name = "ai-agent-http-5xx-ratio"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      duration        = "900s"

      filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.ai_agent.name}\" metric.label.\"response_code_class\"=\"5xx\""

      denominator_filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.ai_agent.name}\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      denominator_aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "ai-agent-http-5xx-count"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 2
      duration        = "0s"

      filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.ai_agent.name}\" metric.label.\"response_code_class\"=\"5xx\""

      aggregations {
        alignment_period     = "900s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = var.monitoring_notification_channel_ids
}

resource "google_monitoring_alert_policy" "worker_http_5xx_ratio" {
  count        = var.monitoring_alerts_enabled ? 1 : 0
  display_name = "[${upper(local.environment)}] Worker HTTP 5xx ratio > 5% (15m)"
  combiner     = "AND"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Cloud Run worker request 5xx ratio exceeded 5% for at least 15 minutes."
  }

  conditions {
    display_name = "worker-http-5xx-ratio"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      duration        = "900s"

      filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.worker.name}\" metric.label.\"response_code_class\"=\"5xx\""

      denominator_filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.worker.name}\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      denominator_aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "worker-http-5xx-count"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 2
      duration        = "0s"

      filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${google_cloud_run_v2_service.worker.name}\" metric.label.\"response_code_class\"=\"5xx\""

      aggregations {
        alignment_period     = "900s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = var.monitoring_notification_channel_ids
}
