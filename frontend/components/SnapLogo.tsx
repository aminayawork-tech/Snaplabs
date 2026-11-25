export default function SnapLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} className={className} aria-hidden="true">
      <rect width="256" height="256" rx="60" fill="#275fe8" />
      <g fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
        <path d="M96 222 C76 196 70 166 80 140" />
        <path d="M80 140 L66 70 C63 54 86 48 91 64 L108 118" />
        <path d="M108 118 C104 84 132 66 158 74 C186 82 190 116 166 130 C146 142 118 146 116 170 C114 196 150 206 174 188 C186 178 190 166 186 156" />
        <path d="M174 34 L180 54" />
        <path d="M212 60 L196 72" />
        <path d="M222 104 L202 104" />
      </g>
    </svg>
  );
}
