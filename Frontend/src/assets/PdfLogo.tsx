import React from 'react';

interface LogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const PdfLogo: React.FC<LogoProps> = ({ width = 24, height = 24, className = "" }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Green Rounded Background */}
      <rect width="24" height="24" rx="6" fill="#10a37f"/>
      
      {/* White Document Icon Path */}
      <path 
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" 
        fill="white" 
      />
      <path 
        d="M14 2V8H20" 
        stroke="#10a37f" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <line x1="16" y1="13" x2="8" y2="13" stroke="#10a37f" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="#10a37f" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
};

export default PdfLogo;