import React from "react";

const TABS = [
  { id: "catalog", label: "CATALOG" },
  { id: "clients", label: "CLIENTS" },
  { id: "form", label: "FORM" },
  { id: "analytics", label: "INSIGHTS" },
];

export default function AdminTabNav({ activeTab, onTabChange }) {
  return (
    <div className="flex gap-2 mb-6 border-b border-xdj-border pb-2 flex-wrap" dir="rtl">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`chip-xdj ${activeTab === tab.id ? "is-active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
