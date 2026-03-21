locals {
  api_image      = "${google_artifact_registry_repository.main.location}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.main.repository_id}/api:${var.api_image_tag}"
  worker_image   = "${google_artifact_registry_repository.main.location}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.main.repository_id}/worker:${var.worker_image_tag}"
  web_image      = "${google_artifact_registry_repository.main.location}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.main.repository_id}/web:${var.web_image_tag}"
  ai_agent_image = "${google_artifact_registry_repository.main.location}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.main.repository_id}/ai-agent:${var.ai_agent_image_tag}"
}

resource "google_cloud_run_v2_service" "api" {
  name                = "${local.resource_prefix}-api"
  location            = local.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account                  = google_service_account.cloud_run_api.email
    timeout                          = "600s"
    max_instance_request_concurrency = 16

    containers {
      image = local.api_image

      ports {
        container_port = 3100
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      env {
        name  = "DB_HOST"
        value = "/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      env {
        name  = "DB_NAME"
        value = google_sql_database.main.name
      }

      env {
        name  = "DB_USER"
        value = google_sql_user.app.name
      }

      env {
        name  = "DB_POOL_MAX"
        value = "15"
      }

      env {
        name  = "DB_POOL_IDLE_TIMEOUT_MS"
        value = "10000"
      }

      env {
        name  = "DB_POOL_CONNECTION_TIMEOUT_MS"
        value = "5000"
      }

      env {
        name  = "USER_FILE_BUCKET"
        value = google_storage_bucket.user_files.name
      }
      env {
        name  = "AI_AGENT_BASE_URL"
        value = google_cloud_run_v2_service.ai_agent.uri
      }

      env {
        name  = "DESIGN_TASKS_PROJECT_ID"
        value = local.project_id
      }

      env {
        name  = "DESIGN_TASKS_LOCATION"
        value = local.region
      }

      env {
        name  = "DESIGN_TASKS_QUEUE"
        value = google_cloud_tasks_queue.design_jobs.name
      }

      env {
        name  = "DESIGN_TASKS_TARGET_BASE_URL"
        value = google_cloud_run_v2_service.worker.uri
      }

      env {
        name  = "DESIGN_TASKS_OIDC_SERVICE_ACCOUNT"
        value = google_service_account.cloud_run_api.email
      }

      env {
        name  = "DESIGN_TASKS_OIDC_AUDIENCE"
        value = google_cloud_run_v2_service.worker.uri
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_db_password.name
            version = google_secret_manager_secret_version.api_db_password.version
          }
        }
      }

      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.stripe_secret_key.name
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.stripe_webhook_secret.name
            version = "latest"
          }
        }
      }

      env {
        name  = "WEB_APP_BASE_URL"
        value = "https://ascoor.app"
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_v2_service" "web" {
  name                = "${local.resource_prefix}-web"
  location            = local.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account                  = google_service_account.cloud_run_web.email
    max_instance_request_concurrency = 32

    containers {
      image = local.web_image

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 8
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_v2_service" "ai_agent" {
  name                = "${local.resource_prefix}-ai-agent"
  location            = local.region
  deletion_protection = false

  template {
    service_account                  = google_service_account.cloud_run_ai_agent.email
    timeout                          = "300s"
    max_instance_request_concurrency = 8

    containers {
      image = local.ai_agent_image

      ports {
        container_port = 8080
      }

      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_api_key.name
            version = "latest"
          }
        }
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_service_iam_member" "api_public" {
  location = google_cloud_run_v2_service.api.location
  service  = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service" "worker" {
  name                = "${local.resource_prefix}-worker"
  location            = local.region
  deletion_protection = false

  template {
    service_account                  = google_service_account.cloud_run_api.email
    timeout                          = "600s"
    max_instance_request_concurrency = 2

    containers {
      image   = local.worker_image
      command = ["node"]
      args    = ["dist/worker.js"]

      ports {
        container_port = 3100
      }

      env {
        name  = "DB_HOST"
        value = "/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      env {
        name  = "DB_NAME"
        value = google_sql_database.main.name
      }

      env {
        name  = "DB_USER"
        value = google_sql_user.app.name
      }

      env {
        name  = "DB_POOL_MAX"
        value = "5"
      }

      env {
        name  = "DB_POOL_IDLE_TIMEOUT_MS"
        value = "10000"
      }

      env {
        name  = "DB_POOL_CONNECTION_TIMEOUT_MS"
        value = "5000"
      }

      env {
        name  = "USER_FILE_BUCKET"
        value = google_storage_bucket.user_files.name
      }
      env {
        name  = "AI_AGENT_BASE_URL"
        value = google_cloud_run_v2_service.ai_agent.uri
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_db_password.name
            version = google_secret_manager_secret_version.api_db_password.version
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        cpu_idle = true

        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_v2_service_iam_member" "worker_invoker_tasks" {
  location = google_cloud_run_v2_service.worker.location
  name     = google_cloud_run_v2_service.worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloud_run_api.email}"
}

resource "google_cloud_run_service_iam_member" "web_public" {
  location = google_cloud_run_v2_service.web.location
  service  = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ai_agent_invoker_api" {
  location = google_cloud_run_v2_service.ai_agent.location
  name     = google_cloud_run_v2_service.ai_agent.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloud_run_api.email}"
}
