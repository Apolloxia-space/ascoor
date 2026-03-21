variable "zone_name" {
  description = "Root domain managed in Cloudflare"
  type        = string
  default     = "ascoor.app"
}

variable "prod_proxied" {
  description = "Whether to enable Cloudflare proxy for prod records"
  type        = bool
  default     = false
}

variable "dev_proxied" {
  description = "Whether to enable Cloudflare proxy for dev records"
  type        = bool
  default     = false
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions to manage DNS records for the zone"
  type        = string
  sensitive   = true
}
