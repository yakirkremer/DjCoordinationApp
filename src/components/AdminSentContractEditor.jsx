import React, { useRef, useState, useCallback } from "react";
import ContractFieldOverlay from "./ContractFieldOverlay";
import ContractPdfViewer from "./ContractPdfViewer";
import {
  buildTicketDisplayValues,
  extractAdminFieldPatch,
  isAdminEditable,
} from "../lib/contractFields";
import {
  getContractTemplateFileUrl,
  updateTicketAdminValues as updateTicketAdminValuesApi,
} from "../lib/api/contractApi";

function ContractPreview({ template, values, onChange }) {
  const docRef = useRef(null);
  const isPdf = template?.sourceType === "pdf";
  const fields = template?.fields ?? [];

  const overlay = (pageIndex, pageEl) => (
    <ContractFieldOverlay
      fields={fields.filter((f) => (f.page ?? 0) === pageIndex)}
      mode="admin-ticket"
      values={values}
      onChange={onChange}
      containerRef={{ current: pageEl }}
    />
  );

  if (isPdf) {
    return (
      <div className="contract-doc-frame contract-doc-frame--pdf admin-sent-contract-preview">
        <ContractPdfViewer fileUrl={getContractTemplateFileUrl(template.id)}>
          {(pageIndex, pageEl) => overlay(pageIndex, pageEl)}
        </ContractPdfViewer>
      </div>
    );
  }

  return (
    <div ref={docRef} className="contract-doc-frame admin-sent-contract-preview">
      <div className="contract-doc-content" dangerouslySetInnerHTML={{ __html: template.html }} />
      <ContractFieldOverlay
        fields={fields.filter((f) => (f.page ?? 0) === 0)}
        mode="admin-ticket"
        values={values}
        onChange={onChange}
        containerRef={docRef}
      />
    </div>
  );
}

export default function AdminSentContractEditor({
  clientName,
  ticket,
  template,
  onClose,
  onSaved,
}) {
  const fields = template?.fields ?? [];
  const adminFields = fields.filter(isAdminEditable);
  const [values, setValues] = useState(() => buildTicketDisplayValues(fields, ticket?.values ?? {}));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = useCallback(
    (fieldId, value) => {
      const field = fields.find((f) => f.id === fieldId);
      if (!isAdminEditable(field)) return;
      setValues((prev) => ({ ...prev, [fieldId]: value }));
    },
    [fields]
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const adminPatch = extractAdminFieldPatch(fields, values);
      const result = await updateTicketAdminValuesApi(ticket.id, adminPatch);
      onSaved?.(result.ticket);
      onClose?.();
    } catch (err) {
      setError(err.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (!ticket || !template) return null;

  return (
    <div className="admin-sent-contract-modal" dir="rtl" role="dialog" aria-modal="true">
      <div className="admin-sent-contract-backdrop" onClick={onClose} aria-hidden />
      <div className="admin-sent-contract-panel panel-luxury">
        <header className="admin-sent-contract-header">
          <div>
            <h2 className="text-lg font-bold text-gray-100">עריכת חוזה — {clientName}</h2>
            <p className="text-sm text-xdj-muted mt-1">{template.name}</p>
            <p className="text-xs text-amber-300/90 mt-2">
              ניתן לערוך שדות «אדמין בלבד» ו«אדמין + לקוח». הלקוח יראה את הערכים לפני החתימה; בשדות «שניהם» הוא יכול גם לשנות.
            </p>
          </div>
          <button type="button" className="btn-luxury-quiet px-3 py-1 text-sm" onClick={onClose}>
            סגור
          </button>
        </header>

        {adminFields.length === 0 ? (
          <p className="text-sm text-amber-300 p-4">
            אין שדות אדמין בתבנית זו. הגדירו שדות כ«אדמין בלבד» או «אדמין + לקוח» בעורך התבנית.
          </p>
        ) : (
          <form onSubmit={handleSave} className="admin-sent-contract-form">
            <div className="admin-sent-contract-fields-list">
              {adminFields.map((field) => (
                <label key={field.id} className="admin-sent-contract-field-row">
                  <span className="admin-sent-contract-field-label">{field.label || field.id}</span>
                  {field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.id])}
                      onChange={(e) => handleChange(field.id, e.target.checked)}
                    />
                  ) : (
                    <input
                      type={field.type === "date" ? "date" : "text"}
                      value={values[field.id] ?? ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="admin-sent-contract-field-input"
                    />
                  )}
                </label>
              ))}
            </div>

            <ContractPreview template={template} values={values} onChange={handleChange} />

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <div className="admin-sent-contract-actions">
              <button type="button" className="btn-luxury px-5 py-2" onClick={onClose}>
                ביטול
              </button>
              <button type="submit" className="btn-luxury-primary px-6 py-2" disabled={saving}>
                {saving ? "שומר..." : "שמור שדות אדמין"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
