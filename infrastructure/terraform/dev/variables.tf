variable "api_image_tag" {
  description = "Cloud Run にデプロイする API コンテナイメージのタグ"
  type        = string
  default     = "latest"
}

variable "worker_image_tag" {
  description = "Cloud Run にデプロイする worker コンテナイメージのタグ"
  type        = string
  default     = "latest"
}

variable "web_image_tag" {
  description = "Cloud Run にデプロイする Web コンテナイメージのタグ"
  type        = string
  default     = "latest"
}

variable "ai_agent_image_tag" {
  description = "Cloud Run にデプロイする ai-agent コンテナイメージのタグ"
  type        = string
  default     = "latest"
}

variable "monitoring_alerts_enabled" {
  description = "Monitoring アラートポリシーを有効化するか"
  type        = bool
  default     = false
}

variable "monitoring_notification_channel_ids" {
  description = "Monitoring アラート通知先チャネルIDのリスト"
  type        = list(string)
  default     = []
}
