resource "google_secret_manager_secret" "api_db_password" {
  secret_id = "${local.resource_prefix}-api-db-password"

  replication {
    auto {}
  }
}


resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "${local.resource_prefix}-openai-api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "${local.resource_prefix}-stripe-secret-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "stripe_webhook_secret" {
  secret_id = "${local.resource_prefix}-stripe-webhook-secret"

  replication {
    auto {}
  }
}


resource "google_secret_manager_secret_version" "api_db_password" {
  secret      = google_secret_manager_secret.api_db_password.name
  secret_data = random_password.db_password.result
}
