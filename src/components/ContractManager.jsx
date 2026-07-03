import React, { useState } from "react";
import ContractTemplateEditor, { ContractTemplateUploader } from "./ContractTemplateEditor";
import { buildContractShareUrl } from "../lib/contractTokens";
import {
  fetchContracts,
  downloadSignedContractCopy,
  deleteSignedContractCopy,
} from "../lib/api/contractApi";
import AdminClientTicketPanel from "./AdminClientTicketPanel";
import ClientContract from "./ClientContract";
import { pickCanonicalTicketForClient } from "../lib/contractTickets";
import { useI18n } from "../lib/i18n/AppSettingsContext";
import { confirmDeleteAction } from "../lib/confirmDelete";

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

export default function ContractManager({
  contracts,
  onReload,
  onUpdateTemplate,
  onDeleteTemplate,
  tickets,
  clients,
  getTemplate,
  onTicketAdminSaved,
}) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(contracts[0]?.id ?? null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const selected = contracts.find((t) => t.id === selectedId) ?? contracts[0] ?? null;

  const getClientName = (clientId) =>
    clients.find((c) => c.id === clientId)?.name ?? clientId;

  const pendingTickets = tickets.filter((t) => t.status === "pending");
  const signedTickets = tickets.filter((t) => t.status === "signed");

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <section className="bg-gray-900 rounded-xl p-6 shadow-xl border border-gray-800">
        <ContractTemplateUploader
          onUploaded={async (template) => {
            await onReload?.();
            setSelectedId(template.id);
          }}
        />
      </section>

      {contracts.length > 0 ? (
        <div className="contract-manager-layout">
          <aside className="contract-template-list">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">תבניות</h3>
            {contracts.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`contract-template-item${selected?.id === tpl.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(tpl.id)}
              >
                <span className="font-bold text-gray-200">{tpl.name}</span>
                <span className="text-xs text-gray-500">{(tpl.fields ?? []).length} שדות</span>
              </button>
            ))}
          </aside>

          <section className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-xl border border-gray-800 flex-1 min-w-0">
            <ContractTemplateEditor
              template={selected}
              onUpdate={onUpdateTemplate}
              onDelete={async (id) => {
                await onDeleteTemplate(id);
                setSelectedId(contracts.find((t) => t.id !== id)?.id ?? null);
              }}
            />
          </section>
        </div>
      ) : null}

      <section className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold text-gray-100">סטטוס חוזים ללקוחות</h3>
        </div>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
              <th className="p-4">לקוח</th>
              <th className="p-4">תבנית</th>
              <th className="p-4">סטטוס</th>
              <th className="p-4">נשלח</th>
              <th className="p-4">נחתם</th>
              <th className="p-4">קישור / עותק</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500 text-sm">
                  אין חוזים. צרו לקוח חדש ובחרו תבנית חוזה.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => {
                const tpl = contracts.find((t) => t.id === ticket.templateId);
                return (
                  <tr key={ticket.id} className="hover:bg-gray-800/30">
                    <td className="p-4 font-bold text-gray-200">{getClientName(ticket.clientId)}</td>
                    <td className="p-4 text-gray-400">{tpl?.name ?? "—"}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs rounded px-2 py-1 ${
                          ticket.status === "signed"
                            ? "bg-green-950/50 text-green-400 border border-green-800"
                            : "bg-amber-950/50 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {ticket.status === "signed" ? "נחתם" : "ממתין לחתימה"}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(ticket.sentAt).toLocaleDateString("he-IL")}
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {ticket.signedAt
                        ? new Date(ticket.signedAt).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {ticket.signToken ? (
                          <button
                            type="button"
                            className="text-xs text-purple-400 hover:text-purple-300 text-right"
                            onClick={async () => {
                              try {
                                const data = await fetchContracts();
                                const fresh = pickCanonicalTicketForClient(
                                  data.tickets ?? [],
                                  ticket.clientId
                                );
                                const token = fresh?.signToken ?? ticket.signToken;
                                await navigator.clipboard?.writeText(buildContractShareUrl(token));
                              } catch {
                                await navigator.clipboard?.writeText(
                                  buildContractShareUrl(ticket.signToken)
                                );
                              }
                            }}
                          >
                            העתק קישור
                          </button>
                        ) : null}
                        {ticket.status === "signed" ? (
                          <>
                            <button
                              type="button"
                              className="text-xs text-cyan-400 hover:text-cyan-300 text-right"
                              onClick={() => {
                                const tpl = getTemplate?.(ticket.templateId) ?? contracts.find((t) => t.id === ticket.templateId);
                                setViewingTicket(buildAdminViewTicket(ticket, tpl));
                              }}
                            >
                              צפה בחוזה חתום
                            </button>
                            <button
                              type="button"
                              className="text-xs text-cyan-400 hover:text-cyan-300 text-right"
                              onClick={() => downloadSignedContractCopy(ticket.id, "pdf").catch(() => {})}
                            >
                              הורד עותק
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-400 hover:text-red-300 text-right"
                              onClick={async () => {
                                const name = getClientName(ticket.clientId);
                                if (!(await confirmDeleteAction(t("admin.deleteSignedCopyConfirm", { name })))) return;
                                try {
                                  const data = await deleteSignedContractCopy(ticket.id);
                                  onTicketAdminSaved?.(data.ticket ?? { ...ticket, signedCopyFile: null });
                                } catch (err) {
                                  window.alert(err?.message || t("admin.deleteFailed"));
                                }
                              }}
                            >
                              {t("admin.deleteSignedCopyAction")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="text-xs text-amber-400 hover:text-amber-300 text-right"
                              onClick={() => setEditingTicket(ticket)}
                            >
                              כרטיס לקוח / חוזה
                            </button>
                            <span className="text-xs text-gray-600">—</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {(pendingTickets.length > 0 || signedTickets.length > 0) && (
          <p className="text-xs text-gray-500 p-4 border-t border-gray-800">
            {pendingTickets.length} ממתינים · {signedTickets.length} נחתמו
          </p>
        )}
      </section>

      {editingTicket ? (
        <AdminClientTicketPanel
          client={clients.find((c) => c.id === editingTicket.clientId) ?? null}
          ticket={editingTicket}
          template={getTemplate?.(editingTicket.templateId) ?? null}
          onClose={() => setEditingTicket(null)}
          onSaved={onTicketAdminSaved}
        />
      ) : null}

      {viewingTicket ? (
        <div className="contract-admin-view-overlay" dir="rtl">
          <div className="contract-admin-view-panel">
            <ClientContract
              ticket={viewingTicket}
              clientName={getClientName(viewingTicket.clientId)}
              onBack={() => setViewingTicket(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
