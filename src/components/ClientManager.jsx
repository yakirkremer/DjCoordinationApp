import React, { useState } from "react";
import { CLIENT_TYPES } from "../lib/clientTypes";
import { CLIENT_STAGE_IDS, CLIENT_STAGE_LABELS, getClientStages } from "../lib/clientStages";
import { buildContractShareUrl } from "../lib/contractTokens";
import AdminSentContractEditor from "./AdminSentContractEditor";
import ClientContract from "./ClientContract";
import { fetchContracts, downloadSignedContractCopy } from "../lib/api/contractApi";
import { pickCanonicalTicketForClient } from "../lib/contractTickets";

function buildAdminViewTicket(ticket, template) {
  if (!ticket || !template) return null;
  const base = {
    id: template.id,
    name: template.name,
    sourceType: template.sourceType || "docx",
    fields: template.fields ?? [],
  };
  const publicTemplate =
    base.sourceType === "pdf"
      ? { ...base, fileUrl: `/api/contracts/templates/${template.id}/file` }
      : { ...base, html: template.html };
  return { ...ticket, template: publicTemplate };
}

function StageToggles({ client, onUpdateStages }) {
  const stages = getClientStages(client);

  return (
    <div className="client-stage-toggles flex flex-wrap gap-1">
      {CLIENT_STAGE_IDS.map((stageId) => {
        const enabled = stages[stageId];
        return (
          <button
            key={stageId}
            type="button"
            onClick={() => onUpdateStages(client.id, { [stageId]: !enabled })}
            className={`client-stage-toggle${enabled ? " is-on" : ""}`}
            title={enabled ? `סגור ${CLIENT_STAGE_LABELS[stageId]}` : `פתח ${CLIENT_STAGE_LABELS[stageId]}`}
          >
            {CLIENT_STAGE_LABELS[stageId]}
          </button>
        );
      })}
    </div>
  );
}

