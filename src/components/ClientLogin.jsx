import React, { useState } from "react";

export default function ClientLogin({ onLogin }) {
  const [loginCode, setLoginCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loginCode.trim()) {
      setError("יש להזין קוד כניסה");
      return;
    }
    const success = onLogin(loginCode);
    if (!success) {
      setError("קוד כניסה שגוי. בדקו עם הדיג'יי.");
    }
  };

  return (
    <section className="panel-luxury rounded-sm p-8 max-w-md mx-auto" dir="rtl">
      <div className="text-center mb-8">
        <p className="font-lcd text-[10px] tracking-[0.3em] text-xdj-cyan uppercase mb-2">Kramer Music</p>
        <h2 className="text-xl font-semibold text-xdj-gold">ברוכים הבאים</h2>
        <p className="text-xs text-xdj-muted mt-2 leading-relaxed">
          הזינו את קוד הכניסה שקיבלתם מהדיג'יי
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
          placeholder="ACCESS CODE"
          className="input-luxury font-lcd px-4 py-4 text-center text-lg tracking-[0.3em] text-xdj-cyan rounded-sm uppercase"
          dir="ltr"
          autoComplete="off"
        />

        {error && <p className="text-xs text-xdj-orange text-center">{error}</p>}

        <button type="submit" className="btn-luxury-primary px-4 py-3 rounded-sm text-sm tracking-widest">
          כניסה
        </button>
      </form>
    </section>
  );
}
