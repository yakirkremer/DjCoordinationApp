import React, { useEffect, useState } from "react";
import ClientContract from "./ClientContract";
import { fetchContractByLink } from "../lib/api/contractApi";

export default function ContractLinkPage({ signToken }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchContractByLink(signToken)
      .then((data) => {
        if (!cancelled) setTicket(data.ticket ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "לא ניתן לטעון את החוזה");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signToken]);

  if (loading) {
    return (
      <p className="font-lcd text-xs text-xdj-muted text-center py-8" dir="rtl">
        טוען חוזה...
      </p>
    );
  }

  if (error) {
    return (
      <section className="panel-luxury rounded-sm p-8 text-center max-w-md mx-auto space-y-3" dir="rtl">
        <h2 className="text-lg font-semibold text-xdj-gold">קישור לא תקין</h2>
        <p className="text-sm text-xdj-muted">{error}</p>
      </section>
    );
  }

  return (
    <div className="contract-client-scroll flex-1 min-h-0 overflow-y-auto max-w-4xl mx-auto w-full py-4">
      <ClientContract ticket={ticket} signToken={signToken} standalone />
    </div>
  );
}
