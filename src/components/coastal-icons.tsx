import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function TideMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8c3-2.5 5.5 2.5 9 0s6 2.5 9 0" />
      <path d="M3 12c3-2.5 5.5 2.5 9 0s6 2.5 9 0" />
      <path d="M5 16c2.3-1.7 4.3 1.7 7 0s4.8 1.7 7 0" />
    </svg>
  );
}

export function MangroveMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21v-9" />
      <path d="M12 13c-3-1-5-3.5-5-6 3 0 5 1.5 5 4" />
      <path d="M12 12c2.8-1 4.8-3.2 5-6-3 .1-5 1.7-5 4.5" />
      <path d="M12 16 7 21M12 16l5 5M12 18l-2 3M12 18l2 3" />
    </svg>
  );
}

export function EvidenceMark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 3.5h11l3 3V20H5z" />
      <path d="M16 3.5V7h3M8 11h8M8 15h5" />
      <path d="M3 7v13h11" />
    </svg>
  );
}

export function DropletCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.8S6.5 9.2 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.2 12 2.8 12 2.8Z" />
      <path d="m9.5 14 1.7 1.7 3.6-4" />
    </svg>
  );
}

export function AlertRipple(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v7M12 16.5v.1" />
      <path d="M7.2 18.2a7 7 0 1 1 9.6 0M4.6 20.5a10.2 10.2 0 1 1 14.8 0" />
    </svg>
  );
}