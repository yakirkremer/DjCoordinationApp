import React, { useRef, useState } from "react";
import {
  FIELD_TYPES,
  DEFAULT_FIELD_SIZE,
  generateFieldId,
  uploadContractTemplate,
} from "../lib/api/contractApi";
import ContractFieldOverlay from "./ContractFieldOverlay";

export default function ContractTemplateEditor({
  template,
  onUpdate,
  onDelete,
}) {
  const docRef = useRef(null);
  const [placingType, setPlacingType] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  const fields = template?.fields ?? [];

  const handleDocClick = (e) => {
    if (!placingType || !docRef.current || !template) return;
    if (e.target.closest(".contract-field-marker")) return;

    const rect = docRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const size = DEFAULT_FIELD_SIZE[placingType] ?? DEFAULT_FIELD_SIZE.text;

    const typeMeta = FIELD_TYPES.find((t) => t.id === placingType);
    const field = {
      id: generateFieldId(),
      type: placingType,
      label: typeMeta?.label ?? placingType,
      x: Math.max(0, Math.min(100 - size.width, x)),
      y: Math.max(0, Math.min(100 - size.height, y)),
      width: size.width,
      height: size.height,
      required: true,
    };

    onUpdate(template.id, { fields: [...fields, field] });
    setSelectedFieldId(field.id);
    setPlacingType(null);
  };

  const updateField = (fieldId, patch) => {
    onUpdate(template.id, {
      fields: fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    });
  };

  const removeField = (fieldId) => {
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

  return (
    <div className="contract-editor" dir="rtl">
      <div className="contract-editor-toolbar">
        <span className="text-sm text-gray-400">הוספת שדה — לחצו על סוג ואז על המיקום בחוזה:</span>
        <div className="contract-editor-tools">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.id}
              type="button"
              className={`contract-tool-btn${placingType === ft.id ? " is-active" : ""}`}
              onClick={() => setPlacingType(placingType === ft.id ? null : ft.id)}
            >
              <span aria-hidden>{ft.icon}</span> {ft.label}
            </button>
          ))}
        </div>
      </div>

      {placingType ? (
        <p className="contract-editor-hint">לחצו על המיקום בחוזה להוספת שדה «{FIELD_TYPES.find((t) => t.id === placingType)?.label}»</p>
      ) : null}

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
          fields={fields}
          mode="admin"
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
        />
      </div>

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
        <button
          type="button"
          className="text-sm text-red-400 hover:text-red-300"
          onClick={() => {
            if (window.confirm(`למחוק את התבנית "${template.name}"?`)) onDelete(template.id);
          }}
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
      const { template } = await uploadContractTemplate(file, name || file.name.replace(/\.docx$/i, ""));
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
      <h3 className="text-md font-bold text-gray-100 mb-3">העלאת תבנית חוזה (DOCX)</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם התבנית (אופציונלי)"
          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
        />
        <label className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-all shrink-0 text-center cursor-pointer">
          {uploading ? "מעלה..." : "בחר קובץ DOCX"}
          <input type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400 mt-2">{error}</p> : null}
      <p className="text-xs text-gray-500 mt-2">
        העלו קובץ Word (.docx). לאחר ההעלאה תוכלו לסמן מיקומים לשם, תאריך, תיבות סימון וחתימה.
      </p>
    </div>
  );
}
