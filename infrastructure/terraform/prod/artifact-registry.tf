data "google_project" "current" {}

resource "google_artifact_registry_repository" "main" {
  location               = local.region
  repository_id          = local.resource_prefix
  description            = "Docker repository for ${local.app_name} (${local.environment})"
  format                 = "DOCKER"
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-latest-only"
    action = "KEEP"

    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["latest"]
    }
  }

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"

    most_recent_versions {
      package_name_prefixes = ["api", "worker", "web", "ai-agent"]
      keep_count            = 5
    }
  }

  cleanup_policies {
    id     = "delete-old-version-tags"
    action = "DELETE"

    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["v"]
      older_than   = "1209600s"
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "259200s"
    }
  }

}

resource "google_artifact_registry_repository_iam_member" "cloud_run_api" {
  project    = google_artifact_registry_repository.main.project
  location   = google_artifact_registry_repository.main.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloud_run_api.email}"
}

resource "google_artifact_registry_repository_iam_member" "cloud_run_ai_agent" {
  project    = google_artifact_registry_repository.main.project
  location   = google_artifact_registry_repository.main.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloud_run_ai_agent.email}"
}

resource "google_artifact_registry_repository_iam_member" "cloud_build_writer" {
  project    = google_artifact_registry_repository.main.project
  location   = google_artifact_registry_repository.main.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}
