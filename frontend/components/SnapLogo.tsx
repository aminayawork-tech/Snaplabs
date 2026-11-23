export default function SnapLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#275fe8"/>
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M22.5 34 L23 10.5" stroke="#275fe8" strokeWidth="10.5"/>
        <path d="M22.5 34 L23 10.5" stroke="#fff" strokeWidth="7.5"/>
        <path d="M28.5 35 L31 20.5 L42.5 21" stroke="#275fe8" strokeWidth="10.5"/>
        <path d="M28.5 35 L31 20.5 L42.5 21" stroke="#fff" strokeWidth="7.5"/>
      </g>
      <rect x="13" y="31" width="23" height="25" rx="9" fill="#fff" stroke="#275fe8" strokeWidth="1.6" transform="rotate(-10 24.5 43.5)"/>
      <path d="M17 41.5 h9 M17.5 48 h8.5" stroke="#275fe8" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M33.5 45 L40.5 28.5" stroke="#275fe8" strokeWidth="10.5" strokeLinecap="round"/>
      <path d="M33.5 45 L40.5 28.5" stroke="#fff" strokeWidth="7.5" strokeLinecap="round"/>
      <g stroke="#fde047" strokeWidth="3.2" strokeLinecap="round">
        <path d="M47.5 14.5 l3-4.5"/><path d="M51 21 l5.5-1"/><path d="M49.5 27.5 l4.5 3"/>
      </g>
    </svg>
  );
}
