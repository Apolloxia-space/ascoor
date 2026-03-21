resource "google_monitoring_notification_channel" "primary_email" {
  display_name = "[${upper(local.environment)}] Primary Email"
  type         = "email"

  labels = {
    email_address = "nishida@apolloxia.com"
  }
}

resource "google_logging_metric" "design_finished_total" {
  name        = "${local.resource_prefix}_design_finished_total"
  description = "Count of design jobs that reached finished state."

  filter = <<-EOT
resource.type="cloud_run_revision"
jsonPayload.message="design_finished"
EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

resource "google_logging_metric" "design_failed_total" {
  name        = "${local.resource_prefix}_design_failed_total"
  description = "Count of design jobs that finished in failed state."

  filter = <<-EOT
resource.type="cloud_run_revision"
jsonPayload.message="design_finished"
jsonPayload.status="failed"
EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

resource "google_logging_metric" "design_duration_ms" {
  name            = "${local.resource_prefix}_design_duration_ms"
  description     = "Design processing duration (milliseconds) from structured logs."
  value_extractor = "EXTRACT(jsonPayload.duration_ms)"

  filter = <<-EOT
resource.type="cloud_run_revision"
jsonPayload.message="design_finished"
jsonPayload.duration_ms:*
EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "DISTRIBUTION"
    unit        = "ms"
  }

  bucket_options {
    exponential_buckets {
      num_finite_buckets = 20
      growth_factor      = 2
      scale              = 1
    }
  }
}

resource "google_logging_metric" "design_stale_recovered_total" {
  name        = "${local.resource_prefix}_design_stale_recovered_total"
  description = "Count of stale running design jobs that were force-failed."

  filter = <<-EOT
resource.type="cloud_run_revision"
jsonPayload.message="design_stale_running_recovered"
EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

resource "google_logging_metric" "design_stage_failed_total" {
  name        = "${local.resource_prefix}_design_stage_failed_total"
  description = "Count of design stage failures by stage and error code."

  filter = <<-EOT
resource.type="cloud_run_revision"
jsonPayload.message="design_stage_failure"
jsonPayload.status="failure"
EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"

    labels {
      key         = "stage"
      value_type  = "STRING"
      description = "Design pipeline stage"
    }

    labels {
      key         = "error_code"
      value_type  = "STRING"
      description = "Design failure code"
    }
  }

  label_extractors = {
    stage      = "EXTRACT(jsonPayload.stage)"
    error_code = "EXTRACT(jsonPayload.error_code)"
  }
}

resource "google_logging_metric" "design_trace_failed_total" {
  name        = "${local.resource_prefix}_design_trace_failed_total"
  description = "Count of design traces that ended in failed status."

  filter = <<-EOT
resource.type="cloud_run_revision"
jsonPayload.message="design_trace_summary"
jsonPayload.final_status="failed"
EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"

    labels {
      key         = "failed_stage"
      value_type  = "STRING"
      description = "Failed stage from design trace summary"
    }

    labels {
      key         = "error_code"
      value_type  = "STRING"
      description = "Error code from design trace summary"
    }
  }

  label_extractors = {
    failed_stage = "EXTRACT(jsonPayload.failed_stage)"
    error_code   = "EXTRACT(jsonPayload.error_code)"
  }
}

resource "google_logging_metric" "design_api_enqueue_http_5xx_total" {
  name        = "${local.resource_prefix}_design_api_enqueue_http_5xx_total"
  description = "Count of HTTP 5xx responses from POST /designs on API service."

  filter = <<-EOT
resource.type="cloud_run_revision"
resource.labels.service_name="${google_cloud_run_v2_service.api.name}"
logName="projects/${local.project_id}/logs/run.googleapis.com%2Frequests"
httpRequest.requestMethod="POST"
httpRequest.requestUrl=~".*/designs(\\?.*)?$"
httpRequest.status>=500
EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

resource "google_monitoring_alert_policy" "design_failure_rate" {
  count        = var.monitoring_alerts_enabled ? 1 : 0
  display_name = "[${upper(local.environment)}] Design failure rate > 10% (15m)"
  combiner     = "OR"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Design finished events show failure ratio above 10% over 15 minutes."
  }

  conditions {
    display_name = "design-failure-rate"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      threshold_value = 0.10
      duration        = "900s"

      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.design_failed_total.name}\" resource.type=\"cloud_run_revision\""

      denominator_filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.design_finished_total.name}\" resource.type=\"cloud_run_revision\""

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

  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = var.monitoring_notification_channel_ids
}

resource "google_monitoring_alert_policy" "design_latency_p95" {
  count        = var.monitoring_alerts_enabled ? 1 : 0
  display_name = "[${upper(local.environment)}] Design duration p95 > 300s (15m)"
  combiner     = "OR"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Design duration p95 exceeded 300 seconds for at least 15 minutes."
  }

  conditions {
    display_name = "design-duration-p95"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.design_duration_ms.name}\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 300000
      duration        = "900s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = concat(
    var.monitoring_notification_channel_ids,
    [google_monitoring_notification_channel.primary_email.name],
  )
}

resource "google_monitoring_alert_policy" "design_stale_recovered" {
  count        = var.monitoring_alerts_enabled ? 1 : 0
  display_name = "[${upper(local.environment)}] Stale running design recovered"
  combiner     = "OR"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Detected stale running design jobs that were force-failed by stale reaper logic."
  }

  conditions {
    display_name = "design-stale-recovered"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.design_stale_recovered_total.name}\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

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

  notification_channels = concat(
    var.monitoring_notification_channel_ids,
    [google_monitoring_notification_channel.primary_email.name],
  )
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

  notification_channels = concat(
    var.monitoring_notification_channel_ids,
    [google_monitoring_notification_channel.primary_email.name],
  )
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

  notification_channels = concat(
    var.monitoring_notification_channel_ids,
    [google_monitoring_notification_channel.primary_email.name],
  )
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

  notification_channels = concat(
    var.monitoring_notification_channel_ids,
    [google_monitoring_notification_channel.primary_email.name],
  )
}

resource "google_monitoring_alert_policy" "design_failed_immediate_email" {
  display_name = "[${upper(local.environment)}] Design failed (immediate)"
  combiner     = "OR"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Triggered immediately when design trace ends with failed, or when API `POST /designs` returns HTTP 5xx."
  }

  conditions {
    display_name = "design-trace-failed-immediate"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.design_trace_failed_total.name}\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_DELTA"
      }

      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "design-api-enqueue-http-5xx-immediate"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.design_api_enqueue_http_5xx_total.name}\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_DELTA"
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

resource "google_monitoring_alert_policy" "design_stage_error_spike" {
  count        = var.monitoring_alerts_enabled ? 1 : 0
  display_name = "[${upper(local.environment)}] Design stage/error_code failures spike"
  combiner     = "OR"
  enabled      = true

  documentation {
    mime_type = "text/markdown"
    content   = "Triggered when the same `stage + error_code` combination appears repeatedly in a short window."
  }

  conditions {
    display_name = "design-stage-error-spike"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.design_stage_failed_total.name}\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
        group_by_fields    = ["metric.label.stage", "metric.label.error_code"]
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
