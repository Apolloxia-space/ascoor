data "cloudflare_zones" "main" {
  # v5 provider data source requires using cloudflare_zones and reading the first match
  name  = var.zone_name
  match = "all"
}

data "terraform_remote_state" "prod" {
  backend = "gcs"
  config = {
    bucket = "ascoor-terraform-state-prod"
    prefix = "terraform/state/prod"
  }
}

data "terraform_remote_state" "dev" {
  backend = "gcs"
  config = {
    bucket = "ascoor-dev-terraform-state"
    prefix = "terraform/state/dev"
  }
}

locals {
  # v5 の cloudflare_zone データソースが name 参照を受け付けないため、cloudflare_zones から取得
  zone_id = data.cloudflare_zones.main.result[0].id

  prod_records = [
    {
      name    = "ascoor.app"
      type    = "A"
      content = data.terraform_remote_state.prod.outputs.web_lb_ip
      proxied = var.prod_proxied
    },
    {
      name    = "www"
      type    = "A"
      content = data.terraform_remote_state.prod.outputs.web_lb_ip
      proxied = var.prod_proxied
    },
    {
      name    = "api"
      type    = "A"
      content = data.terraform_remote_state.prod.outputs.api_lb_ip
      proxied = var.prod_proxied
    }
  ]

  dev_records = [
    {
      name    = "dev"
      type    = "A"
      content = data.terraform_remote_state.dev.outputs.web_lb_ip
      proxied = var.dev_proxied
    },
    {
      name    = "api-dev"
      type    = "A"
      content = data.terraform_remote_state.dev.outputs.api_lb_ip
      proxied = var.dev_proxied
    }
  ]

  records = concat(local.prod_records, local.dev_records)

  # v5 Cloudflare provider expects FQDN; expand here and set TTL.
  records_map = {
    for record in local.records : record.name => merge(
      record,
      {
        # cloudflare_dns_record requires FQDN; append zone if not provided.
        name = endswith(record.name, var.zone_name) ? record.name : "${record.name}.${var.zone_name}"
        ttl  = 1
      }
    )
  }
}

resource "cloudflare_dns_record" "records" {
  for_each = local.records_map

  zone_id = local.zone_id
  name    = each.value.name
  content = each.value.content
  type    = each.value.type
  proxied = each.value.proxied
  ttl     = each.value.ttl
}
