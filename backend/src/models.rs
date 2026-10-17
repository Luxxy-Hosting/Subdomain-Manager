use garde::Validate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(ToSchema, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentStatus {
    Assigned,
    Unknown,
    PendingReassignment,
    Unassigned,
}

impl AssignmentStatus {
    #[inline]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Assigned => "assigned",
            Self::Unknown => "unknown",
            Self::PendingReassignment => "pending_reassignment",
            Self::Unassigned => "unassigned",
        }
    }
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiManagedDomain {
    pub uuid: uuid::Uuid,
    pub provider_uuid: uuid::Uuid,
    pub display_name: String,
    pub base_domain: String,
    pub zone_name: String,
    pub zone_id: String,
    pub default_ttl: i32,
    pub default_proxied: bool,
    pub game: Option<String>,
    pub allow_user_updates: bool,
    pub allowed_record_types: Vec<String>,
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct ApiRecordTemplate {
    pub uuid: uuid::Uuid,
    pub managed_domain_uuid: uuid::Uuid,
    pub egg_uuid: Option<uuid::Uuid>,
    pub game: Option<String>,
    pub record_type: String,
    pub content_template: String,
    pub ttl: Option<i32>,
    pub proxied: Option<bool>,
    pub priority: Option<i32>,
    pub weight: Option<i32>,
    pub port: Option<i32>,
    pub service: Option<String>,
    pub protocol: Option<String>,
    pub only_non_default_port: bool,
    pub enabled: bool,
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct ApiBlacklistRule {
    pub uuid: uuid::Uuid,
    pub managed_domain_uuid: Option<uuid::Uuid>,
    pub pattern: String,
    pub case_sensitive: bool,
    pub enabled: bool,
    pub description: Option<String>,
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct ApiAliasRule {
    pub uuid: uuid::Uuid,
    pub managed_domain_uuid: Option<uuid::Uuid>,
    pub source: String,
    pub target: String,
    pub enabled: bool,
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct ApiGeneratedRecord {
    pub uuid: uuid::Uuid,
    pub cloudflare_record_id: Option<String>,
    pub record_type: String,
    pub name: String,
    pub content: String,
    pub ttl: i32,
    pub proxied: Option<bool>,
    pub priority: Option<i32>,
    pub port: Option<i32>,
    pub weight: Option<i32>,
    pub service: Option<String>,
    pub protocol: Option<String>,
    pub status: String,
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiAssignment {
    pub uuid: uuid::Uuid,
    pub server_uuid: uuid::Uuid,
    pub managed_domain_uuid: uuid::Uuid,
    pub record_type: String,
    pub label: String,
    pub fqdn: String,
    pub status: String,
    pub assignment_source: String,
    pub allocation_ip: Option<String>,
    pub allocation_ip_alias: Option<String>,
    pub allocation_port: Option<i32>,
    pub resolved_target: Option<String>,
    pub records: Vec<ApiGeneratedRecord>,
    pub updated: chrono::DateTime<chrono::Utc>,
    pub created: chrono::DateTime<chrono::Utc>,
}

#[derive(ToSchema, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientAssignmentResponse {
    pub assignment: Option<ApiAssignment>,
    pub managed_domains: Vec<ApiManagedDomain>,
}

#[derive(ToSchema, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PutClientAssignmentRequest {
    #[garde(skip)]
    pub managed_domain_uuid: uuid::Uuid,
    #[garde(skip)]
    #[serde(default)]
    pub allocation_uuid: Option<uuid::Uuid>,
    #[garde(skip)]
    #[serde(default)]
    pub server_type: Option<String>,
    #[garde(length(chars, min = 1, max = 63))]
    pub label: String,
    #[garde(length(chars, min = 1, max = 10))]
    pub record_type: String,
    #[garde(skip)]
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(ToSchema, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AdminUpsertProviderRequest {
    #[garde(length(chars, min = 1, max = 255))]
    pub name: String,
    #[garde(length(chars, min = 20, max = 4096))]
    pub api_token: String,
    #[garde(skip)]
    #[serde(default)]
    pub enabled: bool,
}

#[derive(ToSchema, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AdminUpsertManagedDomainRequest {
    #[garde(skip)]
    pub provider_uuid: uuid::Uuid,
    #[garde(length(chars, min = 1, max = 255))]
    pub display_name: String,
    #[garde(length(chars, min = 1, max = 255))]
    pub base_domain: String,
    #[garde(length(chars, min = 1, max = 255))]
    pub zone_name: String,
    #[garde(length(chars, min = 1, max = 64))]
    pub zone_id: String,
    #[garde(range(min = 1, max = 86400))]
    pub default_ttl: i32,
    #[garde(skip)]
    pub default_proxied: bool,
    #[garde(skip)]
    pub game: Option<String>,
    #[garde(skip)]
    pub allow_user_updates: bool,
    #[garde(skip)]
    pub allowed_record_types: Vec<String>,
}

#[derive(ToSchema, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AdminUpsertBlacklistRuleRequest {
    #[garde(skip)]
    pub managed_domain_uuid: Option<uuid::Uuid>,
    #[garde(length(chars, min = 1, max = 512))]
    pub pattern: String,
    #[garde(skip)]
    pub case_sensitive: bool,
    #[garde(skip)]
    pub enabled: bool,
    #[garde(skip)]
    pub description: Option<String>,
}

#[derive(ToSchema, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AdminUpsertAliasRuleRequest {
    #[garde(skip)]
    pub managed_domain_uuid: Option<uuid::Uuid>,
    #[garde(length(chars, min = 1, max = 255))]
    pub source: String,
    #[garde(length(chars, min = 1, max = 255))]
    pub target: String,
    #[garde(skip)]
    pub enabled: bool,
}

#[derive(ToSchema, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AdminUpsertRecordTemplateRequest {
    #[garde(skip)]
    pub managed_domain_uuid: uuid::Uuid,
    #[garde(skip)]
    pub egg_uuid: Option<uuid::Uuid>,
    #[garde(skip)]
    pub game: Option<String>,
    #[garde(length(chars, min = 1, max = 10))]
    pub record_type: String,
    #[garde(length(chars, min = 1, max = 1024))]
    pub content_template: String,
    #[garde(skip)]
    pub ttl: Option<i32>,
    #[garde(skip)]
    pub proxied: Option<bool>,
    #[garde(skip)]
    pub priority: Option<i32>,
    #[garde(skip)]
    pub weight: Option<i32>,
    #[garde(skip)]
    pub port: Option<i32>,
    #[garde(skip)]
    pub service: Option<String>,
    #[garde(skip)]
    pub protocol: Option<String>,
    #[garde(skip)]
    pub only_non_default_port: bool,
    #[garde(skip)]
    pub enabled: bool,
}

#[derive(ToSchema, Serialize, Deserialize)]
pub struct AdminConfigResponse {
    pub providers: Vec<ApiProvider>,
    pub managed_domains: Vec<ApiManagedDomain>,
    pub blacklist_rules: Vec<ApiBlacklistRule>,
    pub alias_rules: Vec<ApiAliasRule>,
    pub record_templates: Vec<ApiRecordTemplate>,
}

#[derive(ToSchema, Serialize, Deserialize)]
pub struct ApiProvider {
    pub uuid: uuid::Uuid,
    pub name: String,
    pub provider_type: String,
    pub enabled: bool,
    pub created: chrono::DateTime<chrono::Utc>,
    pub updated: chrono::DateTime<chrono::Utc>,
}

#[derive(ToSchema, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AdminReconcileRequest {
    #[garde(skip)]
    pub server_uuid: uuid::Uuid,
    #[garde(skip)]
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(ToSchema, Serialize, Deserialize)]
pub struct AdminReconcileResponse {
    pub assignment: Option<ApiAssignment>,
    pub dry_run: bool,
}