function ClientContractCell({
  client,
  ticket,
  contractTemplates,
  onAssignContract,
  onEditTicket,
  onViewTicket,
  assigningId,
  setAssigningId,
  assignTemplateId,
  setAssignTemplateId,
  onAssign,
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const copyLink = async (clientId) => {
    setCopyError("");
    try {
      const data = await fetchContracts();
      const ticket = pickCanonicalTicketForClient(data.tickets ?? [], clientId);
      if (!ticket?.signToken) {
        setCopyError("אין קישור לחוזה — שלחו חוזה ללקוח קודם");
        return;
      }
      const url = buildContractShareUrl(ticket.signToken);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const data = await fetchContracts().catch(() => null);
      const ticket = pickCanonicalTicketForClient(data?.tickets ?? [], clientId);
      if (ticket?.signToken) {
        const url = buildContractShareUrl(ticket.signToken);
        window.prompt("העתיקו את הקישור:", url);
      } else {
        setCopyError("לא ניתן להעתיק קישור");
      }
    }
  };

  if (!ticket) {
    if (contractTemplates.length === 0 || !onAssignContract) {
      return <span className="text-xs text-gray-600">—</span>;
    }
    if (assigningId === client.id) {
      return (
        <div className="flex flex-col gap-1 min-w-[140px]">
          <select
            value={assignTemplateId[client.id] ?? ""}
            onChange={(e) =>
              setAssignTemplateId((prev) => ({ ...prev, [client.id]: e.target.value }))
            }
            className="text-xs bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-200"
          >
            <option value="">תבנית...</option>
            {contractTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <button type="button" onClick={onAssign} className="text-[10px] text-green-400 hover:text-green-300">
              שלח
            </button>
            <button
              type="button"
              onClick={() => setAssigningId(null)}
              className="text-[10px] text-gray-500"
            >
              ביטול
            </button>
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setAssigningId(client.id)}
        className="text-xs text-purple-400 hover:text-purple-300"
      >
        + שלח חוזה
      </button>
    );
  }

  const signed = ticket.status === "signed";
  const tplName =
    contractTemplates.find((t) => t.id === ticket.templateId)?.name ?? "חוזה";

  return (
    <div className="client-contract-cell flex flex-col gap-1.5 min-w-[150px]">
      <span
        className={`text-xs rounded px-2 py-1 w-fit ${
          signed
            ? "bg-green-950/50 text-green-400 border border-green-800"
            : "bg-amber-950/50 text-amber-400 border border-amber-800"
        }`}
      >
        {signed ? "נחתם" : "ממתין לחתימה"}
      </span>
      <span className="text-[10px] text-gray-500 truncate" title={tplName}>
        {tplName}
      </span>
      {ticket.signToken ? (
        <button
          type="button"
          onClick={() => copyLink(client.id)}
          className="text-[10px] text-purple-400 hover:text-purple-300 text-right"
        >
          {copied ? "הועתק!" : "העתק קישור לחתימה"}
        </button>
      ) : null}
      {copyError ? <span className="text-[10px] text-red-400">{copyError}</span> : null}
      {!signed && onEditTicket ? (
        <button
          type="button"
          onClick={() => onEditTicket(client, ticket)}
          className="text-[10px] text-amber-400 hover:text-amber-300 text-right"
        >
          ערוך שדות אדמין
        </button>
      ) : null}
      {signed && onViewTicket ? (
        <button
          type="button"
          onClick={() => onViewTicket(client, ticket)}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 text-right"
        >
          צפה בחוזה חתום
        </button>
      ) : null}
      {signed ? (
        <button
          type="button"
          onClick={() => downloadSignedContractCopy(ticket.id, "pdf").catch(() => {})}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 text-right"
        >
          הורד עותק חתום
        </button>
      ) : (
        <span className="text-[10px] text-gray-600">
          נשלח {new Date(ticket.sentAt).toLocaleDateString("he-IL")}
        </span>
      )}
      {signed && ticket.signedAt ? (
        <span className="text-[10px] text-gray-500">
          נחתם {new Date(ticket.signedAt).toLocaleDateString("he-IL")}
        </span>
      ) : null}
    </div>
  );
}

export default function ClientManager({
  clients,
  onCreateClient,
  onDeleteClient,
  onAssignContract,
  onUpdateStages,
  onTicketAdminSaved,
  contractTemplates = [],
  getTicketForClient,
  getTemplate,
}) {
  const [name, setName] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [clientType, setClientType] = useState(CLIENT_TYPES[0].id);
  const [templateId, setTemplateId] = useState("");
  const [sendContract, setSendContract] = useState(false);
  const [error, setError] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const [assignTemplateId, setAssignTemplateId] = useState({});
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("יש להזין שם לקוח");
      return;
    }
    if (!eventDate.trim()) {
      setError("יש להזין תאריך אירוע");
      return;
    }
    if (!eventLocation.trim()) {
      setError("יש להזין מיקום אירוע");
      return;
    }

    if (sendContract && !templateId) {
      setError("בחרו תבנית חוזה לשליחה");
      return;
    }

    const client = onCreateClient(
      name,
      loginCode,
      clientType,
      sendContract ? templateId : null,
      eventDate,
      eventLocation
    );
    if (!client) {
      setError("קוד כניסה כבר קיים. בחרו קוד אחר.");
      return;
    }

    setName("");
    setLoginCode("");
    setEventDate("");
    setEventLocation("");
    setClientType(CLIENT_TYPES[0].id);
    setTemplateId("");
    setSendContract(false);
    setError("");
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
  };

  const getTypeLabel = (typeId) =>
    CLIENT_TYPES.find((t) => t.id === typeId)?.label ?? typeId;

  const handleAssignContract = (clientId) => {
    const tplId = assignTemplateId[clientId];
    if (!tplId || !onAssignContract) return;
    onAssignContract(clientId, tplId);
    setAssigningId(null);
  };

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <section className="bg-gray-900 rounded-xl p-6 shadow-xl border border-gray-800">
        <h2 className="text-lg font-bold text-gray-100 mb-4">יצירת לקוח חדש</h2>

        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם הזוג / האירוע *"
              required
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
            />
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
              className="w-full sm:w-44 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
            >
              {CLIENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              title="תאריך האירוע"
              required
              className="flex-1 sm:flex-none sm:w-44 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
              dir="ltr"
            />
            <input
              type="text"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="מיקום האירוע *"
              required
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
              placeholder="קוד כניסה (אופציונלי)"
              className="flex-1 sm:flex-none sm:w-40 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-center font-mono text-purple-300 outline-none focus:border-purple-500 uppercase"
              dir="ltr"
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-all shrink-0"
            >
              + צור לקוח
            </button>
          </div>

          <div className="contract-create-options mt-2 p-4 rounded-lg border border-gray-800 bg-gray-950/50">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input
                type="checkbox"
                checked={sendContract}
                onChange={(e) => setSendContract(e.target.checked)}
                className="rounded"
              />
              שלח חוזה לחתימה בכניסה ללקוח
            </label>

            {sendContract ? (
              <div className="mt-3">
                {contractTemplates.length === 0 ? (
                  <p className="text-xs text-amber-400">
                    אין תבניות חוזה. העלו תבנית בלשונית «חוזים» לפני שליחה.
                  </p>
                ) : (
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 outline-none focus:border-purple-500"
                  >
                    <option value="">בחר תבנית חוזה...</option>
                    {contractTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : null}
          </div>
        </form>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <p className="text-xs text-gray-500 mt-3">
          שם, תאריך ומיקום האירוע חובה — הם ימולאו אוטומטית בחוזה ובטופס הלקוח.
          בחרו סוג לקוח — הטופס יציג שאלות רלוונטיות לסוג שנבחר. ניתן לשלוח חוזה לחתימה דיגיטלית.
          שלבי «טופס», «קטלוג» ו«חוזה» בטבלה קובעים מה הלקוח רואה בדשבורד — לחצו להפעלה/כיבוי.
        </p>
      </section>

      <section className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
              <th className="p-4">שם</th>
              <th className="p-4">סוג</th>
              <th className="p-4">קוד כניסה</th>
              <th className="p-4">שלבים ללקוח</th>
              <th className="p-4">חוזה</th>
              <th className="p-4">נוצר</th>
              <th className="p-4 w-24 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500 text-sm">
                  עדיין אין לקוחות. צרו את הלקוח הראשון למעלה.
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const ticket = getTicketForClient?.(client.id) ?? null;
                return (
                  <tr key={client.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-bold text-gray-200">
                      {client.name}
                      {client.eventDate || client.eventLocation ? (
                        <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                          {[client.eventDate, client.eventLocation].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-4">
                      <span className="text-xs bg-purple-950/50 border border-purple-800 rounded px-2 py-1 text-purple-300">
                        {getTypeLabel(client.clientType)}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => copyCode(client.loginCode)}
                        className="font-mono text-purple-400 hover:text-purple-300 tracking-widest"
                        title="העתק קוד"
                      >
                        {client.loginCode}
                      </button>
                    </td>
                    <td className="p-4">
                      {onUpdateStages ? (
                        <StageToggles client={client} onUpdateStages={onUpdateStages} />
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <ClientContractCell
                        client={client}
                        ticket={ticket}
                        contractTemplates={contractTemplates}
                        onAssignContract={onAssignContract}
                        assigningId={assigningId}
                        setAssigningId={setAssigningId}
                        assignTemplateId={assignTemplateId}
                        setAssignTemplateId={setAssignTemplateId}
                        onAssign={() => handleAssignContract(client.id)}
                        onEditTicket={(c, t) => setEditingTicket({ client: c, ticket: t })}
                        onViewTicket={(c, t) => {
                          const template = getTemplate?.(t.templateId) ?? null;
                          setViewingTicket(buildAdminViewTicket(t, template));
                        }}
                      />
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(client.createdAt).toLocaleDateString("he-IL")}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => onDeleteClient(client.id)}
                        className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-gray-800 transition-colors"
                        title="מחק לקוח"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {editingTicket ? (
        <AdminSentContractEditor
          clientName={editingTicket.client.name}
          ticket={editingTicket.ticket}
          template={getTemplate?.(editingTicket.ticket.templateId) ?? null}
          onClose={() => setEditingTicket(null)}
          onSaved={(savedTicket) => {
            onTicketAdminSaved?.(savedTicket);
          }}
        />
      ) : null}

      {viewingTicket ? (
        <div className="contract-admin-view-overlay" dir="rtl">
          <div className="contract-admin-view-panel">
            <ClientContract
              ticket={viewingTicket}
              clientName={
                clients.find((c) => c.id === viewingTicket.clientId)?.name ?? ""
              }
              eventDate={clients.find((c) => c.id === viewingTicket.clientId)?.eventDate ?? ""}
              eventLocation={
                clients.find((c) => c.id === viewingTicket.clientId)?.eventLocation ?? ""
              }
              onBack={() => setViewingTicket(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
