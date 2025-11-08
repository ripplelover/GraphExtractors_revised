import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useApp } from '../store';

function sanitizeScene(base: any, makeTransparent: boolean) {
  try {
    const elements = Array.isArray(base?.elements) ? base.elements : [];
    const files = base?.files || {};
    const appState: any = { ...(base?.appState || {}) };
    if (appState && appState.collaborators && typeof appState.collaborators.forEach !== 'function') {
      delete appState.collaborators;
    }
    if (makeTransparent) appState.viewBackgroundColor = 'transparent';
    return { elements, appState, files };
  } catch { return { elements: [], appState: makeTransparent ? { viewBackgroundColor: 'transparent' } : {}, files: {} }; }
}

export default function ExcalidrawEditor({ onClose, chartThumbnail }: { onClose: () => void; chartThumbnail?: string | null }) {
  const { currentProjectId, excalidrawByProject, setExcalidrawForProject, setProjectThumb, saveProject, originalImageSrc, originalImageSize, whiteboardBgByProject, setWhiteboardBgForProject } = useApp() as any;
  const rawInitial = useMemo(() => (currentProjectId && excalidrawByProject?.[currentProjectId]) || null, [currentProjectId, excalidrawByProject]);
  const bgPref = useMemo(() => (currentProjectId && whiteboardBgByProject?.[currentProjectId]) || null, [currentProjectId, whiteboardBgByProject]);
  const [scene, setScene] = useState<any | null>(null);
  const saveTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const excalidrawRef = useRef<any>(null);
  const [editorKey, setEditorKey] = useState<number>(0);
  const [bgMode, setBgMode] = useState<'none'|'original'|'chart'>(() => {
    // Prefer persisted preference first
    if (bgPref?.mode) return bgPref.mode as 'none'|'original'|'chart';
    // Fallback heuristics
    if (originalImageSrc) return 'original';
    if (chartThumbnail) return 'chart';
    return 'none';
  });
  // Removed chartBgUrl state entirely - just use chartThumbnail prop directly
  const [showBg, setShowBg] = useState<boolean>(() => {
    // Prefer persisted preference first
    if (typeof bgPref?.show === 'boolean') return bgPref.show;
    // Fallback: show if any background exists
    if (originalImageSrc || chartThumbnail) return true;
    return false;
  });

  // Calculate if background should be visible
  const isBgVisible = useMemo(() => {
    return showBg && (
      (bgMode === 'original' && originalImageSrc) ||
      (bgMode === 'chart' && chartThumbnail)
    );
  }, [showBg, bgMode, originalImageSrc, chartThumbnail]);

  // keep local scene in sync when project switches and ensure transparent bg when showing background image
  useEffect(() => {
    const safe = sanitizeScene(rawInitial, isBgVisible);
    setScene(safe);
    // Also hydrate the live editor if mounted, so reopening restores drawings
    try { excalidrawRef.current?.updateScene?.(safe); } catch {}
  }, [rawInitial, isBgVisible]);


  // If original image disappears while selected, fallback to none; otherwise do not override user's choice
  useEffect(() => {
    if (!originalImageSrc && bgMode === 'original') {
      setBgMode('none');
      setShowBg(false);
    }
  }, [originalImageSrc, bgMode]);

  // Persist background preferences when they change (but ignore on mount to prevent conflicts)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!currentProjectId || !setWhiteboardBgForProject) return;
    const timer = setTimeout(() => {
      try {
        setWhiteboardBgForProject(currentProjectId, {
          mode: bgMode,
          chartBgUrl: chartThumbnail, // Use chartThumbnail prop directly for persistence
          show: showBg
        });
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [currentProjectId, bgMode, showBg, chartThumbnail, setWhiteboardBgForProject]);

  // helper to capture current chart canvas as data URL (not needed anymore since we use chartThumbnail prop)
  const captureChartBackground = useCallback(() => {
    if (chartThumbnail) {
      setShowBg(true);
      return true;
    }
    try {
      // Fallback: Try to find canvas in ChartView
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return false;
      setShowBg(true);
      return true;
    } catch { return false; }
  }, [chartThumbnail]);


  const persist = useCallback((next: any) => {
    if (!currentProjectId) return;
    try { setExcalidrawForProject?.(currentProjectId, next); } catch {}
  }, [currentProjectId, setExcalidrawForProject]);

  const onChange = useCallback((elements: any, appState: any, files: any) => {
    const adjState = { ...(appState || {}) } as any;
    if (adjState && adjState.collaborators && typeof adjState.collaborators.forEach !== 'function') {
      try { delete adjState.collaborators; } catch {}
    }
    if (isBgVisible) adjState.viewBackgroundColor = 'transparent';
    const next = { elements, appState: adjState, files };
    setScene(next);
    // debounce persist (300ms)
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    // strip collaborators before persisting to localStorage (non-serializable / can break on restore)
    const toSave = JSON.parse(JSON.stringify({ elements, appState: { ...adjState, collaborators: undefined }, files }));
    saveTimer.current = window.setTimeout(() => persist(toSave), 300) as unknown as number;
  }, [persist, isBgVisible]);

  const triggerDownload = (dataUrl: string, filename = 'whiteboard.png') => {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
  };

  const exportPNG = useCallback(async () => {
    try {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const cw = Math.max(1, Math.floor(rect.width));
      const ch = Math.max(1, Math.floor(rect.height));

      // Capture the live Excalidraw canvas to preserve exact on-screen positions
      const liveCanvas = container.querySelector('div[style*="inset: 0"]')?.querySelector('canvas') as HTMLCanvasElement | null
        || container.querySelector('canvas') as HTMLCanvasElement | null;

      let fgImg: HTMLImageElement | null = null;
      let fgScaleX = 1, fgScaleY = 1; // device-pixel ratio mapping
      if (liveCanvas) {
        const liveUrl = liveCanvas.toDataURL('image/png');
        const tmp = new Image();
        await new Promise<void>((resolve)=> { tmp.onload = ()=> resolve(); tmp.src = liveUrl; });
        fgImg = tmp;
        fgScaleX = (liveCanvas.width || tmp.width) / cw;
        fgScaleY = (liveCanvas.height || tmp.height) / ch;
      } else {
        // Fallback to export API if live canvas not found
        if (!scene || !scene.elements) return;
        const drawBlob = await exportToBlob({ elements: scene.elements, appState: scene.appState, files: scene.files, mimeType: 'image/png', quality: 1 });
        const fgUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result||'')); r.readAsDataURL(drawBlob); });
        const tmp = new Image();
        await new Promise<void>((resolve)=> { tmp.onload = ()=> resolve(); tmp.src = fgUrl; });
        fgImg = tmp;
        fgScaleX = fgScaleY = 1;
      }

      if (!fgImg) return;

      const bgUrl = showBg ? (bgMode==='original' ? originalImageSrc : (bgMode==='chart' ? chartThumbnail : null)) : null;
      let W = 0, H = 0;
      let bgImg: HTMLImageElement | null = null;
      if (showBg && bgUrl) {
        bgImg = new Image();
        await new Promise<void>((resolve)=> { bgImg!.onload = ()=> resolve(); bgImg!.src = bgUrl!; });
        const bw = bgImg.naturalWidth || bgImg.width;
        const bh = bgImg.naturalHeight || bgImg.height;
        W = bw; H = bh;
      } else {
        // No background: export exactly the visible drawing
        W = Math.max(1, Math.floor(cw));
        H = Math.max(1, Math.floor(ch));
      }

      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);

      if (bgImg) {
        // Draw full-resolution background
        ctx.drawImage(bgImg, 0, 0, W, H);
        // On-screen background placement (max 75%, contain, centered)
        const bw = W, bh = H;
        const s = Math.min(1, Math.min(0.75 * cw / bw, 0.75 * ch / bh));
        const tw = bw * s;
        const th = bh * s;
        const dx = (cw - tw) / 2;
        const dy = (ch - th) / 2;
        // Map the portion of the live Excalidraw canvas that overlays the background
        const sx = dx * fgScaleX;
        const sy = dy * fgScaleY;
        const sw = tw * fgScaleX;
        const sh = th * fgScaleY;
        ctx.drawImage(fgImg, sx, sy, sw, sh, 0, 0, W, H);
      } else {
        // No background: draw the full live canvas
        const sx = 0, sy = 0, sw = (fgImg as any).naturalWidth || fgImg.width, sh = (fgImg as any).naturalHeight || fgImg.height;
        ctx.drawImage(fgImg, sx, sy, sw, sh, 0, 0, W, H);
      }

      const combined = canvas.toDataURL('image/png');
      triggerDownload(combined);
      try { if (currentProjectId) saveProject?.(); } catch {}
    } catch (e) { console.error('Excalidraw export error', e); }
  }, [scene, currentProjectId, setProjectThumb, saveProject, showBg, originalImageSrc, bgMode, chartThumbnail]);

  const clearAll = useCallback(() => {
    const appState = { viewBackgroundColor: isBgVisible ? 'transparent' : '#ffffff' } as any;
    // Update live canvas via imperative API so the editor clears immediately
    try { excalidrawRef.current?.updateScene?.({ elements: [], appState, files: {} }); } catch {}
    // Reflect in local state and persist
    const next = { elements: [], appState, files: {} };
    setScene(next);
    if (currentProjectId) setExcalidrawForProject?.(currentProjectId, next);
    // Force remount as a safety net to ensure the UI resets even if imperative API isn't available
    setEditorKey((k)=> k + 1);
  }, [currentProjectId, setExcalidrawForProject, isBgVisible]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,24,39,0.85)', zIndex: 10000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'min(1200px, 96vw)', height:'min(780px, 92vh)', background:'#fff', borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,.35)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderBottom:'1px solid #e5e7eb' }}>
          <div style={{ fontWeight:600 }}>Whiteboard (Excalidraw)</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <label className="btn" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <input type="checkbox" checked={showBg && bgMode!=='none'} onChange={e=> setShowBg(e.target.checked)} />
              배경 이미지
            </label>
            <select className="btn" value={bgMode} onChange={(e)=> {
              const v = e.target.value as any;
              setBgMode(v);
              if (v==='none') setShowBg(false);
              if (v==='chart') captureChartBackground();
              if (v==='original' && originalImageSrc) setShowBg(true);
            }}>
              <option value="none">없음</option>
              <option value="original" disabled={!originalImageSrc}>원본 이미지</option>
              <option value="chart">현재 차트</option>
            </select>
            {bgMode==='chart' && (
              <button className="btn" onClick={()=> captureChartBackground() || alert('차트 캔버스를 찾을 수 없습니다.')}>배경 새로고침</button>
            )}
            <button className="btn" onClick={exportPNG}>Export PNG</button>
            <button className="btn" onClick={clearAll}>Clear</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div ref={containerRef} style={{ flex:1, position:'relative' }}>
          {(() => {
            const shouldShowBg = showBg && (
              (bgMode === 'original' && originalImageSrc) || 
              (bgMode === 'chart' && chartThumbnail)
            );
            const bgUrl = bgMode === 'original' ? originalImageSrc : chartThumbnail;
            
            return shouldShowBg && bgUrl && (
              <img 
                src={bgUrl} 
                alt="bg" 
                style={{ 
                  position:'absolute', 
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '75%',
                  maxHeight: '75%',
                  objectFit: 'contain', 
                  pointerEvents:'none', 
                  userSelect:'none' 
                }} 
              />
            );
          })()}
          <div style={{ position:'absolute', inset:0 }}>
            <Excalidraw
              key={editorKey}
              ref={excalidrawRef as any}
              initialData={sanitizeScene(rawInitial || scene, isBgVisible)}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
