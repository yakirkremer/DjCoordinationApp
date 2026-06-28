import React, { useState, useMemo } from "react";
import {
  exportClientReportFiles,
  downloadReportFile,
  openClientReportEmail,
} from "../lib/clientReport";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function ClientReportExport({ client, feedback, tracks, formSchema, disabled }) {
  const { t, dir } = useI18n();
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");

  const exportPack = useMemo(() => {
    if (!client || !feedback) return null;
    return exportClientReportFiles({ client, feedback, tracks, formSchema });
  }, [client, feedback, tracks, formSchema]);

  const handleDownloadTxt = () => {
    if (!exportPack) return;
    downloadReportFile(exportPack.text, exportPack.txtFilename, "text/plain;charset=utf-8");
    setStatus(t("admin.reportDownloadedTxt"));
  };

  const handleDownloadHtml = () => {
    if (!exportPack) return;
    downloadReportFile(exportPack.html, exportPack.htmlFilename, "text/html;charset=utf-8");
    setStatus(t("admin.reportDownloadedHtml"));
  };

  const handleEmail = () => {
    if (!exportPack) return;
    if (exportPack.text.length > 1800) {
      downloadReportFile(exportPack.text, exportPack.txtFilename, "text/plain;charset=utf-8");
    }
    openClientReportEmail({
      client,
      text: exportPack.text,
      to: recipient,
    });
    setStatus(t("admin.reportEmailOpened"));
  };

  if (!client) return null;

  return (
    <section className="panel-luxury rounded-sm p-5 sm:p-6" dir={dir}>
      <p className="font-lcd text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-1">REPORT</p>
      <h3 className="text-lg font-bold text-xdj-gold mb-1">{t("admin.reportTitle")}</h3>
      <p className="text-sm text-xdj-muted mb-4">{t("admin.reportSubtitle")}</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="font-lcd text-[10px] text-xdj-muted uppercase">{t("admin.reportEmailTo")}</span>
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={t("admin.reportEmailPlaceholder")}
            disabled={disabled}
            className="input-luxury px-3 py-2 text-sm rounded-sm min-h-[44px]"
            dir="ltr"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDownloadTxt}
          disabled={disabled || !exportPack}
          className="btn-luxury px-4 py-2 rounded-sm text-xs min-h-[40px] disabled:opacity-40"
        >
          {t("admin.reportDownloadTxt")}
        </button>
        <button
          type="button"
          onClick={handleDownloadHtml}
          disabled={disabled || !exportPack}
          className="btn-luxury px-4 py-2 rounded-sm text-xs min-h-[40px] disabled:opacity-40"
        >
          {t("admin.reportDownloadHtml")}
        </button>
        <button
          type="button"
          onClick={handleEmail}
          disabled={disabled || !exportPack}
          className="btn-luxury-primary px-4 py-2 rounded-sm text-xs min-h-[40px] disabled:opacity-40"
        >
          {t("admin.reportSendEmail")}
        </button>
      </div>

      {status ? <p className="text-xs text-xdj-cyan mt-3">{status}</p> : null}
      <p className="text-[10px] text-xdj-muted mt-2">{t("admin.reportEmailHint")}</p>
    </section>
  );
}
