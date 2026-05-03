import React from "react";

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" rx="7" fill="#6366f1" fillOpacity="0.9" />
      <circle cx="13" cy="13" r="3.2" fill="white" />
      <circle cx="6" cy="7" r="1.8" fill="white" fillOpacity="0.65" />
      <circle cx="20" cy="7" r="1.8" fill="white" fillOpacity="0.65" />
      <circle cx="6" cy="19" r="1.5" fill="white" fillOpacity="0.35" />
      <circle cx="20" cy="19" r="1.5" fill="white" fillOpacity="0.35" />
      <line
        x1="7.3"
        y1="8.3"
        x2="11.1"
        y2="11.1"
        stroke="white"
        strokeWidth="1"
        strokeOpacity="0.45"
      />
      <line
        x1="18.7"
        y1="8.3"
        x2="14.9"
        y2="11.1"
        stroke="white"
        strokeWidth="1"
        strokeOpacity="0.45"
      />
      <line
        x1="7.3"
        y1="17.7"
        x2="11.1"
        y2="14.9"
        stroke="white"
        strokeWidth="0.9"
        strokeOpacity="0.25"
      />
      <line
        x1="18.7"
        y1="17.7"
        x2="14.9"
        y2="14.9"
        stroke="white"
        strokeWidth="0.9"
        strokeOpacity="0.25"
      />
    </svg>
  );
}
