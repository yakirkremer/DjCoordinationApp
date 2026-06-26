import React, { useState } from "react";
import { CLIENT_TYPES } from "../lib/clientTypes";

export default function ClientManager({ clients, onCreateClient, onDeleteClient }) {
  const [name, setName] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [clientType, setClientType] = useState(CLIENT_TYPES[0].id);
  const [error, setError] = useState("");

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("יש להזין שם לקוח");
      return;
    }

    const client = onCreateClient(name, loginCode, clientType);
    if (!client) {
      setError("קוד כניסה כבר קיים. בחרו קוד אחר.");
      return;
    }

    setName("");
    setLoginCode("");
    setClientType(CLIENT_TYPES[0].id);
    setError("");
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
  };

  const getTypeLabel = (typeId) =>
    CLIENT_TYPES.find((t) => t.id === typeId)?.label ?? typeId;

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
              placeholder="שם הזוג / האירוע"
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
        </form>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <p className="text-xs text-gray-500 mt-3">
          בחרו סוג לקוח — הטופס יציג שאלות רלוונטיות לסוג שנבחר.
        </p>
      </section>

      <section className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
              <th className="p-4">שם</th>
              <th className="p-4">סוג</th>
              <th className="p-4">קוד כניסה</th>
              <th className="p-4">נוצר</th>
              <th className="p-4 w-24 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500 text-sm">
                  עדיין אין לקוחות. צרו את הלקוח הראשון למעלה.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-4 font-bold text-gray-200">{client.name}</td>
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
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
