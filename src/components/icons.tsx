import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
      {...props}
    >
      {children}
    </svg>
  );
}

const strokeProps = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

export function TodayIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 13.2 9.1 17 19 7" {...strokeProps} /></IconBase>;
}

export function ClientsIcon(props: IconProps) {
  return <IconBase {...props}><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20M9.5 11.6a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM17 11.6a3.4 3.4 0 0 0 0-6.6M21 20v-1.6a3.4 3.4 0 0 0-2.5-3.3" {...strokeProps} /></IconBase>;
}

export function SparklesIcon(props: IconProps) {
  return <IconBase {...props}><path d="m12 3 .8 3.2A6 6 0 0 0 17 10.4l3.2.8-3.2.8a6 6 0 0 0-4.2 4.2L12 19.4l-.8-3.2A6 6 0 0 0 7 12l-3.2-.8 3.2-.8a6 6 0 0 0 4.2-4.2L12 3Z" {...strokeProps} /></IconBase>;
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="10.8" cy="10.8" r="6.3" {...strokeProps} /><path d="m16 16 4.2 4.2" {...strokeProps} /></IconBase>;
}

export function MoreIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></IconBase>;
}

export function CalendarIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" {...strokeProps} /><path d="M8 3v5M16 3v5M3.5 10h17" {...strokeProps} /></IconBase>;
}

export function SyncIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 7v5h-5M4 17v-5h5M18.4 10A7 7 0 0 0 6.2 6.2L4 8M5.6 14A7 7 0 0 0 17.8 17.8L20 16" {...strokeProps} /></IconBase>;
}

export function FileIcon(props: IconProps) {
  return <IconBase {...props}><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" {...strokeProps} /><path d="M14 3.5v5h4M8 13h7M8 17h5" {...strokeProps} /></IconBase>;
}

export function RegulationsIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 5h16M4 9h16M4 13h10M4 17h13" {...strokeProps} /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3.2" {...strokeProps} /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" {...strokeProps} /></IconBase>;
}

export function AppearanceIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="4" {...strokeProps} /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...strokeProps} /></IconBase>;
}

export function ChevronRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 5 7 7-7 7" {...strokeProps} /></IconBase>;
}

export function ArrowUpIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 10 6-6 6 6M12 4v16" {...strokeProps} /></IconBase>;
}

export function CloseIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" {...strokeProps} /></IconBase>;
}

export function CheckCircleIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" {...strokeProps} /><path d="m8 12 2.6 2.6L16.5 9" {...strokeProps} /></IconBase>;
}

export function StopIcon(props: IconProps) {
  return <IconBase {...props}><rect height="10" rx="2" width="10" x="7" y="7" {...strokeProps} /></IconBase>;
}

export function EditIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 20h9" {...strokeProps} /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" {...strokeProps} /></IconBase>;
}
