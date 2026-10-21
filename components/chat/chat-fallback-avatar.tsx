"use client";

// Legacy path kept for source compatibility; no chat fallback renders this image.
export const CHAT_FALLBACK_AVATAR_SRC = "/images/default-moment-avatar.png";

/** Same neutral-to-slate gradient and serif initial as iMessage's .im-avatar. */
export function ChatFallbackAvatar({ name, alt = "", className = "", size = "regular" }: {
    name?: string;
    alt?: string;
    className?: string;
    size?: "regular" | "small" | "mini";
}) {
    const initial = Array.from(name?.trim() || "?")[0] || "?";
    const fontSize = size === "mini" ? 13 : size === "small" ? 20 : 26;
    return (
        <span
            role="img"
            aria-label={alt || `${name?.trim() || "角色"} 默认头像`}
            className={`chat-initial-avatar flex w-full h-full items-center justify-center overflow-hidden rounded-full select-none ${className}`.trim()}
            style={{
                background: "linear-gradient(180deg, #b7c9c9 0%, #35444b 100%)",
                color: "#fff",
                fontFamily: "Georgia, serif",
                fontSize,
                fontWeight: 400,
                lineHeight: 1,
                textTransform: "none",
            }}
        >
            {initial}
        </span>
    );
}
