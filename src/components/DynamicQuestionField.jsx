import React from "react";
import { getFieldValue } from "../lib/formAnswers";

export default function DynamicQuestionField({ question, preferences, onChange }) {
  const value = getFieldValue(preferences, question);
  const labelClass = "block font-lcd text-[10px] tracking-widest text-xdj-cyan uppercase mb-2";

  if (question.type === "textarea") {
    return (
      <div>
        <label className={labelClass}>
          {question.label}
          {question.required && " *"}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
          className="input-luxury w-full px-4 py-3 text-xdj-text rounded-sm resize-none placeholder:text-xdj-muted/50"
        />
      </div>
    );
  }

  if (question.type === "date") {
    return (
      <div>
        <label className={labelClass}>
          {question.label}
          {question.required && " *"}
        </label>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-luxury w-full px-4 py-3 text-xdj-text rounded-sm"
        />
      </div>
    );
  }

  if (question.type === "select") {
    return (
      <div>
        <label className={labelClass}>
          {question.label}
          {question.required && " *"}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-luxury w-full px-4 py-3 text-xdj-text rounded-sm"
        >
          <option value="">בחרו...</option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className={labelClass}>
        {question.label}
        {question.required && " *"}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        className="input-luxury w-full px-4 py-3 text-xdj-text rounded-sm placeholder:text-xdj-muted/50"
      />
    </div>
  );
}
