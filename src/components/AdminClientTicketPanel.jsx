import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import ContractFieldOverlay from "./ContractFieldOverlay";
import ContractPdfViewer from "./ContractPdfViewer";
import {
  applyFieldSyncToValues,
  buildTicketDisplayValues,
  extractAdminFieldPatch,
  getFieldSyncFromExplicit,
  isAdminEditable,
} from "../lib/contractFields";
import { CLIENT_DETAIL_SOURCES, buildClientDetailsSnapshot } from "../lib/clientDetails";
import { fetchFeedback } from "../lib/api/dataApi";
import {
  getContractTemplateFileUrl,
  syncTicketClientDetails,
  updateTicketAdminValues,
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

export default function AdminClientTicketPanel({
  client,
  ticket,
  template,
  onClose,
  onSaved,
}) {
  const fields = template?.fields ?? [];
  const syncedFields = useMemo(
    () =>
      fields
        .filter((field) => getFieldSyncFromExplicit(field))
        .map((field) => {
          const syncKey = getFieldSyncFromExplicit(field);
          const source = CLIENT_DETAIL_SOURCES.find((item) => item.key === syncKey);
          return { field, source };
        }),
    [fields]
  );
  const [preferences, setPreferences] = useState(null);
  const [values, setValues] = useState(() => buildTicketDisplayValues(fields, ticket?.values ?? {}));
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!client?.id) {
      setPreferences(null);
      return undefined;
    }

    fetchFeedback(client.id)
      .then((data) => {
        if (!cancelled) setPreferences(data?.preferences ?? data ?? null);
      })
      .catch(() => {
        if (!cancelled) setPreferences(null);
      });

    return () => {
      cancelled = true;
    };
  }, [client?.id]);

  const clientDetails = useMemo(
    () => buildClientDetailsSnapshot(client, preferences),
    [client, preferences]
  );

  const handleChange = useCallback(
    (fieldId, value) => {
      const field = fields.find((f) => f.id === fieldId);
      if (!isAdminEditable(field)) return;
      setValues((prev) => ({ ...prev, [fieldId]: value }));
    },
    [fields]
  );

  const applyLocalSync = useCallback(() => {
    setValues((prev) =>
      applyFieldSyncToValues(fields, clientDetails, prev, { onlyEmpty: false })
    );
  }, [fields, clientDetails]);

  const handleSync = async () => {
    setError("");
    setSyncing(true);
    try {
      const result = await syncTicketClientDetails(ticket.id);
      const syncedValues = result.ticket?.values ?? {};
      setValues(buildTicketDisplayValues(fields, syncedValues));
      onSaved?.(result.ticket);
    } catch (err) {
      setError(err.message || "סנכרון נכשל");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveAdminFields = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const adminPatch = extractAdminFieldPatch(fields, values);
      const result = await updateTicketAdminValues(ticket.id, adminPatch);
      onSaved?.(result.ticket);
    } catch (err) {
      setError(err.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (!ticket || !template || !client) return null;

  return (
    <div className="admin-sent-contract-modal" dir="rtl" role="dialog" aria-modal="true">
      <div className="admin-sent-contract-backdrop" onClick={onClose} aria-hidden />
      <div className="admin-sent-contract-panel panel-luxury admin-client-ticket-panel">
        <header className="admin-sent-contract-header">
          <div>
            <h2 className="text-lg font-bold text-gray-100">כרטיס לקוח — {client.name}</h2>
            <p className="text-sm text-xdj-muted mt-1">{template.name}</p>
            <p className="text-xs text-amber-300/90 mt-2">
              סנכרון השדות מוגדר בתבנית החוזה. לחצו «סנכרן לחוזה» לעדכון מפרט הלקוח.
            </p>
          </div>
          <button type="button" className="btn-luxury-quiet px-3 py-1 text-sm" onClick={onClose}>
            סגור
          </button>
        </header>

        <section className="admin-client-details-card">
          <h3 className="admin-client-details-title">פרטי הלקוח</h3>
          <div className="admin-client-details-grid">
            {CLIENT_DETAIL_SOURCES.map((source) => (
              <div key={source.key} className="admin-client-detail-item">
                <span className="admin-client-detail-label">{source.label}</span>
                <span className="admin-client-detail-value">
                  {clientDetails[source.key] || "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-client-sync-section">
          <div className="admin-client-sync-header">
            <h3 className="admin-client-details-title">שדות מסונכרנים בתבנית</h3>
            <button
              type="button"
              className="btn-luxury px-3 py-1.5 text-xs"
              onClick={applyLocalSync}
            >
              תצוגה מקדימה
            </button>
          </div>
          {syncedFields.length > 0 ? (
            <ul className="admin-client-sync-list">
              {syncedFields.map(({ field, source }) => (
                <li key={field.id} className="admin-client-sync-list-item">
                  <span className="admin-client-sync-list-source">{source?.label ?? field.syncFrom}</span>
                  <span className="admin-client-sync-list-arrow">→</span>
                  <span className="admin-client-sync-list-field">{field.label || field.type}</span>
                  <span className="admin-client-sync-list-value">
                    {clientDetails[source?.key] || "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-xdj-muted">
              אין שדות מסונכרנים. בעורך תבנית החוזה בחרו «סנכרון מפרט לקוח» לכל שדה רלוונטי.
            </p>
          )}
        </section>

        <form onSubmit={handleSaveAdminFields} className="admin-sent-contract-form">
          <ContractPreview template={template} values={values} onChange={handleChange} />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="admin-sent-contract-actions">
            <button type="button" className="btn-luxury px-5 py-2" onClick={onClose}>
              ביטול
            </button>
            <button
              type="button"
              className="btn-luxury px-5 py-2"
              disabled={syncing || syncedFields.length === 0}
              onClick={handleSync}
            >
              {syncing ? "מסנכרן..." : "סנכרן לחוזה"}
            </button>
            <button type="submit" className="btn-luxury-primary px-6 py-2" disabled={saving}>
              {saving ? "שומר..." : "שמור שדות אדמין"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
