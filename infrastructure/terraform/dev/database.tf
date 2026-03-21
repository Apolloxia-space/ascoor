resource "random_password" "db_password" {
  length  = 32
  special = false
  upper   = true
  lower   = true
  numeric = true
}

resource "google_sql_database_instance" "main" {
  name                = "${local.resource_prefix}-db"
  database_version    = "POSTGRES_18"
  region              = local.region
  deletion_protection = false

  settings {
    tier = "db-f1-micro"

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }
}

resource "google_sql_database" "main" {
  name     = local.app_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "${local.app_name}-app"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}

# Cloud Run APIサービス用のIAM認証ユーザー（パスワード不要）
resource "google_sql_user" "api_iam" {
  name     = trimsuffix(google_service_account.cloud_run_api.email, ".gserviceaccount.com")
  instance = google_sql_database_instance.main.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

# 開発者用IAMユーザーリスト
locals {
  iam_users = ["nishida@apolloxia.com"]
}

# 開発者がCloud SQL ProxyやStudioツールで接続するためのIAMユーザー
resource "google_sql_user" "studio_iam_users" {
  for_each = toset(local.iam_users)

  name     = each.value
  instance = google_sql_database_instance.main.name
  type     = "CLOUD_IAM_USER"
}

resource "google_project_iam_member" "cloudsql_client" {
  for_each = toset(local.iam_users)

  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = "user:${each.value}"
}

resource "google_project_iam_member" "cloudsql_instance_user" {
  for_each = toset(local.iam_users)

  project = local.project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "user:${each.value}"
}

resource "google_project_iam_member" "cloudsql_viewer" {
  for_each = toset(local.iam_users)

  project = local.project_id
  role    = "roles/cloudsql.viewer"
  member  = "user:${each.value}"
}
