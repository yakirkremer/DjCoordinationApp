import React, { useState } from "react";
import ContractTemplateEditor, { ContractTemplateUploader } from "./ContractTemplateEditor";

export default function ContractManager({
  contracts,
  onReload,
  onUpdateTemplate,
  onDeleteTemplate,
  tickets,
  clients,
}) {
  const [selectedId, setSelectedId] = useState(contracts[0]?.id ?? null);
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
              onDelete={(id) => {
                onDeleteTemplate(id);
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500 text-sm">
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
    </div>
  );
}
