import React from "react";
import { useAppSettingsContext } from "../lib/i18n/AppSettingsContext";

/**
 * Renders translated copy. In site text edit mode (admin), click to edit the string inline.
 */
export default function EditableText({
  k,
  vars,
  as: Tag = "span",
  className = "",
  editClassName = "",
  ...rest
}) {
  const { t, siteTextEditMode, openSiteTextEditor } = useAppSettingsContext();
  const text = t(k, vars);

  if (!siteTextEditMode) {
    return (
      <Tag className={className} {...rest}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      role="button"
      tabIndex={0}
      className={`site-text-editable ${editClassName} ${className}`.trim()}
      data-i18n-key={k}
      title={k}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openSiteTextEditor(k);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          openSiteTextEditor(k);
        }
      }}
      {...rest}
    >
      {text}
    </Tag>
  );
}
