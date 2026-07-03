import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  FIELD_TYPES,
  DEFAULT_FIELD_SIZE,
  generateFieldId,
  uploadContractTemplate,
  getContractTemplateFileUrl,
} from "../lib/api/contractApi";
import { FIELD_EDITORS, normalizeFieldDefault } from "../lib/contractFields";
import { CLIENT_DETAIL_SOURCES, hydrateFieldSyncFromDetailSync } from "../lib/clientDetails";
import { confirmDeleteAction } from "../lib/confirmDelete";
import { useI18n } from "../lib/i18n/AppSettingsContext";
import ContractFieldOverlay from "./ContractFieldOverlay";
import ContractPdfViewer from "./ContractPdfViewer";

function placeFieldAtClick({ e, container, placingType, page = 0 }) {
  if (!container || !placingType) return null;

  const rect = container.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  const size = DEFAULT_FIELD_SIZE[placingType] ?? DEFAULT_FIELD_SIZE.text;
  const typeMeta = FIELD_TYPES.find((t) => t.id === placingType);

  return {
    id: generateFieldId(),
    type: placingType,
    label: typeMeta?.label ?? placingType,
    page,
    x: Math.max(0, Math.min(100 - size.width, x)),
    y: Math.max(0, Math.min(100 - size.height, y)),
    width: size.width,
    height: size.height,
    required: true,
    editableBy: placingType === "signature" ? FIELD_EDITORS.client : FIELD_EDITORS.client,
    defaultValue: placingType === "checkbox" ? false : "",
  };
}

