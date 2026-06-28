import React, { useState } from "react";
import ClientLogin from "./ClientLogin";

export default function WelcomePage({ onLogin, onEnterAdmin }) {
  const [showClientLogin, setShowClientLogin] = useState(false);

  return (
    <div className="welcome-page flex flex-col items-center justify-center flex-1 min-h-0 py-8 px-4">
      <div className="welcome-hero text-center mb-10 max-w-lg">
        <img
          src="/kremer-logo.png"
          alt="KREMER"
          className="h-12 sm:h-14 w-auto mx-auto mb-6 object-contain"
        />
        <p className="font-lcd text-[10px] tracking-[0.35em] text-xdj-cyan uppercase mb-3">
          Kramer Music
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-xdj-gold mb-3">ברוכים הבאים</h1>
        <p className="text-sm text-xdj-muted leading-relaxed">
          מערכת חכמה לתיאום המוזיקה לאירוע שלכם — בחירת סגנונות, העדפות אישיות ודירוג שירים
        </p>
      </div>

      <div className="welcome-actions w-full max-w-md flex flex-col gap-4">
        {!showClientLogin ? (
          <>
            <button
              type="button"
              onClick={() => setShowClientLogin(true)}
              className="btn-luxury-primary px-6 py-4 rounded-sm text-sm tracking-widest min-h-[52px]"
            >
              יש לי קוד כניסה לחתונה
            </button>
            <div className="flex items-center gap-3 text-xdj-muted text-xs">
              <span className="flex-1 h-px bg-xdj-border" />
              <span>או</span>
              <span className="flex-1 h-px bg-xdj-border" />
            </div>
            <button
              type="button"
              onClick={onEnterAdmin}
              className="btn-luxury px-6 py-4 rounded-sm text-sm tracking-wider min-h-[52px]"
            >
              כניסת מנהל / דיג&apos;יי
            </button>
          </>
        ) : (
          <div className="welcome-login-wrap">
            <ClientLogin
              onLogin={(code) => {
                const ok = onLogin(code);
                if (ok) setShowClientLogin(false);
                return ok;
              }}
            />
            <button
              type="button"
              onClick={() => setShowClientLogin(false)}
              className="w-full mt-3 text-xs text-xdj-muted hover:text-xdj-text py-2"
            >
              חזרה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
