/**
 * AnimalAvatar — displays user avatar (new SVG or legacy emoji)
 * Handles both new avatar IDs ("fox", "bear") and legacy emoji ("🦊").
 */
import { getAvatarById, isAvatarId } from "@/lib/avatars";

interface AnimalAvatarProps {
  /** Avatar identifier — new ID ("fox") or legacy emoji ("🦊") */
  icon: string | null | undefined;
  /** Fallback: user's first letter */
  username: string;
  /** User color for letter/emoji fallback */
  color?: string;
  /** Size in px (default 48) */
  size?: number;
  /** Extra className */
  className?: string;
}

function hexToRgba(hex: string | undefined, alpha = 1): string {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return `rgba(128,128,128,${alpha})`;
  let c = hex.substring(1).split("");
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  const n = parseInt(c.join(""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function AnimalAvatar({ icon, username, color, size = 48, className = "" }: AnimalAvatarProps) {
  const avatarDef = isAvatarId(icon) ? getAvatarById(icon!) : undefined;

  // New-style: SVG image avatar
  if (avatarDef) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: avatarDef.fallbackColor,
        }}
      >
        <img
          src={avatarDef.src}
          alt={avatarDef.label}
          width={size}
          height={size}
          loading="lazy"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  // Legacy: emoji avatar
  if (icon) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          backgroundColor: hexToRgba(color, 0.08),
        }}
      >
        {icon}
      </div>
    );
  }

  // Fallback: generic user silhouette (no text initials)
  return (
    <div
      className={className}
      title={username}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: hexToRgba(color, 0.12),
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill={color || "#94a3b8"}
        width={size * 0.55}
        height={size * 0.55}
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21v-1a6 6 0 0 0-6-6H10a6 6 0 0 0-6 6v1" />
      </svg>
    </div>
  );
}