export default function ContractTemplateEditor({
  template,
  onUpdate,
  onDelete,
}) {
  const { t } = useI18n();
  const docRef = useRef(null);
  const [placingType, setPlacingType] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [fillPreview, setFillPreview] = useState(false);

  const fields = useMemo(() => template?.fields ?? [], [template?.fields]);
  const isPdf = template?.sourceType === "pdf";
  const hydratedTemplateIdRef = useRef(null);

  useEffect(() => {
    if (!template?.id || !template?.detailSync) return;
    if (hydratedTemplateIdRef.current === template.id) return;
    const hydratedFields = hydrateFieldSyncFromDetailSync(fields, template.detailSync);
    const changed = hydratedFields.some((field, index) => field.syncFrom !== fields[index]?.syncFrom);
    if (!changed) {
      hydratedTemplateIdRef.current = template.id;
      return;
    }
    hydratedTemplateIdRef.current = template.id;
    onUpdate(template.id, { fields: hydratedFields });
  }, [template?.id, template?.detailSync, fields, onUpdate]);

  const addField = (field) => {
    if (!field || !template) return;
    onUpdate(template.id, { fields: [...fields, field] });
    setSelectedFieldId(field.id);
    setPlacingType(null);
  };

  const handleDocClick = (e) => {
    if (!placingType || !docRef.current || !template) return;
    if (e.target.closest(".contract-field-marker")) return;
    const field = placeFieldAtClick({ e, container: docRef.current, placingType, page: 0 });
    addField(field);
  };

  const handlePdfPageClick = (e, pageIndex, pageEl) => {
    if (!placingType || !template) return;
    const field = placeFieldAtClick({ e, container: pageEl, placingType, page: pageIndex });
    addField(field);
  };

  const updateField = (fieldId, patch) => {
    onUpdate(template.id, {
      fields: fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    });
  };

  const removeField = async (fieldId) => {
    const field = fields.find((f) => f.id === fieldId);
    const label = field?.label || fieldId;
    if (!(await confirmDeleteAction(t("admin.deleteFieldConfirm", { label })))) return;
    onUpdate(template.id, { fields: fields.filter((f) => f.id !== fieldId) });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  if (!template) {
    return (
      <div className="contract-editor-empty" dir="rtl">
        <p className="text-gray-400 text-sm">בחרו תבנית חוזה לעריכה או העלו חדשה.</p>
      </div>
    );
  }

  const overlayProps = {
    mode: fillPreview ? "admin-fill" : "admin",
    selectedFieldId,
    onSelectField: setSelectedFieldId,
    onFieldChange: updateField,
    onDeleteField: removeField,
    values: Object.fromEntries(fields.map((f) => [f.id, normalizeFieldDefault(f)])),
    onDefaultValueChange: (fieldId, value) => updateField(fieldId, { defaultValue: value }),
  };

  return (
    <div className="contract-editor" dir="rtl">
      <div className="contract-editor-toolbar">
        <span className="text-sm text-gray-400">
          סמנו שדות על החוזה. «לקוח» = מילוי בחתימה · «אדמין» = רק אתם · «שניהם» = אתם ממלאים מראש והלקוח יכול לערוך.
        </span>
        <div className="contract-editor-tools">
          <button
            type="button"
            className={`contract-tool-btn${fillPreview ? " is-active" : ""}`}
            onClick={() => {
              setFillPreview((v) => !v);
              setPlacingType(null);
            }}
          >
            📝 {fillPreview ? "מצב עריכת מיקום" : "מילוי ערכי ברירת מחדל"}
          </button>
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.id}
              type="button"
              className={`contract-tool-btn${placingType === ft.id ? " is-active" : ""}`}
              disabled={fillPreview}
              onClick={() => setPlacingType(placingType === ft.id ? null : ft.id)}
            >
              <span aria-hidden>{ft.icon}</span> {ft.label}
            </button>
          ))}
        </div>
      </div>

      {placingType ? (
        <p className="contract-editor-hint">
          לחצו על המיקום בחוזה להוספת שדה «{FIELD_TYPES.find((t) => t.id === placingType)?.label}»
        </p>
      ) : null}

      {isPdf ? (
        <div className="contract-doc-frame contract-doc-frame--pdf">
          <ContractPdfViewer
            fileUrl={getContractTemplateFileUrl(template.id)}
            placingType={placingType}
            onPageClick={handlePdfPageClick}
          >
            {(pageIndex, pageEl) => (
              <ContractFieldOverlay
                {...overlayProps}
                fields={fields.filter((f) => (f.page ?? 0) === pageIndex)}
                containerRef={{ current: pageEl }}
              />
            )}
          </ContractPdfViewer>
        </div>
      ) : (
        <div
          ref={docRef}
          className={`contract-doc-frame${placingType ? " is-placing" : ""}`}
          onClick={handleDocClick}
        >
          <div
            className="contract-doc-content"
            dangerouslySetInnerHTML={{ __html: template.html }}
          />
          <ContractFieldOverlay
            {...overlayProps}
            fields={fields.filter((f) => (f.page ?? 0) === 0)}
            containerRef={docRef}
          />
        </div>
      )}

      {selectedField ? (
        <div className="contract-field-inspector">
          <h4 className="text-sm font-bold text-gray-200 mb-2">עריכת שדה</h4>
          <label className="contract-inspector-row">
            <span>תווית</span>
            <input
              type="text"
              value={selectedField.label}
              onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
              className="contract-inspector-input"
            />
          </label>
          <label className="contract-inspector-row">
            <span>חובה</span>
            <input
              type="checkbox"
              checked={selectedField.required !== false}
              onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
            />
          </label>
          {selectedField.type !== "signature" ? (
            <label className="contract-inspector-row">
              <span>מי ממלא</span>
              <select
                value={selectedField.editableBy ?? FIELD_EDITORS.client}
                onChange={(e) => updateField(selectedField.id, { editableBy: e.target.value })}
                className="contract-inspector-input"
              >
                <option value={FIELD_EDITORS.client}>לקוח (ניתן לעריכה בחתימה)</option>
                <option value={FIELD_EDITORS.both}>אדמין + לקוח (מילוי מראש ועריכה בחתימה)</option>
                <option value={FIELD_EDITORS.admin}>אדמין בלבד (ערך קבוע)</option>
              </select>
            </label>
          ) : null}
          {selectedField.type !== "signature" ? (
            <label className="contract-inspector-row">
              <span>סנכרון מפרט לקוח</span>
              <select
                value={selectedField.syncFrom ?? selectedField.prefillFrom ?? ""}
                onChange={(e) => {
                  const syncFrom = e.target.value || undefined;
                  updateField(selectedField.id, { syncFrom, prefillFrom: undefined });
                }}
                className="contract-inspector-input"
              >
                <option value="">לא מסונכרן</option>
                {CLIENT_DETAIL_SOURCES.map((source) => (
                  <option key={source.key} value={source.key}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {selectedField.type === "checkbox" ? (
            <label className="contract-inspector-row">
              <span>ברירת מחדל</span>
              <input
                type="checkbox"
                checked={Boolean(normalizeFieldDefault(selectedField))}
                onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.checked })}
              />
            </label>
          ) : selectedField.type !== "signature" ? (
            <label className="contract-inspector-row">
              <span>ערך ברירת מחדל</span>
              <input
                type={selectedField.type === "date" ? "date" : "text"}
                value={normalizeFieldDefault(selectedField)}
                onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
                className="contract-inspector-input"
                placeholder="ריק"
              />
            </label>
          ) : null}
          <div className="contract-inspector-grid">
            <label className="contract-inspector-row">
              <span>X %</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={Number(selectedField.x).toFixed(1)}
                onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) || 0 })}
                className="contract-inspector-input"
              />
            </label>
            <label className="contract-inspector-row">
              <span>Y %</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={Number(selectedField.y).toFixed(1)}
                onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) || 0 })}
                className="contract-inspector-input"
              />
            </label>
            <label className="contract-inspector-row">
              <span>רוחב %</span>
              <input
                type="number"
                min={2}
                max={100}
                step={0.1}
                value={Number(selectedField.width).toFixed(1)}
                onChange={(e) => updateField(selectedField.id, { width: Number(e.target.value) || 2 })}
                className="contract-inspector-input"
              />
            </label>
            <label className="contract-inspector-row">
              <span>גובה %</span>
              <input
                type="number"
                min={2}
                max={100}
                step={0.1}
                value={Number(selectedField.height).toFixed(1)}
                onChange={(e) => updateField(selectedField.id, { height: Number(e.target.value) || 2 })}
                className="contract-inspector-input"
              />
            </label>
            {isPdf ? (
              <label className="contract-inspector-row">
                <span>עמוד</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={(selectedField.page ?? 0) + 1}
                  onChange={(e) =>
                    updateField(selectedField.id, { page: Math.max(0, (Number(e.target.value) || 1) - 1) })
                  }
                  className="contract-inspector-input"
                />
              </label>
            ) : null}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="text-sm text-red-400 hover:text-red-300"
              onClick={() => removeField(selectedField.id)}
            >
              מחק שדה
            </button>
          </div>
        </div>
      ) : null}

      <div className="contract-editor-footer">
        <span className="text-xs text-gray-500">
          {isPdf ? "PDF" : "Word"} · {fields.length} שדות
        </span>
        <button
          type="button"
          className="text-sm text-red-400 hover:text-red-300"
          onClick={() => onDelete(template.id)}
        >
          מחק תבנית
        </button>
      </div>
    </div>
  );
}

export function ContractTemplateUploader({ onUploaded }) {
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const baseName = file.name.replace(/\.(docx|pdf)$/i, "");
      const { template } = await uploadContractTemplate(file, name || baseName);
      onUploaded(template);
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="contract-uploader" dir="rtl">
      <h3 className="text-md font-bold text-gray-100 mb-3">העלאת תבנית חוזה (PDF / Word)</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם התבנית (אופציונלי)"
          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
        />
        <label className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-all shrink-0 text-center cursor-pointer">
          {uploading ? "מעלה..." : "בחר קובץ PDF / DOCX"}
          <input
            type="file"
            accept=".pdf,.docx,application/pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400 mt-2">{error}</p> : null}
      <p className="text-xs text-gray-500 mt-2">
        העלו PDF או Word. לאחר ההעלאה סמנו מיקומים לשם, תאריך, תיבות סימון וחתימה — ניתן לגרור, לשנות גודל ולמחוק.
      </p>
    </div>
  );
}
