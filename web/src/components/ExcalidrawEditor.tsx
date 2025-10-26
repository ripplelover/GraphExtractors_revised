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

export default function ExcalidrawEditor({ onClose }: { onClose: () => void }) {
  const { currentProjectId, excalidrawByProject, setExcalidrawForProject, setProjectThumb, saveProject, originalImageSrc, originalImageSize } = useApp() as any;
  const rawInitial = useMemo(() => (currentProjectId && excalidrawByProject?.[currentProjectId]) || null, [currentProjectId, excalidrawByProject]);
  const [scene, setScene] = useState<any | null>(null);
  const saveTimer = useRef<number | null>(null);
  const [showBg, setShowBg] = useState<boolean>(!!originalImageSrc);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const excalidrawRef = useRef<any>(null);
  const [editorKey, setEditorKey] = useState<number>(0);

  // keep local scene in sync when project switches and ensure transparent bg when showing background image
  useEffect(() => {
    const safe = sanitizeScene(rawInitial, !!originalImageSrc);
    setScene(safe);
  }, [rawInitial, originalImageSrc]);

  // keep background toggle in sync with latest image presence
  useEffect(() => { setShowBg(!!originalImageSrc); }, [originalImageSrc]);

  const persist = useCallback((next: any) => {
    if (!currentProjectId) return;
    try { setExcalidrawForProject?.(currentProjectId, next); } catch {}
  }, [currentProjectId, setExcalidrawForProject]);

  const onChange = useCallback((elements: any, appState: any, files: any) => {
    const adjState = { ...(appState || {}) } as any;
    if (adjState && adjState.collaborators && typeof adjState.collaborators.forEach !== 'function') {
      try { delete adjState.collaborators; } catch {}
    }
    if (originalImageSrc) adjState.viewBackgroundColor = 'transparent';
    const next = { elements, appState: adjState, files };
    setScene(next);
    // debounce persist (300ms)
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    // strip collaborators before persisting to localStorage (non-serializable / can break on restore)
    const toSave = JSON.parse(JSON.stringify({ elements, appState: { ...adjState, collaborators: undefined }, files }));
    saveTimer.current = window.setTimeout(() => persist(toSave), 300) as unknown as number;
  }, [persist, originalImageSrc]);

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
      if (!scene || !scene.elements) return;
      const drawBlob = await exportToBlob({ elements: scene.elements, appState: scene.appState, files: scene.files, mimeType: 'image/png', quality: 1 });
      if (showBg && originalImageSrc && containerRef.current) {
        const bgImg = new Image();
        const fgImg = new Image();
        const dataUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result||'')); r.readAsDataURL(drawBlob); });
        await new Promise<void>((resolve)=> { fgImg.onload = ()=> resolve(); fgImg.src = dataUrl; });
        await new Promise<void>((resolve)=> { bgImg.onload = ()=> resolve(); bgImg.src = originalImageSrc; });
        const rect = containerRef.current.getBoundingClientRect();
        const W = Math.max(600, Math.floor(rect.width));
        const H = Math.max(400, Math.floor(rect.height));
        const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
        const s = Math.min(W / bgImg.width, H / bgImg.height);
        const tw = bgImg.width * s, th = bgImg.height * s;
        const dx = (W - tw)/2, dy = (H - th)/2;
        ctx.drawImage(bgImg, dx, dy, tw, th);
        ctx.drawImage(fgImg, 0, 0, W, H);
        const combined = canvas.toDataURL('image/png');
        // Trigger download and update thumbnail
        triggerDownload(combined);
        if (currentProjectId) { setProjectThumb?.(currentProjectId, combined); setTimeout(()=>{ try { saveProject?.(); } catch {} }, 0); }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const dataUrl2 = String(reader.result||'');
            triggerDownload(dataUrl2);
            if (currentProjectId) { setProjectThumb?.(currentProjectId, dataUrl2); setTimeout(()=>{ try { saveProject?.(); } catch {} }, 0); }
          } catch {}
        };
        reader.readAsDataURL(drawBlob);
      }
    } catch (e) { console.error('Excalidraw export error', e); }
  }, [scene, currentProjectId, setProjectThumb, saveProject, showBg, originalImageSrc]);

  const clearAll = useCallback(() => {
    const appState = { viewBackgroundColor: originalImageSrc ? 'transparent' : '#ffffff' } as any;
    // Update live canvas via imperative API so the editor clears immediately
    try { excalidrawRef.current?.updateScene?.({ elements: [], appState, files: {} }); } catch {}
    // Reflect in local state and persist
    const next = { elements: [], appState, files: {} };
    setScene(next);
    if (currentProjectId) setExcalidrawForProject?.(currentProjectId, next);
    // Force remount as a safety net to ensure the UI resets even if imperative API isn't available
    setEditorKey((k)=> k + 1);
  }, [currentProjectId, setExcalidrawForProject, originalImageSrc]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,24,39,0.85)', zIndex: 10000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'min(1200px, 96vw)', height:'min(780px, 92vh)', background:'#fff', borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,.35)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderBottom:'1px solid #e5e7eb' }}>
          <div style={{ fontWeight:600 }}>Whiteboard (Excalidraw)</div>
        <div style={{ display:'flex', gap:8 }}>
            {originalImageSrc && (
              <label className="btn" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <input type="checkbox" checked={showBg} onChange={e=> setShowBg(e.target.checked)} />
                배경 이미지
              </label>
            )}
            <button className="btn" onClick={exportPNG}>Export PNG</button>
            <button className="btn" onClick={clearAll}>Clear</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div ref={containerRef} style={{ flex:1, position:'relative' }}>
          {originalImageSrc && showBg && (
            <img src={originalImageSrc} alt="bg" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none', userSelect:'none' }} />
          )}
          <div style={{ position:'absolute', inset:0 }}>
            <Excalidraw
              key={editorKey}
              ref={excalidrawRef as any}
              initialData={sanitizeScene(scene, !!originalImageSrc)}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
