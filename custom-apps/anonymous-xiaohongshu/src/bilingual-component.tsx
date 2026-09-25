// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.
"use client";

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { normalizeBilingualTextInput, splitBilingualText } from "./bilingual-text";


export type CheckPhoneBilingualTone =
  | "default"
  | "light"
  | "ios"
  | "chat"
  | "messages"
  | "browser"
  | "photos"
  | "notes"
  | "shopping"
  | "assets"
  | "phone"
  | "telegram"
  | "x"
  | "reddit"
  | "youtube"
  | "bilibili"
  | "instagram"
  | "douyin"
  | "weibo"
  | "xiaohongshu"
  | "douban"
  | "steam"
  | "reading"
  | "music"
  | "email"
  | "takeout";

type CheckPhoneBilingualTextProps = {
  text: string;
  className?: string;
  tone?: CheckPhoneBilingualTone;
  variant?: "block" | "inline";
  collapseBilingualTranslation?: boolean;
};

export function normalizeCheckPhoneText(value: string): string {
  return normalizeBilingualTextInput(value);
}

export function CheckPhoneBilingualText({
  text,
  className = "",
  tone = "default",
  variant = "block",
  collapseBilingualTranslation: collapseBilingualTranslationOverride,
}: CheckPhoneBilingualTextProps) {
  const normalized = normalizeCheckPhoneText(text);
  const bilingual = splitBilingualText(normalized);
  const [settingsCollapseBilingualTranslation, setSettingsCollapseBilingualTranslation] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const collapseBilingualTranslation = collapseBilingualTranslationOverride ?? settingsCollapseBilingualTranslation;



  useEffect(() => {
    setExpanded(!collapseBilingualTranslation);
  }, [normalized, collapseBilingualTranslation]);

  if (!bilingual) {
    return <span className={className}>{normalized}</span>;
  }

  function toggle(event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) {
    event.stopPropagation();
    setExpanded((current) => !current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle(event);
  }

  return (
    <span className={`cp-bilingual cp-bilingual--${tone} cp-bilingual--${variant} ${className}`.trim()}>
      <span className="cp-bilingual-original">{bilingual.original}</span>
      <span
        className="cp-bilingual-toggle"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-expanded={expanded}
      >
        {expanded ? "收起中文" : "中文"}
      </span>
      {expanded && variant === "inline" ? (
        <>
          <span className="cp-bilingual-inline-separator" aria-hidden="true"> </span>
          <span className="cp-bilingual-translation">{bilingual.translated}</span>
        </>
      ) : null}
      {expanded && variant === "block" ? (
        <>
          <span className="cp-bilingual-divider" aria-hidden="true" />
          <span className="cp-bilingual-translation">{bilingual.translated}</span>
        </>
      ) : null}
    </span>
  );
}
