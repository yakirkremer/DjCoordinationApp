import React, { useCallback, useEffect, useState } from "react";
import { registerConfirmDeleteHandler } from "../lib/confirmDelete";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function ConfirmDeleteProvider({ children }) {
  const { t, dir } = useI18n();
  const [pending, setPending] = useState(null);

  const resolvePending = useCallback((result) => {
    setPending((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    registerConfirmDeleteHandler(
      (message) =>
        new Promise((resolve) => {
          setPending({ message, resolve });
        })
    );
    return () => registerConfirmDeleteHandler(null);
  }, []);

  return (
    <>
      {children}
      {pending ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          aria-describedby="confirm-delete-message"
          onClick={() => resolvePending(false)}
        >
          <div
            className="panel-luxury rounded-sm w-full max-w-md shadow-2xl border border-xdj-border p-5"
            dir={dir}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="confirm-delete-title"
              className="font-lcd text-[10px] tracking-[0.2em] text-xdj-orange uppercase mb-3"
            >
              {t("admin.confirmDeleteTitle")}
            </p>
            <p id="confirm-delete-message" className="text-sm text-xdj-text whitespace-pre-line leading-relaxed">
              {pending.message}
            </p>
            <div className="flex flex-wrap justify-end gap-2 mt-6">
              <button
                type="button"
                className="btn-luxury px-4 py-2 rounded-sm text-sm min-h-[40px]"
                onClick={() => resolvePending(false)}
              >
                {t("admin.confirmDeleteCancel")}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-sm text-sm font-semibold min-h-[40px] bg-red-900/80 border border-red-600 text-red-100 hover:bg-red-800"
                onClick={() => resolvePending(true)}
              >
                {t("admin.confirmDeleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
