import React, { useState } from "react";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function ClientLogin({ onLogin }) {
  const [loginCode, setLoginCode] = useState("");
  const [error, setError] = useState("");
  const { t, dir } = useI18n();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loginCode.trim()) {
      setError(t("login.codeRequired"));
      return;
    }
    const success = onLogin(loginCode);
    if (!success) {
      setError(t("login.codeInvalid"));
    }
  };

  return (
    <section className="panel-luxury rounded-sm p-8 max-w-md mx-auto" dir={dir}>
      <div className="text-center mb-8">
        <p className="font-lcd text-[10px] tracking-[0.3em] text-xdj-cyan uppercase mb-2">Kramer Music</p>
        <h2 className="text-xl font-semibold text-xdj-gold">{t("login.title")}</h2>
        <p className="text-xs text-xdj-muted mt-2 leading-relaxed">{t("login.subtitle")}</p>
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
          className="input-luxury font-lcd px-4 py-4 text-center text-base tracking-[0.3em] text-xdj-cyan rounded-sm uppercase min-h-[44px]"
          dir="ltr"
          inputMode="numeric"
          autoComplete="one-time-code"
        />

        {error && <p className="text-xs text-xdj-orange text-center">{error}</p>}

        <button
          type="submit"
          className="btn-luxury-primary px-4 py-3 rounded-sm text-sm tracking-widest min-h-[44px] text-base"
        >
          {t("login.submit")}
        </button>
      </form>
    </section>
  );
}
