import React from 'react';

interface LargeLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function LargeLogo({ size = 120, className = '', showText = true }: LargeLogoProps) {
  return (
    <div className={`large-logo ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle cx="60" cy="60" r="60" fill="url(#gradient)"/>
        
        {/* Chart bars */}
        <rect x="26" y="75" width="8" height="22" fill="white" rx="4"/>
        <rect x="41" y="60" width="8" height="37" fill="white" rx="4"/>
        <rect x="56" y="45" width="8" height="52" fill="white" rx="4"/>
        <rect x="71" y="30" width="8" height="67" fill="white" rx="4"/>
        <rect x="86" y="52" width="8" height="45" fill="white" rx="4"/>
        
        {/* Image icon */}
        <rect x="19" y="15" width="30" height="22" fill="white" rx="4"/>
        <circle cx="26" cy="22" r="4" fill="#667eea"/>
        <path d="M19 30L26 22L33 30L40 22L49 30" stroke="#667eea" stroke-width="2" fill="none"/>
        
        {/* Arrow indicating transformation */}
        <path d="M56 26L71 26" stroke="#667eea" stroke-width="3" stroke-linecap="round"/>
        <path d="M64 18L71 26L64 34" stroke="#667eea" stroke-width="3" stroke-linecap="round" fill="none"/>
        
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#667eea', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#764ba2', stopOpacity:1}} />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ 
            fontSize: `${size * 0.4}px`, 
            fontWeight: '700', 
            margin: 0, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Image2Graph
          </h1>
          <p style={{ 
            fontSize: `${size * 0.15}px`, 
            color: '#6b7280', 
            margin: 0,
            fontWeight: '500'
          }}>
            이미지에서 데이터까지, 차트를 더 빠르게
          </p>
        </div>
      )}
    </div>
  );
}
