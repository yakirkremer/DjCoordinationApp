import React, { useState } from "react";
import EditableText from "./EditableText";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function ClientLogin({ onLogin }) {
  const [loginCode, setLoginCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t, dir } = useI18n();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!loginCode.trim()) {
      setError(t("login.codeRequired"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const success = await onLogin(loginCode);
      if (!success) {
        setError(t("login.codeInvalid"));
      }
    } catch (err) {
      setError(err.message || t("login.codeInvalid"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel-luxury rounded-sm p-8 max-w-md mx-auto" dir={dir}>
      <div className="text-center mb-8">
        <p className="font-lcd text-[10px] tracking-[0.3em] text-xdj-cyan uppercase mb-2">kremer Music</p>
        <h2 className="text-xl font-semibold text-xdj-gold">
          <EditableText k="login.title" />
        </h2>
        <p className="text-xs text-xdj-muted mt-2 leading-relaxed">
          <EditableText k="login.subtitle" />
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={loginCode}
          onChange={(e) => {
            setLoginCode(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder={t("login.placeholder")}
          className="input-luxury font-lcd px-4 py-4 text-center text-base tracking-[0.3em] text-xdj-cyan rounded-sm uppercase min-h-[44px] disabled:opacity-40"
          dir="ltr"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          disabled={submitting}
        />

        {error && <p className="text-xs text-xdj-orange text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-luxury-primary px-4 py-3 rounded-sm text-sm tracking-widest min-h-[44px] text-base disabled:opacity-40"
        >
          {submitting ? t("common.loading") : <EditableText k="login.submit" />}
        </button>
      </form>
    </section>
  );
}
