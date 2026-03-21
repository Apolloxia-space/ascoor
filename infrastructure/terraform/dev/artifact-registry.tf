data "google_project" "current" {}

resource "google_artifact_registry_repository" "main" {
  location      = local.region
  repository_id = local.resource_prefix
  description   = "Docker repository for ${local.app_name} (${local.environment})"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-latest-only"
    action = "KEEP"

    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["latest"]
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
