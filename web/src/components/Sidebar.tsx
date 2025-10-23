import React, { useEffect, useState } from "react";

type SidebarProps = {
  onNew: () => void;
  onNewFromTemplate: (name: string, spec: any) => void;
  onLoad: (p: { id: string; name: string }) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  savedList: { id: string; name: string }[];
  currentId?: string | null;
};

export default function Sidebar({ onNew, onNewFromTemplate, onLoad, onRename, onDelete, savedList, currentId }: SidebarProps) {
  const [current, setCurrent] = useState<string>(typeof location !== 'undefined' ? (location.hash || '#/home') : '#/home');
  useEffect(() => {
    const fn = () => setCurrent(location.hash || '#/home');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return (
    <aside className="sidebar border bg-white" style={{ width: 88, display: "flex", flexDirection: "column", alignItems:'center', padding: "8px 8px", gap: 12 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <button className={`icon-btn${current.includes('/home') ? ' active' : ''}`} title="홈" onClick={(e) => { e.preventDefault(); (window as any).closeProject?.(); (window as any).setHomeTab?.('home'); (window as any).routerNavigate?.('/home'); }}>
          🏠
        </button>
        <div className="nav-label">홈</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <button className={`icon-btn${current.includes('/create') ? ' active' : ''}`} title="만들기" onClick={(e) => { e.preventDefault(); (window as any).goCreate?.(); (window as any).routerNavigate?.('/create'); setTimeout(()=>{ try { location.replace('#/create'); window.dispatchEvent(new HashChangeEvent('hashchange')); } catch {} }, 0); }}>＋</button>
        <div className="nav-label">만들기</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <button className={`icon-btn${current.includes('/projects') ? ' active' : ''}`} title="프로젝트" onClick={(e) => { e.preventDefault(); (window as any).closeProject?.(); (window as any).setHomeTab?.('projects'); (window as any).routerNavigate?.('/projects'); }}>📁</button>
        <div className="nav-label">프로젝트</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <button className={`icon-btn${current.includes('/templates') ? ' active' : ''}`} title="템플릿" onClick={(e) => { e.preventDefault(); (window as any).closeProject?.(); (window as any).setHomeTab?.('templates'); (window as any).routerNavigate?.('/templates'); }}>🧩</button>
        <div className="nav-label">템플릿</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <button className={`icon-btn`} title="Whiteboard" onClick={(e) => { e.preventDefault(); try { window.dispatchEvent(new Event('openWhiteboard')); } catch {} }}>
          ✏️
        </button>
        <div className="nav-label">Whiteboard</div>
      </div>
      <div style={{ flex:1 }} />
    </aside>
  );
}


