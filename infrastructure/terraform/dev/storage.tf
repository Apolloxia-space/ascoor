resource "google_storage_bucket" "user_files" {
  name                        = "${local.resource_prefix}-user-file"
  location                    = local.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }
}

resource "google_storage_bucket_iam_member" "user_files_writer" {
  bucket = google_storage_bucket.user_files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run_api.email}"
}
