import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import ChartView from "./components/ChartView";
import ChartOverlay from "./components/ChartOverlay";
import Sidebar from "./components/Sidebar";
import Inspector from "./components/Inspector";
import { useApp } from "./store";
import { setPrimaryColor, convertBarToPie, convertPieToBar, ensureCategoricalColors } from "./utils/specTransforms";
import { fixSpec } from "./utils/specFixer";
import { findDataValues, findColorEncoding, updateDataValues } from "./utils/dataUtils";
import { useApiBase } from "./hooks/useApiBase";
import HomeDashboard from "./components/HomeDashboard";
import CreatePage from "./components/CreatePage";
import Logo from "./components/Logo";
import ExcalidrawEditor from "./components/ExcalidrawEditor";
import JsonEditorDrawer from "./components/JsonEditorDrawer";
import DataEditorDrawer from "./components/DataEditorDrawer";
import CanvasEditorDrawer from "./components/CanvasEditorDrawer";
// Router dependency removed for now (using simple hash navigation)

// Router dependency removed for now (using simple hash navigation)

export default function App() {
  const API = useApiBase();
  const fileRef = useRef<HTMLInputElement>(null);
  const { spec, setSpec, busy, setBusy, messages, addMsg, projects, newProject, saveProject, loadProject, currentProjectId, renameProject, deleteProject, setOriginalImageSrc, originalImageSrc, setOriginalImageSize, originalImageSize, preferredPalette, setPreferredPalette, homeTab, setHomeTab, closeProject, overlaysByProject, setOverlaysForProject, setProjectThumb } = useApp() as any;
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState("");
  useAutoSave(spec, () => saveProject(), setSaving);
  const [toast, setToast] = useState<string>("");
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editorValue, setEditorValue] = useState<string>("");
  const [showCanvas, setShowCanvas] = useState<boolean>(false);
  const [showWhiteboard, setShowWhiteboard] = useState<boolean>(false);
  const [mode, setMode] = useState<'edit'|'ask'>('edit');
  const [showPlusMenu, setShowPlusMenu] = useState<boolean>(false);
  const [showDataEditor, setShowDataEditor] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [tableCols, setTableCols] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState<any[]>([]);
  // Drag state for data table row reordering
  const [palette, setPalette] = useState<string[]>([]);
  const [overlays, setOverlays] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [redoStack, setRedoStack] = useState<any[][]>([]);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(10);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set());
  const [textMode, setTextMode] = useState<boolean>(false); // 텍스트 추가 모드
  // Drag state moved into CanvasEditorDrawer and ChartOverlay components
  const [catField, setCatField] = useState<string | null>(null);
  const [catOrder, setCatOrder] = useState<string[]>([]);
  const [catColors, setCatColors] = useState<Record<string,string>>({});
  const [overlaySize, setOverlaySize] = useState<{w:number; h:number}>({ w: 800, h: 450 });

  function addTextAt(x:number, y:number, text:string='텍스트') {
    setOverlays(prev => [...prev, { type:'text', x, y, text, color:'#111827', size:18 }]);
    setSelectedIdx((overlays?.length ?? 0));
  }

  // Force light mode only
  useEffect(() => {
    document.body.setAttribute('data-theme', 'light');
    try { localStorage.setItem('currentTheme', 'light'); localStorage.setItem('image2graph:theme', 'light'); } catch {}
  }, []);

  // global event to open whiteboard (for Sidebar/header triggers)
  useEffect(() => {
    const fn = () => setShowWhiteboard(true);
    window.addEventListener('openWhiteboard', fn as EventListener);
    return () => window.removeEventListener('openWhiteboard', fn as EventListener);
  }, []);

  // Restore overlays per project
  useEffect(()=>{
    if (!currentProjectId) { setOverlays([]); return; }
    const arr = (overlaysByProject && overlaysByProject[currentProjectId]) || [];
    setOverlays(arr);
  }, [currentProjectId, overlaysByProject]);

  // Persist overlays per project (debounced 300ms)
  useEffect(()=>{
    if (!currentProjectId) return;
    const t = setTimeout(()=> setOverlaysForProject?.(currentProjectId, overlays), 300);
    return ()=> clearTimeout(t);
  }, [overlays, currentProjectId]);

  // canvas history (limit 50)
  useEffect(()=>{
    setHistory(h => (h.length && h[h.length-1] === overlays) ? h : [...h.slice(-49), overlays]);
  }, [overlays]);

  const undo = () => {
    setHistory(h => {
      if (h.length < 2) return h;
      const prev = h[h.length-2];
      setRedoStack(r => [h[h.length-1], ...r].slice(0,50));
      setOverlays(prev);
      return h.slice(0, -1);
    });
  };
  const redo = () => {
    setRedoStack(r => {
      if (r.length === 0) return r;
      const [top, ...rest] = r;
      setHistory(h => [...h, top].slice(-50));
      setOverlays(top);
      return rest;
    });
  };

  // keyboard shortcuts when canvas open
  useEffect(()=>{
    if (!showCanvas) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase()==='z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='z') || (e.ctrlKey && e.key.toLowerCase()==='y')) { e.preventDefault(); redo(); return; }
      const targetIdx = selectedIdx ?? (selectedSet.size? Array.from(selectedSet)[0] : null);
      if (targetIdx===null) return;
      const delta = e.shiftKey ? 1 : gridSize;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const indices = selectedSet.size? Array.from(selectedSet) : [targetIdx];
        setOverlays(prev => prev.map((o,i)=>{
          if (!indices.includes(i)) return o;
          if (e.key==='ArrowLeft') return { ...o, x: Math.max(0, o.x - delta) };
          if (e.key==='ArrowRight') return { ...o, x: o.x + delta };
          if (e.key==='ArrowUp') return { ...o, y: Math.max(0, o.y - delta) };
          return { ...o, y: o.y + delta };
        }));
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [showCanvas, selectedIdx, gridSize]);

  function exportCanvasPNG() {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const image64 = `data:image/svg+xml;base64,${svg64}`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth || 1200;
      canvas.height = svg.clientHeight || 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--surface') || '#fff';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url; a.download = 'canvas.png'; a.click();
    };
    img.src = image64;
  }

  // Fallback: if overlays are empty but storage has data, restore (e.g., after hard refresh or spec reload)
  useEffect(()=>{
    if (!currentProjectId) return;
    if (overlays && overlays.length > 0) return;
    try {
      const raw = localStorage.getItem('image2graph:overlaysByProject');
      if (!raw) return;
      const map = JSON.parse(raw || '{}');
      if (map[currentProjectId] && map[currentProjectId].length) {
        setOverlays(map[currentProjectId]);
      }
    } catch {}
  }, [spec, currentProjectId]);

  // Ensure last state saved on refresh/close
  useEffect(()=>{
    const handler = () => {
      try { if (currentProjectId) setOverlaysForProject?.(currentProjectId, overlays); } catch {}
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [currentProjectId, overlays]);

  // Hard sync store with URL hash to guarantee re-render even if bridge fails
  useEffect(() => {
    const applyFromHash = () => {
      const raw = (location.hash || '#/home').replace(/^#/, '');
      const tab = raw.replace(/^\//, '');
      if (tab.startsWith('project/')) {
        const id = tab.split('/')[1];
        if (id) loadProject(id);
        setHomeTab('create');
      } else {
        const map: any = { home: 'home', projects: 'projects', create: 'create', templates: 'templates' };
        setHomeTab(map[tab] || 'home');
        // ensure we exit chart view when leaving a project page
        if (spec) { try { closeProject(); } catch { setSpec(null); } }
      }
    };
    applyFromHash();
    window.addEventListener('hashchange', applyFromHash);
    return () => window.removeEventListener('hashchange', applyFromHash);
  }, [setHomeTab]);

  // Hard-guard: whenever we are not on a project route, clear spec so UI switches away from editor
  useEffect(() => {
    const isProject = (location.hash || '').includes('/project/');
    if (!isProject && spec) {
      try { closeProject(); } catch {}
      setSpec(null);
    }
  }, [homeTab]);

  // Spec fixer moved to utils/specFixer

  const onUpload = async (f: File, dataUrl?: string, instruction?: string) => {
    const form = new FormData();
    form.append("image", f);
    // 명령어가 있으면 함께 전송
    if (instruction && instruction.trim()) {
      form.append("instruction", instruction.trim());
    }
    setBusy(true);
    try {
      if (dataUrl) {
        setOriginalImageSrc(dataUrl);
        const img = new Image();
        img.onload = () => { setOriginalImageSize && setOriginalImageSize({ width: img.width, height: img.height }); };
        img.src = dataUrl;
      }
      // Ensure a project is created immediately on image upload
      try {
        const createdId = saveProject();
        setHomeTab('create');
        // robust navigation to project route even if same hash/state
        setTimeout(() => {
          const target = `#/project/${createdId}`;
          if (location.hash !== target) {
            location.replace(target);
          } else {
            location.hash = '#/home';
            location.replace(target);
          }
          try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch {}
          requestAnimationFrame(() => { try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch {} });
        }, 0);
      } catch {}
      const { data } = await axios.post(`${API}/api/convert`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setSpec(fixSpec(ensureCategoricalColors(data.spec)));
      // 저장 후 해당 프로젝트 상세로 이동
      try {
        const id = saveProject();
        setHomeTab('create');
        (window as any).routerNavigate?.(`/project/${id}`);
      } catch {}
      // 사용자 피드백
      addMsg({ role: "assistant", text: instruction ? `"${instruction}" 명령어로 이미지를 변환했습니다.` : "이미지에서 그래프를 변환했습니다." });
      setToast('변환 완료'); setTimeout(()=> setToast(''), 2000);
      // 즉시 저장 (스펙/이미지 모두 포함)
      saveProject();
    } catch (e: any) {
      addMsg({ role: "assistant", text: `오류: ${e?.message || e}` });
    } finally {
      setBusy(false);
    }
  };

  async function doInstruction(text: string) {
    if (!text.trim() || !spec) return;
    const t = text.trim();
    addMsg({ role: "user", text: t });
    setBusy(true);
    try {
      // 모드 우선: edit이면 편집 강제, ask이면 QA, auto는 키워드로 판단
      let isQA = mode === 'ask';
      if (mode === 'edit') isQA = false;
      if (!isQA && mode !== 'edit') {
        isQA = /\?|얼마|몇\s*퍼센트|의미|무엇|누구|언제/.test(t);
      }
      if (isQA) {
        const { data } = await axios.post(`${API}/api/ask`, { spec, question: t });
        addMsg({ role: "assistant", text: data.answer || "답변을 생성하지 못했습니다." });
      } else {
        const { data } = await axios.post(`${API}/api/edit`, { spec, instruction: t });
        setSpec(fixSpec(ensureCategoricalColors(data.spec)));
      setEditorValue(JSON.stringify(data.spec, null, 2));
      addMsg({ role: "assistant", text: "요청에 맞게 스펙을 수정했습니다." });
      setToast("Updated spec"); setTimeout(()=> setToast(""), 2000);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.error || e?.message || String(e);
      addMsg({ role: "assistant", text: `오류${status ? ` (${status})` : ''}: ${detail}` });
    } finally {
      setBusy(false);
    }
  }

  const createRandomChart = () => {
    const chartTypes = [
      '막대 그래프',
      '파이 차트', 
      '라인 차트',
      '산점도',
      '도넛 차트',
      '면적 차트',
      '히트맵'
    ];
    const randomType = chartTypes[Math.floor(Math.random() * chartTypes.length)];
    setInput(`${randomType}를 만들어줘`);
  };

  const generateRandomChart = async () => {
    const chartTypes = [
      '막대 그래프',
      '파이 차트', 
      '라인 차트',
      '산점도',
      '도넛 차트',
      '면적 차트',
      '히트맵'
    ];
    const randomType = chartTypes[Math.floor(Math.random() * chartTypes.length)];
    await generateChart(`${randomType}를 만들어줘`);
  };

  const sendInstruction = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    
    if (!spec) {
      // 새 프로젝트 생성 - 텍스트로 차트 생성
      await generateChart(text);
    } else {
      // 기존 차트 수정
      await doInstruction(text);
    }
  };

  const generateChart = async (instruction: string) => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/api/generate`, { instruction });
      setSpec(fixSpec(ensureCategoricalColors(data.spec)));
      // 저장 후 해당 프로젝트 상세로 이동
      try {
        const id = saveProject();
        setHomeTab('create');
        (window as any).routerNavigate?.(`/project/${id}`);
      } catch {}
      // 사용자 피드백
      addMsg({ role: "assistant", text: `"${instruction}" 요청에 따라 차트를 생성했습니다.` });
      setToast('차트 생성 완료'); setTimeout(()=> setToast(''), 2000);
      // 즉시 저장
      saveProject();
    } catch (e: any) {
      addMsg({ role: "assistant", text: `오류: ${e?.message || e}` });
    } finally {
      setBusy(false);
    }
  };

  const exportJSON = () => {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vega-lite.json";
    a.click();
  };

  // Thumbnail: capture canvas after VL render settled - ONLY for current project
  useEffect(() => {
    if (!spec || !currentProjectId) return;
    
    console.log('Thumbnail useEffect triggered for project:', currentProjectId);
    
    const projectId = currentProjectId; // Capture the project ID at the time of effect
    
    const generateThumbnail = () => {
      // Only generate thumbnail if we're still on the same project
      if (currentProjectId !== projectId) {
        console.log(`Project changed from ${projectId} to ${currentProjectId}, skipping thumbnail generation`);
        return;
      }
      
      const canvas = document.querySelector('.editor-canvas canvas') as HTMLCanvasElement | null
        || document.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          console.log('Generated thumbnail for project:', projectId);
          setProjectThumb?.(projectId, dataUrl);
          console.log('Thumbnail saved via useEffect for project:', projectId);
        } catch (e) {
          console.error('Thumbnail generation error:', e);
        }
      } else {
        console.log('Canvas not found in useEffect, retrying in 500ms...');
        setTimeout(generateThumbnail, 500);
      }
    };
    
    // Try immediately and then retry after shorter delays
    generateThumbnail();
    setTimeout(generateThumbnail, 300);
    setTimeout(generateThumbnail, 600);
    setTimeout(generateThumbnail, 1000);
  }, [spec, currentProjectId]);

  // Listen for chart rendering events to update thumbnails
  useEffect(() => {
    const handleChartRendered = (event: CustomEvent) => {
      if (!currentProjectId) return;
      
      const projectId = currentProjectId; // Capture the project ID
      try {
        const { dataUrl } = event.detail;
        console.log('Received chartRendered event, updating thumbnail for project:', projectId);
        
        // Double-check that we're still on the same project
        if (currentProjectId === projectId) {
          setProjectThumb?.(projectId, dataUrl);
          console.log('Thumbnail updated via chartRendered event for project:', projectId);
        } else {
          console.log(`Project changed from ${projectId} to ${currentProjectId}, skipping chartRendered thumbnail update`);
        }
      } catch (e) {
        console.error('Error handling chartRendered event:', e);
      }
    };

    window.addEventListener('chartRendered', handleChartRendered as EventListener);
    return () => window.removeEventListener('chartRendered', handleChartRendered as EventListener);
  }, [currentProjectId]);

  // Observe VL canvas size → overlay size with better dynamic sizing
  useEffect(() => {
    const root = document.querySelector('.editor-canvas .chart-with-overlay') as HTMLElement | null;
    if (!root) return;
    const canvas = root.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const set = () => {
      // Use container size instead of canvas size for better responsiveness
      const containerRect = root.getBoundingClientRect();
      const availableWidth = Math.max(600, containerRect.width - 40); // Minimum 600px width
      const availableHeight = Math.max(400, containerRect.height - 40); // Minimum 400px height
      setOverlaySize({ w: availableWidth, h: availableHeight });
    };
    set();
    const ResizeObserver = (window as any).ResizeObserver;
    const ro = ResizeObserver ? new ResizeObserver(() => set()) : null;
    ro?.observe(root); // Observe container instead of canvas
    return () => ro?.disconnect();
  }, [spec]);

  const exportCSV = () => {
    if (!spec?.data?.values) return;
    const arr = spec.data.values as any[];
    const cols = Object.keys(arr[0] || {});
    const csv = [cols.join(","), ...arr.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.csv";
    a.click();
  };

  // Data utils moved to utils/dataUtils

  // --- Data Editor helpers ---
  function openDataEditor() {
    const rows = findDataValues(spec);
    if (!rows || !Array.isArray(rows)) { 
      alert('이 스펙은 편집 가능한 data.values를 찾을 수 없습니다.'); 
      return; 
    }
    const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    setTableCols(cols);
    setTableRows(rows.map(r => ({ ...cols.reduce((acc,k)=> ({...acc, [k]: r[k] ?? ''}), {}) })));
    // palette 초기화(있으면)
    try {
      const colorEnc = findColorEncoding(spec);
      const range = colorEnc?.scale?.range as string[] | undefined;
      setPalette(range ? [...range] : []);
    } catch { setPalette([]); }
    setShowDataEditor(true);
  }

  // data editor logic moved into DataEditorDrawer component

  // --- Category color mapping helpers ---
  useEffect(()=>{
    if (!spec) { setCatField(null); setCatOrder([]); setCatColors({}); return; }
    const field = spec?.encoding?.color?.field || null;
    setCatField(field);
    const values: any[] = (spec?.data?.values && Array.isArray(spec.data.values)) ? spec.data.values : [];
    const order = field ? Array.from(new Set(values.map(v=> v?.[field]).filter((v:any)=> v!==undefined))) : [];
    const existingDomain: string[] | undefined = spec?.encoding?.color?.scale?.domain;
    const existingRange: string[] | undefined = spec?.encoding?.color?.scale?.range;
    const dom = existingDomain && existingDomain.length ? existingDomain : order;
    const map: Record<string,string> = {};
    (dom || []).forEach((d, i)=> { map[String(d)] = existingRange?.[i] || palette?.[i] || '#4e79a7'; });
    setCatOrder(dom);
    setCatColors(map);
  }, [spec]);

  function applyCategoryColors() {
    if (!spec || !catField) return;
    const domain = catOrder;
    const range = domain.map(d => catColors[String(d)] || '#4e79a7');
    const next = JSON.parse(JSON.stringify(spec));
    next.encoding = next.encoding || {};
    next.encoding.color = next.encoding.color || { field: catField, type:'nominal' };
    next.encoding.color.scale = next.encoding.color.scale || {};
    next.encoding.color.scale.domain = domain;
    next.encoding.color.scale.range = range;
    setSpec(next);
    saveProject();
  }

  return (
    <div className="min-h-screen text-gray-900" style={{ display: "flex", flexDirection: "column" }}>
      {/* 전체 화면 로딩 오버레이 */}
      {busy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: 'white',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          <div style={{
            background: 'white',
            color: '#333',
            padding: '24px 32px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            AI가 처리 중입니다...
          </div>
        </div>
      )}
      
      {/* 원본 이미지 확대 모달 */}
      {showImageModal && originalImageSrc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }} onClick={() => setShowImageModal(false)}>
          <div style={{
            position: 'relative',
            maxWidth: '90%',
            maxHeight: '90%',
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            <img
              src={originalImageSrc}
              alt="원본 이미지 확대"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: '8px',
                display: 'block'
              }}
            />
          </div>
        </div>
      )}
      <header className="h-14 px-3 flex items-center justify-between appbar" style={{ flex: "0 0 auto" }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px' }}>
          <Logo size={28} />
          <span style={{ fontSize: '18px', fontWeight: '600' }}>Image2Graph</span>
        </div>
        <div className="flex gap-2">
          {/* Back to home when a project is open */}
          {/* top-right nav buttons removed; navigation via left sidebar only */}
          {/* theme selector removed; light mode enforced */}
          <span className={`badge ${saving ? 'badge--busy' : 'badge--ok'}`}>{saving ? 'Saving…' : 'Saved'}</span>
          <button className="btn" onClick={exportJSON} disabled={!spec}>Export JSON</button>
          <button className="btn" onClick={exportCSV} disabled={!spec || !spec?.data?.values}>Export CSV</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (!e.target.files) return; const f=e.target.files[0]; const r=new FileReader(); r.onload=()=> onUpload(f, r.result as string); r.readAsDataURL(f); }} />
        </div>
      </header>
      <div className="workspace" style={{ display: "grid", gridTemplateColumns: "88px 1fr 0px", flex: "1 1 auto", width:'100%', justifyContent:'start' }}>
        <Sidebar
          onNew={() => newProject()}
          onNewFromTemplate={(name: string, templateSpec: any) => {
            console.log('Creating template project:', name);
            const projectId = newProject(name);
            console.log('Project created with ID:', projectId);
            setSpec(templateSpec);
            console.log('Spec set for template');
            // Explicitly clear original image for template projects
            setOriginalImageSrc(null);
            setOriginalImageSize(null);
            const savedId = saveProject(name);
            console.log('Project saved with ID:', savedId);
            setHomeTab('create');
            (window as any).routerNavigate?.(`/project/${savedId}`);
            
            // Force thumbnail generation with faster attempts
            const templateProjectId = savedId; // Capture the project ID
            const attempts = [300, 600, 1000, 1500, 2000];
            attempts.forEach((delay, index) => {
              setTimeout(() => {
                console.log(`Template thumbnail attempt ${index + 1} after ${delay}ms for project:`, templateProjectId);
                // Only generate thumbnail if we're still on the same project
                if (currentProjectId !== templateProjectId) {
                  console.log(`Project changed from ${templateProjectId} to ${currentProjectId}, skipping thumbnail generation`);
                  return;
                }
                const canvas = document.querySelector('.editor-canvas canvas') as HTMLCanvasElement | null
                  || document.querySelector('canvas') as HTMLCanvasElement | null;
                if (canvas) {
                  try {
                    const dataUrl = canvas.toDataURL('image/png');
                    console.log(`Template thumbnail generated successfully on attempt ${index + 1} for project:`, templateProjectId);
                    setProjectThumb?.(templateProjectId, dataUrl);
                    console.log('Thumbnail saved to project:', templateProjectId);
                    // Force save to persist the thumbnail
                    setTimeout(() => {
                      const st = (useApp() as any);
                      st.saveProject?.();
                    }, 100);
                  } catch (e) {
                    console.error(`Template thumbnail generation failed on attempt ${index + 1} for project ${templateProjectId}:`, e);
                  }
                } else {
                  console.log(`Canvas not found on attempt ${index + 1} for project:`, templateProjectId);
                }
              }, delay);
            });
          }}
          onLoad={(p: any) => loadProject(p.id)}
          onRename={(id, name) => renameProject(id, name)}
          onDelete={(id) => deleteProject(id)}
          savedList={projects.map(p => ({ id: p.id, name: p.name }))}
          currentId={currentProjectId}
        />
        <main style={{ padding: 16 }}>
          {homeTab === 'create' ? (
            !currentProjectId ? (
              <CreatePage onUpload={onUpload} input={input} setInput={setInput} onSend={sendInstruction} onCreateRandomChart={createRandomChart} onGenerateRandomChart={generateRandomChart} busy={busy} />
            ) : (
              <div className="editor-layout">
                <aside className="editor-side">
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    <button className="btn" onClick={openDataEditor}>데이터 편집</button>
                    <button className="btn" onClick={()=> setShowCanvas(true)}>캔버스</button>
                  </div>
                  
               {/* Canva 스타일 고정 텍스트 편집 툴바 */}
               {selectedIdx !== null && overlays[selectedIdx] && overlays[selectedIdx].type === 'text' && (
                 <div style={{ 
                   background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)', 
                   border: '1px solid rgba(102, 126, 234, 0.2)', 
                   borderRadius: '16px', 
                   padding: '20px', 
                   marginBottom: '16px',
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '12px',
                   boxShadow: '0 4px 16px rgba(102, 126, 234, 0.1)',
                   backdropFilter: 'blur(10px)',
                   width: '100%',
                   overflow: 'visible'
                 }}>
                   <div style={{ 
                     fontWeight: '700', 
                     fontSize: '16px', 
                     color: '#4a5568',
                     textShadow: 'none'
                   }}>✏️ 텍스트 편집</div>
                   
                   <div style={{
                     background: 'rgba(255,255,255,0.8)',
                     borderRadius: '12px',
                     padding: '12px',
                     display: 'flex',
                     gap: '8px',
                     alignItems: 'center',
                     border: '1px solid rgba(102, 126, 234, 0.1)',
                     width: '100%'
                   }}>
                     <input
                       value={(overlays[selectedIdx] as any).text || ''}
                       onChange={(e)=>{
                         const val = e.target.value;
                         setOverlays(prev => prev.map((o, i) => i === selectedIdx ? { ...o, text: val } : o));
                       }}
                       placeholder="텍스트 입력"
                       style={{ 
                         flex: '1',
                         border: 'none', 
                         background: 'transparent',
                         outline: 'none',
                         fontSize: '14px',
                         fontWeight: '500',
                         color: '#2d3748'
                       }}
                     />
                   </div>
                   
                   <div style={{
                     background: 'rgba(255,255,255,0.8)',
                     borderRadius: '12px',
                     padding: '12px',
                     display: 'flex',
                     gap: '12px',
                     alignItems: 'center',
                     border: '1px solid rgba(102, 126, 234, 0.1)',
                     width: '100%',
                     flexWrap: 'wrap'
                   }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>색상:</span>
                       <input
                         type="color"
                         value={(overlays[selectedIdx] as any).color || '#111827'}
                         onChange={(e)=>{
                           const val = e.target.value;
                           setOverlays(prev => prev.map((o, i) => i === selectedIdx ? { ...o, color: val } : o));
                         }}
                         title="색상"
                         style={{ 
                           width: '32px', 
                           height: '32px', 
                           border: 'none', 
                           borderRadius: '6px',
                           cursor: 'pointer',
                           boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                         }}
                       />
                     </div>
                     
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>크기:</span>
                       <input
                         type="number"
                         min={8}
                         max={96}
                         value={(overlays[selectedIdx] as any).size || 18}
                         onChange={(e)=>{
                           const val = Number(e.target.value) || 18;
                           setOverlays(prev => prev.map((o, i) => i === selectedIdx ? { ...o, size: val } : o));
                         }}
                         title="크기"
                         style={{ 
                           width: '60px', 
                           border: '1px solid rgba(102, 126, 234, 0.2)', 
                           background: 'white',
                           borderRadius: '6px', 
                           padding: '6px',
                           fontSize: '14px',
                           fontWeight: '500',
                           textAlign: 'center',
                           color: '#2d3748'
                         }}
                       />
                     </div>
                     
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1' }}>
                       <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>글꼴:</span>
                       <select
                         value={(overlays[selectedIdx] as any).fontFamily || 'system-ui'}
                         onChange={(e)=>{
                           const val = e.target.value;
                           setOverlays(prev => prev.map((o, i) => i === selectedIdx ? { ...o, fontFamily: val } : o));
                         }}
                         title="글꼴"
                         style={{ 
                           border: '1px solid rgba(102, 126, 234, 0.2)', 
                           background: 'white',
                           borderRadius: '6px', 
                           padding: '6px',
                           fontSize: '14px',
                           fontWeight: '500',
                           cursor: 'pointer',
                           outline: 'none',
                           color: '#2d3748',
                           flex: '1',
                           minWidth: '120px'
                         }}
                       >
                         <option value="system-ui">System</option>
                         <option value="Pretendard">Pretendard</option>
                         <option value="Arial">Arial</option>
                         <option value="Roboto">Roboto</option>
                         <option value="Noto Sans KR">Noto Sans KR</option>
                         <option value="Georgia">Georgia</option>
                       </select>
                     </div>
                   </div>
                   
                   <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                     <button
                       className="btn"
                       onClick={()=> setSelectedIdx(null)}
                       style={{ 
                         background: 'rgba(34, 197, 94, 0.1)', 
                         border: '1px solid rgba(34, 197, 94, 0.3)',
                         color: '#059669',
                         borderRadius: '12px',
                         padding: '10px 16px',
                         fontWeight: '600',
                         fontSize: '14px',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                         e.currentTarget.style.transform = 'translateY(-1px)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                         e.currentTarget.style.transform = 'translateY(0)';
                       }}
                     >
                       ✅ 완료
                     </button>
                     <button
                       className="btn"
                       onClick={()=>{
                         const idx = selectedIdx;
                         setSelectedIdx(null);
                         setOverlays(prev => prev.filter((_, i) => i !== idx));
                       }}
                       style={{ 
                         background: 'rgba(239, 68, 68, 0.1)', 
                         border: '1px solid rgba(239, 68, 68, 0.3)',
                         color: '#dc2626',
                         borderRadius: '12px',
                         padding: '10px 16px',
                         fontWeight: '600',
                         fontSize: '14px',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                         e.currentTarget.style.transform = 'translateY(-1px)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                         e.currentTarget.style.transform = 'translateY(0)';
                       }}
                     >
                       🗑️ 삭제
                     </button>
                   </div>
                 </div>
               )}
                  <div style={{ display:'grid', gap:8 }}>
                    <div className="muted">팔레트 빠른 설정</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {(() => {
                        const colorEnc = findColorEncoding(spec);
                        const range = (colorEnc?.scale?.range || []) as string[];
                        return range.map((c:string, i:number)=> (
                          <input key={i} type="color" value={c} onChange={e=>{
                            const next = JSON.parse(JSON.stringify(spec));
                            const colorEnc = findColorEncoding(next);
                            if (colorEnc) {
                              colorEnc.scale = colorEnc.scale || {};
                              colorEnc.scale.range = [...range];
                              colorEnc.scale.range[i] = e.target.value;
                            }
                            setSpec(next); saveProject();
                          }} />
                        ));
                      })()}
                      <button className="btn" onClick={()=>{
                        const next = JSON.parse(JSON.stringify(spec));
                        const colorEnc = findColorEncoding(next);
                        if (colorEnc) {
                          colorEnc.scale = colorEnc.scale || {};
                          const range = (colorEnc.scale.range || []) as string[];
                          colorEnc.scale.range = [...range, '#4e79a7'];
                          setSpec(next); saveProject();
                        } else {
                          const directEnc = next.encoding || {};
                          const directColor = directEnc.color || {};
                          directColor.scale = directColor.scale || {};
                          const range = (directColor.scale.range || []) as string[];
                          directColor.scale.range = [...range, '#4e79a7'];
                          next.encoding = directEnc;
                          setSpec(next); saveProject();
                        }
                      }}>색상 추가</button>
                    </div>
                    {originalImageSrc && (
                      <div style={{ marginTop:12 }}>
                        <div className="muted" style={{ marginBottom:6 }}>원본 이미지</div>
                        <img 
                          src={originalImageSrc} 
                          alt="original" 
                          style={{ maxWidth:'100%', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer' }} 
                          onClick={() => setShowImageModal(true)}
                        />
                      </div>
                    )}
                  </div>
                </aside>
                <section
                  className="editor-canvas"
                  style={{ minHeight: 0, overflow: "auto", maxWidth: "100%", maxHeight: "100%", cursor: textMode ? 'crosshair' : 'default' }}
                  onDoubleClick={(e)=>{
                    // 텍스트 모드일 때만 새 텍스트 추가 - 전체 캔버스에서 가능
                    if (!textMode) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const x = Math.round(e.clientX - rect.left);
                    const y = Math.round(e.clientY - rect.top);
                    console.log('Adding text at:', x, y, 'textMode:', textMode);
                    addTextAt(x, y);
                    setTextMode(false); // 텍스트 추가 후 모드 해제
                  }}
                  onMouseDown={(e)=>{
                    // 빈 공간 클릭 시 선택 해제만 (텍스트 모드는 유지)
                    const target = e.target as HTMLElement;
                    if (target.closest('.overlay-toolbar') || target.tagName.toLowerCase() === 'text') return;
                    setSelectedIdx(null);
                  }}
                >
                    <ChartOverlay
                      spec={spec}
                      originalImageSize={originalImageSize}
                      preferredPalette={preferredPalette}
                      overlays={overlays}
                      setOverlays={(updater)=> setOverlays(updater as any)}
                      textMode={textMode}
                      setTextMode={setTextMode}
                      setSelectedIdx={(i)=> setSelectedIdx(i)}
                      onAddTextAt={(x,y)=> addTextAt(x,y)}
                    />
                </section>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <div className="card" style={{ padding: 12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', position:'relative' }}>
                    <div style={{ position:'relative' }}>
                      <button className="btn" onClick={()=> setShowPlusMenu(v=>!v)}>+</button>
                      {showPlusMenu && (
                        <div className="menu" style={{ position:'absolute', top:40, left:0, zIndex:10 }} onMouseLeave={()=> setShowPlusMenu(false)}>
                          <div className="menu-item" onClick={()=>{ setShowPlusMenu(false); fileRef.current?.click(); }}>
                            <div className="menu-icon">📎</div>
                            <div className="menu-label">사진 및 파일 추가</div>
                          </div>
                          <div className="menu-item" onClick={()=>{ setMode('edit'); setShowPlusMenu(false); }}>
                            <div className="menu-icon">🛠️</div>
                            <div className="menu-label">차트 수정 모드</div>
                          </div>
                          <div className="menu-item" onClick={()=>{ setMode('ask'); setShowPlusMenu(false); }}>
                            <div className="menu-icon">❓</div>
                            <div className="menu-label">질문 모드</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                      <div className="mode-pill" title={mode==='ask' ? '질문 모드' : '차트 수정 모드'} onClick={()=> setMode(mode==='ask' ? 'edit' : 'ask')}>
                        <span className="icon">{mode==='ask' ? '❓' : '🛠️'}</span>
                        <span>{mode==='ask' ? '질문' : '차트 수정'}</span>
                      </div>
                      <input className="border rounded px-3 py-2" style={{ flex:1 }} placeholder="명령 입력 (예: 색상을 초록으로, 라인 차트로)" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && sendInstruction()} />
                    </div>
                    <button className="btn" onClick={sendInstruction} disabled={!spec || busy}>{busy? '처리 중...' : 'Send'}</button>
                    {/* preset actions */}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button className="btn" onClick={()=> doInstruction('막대 색상을 원본 이미지와 동일한 팔레트로 맞춰줘')}>색상 매칭</button>
                      <button className="btn" onClick={()=> doInstruction('막대를 가로 방향으로 전환해줘')}>가로 막대</button>
                      <button className="btn" onClick={()=> doInstruction('막대를 세로 방향으로 전환해줘')}>세로 막대</button>
                      <button className="btn" onClick={()=> doInstruction('라벨 각도를 0도로 맞춰줘')}>라벨 0°</button>
                      <button className="btn" onClick={()=> doInstruction('파이 차트로 바꿔줘')}>파이</button>
                      <button className="btn" onClick={()=> doInstruction('도넛 차트로 바꿔줘')}>도넛</button>
                    </div>
                  </div>
                  <div className="card" style={{ padding: 12, marginTop: 8, maxHeight: 220, overflow: 'auto' }}>
                    {messages.map((m, i) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
                        <div className="badge" style={{ background: m.role==='user' ? '#eef2ff' : '#ecfdf5', color: m.role==='user' ? '#3730a3' : '#065f46' }}>{m.role}</div>
                        <div style={{ whiteSpace:'pre-wrap' }}>
                          <div style={{ fontSize:12, color:'var(--muted)' }}>{new Date().toLocaleString()}</div>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <button className="btn" onClick={() => { setEditorValue(JSON.stringify(spec ?? {}, null, 2)); setShowEditor(true); }}>Open JSON Editor</button>
                      <button className="btn" onClick={() => setShowCanvas(true)}>Open Canvas Editor</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            !spec ? (
                <HomeDashboard
                  mode={homeTab || 'home'}
                  projects={projects}
                  onOpen={(id)=> { loadProject(id); setHomeTab('create'); (window as any).routerNavigate?.(`/project/${id}`); }}
                  onDelete={(id)=> deleteProject(id)}
                  onCreateEmpty={()=> { const id = newProject(); setHomeTab('create'); (window as any).routerNavigate?.(`/project/${id}`); }}
                  onTemplate={(name, spec)=> { 
                    console.log('HomeDashboard: Creating template project:', name);
                    const id = newProject(name); 
                    console.log('HomeDashboard: Project created with ID:', id);
                    setSpec(spec); 
                    console.log('HomeDashboard: Spec set for template');
                    // Explicitly clear original image for template projects
                    setOriginalImageSrc(null);
                    setOriginalImageSize(null);
                    const savedId = saveProject(name);
                    console.log('HomeDashboard: Project saved with ID:', savedId);
                    setHomeTab('create'); 
                    (window as any).routerNavigate?.(`/project/${savedId}`);
                    
                    // Force thumbnail generation with faster attempts
                    const templateProjectId = savedId; // Capture the project ID
                    const attempts = [300, 600, 1000, 1500, 2000];
                    attempts.forEach((delay, index) => {
                      setTimeout(() => {
                        console.log(`HomeDashboard template thumbnail attempt ${index + 1} after ${delay}ms for project:`, templateProjectId);
                        // Only generate thumbnail if we're still on the same project
                        if (currentProjectId !== templateProjectId) {
                          console.log(`Project changed from ${templateProjectId} to ${currentProjectId}, skipping thumbnail generation`);
                          return;
                        }
                        const canvas = document.querySelector('.editor-canvas canvas') as HTMLCanvasElement | null
                          || document.querySelector('canvas') as HTMLCanvasElement | null;
                        if (canvas) {
                          try {
                            const dataUrl = canvas.toDataURL('image/png');
                            console.log(`HomeDashboard template thumbnail generated successfully on attempt ${index + 1} for project:`, templateProjectId);
                            setProjectThumb?.(templateProjectId, dataUrl);
                            console.log('HomeDashboard: Thumbnail saved to project:', templateProjectId);
                            // Force save to persist the thumbnail
                            setTimeout(() => {
                              const st = (useApp() as any);
                              st.saveProject?.();
                            }, 100);
                          } catch (e) {
                            console.error(`HomeDashboard template thumbnail generation failed on attempt ${index + 1} for project ${templateProjectId}:`, e);
                          }
                        } else {
                          console.log(`HomeDashboard: Canvas not found on attempt ${index + 1} for project:`, templateProjectId);
                        }
                      }, delay);
                    });
                  }}
                  onUploadClick={()=> fileRef.current?.click()}
                />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card" style={{ padding: 12 }}>
                <div className="muted" style={{ marginBottom: 8 }}>Original</div>
                {originalImageSrc ? <img src={originalImageSrc} alt="original" style={{ maxWidth: "100%" }} /> : <div className="muted">(no image)</div>}
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="muted" style={{ marginBottom: 8 }}>Vega‑Lite</div>
                <ChartView
                  key={`preview-${(spec?.data?.values && Array.isArray(spec.data.values) ? spec.data.values.length : 0)}-${JSON.stringify(spec?.encoding?.color?.scale?.range)}`}
                  spec={spec}
                  aspect={originalImageSize ? originalImageSize.width / originalImageSize.height : undefined}
                  palette={preferredPalette}
                />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                  <div className="card" style={{ padding: 12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', position:'relative' }}>
                    <div style={{ position:'relative' }}>
                      <button className="btn" onClick={()=> setShowPlusMenu(v=>!v)}>+</button>
                      {showPlusMenu && (
                        <div className="card" style={{ position:'absolute', top:40, left:0, zIndex:10, padding:8, display:'grid', gap:6 }} onMouseLeave={()=> setShowPlusMenu(false)}>
                          <button className="btn" onClick={()=>{ setShowPlusMenu(false); fileRef.current?.click(); }}>이미지 업로드</button>
                          <button className="btn" onClick={()=>{ setMode('edit'); setShowPlusMenu(false); }}>차트 수정 모드</button>
                          <button className="btn" onClick={()=>{ setMode('ask'); setShowPlusMenu(false); }}>질문 모드</button>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                      <div className="mode-pill" title={mode==='ask' ? '질문 모드' : '차트 수정 모드'} onClick={()=> setMode(mode==='ask' ? 'edit' : 'ask')}>
                        <span className="icon">{mode==='ask' ? '❓' : '🛠️'}</span>
                        <span>{mode==='ask' ? '질문' : '차트 수정'}</span>
                      </div>
                  <input className="border rounded px-3 py-2" style={{ flex:1 }} placeholder="명령 입력 (예: 색상을 초록으로, 라인 차트로)" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && sendInstruction()} />
                    </div>
                  <button className="btn" onClick={sendInstruction} disabled={!spec || busy}>{busy? '처리 중...' : 'Send'}</button>
                    <div style={{ display:'inline-flex', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                      <button className="btn" style={{ border:'none', borderRight:'1px solid var(--border)', background: mode==='edit'? '#eef2ff':'#fff' }} onClick={()=> setMode('edit')}>차트 수정</button>
                      <button className="btn" style={{ border:'none', background: mode==='ask'? '#eef2ff':'#fff' }} onClick={()=> setMode('ask')}>질문</button>
                    </div>
                </div>
                <div className="card" style={{ padding: 12, marginTop: 8, maxHeight: 220, overflow: 'auto' }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
                      <div className="badge" style={{ background: m.role==='user' ? '#eef2ff' : '#ecfdf5', color: m.role==='user' ? '#3730a3' : '#065f46' }}>{m.role}</div>
                      <div style={{ whiteSpace:'pre-wrap' }}>
                        <div style={{ fontSize:12, color:'var(--muted)' }}>{new Date().toLocaleString()}</div>
                        {m.text}
                      </div>
                      {m.role==='assistant' && (
                        <button className="icon-btn" onClick={() => navigator.clipboard.writeText(m.text as string)}>Copy</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button className="btn" onClick={() => { setEditorValue(JSON.stringify(spec ?? {}, null, 2)); setShowEditor(true); }}>Open JSON Editor</button>
                    <button className="btn" onClick={() => setShowCanvas(true)}>Open Canvas Editor</button>
                  </div>
                </div>
              </div>
            </div>
            )
          )}
        </main>
        <div className="border bg-white" style={{ width: 0 }} />
      </div>
      {toast && <div className="toast">{toast}</div>}
      {showEditor && (
        <JsonEditorDrawer
          value={editorValue}
          onChange={setEditorValue}
          onApply={() => { try { const next = JSON.parse(editorValue); setSpec(next); setToast('Applied'); setTimeout(()=> setToast(''), 1600); } catch (e:any) { alert('JSON 오류: '+ e.message); } }}
          onClose={() => setShowEditor(false)}
        />
      )}
      {showCanvas && (
        <CanvasEditorDrawer
          overlays={overlays}
          setOverlays={setOverlays}
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          selectedSet={selectedSet}
          setSelectedSet={setSelectedSet}
          overlaySize={overlaySize}
          setOverlaySize={setOverlaySize}
          snapEnabled={snapEnabled}
          setSnapEnabled={setSnapEnabled}
          gridSize={gridSize}
          setGridSize={setGridSize}
          undo={undo}
          redo={redo}
          exportCanvasPNG={exportCanvasPNG}
          onClose={()=> setShowCanvas(false)}
          svgRef={svgRef}
        />
      )}

      {showDataEditor && (
        <DataEditorDrawer
          spec={spec}
          setSpec={setSpec}
          tableCols={tableCols}
          setTableCols={setTableCols}
          tableRows={tableRows}
          setTableRows={setTableRows}
          palette={palette}
          setPalette={setPalette}
          onClose={()=> setShowDataEditor(false)}
          saveProject={saveProject}
        />
      )}
      {showWhiteboard && (
        <ExcalidrawEditor 
          onClose={() => setShowWhiteboard(false)}
          chartThumbnail={projects.find((p: any) => p.id === currentProjectId)?.imageSrc || null}
        />
      )}
    </div>
  );
}

// Auto-save current spec after idle 3s
export function useAutoSave(spec: any, save: () => void, setSaving: (b:boolean)=>void) {
  useEffect(() => {
    if (!spec) return;
    setSaving(true);
    const t = setTimeout(() => { try { save(); } finally { setSaving(false); } }, 3000);
    return () => clearTimeout(t);
  }, [spec]);
}


