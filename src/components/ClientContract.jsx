import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import ContractFieldOverlay from "./ContractFieldOverlay";
import ContractPdfViewer from "./ContractPdfViewer";
import { signContract, signContractByLink, getContractTemplateFileUrl, downloadSignedContractCopy } from "../lib/api/contractApi";
import {
  buildTicketDisplayValuesWithProfile,
  getMissingClientProfileFields,
  isClientEditable,
  CLIENT_PROFILE_PREFILL_KEYS,
} from "../lib/contractFields";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function SignaturePad({ onChange, label, id }) {
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
    <div className="signature-pad" dir="rtl" id={id}>
      <p className="text-sm font-bold text-amber-200 mb-2">{label}</p>
      <p className="text-xs text-xdj-muted mb-2">חתמו בתיבה למטה עם העכבר או האצבע</p>
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

function ContractDocumentBody({
  template,
  values,
  onChange,
  onScrollToSignature,
  fileAccessToken,
  readOnly = false,
}) {
  const docRef = useRef(null);
  const isPdf = template?.sourceType === "pdf";
  const allFields = template.fields ?? [];
  const inputFields = allFields.filter((f) => f.type !== "signature");
  const signatureFields = allFields.filter((f) => f.type === "signature");

  const pageOverlay = (pageIndex, pageEl) => {
    if (readOnly) {
      return (
        <ContractFieldOverlay
          fields={allFields.filter((f) => (f.page ?? 0) === pageIndex)}
          mode="client"
          readOnly
          values={values}
          containerRef={{ current: pageEl }}
        />
      );
    }

    return (
      <>
        <ContractFieldOverlay
          fields={inputFields.filter((f) => (f.page ?? 0) === pageIndex)}
          mode="client"
          values={values}
          onChange={onChange}
          containerRef={{ current: pageEl }}
        />
        <ContractFieldOverlay
          fields={signatureFields.filter((f) => (f.page ?? 0) === pageIndex)}
          mode="client-signature-hint"
          values={values}
          onScrollToSignature={onScrollToSignature}
          containerRef={{ current: pageEl }}
        />
      </>
    );
  };

  if (isPdf) {
    return (
      <div className="contract-doc-frame contract-doc-frame--client contract-doc-frame--pdf">
        <ContractPdfViewer fileUrl={getContractTemplateFileUrl(template.id, fileAccessToken)}>
          {(pageIndex, pageEl) => pageOverlay(pageIndex, pageEl)}
        </ContractPdfViewer>
      </div>
    );
  }

  return (
    <div ref={docRef} className="contract-doc-frame contract-doc-frame--client">
      <div className="contract-doc-content" dangerouslySetInnerHTML={{ __html: template.html }} />
      {readOnly ? (
        <ContractFieldOverlay
          fields={allFields.filter((f) => (f.page ?? 0) === 0)}
          mode="client"
          readOnly
          values={values}
          containerRef={docRef}
        />
      ) : (
        <>
          <ContractFieldOverlay
            fields={inputFields.filter((f) => (f.page ?? 0) === 0)}
            mode="client"
            values={values}
            onChange={onChange}
            containerRef={docRef}
          />
          <ContractFieldOverlay
            fields={signatureFields.filter((f) => (f.page ?? 0) === 0)}
            mode="client-signature-hint"
            values={values}
            onScrollToSignature={onScrollToSignature}
            containerRef={docRef}
          />
        </>
      )}
    </div>
  );
}

function SignedContractDownloads({ ticketId, signToken }) {
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState("");

  const handleDownload = async (format) => {
    setError("");
    setDownloading(format);
    try {
      await downloadSignedContractCopy(ticketId, format, signToken);
    } catch (err) {
      setError(err.message || "ההורדה נכשלה");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="contract-client-downloads">
      <button
        type="button"
        className="btn-luxury px-4 py-2 text-sm"
        disabled={downloading === "pdf"}
        onClick={() => handleDownload("pdf")}
      >
        {downloading === "pdf" ? "מוריד..." : "הורד PDF חתום"}
      </button>
      <button
        type="button"
        className="btn-luxury px-4 py-2 text-sm"
        disabled={downloading === "html"}
        onClick={() => handleDownload("html")}
      >
        {downloading === "html" ? "מוריד..." : "הורד HTML"}
      </button>
      {error ? <p className="text-sm text-red-400 w-full">{error}</p> : null}
    </div>
  );
}

export default function ClientContract({
  ticket,
  onSigned,
  onBack,
  signToken,
  standalone = false,
  clientName = "",
  eventDate = "",
  eventLocation = "",
  onFillEventDetails,
}) {
  const { t } = useI18n();
  const template = ticket?.template;
  const signatureRef = useRef(null);
  const clientProfile = useMemo(
    () => ({ clientName, eventDate, eventLocation }),
    [clientName, eventDate, eventLocation]
  );
  const missingProfileFields = useMemo(
    () => getMissingClientProfileFields(clientProfile),
    [clientProfile]
  );
  const missingProfileLabels = useMemo(() => {
    const labels = {
      [CLIENT_PROFILE_PREFILL_KEYS.clientName]: t("home.contractProfileMissingName"),
      [CLIENT_PROFILE_PREFILL_KEYS.eventDate]: t("home.contractProfileMissingDate"),
      [CLIENT_PROFILE_PREFILL_KEYS.eventLocation]: t("home.contractProfileMissingLocation"),
    };
    return missingProfileFields.map((key) => labels[key]).filter(Boolean);
  }, [missingProfileFields, t]);
  const [values, setValues] = useState(() =>
    buildTicketDisplayValuesWithProfile(
      template?.fields ?? [],
      ticket?.values ?? {},
      clientProfile
    )
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(ticket?.status === "signed");
  const isSigned = ticket?.status === "signed" || done;
  const viewOnly = isSigned;
  const readOnly = viewOnly;

  const ticketValuesKey = useMemo(() => JSON.stringify(ticket?.values ?? {}), [ticket?.values]);
  const userEditedRef = React.useRef(false);
  const lastHydratedKeyRef = React.useRef("");

  useEffect(() => {
    userEditedRef.current = false;
    lastHydratedKeyRef.current = "";
  }, [ticket?.id, template?.id]);

  useEffect(() => {
    if (!template?.fields?.length || !ticket?.id) return;
    const hydrateKey = `${ticket.id}|${template.id}|${ticketValuesKey}|${clientName}|${eventDate}|${eventLocation}`;
    if (lastHydratedKeyRef.current === hydrateKey) return;
    if (userEditedRef.current) return;
    lastHydratedKeyRef.current = hydrateKey;
    setValues(
      buildTicketDisplayValuesWithProfile(
        template.fields,
        ticket?.values ?? {},
        clientProfile
      )
    );
  }, [ticket?.id, template?.id, ticketValuesKey, clientName, eventDate, eventLocation, clientProfile, template?.fields, ticket?.values]);

  const signatureField = template?.fields?.find((f) => f.type === "signature");

  const scrollToSignature = useCallback(() => {
    signatureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleChange = useCallback((fieldId, value) => {
    if (readOnly) return;
    const field = template?.fields?.find((f) => f.id === fieldId);
    if (field && !isClientEditable(field)) return;
    userEditedRef.current = true;
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, [template?.fields, readOnly]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    setError("");
    if (missingProfileFields.length > 0) {
      setError(t("home.contractProfileMissingSubmit"));
      return;
    }
    if (signatureField && !values[signatureField.id]) {
      setError("נדרשת חתימה לפני השליחה");
      scrollToSignature();
      return;
    }
    setSubmitting(true);
    try {
      let signedTicket = null;
      if (signToken) {
        const data = await signContractByLink(signToken, values);
        signedTicket = data.ticket ?? null;
      } else {
        const data = await signContract(ticket.id, values);
        signedTicket = data.ticket ?? null;
      }
      setDone(true);
      onSigned?.(signedTicket);
    } catch (err) {
      setError(err.message || "שליחת החוזה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket || !template) {
    return (
      <div className="contract-client-empty panel-luxury p-8 text-center" dir="rtl">
        <p className="text-gray-400">
          {standalone ? "הקישור לחוזה לא תקין או שפג תוקפו." : "אין חוזה ממתין לחתימה."}
        </p>
        {!standalone ? (
          <>
            <p className="text-xs text-xdj-muted mt-2 max-w-md mx-auto">
              האדמין צריך לשלוח חוזה ללקוח בלשונית «לקוחות» (שלח חוזה) או ליצור לקוח עם תיבת «שלח חוזה לחתימה».
            </p>
            <button type="button" className="btn-luxury mt-4 px-4 py-2" onClick={onBack}>
              חזרה לדף הבית
            </button>
          </>
        ) : null}
      </div>
    );
  }

  if (viewOnly) {
    const displayValues = buildTicketDisplayValuesWithProfile(
      template?.fields ?? [],
      ticket?.values ?? {},
      clientProfile
    );
    const mergedValues = { ...displayValues, ...values };

    return (
      <div className="contract-client contract-client--view" dir="rtl">
        <header className="contract-client-header mb-4">
          <h1 className="text-xl font-bold text-gray-100">{template.name}</h1>
          <p className="text-sm text-green-300 mt-1">
            {done && !isSigned ? "החוזה נחתם בהצלחה" : "החוזה נחתם — ניתן לצפות ולהוריד עותק"}
          </p>
          {ticket.signedAt ? (
            <p className="text-xs text-xdj-muted mt-1">
              נחתם ב־{new Date(ticket.signedAt).toLocaleString("he-IL")}
            </p>
          ) : null}
        </header>

        <ContractDocumentBody
          template={template}
          values={mergedValues}
          readOnly
          fileAccessToken={signToken || ticket.signToken}
        />

        <SignedContractDownloads ticketId={ticket.id} signToken={signToken || ticket.signToken} />

        {!standalone ? (
          <div className="contract-client-actions mt-4">
            <button type="button" className="btn-luxury-primary px-6 py-2" onClick={onBack}>
              חזרה לדף הבית
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form className="contract-client" onSubmit={handleSubmit} dir="rtl">
      <header className="contract-client-header mb-4">
        <h1 className="text-xl font-bold text-gray-100">{template.name}</h1>
        {missingProfileFields.length > 0 ? (
          <section className="contract-client-profile-alert panel-luxury mt-3 p-4">
            <p className="text-sm font-bold text-amber-300">{t("home.contractProfileMissingTitle")}</p>
            <p className="text-xs text-xdj-muted mt-1">{t("home.contractProfileMissingDesc")}</p>
            {missingProfileLabels.length > 0 ? (
              <ul className="text-xs text-amber-100/90 mt-2 list-disc list-inside">
                {missingProfileLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : null}
            {onFillEventDetails ? (
              <button
                type="button"
                className="btn-luxury-primary px-4 py-2 text-sm mt-3"
                onClick={onFillEventDetails}
              >
                {t("home.contractProfileFillAction")}
              </button>
            ) : null}
          </section>
        ) : (
          <p className="text-sm text-gray-400 mt-1">{t("home.contractProfilePrefilledDesc")}</p>
        )}
      </header>

      <ContractDocumentBody
        template={template}
        values={values}
        onChange={handleChange}
        onScrollToSignature={scrollToSignature}
        fileAccessToken={signToken}
      />

      <div ref={signatureRef} className="contract-signature-section contract-signature-section--prominent">
        {signatureField ? (
          <SignaturePad
            id="contract-signature-pad"
            label={signatureField.label || "חתימה דיגיטלית"}
            onChange={(dataUrl) => handleChange(signatureField.id, dataUrl)}
          />
        ) : (
          <p className="text-sm text-amber-300">
            לא הוגדר שדה חתימה בתבנית — הוסיפו שדה «חתימה» בעורך החוזה באדמין.
          </p>
        )}
      </div>

      {error ? <p className="text-sm text-red-400 mt-3">{error}</p> : null}

      <div className="contract-client-actions contract-client-actions--sticky">
        {!standalone ? (
          <button type="button" className="btn-luxury px-5 py-2" onClick={onBack}>
            ביטול
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btn-luxury-primary px-6 py-2" disabled={submitting}>
          {submitting ? "שולח..." : "חתום ושלח"}
        </button>
      </div>
    </form>
  );
}
