import React, { useState } from 'react';
import ChartView from './ChartView';

type Props = {
  spec: any | null;
  originalImageSize?: { width: number; height: number } | null;
  preferredPalette?: string[];
  overlays: any[];
  setOverlays: (updater: (prev: any[]) => any[]) => void;
  textMode: boolean;
  setTextMode: (b: boolean) => void;
  setSelectedIdx: (n: number) => void;
  onAddTextAt: (x: number, y: number) => void;
};

type DragState = { idx:number; offsetX:number; offsetY:number; mode:'move'|'resize' };

export default function ChartOverlay({ spec, originalImageSize, preferredPalette, overlays, setOverlays, textMode, setTextMode, setSelectedIdx, onAddTextAt }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);

  return (
    <div
      className="vl-container chart-with-overlay"
      style={{ position:'relative', width: '100%', height: '100%', minWidth: '800px', minHeight: '600px' }}
      onDoubleClick={(e)=>{
        if (!textMode) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        onAddTextAt(x, y);
        setTextMode(false);
      }}
    >
      <div style={{ position:'absolute', left: 40, top: 40, right: 40, bottom: 40, pointerEvents:'none' }} />
      <div style={{ position:'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: textMode ? 'none' : 'auto' }}>
          <ChartView
            key={`chart-${(spec?.data?.values && Array.isArray(spec.data.values) ? spec.data.values.length : 0)}-${JSON.stringify(spec?.encoding?.color?.scale?.range)}`}
            spec={spec}
            aspect={originalImageSize ? originalImageSize.width / originalImageSize.height : undefined}
            palette={preferredPalette}
          />
        </div>
      </div>
      <svg
        className="overlay-svg"
        style={{ width: '100%', height: '100%', position:'absolute', left:0, top:0 }}
        viewBox="0 0 1000 1000"
        onMouseMove={(e)=>{
          if (!drag) return;
          const svgRect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const maxX = 1000; const maxY = 1000;
          const x = Math.max(0, Math.min(maxX, e.clientX - svgRect.left - drag.offsetX));
          const y = Math.max(0, Math.min(maxY, e.clientY - svgRect.top - drag.offsetY));
          setOverlays(prev=> prev.map((o,idx)=> idx===drag.idx ? { ...o, x, y } : o));
        }}
        onMouseUp={()=> setDrag(null)}
        onMouseLeave={()=> setDrag(null)}
      >
        {overlays.filter(o=>o.type==='text').map((o,i)=> (
          <text
            key={i}
            x={o.x||100}
            y={o.y||100}
            fill={o.color||'#111827'}
            fontSize={o.size||18}
            style={{ cursor:'move', userSelect:'none', fontFamily: (o as any).fontFamily || 'system-ui' }}
            onMouseDown={(e)=>{ setSelectedIdx(i); const svgRect=(e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); const curX=(o.x||0); const curY=(o.y||0); setDrag({ idx:i, offsetX: (e.clientX - svgRect.left) - curX, offsetY: (e.clientY - svgRect.top) - curY, mode:'move' }); }}
            onDoubleClick={(e)=>{ e.stopPropagation(); setSelectedIdx(i); }}
          >{o.text||'텍스트'}</text>
        ))}
        {overlays.filter(o=>o.type==='rect').map((o,i)=> (
          <rect
            key={`r${i}`}
            x={o.x||100}
            y={o.y||100}
            width={o.w||120}
            height={o.h||60}
            fill={o.color||'rgba(0,0,0,0.1)'}
            stroke={o.stroke||'#111827'}
            onMouseDown={(e)=>{ setSelectedIdx(i); const svgRect=(e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); const curX=(o.x||0); const curY=(o.y||0); setDrag({ idx:i, offsetX: (e.clientX - svgRect.left) - curX, offsetY: (e.clientY - svgRect.top) - curY, mode:'move' }); }}
          />
        ))}
      </svg>
      {textMode && (
        <div style={{ 
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', color: 'white', padding: '12px 20px', borderRadius: 8,
          fontSize: 14, pointerEvents: 'none', zIndex: 10
        }}>
          캔버스 어디든 더블클릭하여 텍스트 추가 (차트 위에서도 가능)
        </div>
      )}
    </div>
  );
}

