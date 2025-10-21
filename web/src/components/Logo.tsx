import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="16" cy="16" r="16" fill="url(#gradient)"/>
      
      {/* Chart bars */}
      <rect x="7" y="20" width="2" height="6" fill="white" rx="1"/>
      <rect x="11" y="16" width="2" height="10" fill="white" rx="1"/>
      <rect x="15" y="12" width="2" height="14" fill="white" rx="1"/>
      <rect x="19" y="8" width="2" height="18" fill="white" rx="1"/>
      <rect x="23" y="14" width="2" height="12" fill="white" rx="1"/>
      
      {/* Image icon */}
      <rect x="5" y="4" width="8" height="6" fill="white" rx="1"/>
      <circle cx="7" cy="6" r="1" fill="#667eea"/>
      <path d="M5 8L7 6L9 8L11 6L13 8" stroke="#667eea" stroke-width="0.5" fill="none"/>
      
      {/* Arrow indicating transformation */}
      <path d="M15 7L19 7" stroke="#667eea" stroke-width="1" stroke-linecap="round"/>
      <path d="M17 5L19 7L17 9" stroke="#667eea" stroke-width="1" stroke-linecap="round" fill="none"/>
      
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#667eea', stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#764ba2', stopOpacity:1}} />
        </linearGradient>
      </defs>
    </svg>
  );
}
