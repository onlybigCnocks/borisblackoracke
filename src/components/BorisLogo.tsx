const BorisLogo = ({ size = 40, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={className}>
    <line x1="50" y1="5" x2="50" y2="95" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M10 50 C10 30, 30 15, 50 15 C70 15, 90 30, 90 50 C90 70, 70 85, 50 85 C30 85, 10 70, 10 50Z" stroke="#dc2626" strokeWidth="3.5" fill="none"/>
    <circle cx="50" cy="50" r="14" stroke="#dc2626" strokeWidth="3" fill="none"/>
    <circle cx="50" cy="50" r="4" fill="#dc2626"/>
  </svg>
);

export default BorisLogo;
