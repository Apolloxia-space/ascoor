resource "google_service_account" "cloud_run_api" {
  account_id   = "${local.resource_prefix}-api"
  display_name = "${local.app_name} Cloud Run Service Account (${local.environment})"
  description  = "Service account for Cloud Run services"
}

resource "google_service_account" "cloud_run_web" {
  account_id   = "${local.resource_prefix}-web"
  display_name = "${local.app_name} web Service Account (${local.environment})"
  description  = "Service account for web Cloud Run Service runtime"
}

resource "google_project_iam_member" "cloud_run_api_roles" {
  for_each = {
    cloudsql_client     = "roles/cloudsql.client"
    secret_accessor     = "roles/secretmanager.secretAccessor"
    cloudtasks_enqueuer = "roles/cloudtasks.enqueuer"
    firebaseauth_admin  = "roles/firebaseauth.admin"
  }

  project = local.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run_api.email}"
}

resource "google_service_account_iam_member" "cloud_tasks_token_creator" {
  service_account_id = google_service_account.cloud_run_api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudtasks.iam.gserviceaccount.com"
}

resource "google_project_service_identity" "cloud_scheduler" {
  provider = google-beta
  project  = local.project_id
  service  = "cloudscheduler.googleapis.com"
}

resource "google_service_account_iam_member" "cloud_scheduler_token_creator" {
  service_account_id = google_service_account.cloud_run_api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_project_service_identity.cloud_scheduler.email}"
}

resource "google_service_account_iam_member" "cloud_run_api_act_as" {
  service_account_id = google_service_account.cloud_run_api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cloud_run_api.email}"
}

resource "google_service_account" "cloud_run_ai_agent" {
  account_id   = "${local.resource_prefix}-ai-agent"
  display_name = "${local.app_name} ai-agent Service Account (${local.environment})"
  description  = "Service account for ai-agent Cloud Run Service runtime"
}

resource "google_project_iam_member" "cloud_run_ai_agent_roles" {
  for_each = {
    secret_accessor = "roles/secretmanager.secretAccessor"
  }

  project = local.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run_ai_agent.email}"
}
