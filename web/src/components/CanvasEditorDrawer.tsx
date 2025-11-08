import React, { useRef, useState } from 'react';

type Overlay = any;
type Size = { w: number; h: number };
type DragState = { idx:number; offsetX:number; offsetY:number; mode:'move'|'resize'; handle?:'nw'|'ne'|'se'|'sw' };

type Props = {
  overlays: Overlay[];
  setOverlays: (updater: (prev: Overlay[]) => Overlay[]) => void;
  selectedIdx: number | null;
  setSelectedIdx: (n: number | null) => void;
  selectedSet: Set<number>;
  setSelectedSet: (s: Set<number>) => void;
  overlaySize: Size;
  setOverlaySize: (s: Size) => void;
  snapEnabled: boolean;
  setSnapEnabled: (b: boolean) => void;
  gridSize: number;
  setGridSize: (n: number) => void;
  undo: () => void;
  redo: () => void;
  exportCanvasPNG: () => void;
  onClose: () => void;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
};

export default function CanvasEditorDrawer({ overlays, setOverlays, selectedIdx, setSelectedIdx, selectedSet, setSelectedSet, overlaySize, setOverlaySize, snapEnabled, setSnapEnabled, gridSize, setGridSize, undo, redo, exportCanvasPNG, onClose, svgRef }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag) return;
    const rect = (svgRef.current as any)?.getBoundingClientRect?.();
    const pageX = e.clientX - (rect?.left || 0);
    const pageY = e.clientY - (rect?.top || 0);
    const snap = (v:number) => snapEnabled ? Math.round(v / gridSize) * gridSize : v;
    setOverlays(prev => prev.map((o:any, i:number) => {
      if (i !== drag.idx) return o;
      if (drag.mode === 'move') {
        const nx = snap(Math.max(0, pageX - drag.offsetX));
        const ny = snap(Math.max(0, pageY - drag.offsetY));
        if (o.type === 'text') return { ...o, x: nx, y: ny };
        if (o.type === 'rect') return { ...o, x: nx, y: ny };
      }
      if (drag.mode === 'resize') {
        if (o.type === 'rect') {
          const dx = pageX - (o.x + (drag.handle === 'ne' || drag.handle === 'se' ? o.w : 0));
          const dy = pageY - (o.y + (drag.handle === 'sw' || drag.handle === 'se' ? o.h : 0));
          let nx = o.x, ny = o.y, nw = o.w, nh = o.h;
          if (drag.handle === 'nw') { nx = snap(o.x + dx); ny = snap(o.y + dy); nw = snap(o.w - dx); nh = snap(o.h - dy); }
          if (drag.handle === 'ne') { ny = snap(o.y + dy); nw = snap(o.w + dx); nh = snap(o.h - dy); }
          if (drag.handle === 'sw') { nx = snap(o.x + dx); nw = snap(o.w - dx); nh = snap(o.h + dy); }
          if (drag.handle === 'se') { nw = snap(o.w + dx); nh = snap(o.h + dy); }
          nw = Math.max(4, nw); nh = Math.max(4, nh);
          return { ...o, x: nx, y: ny, w: nw, h: nh };
        }
        if (o.type === 'text' && drag.handle === 'se') {
          const size = Math.max(8, (o.size || 16) + (e.movementY || 0));
          return { ...o, size };
        }
      }
      return o;
    }));
  };

  const onMouseUp = () => setDrag(null);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>Canvas Editor (beta)</div>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="drawer-body">
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <button className="btn" onClick={() => setOverlays(prev => [...prev, { type:'text', x: 60, y: 60, text: 'Text', color:'#e5e7eb', size:16 }])}>+ Text</button>
            <button className="btn" onClick={() => setOverlays(prev => [...prev, { type:'rect', x: 40, y: 40, w:120, h:60, color:'rgba(99,102,241,0.2)', stroke:'#6366f1' }])}>+ Rect</button>
            {selectedIdx !== null && (
              <button className="btn" onClick={() => { setOverlays(prev => { const arr=[...prev]; arr.splice(selectedIdx,1); return arr; }); setSelectedIdx(null); }}>Delete</button>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:12 }}>
            <svg
              ref={el => (svgRef.current = el)}
              width="100%" height="320"
              style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8 }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {overlays.filter(o=>o.type==='text').map((o:any,i:number)=> (
                <text
                  key={i}
                  x={o.x}
                  y={o.y}
                  fontSize={o.size||16}
                  fill={o.color || '#111827'}
                  onMouseDown={(e)=>{
                    if ((e as any).shiftKey) {
                      setSelectedSet(prev=> { const next=new Set(prev); next.has(i)? next.delete(i): next.add(i); return next; });
                    } else {
                      setSelectedSet(new Set([i]));
                    }
                    setSelectedIdx(i);
                    setDrag({ idx:i, offsetX: (e.clientX - (e.currentTarget as any).getBoundingClientRect().left), offsetY: (e.clientY - (e.currentTarget as any).getBoundingClientRect().top), mode:'move' });
                  }}
                  style={{ cursor:'move', userSelect:'none', outline: selectedIdx===i? '1px solid #6366f1':'none' }}
                >{o.text}</text>
              ))}
              {overlays.filter(o=>o.type==='rect').map((o:any,i:number)=> (
                <rect
                  key={i}
                  x={o.x}
                  y={o.y}
                  width={o.w}
                  height={o.h}
                  fill={o.color}
                  stroke={o.stroke}
                  rx={o.r||0}
                  opacity={o.opacity==null?1:o.opacity}
                  onMouseDown={(e)=>{
                    if ((e as any).shiftKey) {
                      setSelectedSet(prev=> { const next=new Set(prev); next.has(i)? next.delete(i): next.add(i); return next; });
                    } else {
                      setSelectedSet(new Set([i]));
                    }
                    setSelectedIdx(i);
                    setDrag({ idx:i, offsetX: e.clientX - (e.currentTarget as any).getBoundingClientRect().left, offsetY: e.clientY - (e.currentTarget as any).getBoundingClientRect().top, mode:'move' });
                  }}
                  style={{ cursor:'move', outline: selectedIdx===i? '1px solid #6366f1':'none' }}
                />
              ))}
              {(selectedIdx!==null || selectedSet.size>0) && (()=>{
                const idx = selectedIdx ?? Array.from(selectedSet)[0];
                const o:any = overlays[idx];
                const handleSize = 6;
                if (o?.type==='rect') {
                  return (
                    <g>
                      <rect x={o.x-1} y={o.y-1} width={o.w+2} height={o.h+2} fill="none" stroke="#6366f1" strokeDasharray="4 2" />
                      <rect x={o.x-handleSize} y={o.y-handleSize} width={handleSize} height={handleSize} fill="#6366f1" style={{cursor:'nwse-resize'}} onMouseDown={(e)=> setDrag({ idx:idx, offsetX: e.clientX - (svgRef.current!.getBoundingClientRect().left + o.x), offsetY: e.clientY - (svgRef.current!.getBoundingClientRect().top + o.y), mode:'resize', handle:'nw' })} />
                      <rect x={o.x+o.w} y={o.y-handleSize} width={handleSize} height={handleSize} fill="#6366f1" style={{cursor:'nesw-resize'}} onMouseDown={(e)=> setDrag({ idx:idx, offsetX: e.clientX - (svgRef.current!.getBoundingClientRect().left + o.x+o.w), offsetY: e.clientY - (svgRef.current!.getBoundingClientRect().top + o.y), mode:'resize', handle:'ne' })} />
                      <rect x={o.x-handleSize} y={o.y+o.h} width={handleSize} height={handleSize} fill="#6366f1" style={{cursor:'nesw-resize'}} onMouseDown={(e)=> setDrag({ idx:idx, offsetX: e.clientX - (svgRef.current!.getBoundingClientRect().left + o.x), offsetY: e.clientY - (svgRef.current!.getBoundingClientRect().top + o.y+o.h), mode:'resize', handle:'sw' })} />
                      <rect x={o.x+o.w} y={o.y+o.h} width={handleSize} height={handleSize} fill="#6366f1" style={{cursor:'nwse-resize'}} onMouseDown={(e)=> setDrag({ idx:idx, offsetX: e.clientX - (svgRef.current!.getBoundingClientRect().left + o.x+o.w), offsetY: e.clientY - (svgRef.current!.getBoundingClientRect().top + o.y+o.h), mode:'resize', handle:'se' })} />
                    </g>
                  );
                }
                if (o?.type==='text') {
                  return (
                    <g>
                      <text x={o.x} y={o.y} fontSize={o.size||16} fill="transparent" stroke="#6366f1" strokeDasharray="3 2">{o.text}</text>
                      <rect x={o.x+(o.size||16)} y={o.y-(o.size||16)} width={6} height={6} fill="#6366f1" style={{cursor:'nwse-resize'}} onMouseDown={(e)=> setDrag({ idx:idx, offsetX: 0, offsetY: 0, mode:'resize', handle:'se' })} />
                    </g>
                  );
                }
                return null;
              })()}
            </svg>
            <div>
              <div className="muted" style={{ marginBottom:8 }}>Properties</div>
              {selectedIdx !== null ? (
                <div style={{ display:'grid', gap:6 }}>
                  <label>Type: {(overlays[selectedIdx] as any).type}</label>
                  {(overlays[selectedIdx] as any).type==='text' && (
                    <>
                      <label>Text</label>
                      <input className="btn" value={(overlays[selectedIdx] as any).text} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, text:e.target.value }: o))} />
                      <label>Size</label>
                      <input type="number" className="btn" value={(overlays[selectedIdx] as any).size||16} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, size: Number(e.target.value) }: o))} />
                    </>
                  )}
                  {(overlays[selectedIdx] as any).type==='rect' && (
                    <>
                      <label>Width</label>
                      <input type="number" className="btn" value={(overlays[selectedIdx] as any).w} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, w: Number(e.target.value) }: o))} />
                      <label>Height</label>
                      <input type="number" className="btn" value={(overlays[selectedIdx] as any).h} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, h: Number(e.target.value) }: o))} />
                      <label>Corner radius</label>
                      <input type="number" className="btn" value={(overlays[selectedIdx] as any).r||0} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, r: Number(e.target.value) }: o))} />
                      <label>Opacity</label>
                      <input type="number" className="btn" value={(overlays[selectedIdx] as any).opacity==null?1:(overlays[selectedIdx] as any).opacity} step={0.05} min={0} max={1} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, opacity: Number(e.target.value) }: o))} />
                    </>
                  )}
                  <label>X</label>
                  <input type="number" className="btn" value={(overlays[selectedIdx] as any).x} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, x: Number(e.target.value) }: o))} />
                  <label>Y</label>
                  <input type="number" className="btn" value={(overlays[selectedIdx] as any).y} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, y: Number(e.target.value) }: o))} />
                  <label>Color</label>
                  <input type="color" className="btn" value={(overlays[selectedIdx] as any).color || '#ffffff'} onChange={(e)=>setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, color: e.target.value }: o))} />
                  <label><input type="checkbox" checked={!!(overlays[selectedIdx] as any).locked} onChange={(e)=> setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, locked: e.target.checked }: o))} /> Lock</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                    <button className="btn" onClick={()=> setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, x: 0 }: o))}>Align L</button>
                    <button className="btn" onClick={()=> setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, y: 0 }: o))}>Align T</button>
                    <button className="btn" onClick={()=> setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, x: Math.max(0, (overlaySize.w - ((o as any).w||0))/2) }: o))}>Center X</button>
                    <button className="btn" onClick={()=> setOverlays(prev=> prev.map((o,i)=> i===selectedIdx? { ...o, y: Math.max(0, (overlaySize.h - ((o as any).h||0))/2) }: o))}>Center Y</button>
                    <button className="btn" onClick={()=>{ setOverlays(prev=> { const arr=[...prev]; const it=arr.splice(selectedIdx,1)[0]; arr.push(it); return arr; }); setSelectedIdx(overlays.length-1); }}>Bring Front</button>
                    <button className="btn" onClick={()=>{ setOverlays(prev=> { const arr=[...prev]; const it=arr.splice(selectedIdx,1)[0]; arr.unshift(it); return arr; }); setSelectedIdx(0); }}>Send Back</button>
                  </div>
                </div>
              ) : (
                <div className="muted">Select an item to edit</div>
              )}
              <div style={{ marginTop:12, display:'grid', gap:8 }}>
                <label className="flex items-center gap-2"><input type="checkbox" checked={snapEnabled} onChange={e=> setSnapEnabled((e.target as any).checked)} /> Snap to grid</label>
                <label>Grid size</label>
                <input type="number" className="btn" value={gridSize} onChange={e=> setGridSize(Math.max(2, Number((e.target as any).value)||10))} />
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn" onClick={undo}>Undo (Ctrl+Z)</button>
                  <button className="btn" onClick={redo}>Redo (Ctrl+Shift+Z)</button>
                </div>
                <button className="btn" onClick={exportCanvasPNG}>Export PNG</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

