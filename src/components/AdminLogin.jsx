import React, { useState } from "react";
import EditableText from "./EditableText";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t, dir } = useI18n();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(t("adminLogin.passwordRequired"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const ok = await onLogin(password);
      if (!ok) setError(t("adminLogin.passwordInvalid"));
    } catch (err) {
      setError(err.message || t("adminLogin.passwordInvalid"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel-luxury rounded-sm p-8 max-w-md mx-auto w-full" dir={dir}>
      <div className="text-center mb-8">
        <p className="font-lcd text-[10px] tracking-[0.3em] text-xdj-cyan uppercase mb-2">Kramer Music</p>
        <h2 className="text-xl font-semibold text-xdj-gold">
          <EditableText k="adminLogin.title" />
        </h2>
        <p className="text-xs text-xdj-muted mt-2 leading-relaxed">
          <EditableText k="adminLogin.subtitle" />
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder={t("adminLogin.placeholder")}
          className="input-luxury px-4 py-4 text-center text-base rounded-sm min-h-[44px]"
          autoComplete="current-password"
        />

        {error && <p className="text-xs text-xdj-orange text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-luxury-primary px-4 py-3 rounded-sm text-sm tracking-widest min-h-[44px] disabled:opacity-40"
        >
          {submitting ? t("common.loading") : <EditableText k="adminLogin.submit" />}
        </button>
      </form>
    </section>
  );
}
