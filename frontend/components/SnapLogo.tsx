// Hand icon: "Finger Snapping" from Streamline Flex (streamlinehq.com), CC BY 4.0, recolored.
export default function SnapLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} className={className} aria-hidden="true">
      <rect width="256" height="256" rx="60" fill="#275fe8" />
      <g transform="translate(38 36) scale(12.857)">
        <path fill="#fff" fillRule="evenodd" d="M3.722 1.684a.625.625 0 1 0 1.245-.112L4.904.864a.625.625 0 1 0-1.245.112zm3.678.73a.625.625 0 0 0-.941-.823l-.467.535a.625.625 0 0 0 .94.823zm-6.008-.113a.625.625 0 0 0 .25.848l.623.34a.625.625 0 1 0 .599-1.098l-.624-.34a.625.625 0 0 0-.848.25m1.24 4.963l2.898.776c-.857 3.66.784 5.06 2.474 5.513c.628.169 1.678.212 2.524.054c.547-.103.91-.571 1.054-1.11l1.034-3.858a2 2 0 0 0-.048-1.19l-.88-2.467a1.373 1.373 0 0 0-2.663.538l.05.882l-5.796-1.553a1.25 1.25 0 0 0-.647 2.415" />
      </g>
    </svg>
  );
}
