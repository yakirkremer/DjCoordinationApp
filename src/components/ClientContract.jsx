import React, { useRef, useState, useEffect, useCallback } from "react";
import ContractFieldOverlay from "./ContractFieldOverlay";
import ContractPdfViewer from "./ContractPdfViewer";
import { signContract, getContractTemplateFileUrl } from "../lib/api/contractApi";
import { buildInitialContractValues, isClientEditable } from "../lib/contractFields";

function SignaturePad({ onChange, label }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange?.(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange?.("");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  return (
    <div className="signature-pad" dir="rtl">
      <p className="text-sm text-gray-300 mb-2">{label}</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="signature-pad-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <button type="button" className="text-xs text-gray-400 hover:text-gray-200 mt-1" onClick={clear}>
        נקה חתימה
      </button>
    </div>
  );
}

function ContractDocumentBody({ template, values, onChange }) {
  const docRef = useRef(null);
  const isPdf = template?.sourceType === "pdf";
  const inputFields = (template.fields ?? []).filter((f) => f.type !== "signature");

  if (isPdf) {
    return (
      <div className="contract-doc-frame contract-doc-frame--client contract-doc-frame--pdf">
        <ContractPdfViewer fileUrl={getContractTemplateFileUrl(template.id)}>
          {(pageIndex, pageEl) => (
            <ContractFieldOverlay
              fields={inputFields.filter((f) => (f.page ?? 0) === pageIndex)}
              mode="client"
              values={values}
              onChange={onChange}
              containerRef={{ current: pageEl }}
            />
          )}
        </ContractPdfViewer>
      </div>
    );
  }

  return (
    <div ref={docRef} className="contract-doc-frame contract-doc-frame--client">
      <div className="contract-doc-content" dangerouslySetInnerHTML={{ __html: template.html }} />
      <ContractFieldOverlay
        fields={inputFields.filter((f) => (f.page ?? 0) === 0)}
        mode="client"
        values={values}
        onChange={onChange}
        containerRef={docRef}
      />
    </div>
  );
}

export default function ClientContract({ ticket, onSigned, onBack }) {
  const template = ticket?.template;
  const [values, setValues] = useState(() => {
    const fromTicket = ticket?.values ?? {};
    const defaults = buildInitialContractValues(template?.fields ?? []);
    return { ...defaults, ...fromTicket };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(ticket?.status === "signed");

  const signatureField = template?.fields?.find((f) => f.type === "signature");

  const handleChange = useCallback((fieldId, value) => {
    const field = template?.fields?.find((f) => f.id === fieldId);
    if (field && !isClientEditable(field)) return;
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, [template?.fields]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signContract(ticket.id, values);
      setDone(true);
      onSigned?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket || !template) {
    return (
      <div className="contract-client-empty panel-luxury p-8 text-center" dir="rtl">
        <p className="text-gray-400">אין חוזה ממתין לחתימה.</p>
        <button type="button" className="btn-luxury mt-4 px-4 py-2" onClick={onBack}>
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="contract-client-done panel-luxury p-8 text-center max-w-lg mx-auto" dir="rtl">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-xdj-gold mb-2">החוזה נחתם בהצלחה</h2>
        <p className="text-sm text-xdj-muted mb-6">תודה! החתימה נשמרה במערכת.</p>
        <button type="button" className="btn-luxury-primary px-6 py-2" onClick={onBack}>
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  return (
    <form className="contract-client" onSubmit={handleSubmit} dir="rtl">
      <header className="contract-client-header mb-4">
        <h1 className="text-xl font-bold text-gray-100">{template.name}</h1>
        <p className="text-sm text-gray-400 mt-1">מלאו את השדות המסומנים ללקוח וחתמו בתחתית. שדות אדמין מוצגים לקריאה בלבד.</p>
      </header>

      <ContractDocumentBody template={template} values={values} onChange={handleChange} />

      {signatureField ? (
        <div className="contract-signature-section">
          <SignaturePad
            label={signatureField.label || "חתימה דיגיטלית"}
            onChange={(dataUrl) => handleChange(signatureField.id, dataUrl)}
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400 mt-3">{error}</p> : null}

      <div className="contract-client-actions">
        <button type="button" className="btn-luxury px-5 py-2" onClick={onBack}>
          ביטול
        </button>
        <button type="submit" className="btn-luxury-primary px-6 py-2" disabled={submitting}>
          {submitting ? "שולח..." : "חתום ושלח"}
        </button>
      </div>
    </form>
  );
}
