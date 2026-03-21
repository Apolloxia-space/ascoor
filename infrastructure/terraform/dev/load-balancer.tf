locals {
  lb_web_hosts       = ["dev.ascoor.app"]
  lb_api_hosts       = ["api-dev.ascoor.app"]
  lb_web_ssl_domains = ["dev.ascoor.app"]
  lb_api_ssl_domains = ["api-dev.ascoor.app"]
}

resource "google_compute_global_address" "web_lb_ip" {
  name        = "${local.app_name}-web-lb-ip-${local.environment}"
  description = "Global IP for web application load balancer"
}

resource "google_compute_global_address" "api_lb_ip" {
  name        = "${local.app_name}-api-lb-ip-${local.environment}"
  description = "Global IP for API load balancer"
}

resource "google_compute_region_network_endpoint_group" "web_ssr_neg" {
  name                  = "${local.app_name}-web-ssr-neg-${local.environment}"
  network_endpoint_type = "SERVERLESS"
  region                = local.region

  cloud_run {
    service = google_cloud_run_v2_service.web.name
  }
}

resource "google_compute_region_network_endpoint_group" "api_neg" {
  name                  = "${local.app_name}-api-neg-${local.environment}"
  network_endpoint_type = "SERVERLESS"
  region                = local.region

  cloud_run {
    service = google_cloud_run_v2_service.api.name
  }
}

resource "google_compute_backend_service" "web_ssr_backend" {
  name       = "${local.app_name}-web-ssr-backend-${local.environment}"
  protocol   = "HTTP"
  enable_cdn = true

  backend {
    group = google_compute_region_network_endpoint_group.web_ssr_neg.id
  }

  cdn_policy {
    cache_mode = "USE_ORIGIN_HEADERS"
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = true
    }
  }

  log_config { enable = true }
}

resource "google_compute_backend_service" "api_backend" {
  name     = "${local.app_name}-api-backend-${local.environment}"
  protocol = "HTTP"

  backend {
    group = google_compute_region_network_endpoint_group.api_neg.id
  }

  log_config { enable = true }
}

resource "google_compute_url_map" "web_lb" {
  name            = "${local.app_name}-web-lb-${local.environment}"
  default_service = google_compute_backend_service.web_ssr_backend.id

  host_rule {
    hosts        = local.lb_web_hosts
    path_matcher = "web-paths"
  }

  path_matcher {
    name            = "web-paths"
    default_service = google_compute_backend_service.web_ssr_backend.id
  }
}

resource "google_compute_url_map" "api_lb" {
  name            = "${local.app_name}-api-lb-${local.environment}"
  default_service = google_compute_backend_service.api_backend.id
}

resource "google_compute_url_map" "api_lb_http_redirect" {
  name = "${local.app_name}-api-lb-http-redirect-${local.environment}"

  default_url_redirect {
    https_redirect         = true
    strip_query            = false
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
  }
}

resource "google_compute_managed_ssl_certificate" "web" {
  name = "${local.app_name}-web-ssl-cert-${local.environment}"

  managed {
    domains = local.lb_web_ssl_domains
  }
}

resource "google_compute_managed_ssl_certificate" "api" {
  name = "${local.app_name}-api-ssl-cert-${local.environment}"

  managed {
    domains = local.lb_api_ssl_domains
  }
}

resource "google_compute_target_http_proxy" "web_lb_http" {
  name    = "${local.app_name}-web-lb-http-proxy-${local.environment}"
  url_map = google_compute_url_map.web_lb.id
}

resource "google_compute_target_http_proxy" "api_lb_http" {
  name    = "${local.app_name}-api-lb-http-proxy-${local.environment}"
  url_map = google_compute_url_map.api_lb_http_redirect.id
}

resource "google_compute_target_https_proxy" "web_lb_https" {
  name             = "${local.app_name}-web-lb-https-proxy-${local.environment}"
  url_map          = google_compute_url_map.web_lb.id
  ssl_certificates = [google_compute_managed_ssl_certificate.web.id]
}

resource "google_compute_target_https_proxy" "api_lb_https" {
  name             = "${local.app_name}-api-lb-https-proxy-${local.environment}"
  url_map          = google_compute_url_map.api_lb.id
  ssl_certificates = [google_compute_managed_ssl_certificate.api.id]
}

resource "google_compute_global_forwarding_rule" "web_lb_http" {
  name       = "${local.app_name}-web-lb-http-${local.environment}"
  target     = google_compute_target_http_proxy.web_lb_http.id
  port_range = "80"
  ip_address = google_compute_global_address.web_lb_ip.address
}

resource "google_compute_global_forwarding_rule" "api_lb_http" {
  name       = "${local.app_name}-api-lb-http-${local.environment}"
  target     = google_compute_target_http_proxy.api_lb_http.id
  port_range = "80"
  ip_address = google_compute_global_address.api_lb_ip.address
}

resource "google_compute_global_forwarding_rule" "web_lb_https" {
  name       = "${local.app_name}-web-lb-https-${local.environment}"
  target     = google_compute_target_https_proxy.web_lb_https.id
  port_range = "443"
  ip_address = google_compute_global_address.web_lb_ip.address
}

resource "google_compute_global_forwarding_rule" "api_lb_https" {
  name       = "${local.app_name}-api-lb-https-${local.environment}"
  target     = google_compute_target_https_proxy.api_lb_https.id
  port_range = "443"
  ip_address = google_compute_global_address.api_lb_ip.address
}
