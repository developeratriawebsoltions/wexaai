function normalizeTemplateStatus(status) {
  const value = String(status || "").trim().toUpperCase();
  if (!value) return "PENDING";
  if (["APPROVED", "SUCCESS", "CONFIRMED"].includes(value)) return "APPROVED";
  if (["REJECTED", "DISAPPROVED", "DECLINED", "FAILED"].includes(value)) return "REJECTED";
  if (["PENDING", "IN_REVIEW", "UNDER_REVIEW", "SUBMITTED"].includes(value)) return "PENDING";
  return value;
}

function getTemplateEventPayload(value = {}) {
  const metaTemplateId = value.message_template_id || value.template_id || value.id || value.message_template?.id || value.messageTemplateId || null;
  const templateName = value.message_template_name || value.name || value.template_name || value.message_template?.name || null;
  const language = value.language || value.template_language || value.locale || value.message_template?.language || null;
  const status = value.event || value.status || value.template_status || value.templateState || value.message_template_status || null;
  const rejectionReason = value.reason || value.rejection_reason || value.error_message || value.message || null;

  return {
    metaTemplateId,
    templateName,
    language,
    status: normalizeTemplateStatus(status),
    rejectionReason,
    components: Array.isArray(value.components) ? value.components : Array.isArray(value.message_template?.components) ? value.message_template.components : [],
  };
}

function parseTemplateUpdateFromChange(change) {
  const field = String(change?.field || "").toLowerCase();
  if (!field || !(field.includes("message_template") || field.includes("template"))) return null;
  if (!field.includes("status") && !field.includes("components")) return null;

  const value = change?.value || {};
  const payload = getTemplateEventPayload(value);
  if (!payload.metaTemplateId && !payload.templateName) return null;

  return {
    field,
    ...payload,
  };
}

module.exports = {
  normalizeTemplateStatus,
  getTemplateEventPayload,
  parseTemplateUpdateFromChange,
};
