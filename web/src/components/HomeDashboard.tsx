import React from "react";

type HomeDashboardProps = {
  mode: "home" | "projects" | "create" | "templates";
  projects: { id: string; name: string; updatedAt: number; imageSrc?: string | null }[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateEmpty: () => void;
  onTemplate: (name: string, spec: any) => void;
  onUploadClick: () => void;
};

export default function HomeDashboard({ mode, projects, onOpen, onDelete, onCreateEmpty, onTemplate, onUploadClick }: HomeDashboardProps) {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<'recent'|'name'>('recent');
  const filtered = React.useMemo(() => {
    const kw = q.trim().toLowerCase();
    let arr = !kw ? projects : projects.filter(p => p.name.toLowerCase().includes(kw));
    if (sort === 'recent') arr = arr.slice().sort((a,b)=> b.updatedAt - a.updatedAt);
    else arr = arr.slice().sort((a,b)=> a.name.localeCompare(b.name));
    return arr;
  }, [projects, q, sort]);
  const templateItems = React.useMemo(() => {
    const list = [
      '누적 막대', '그룹 막대', '산점도', '히트맵', '도넛', '라인', '면적', '파레토', '버블', '박스플롯', '히스토그램', '워드클라우드'
    ];
    const kw = q.trim().toLowerCase();
    return !kw ? list : list.filter(s => s.toLowerCase().includes(kw));
  }, [q]);
  return (
    <div>
      <div className="dash-hero">
        <div className="dash-hero-title">
          {mode === 'home' && '오늘은 무엇을 만들어 볼까요?'}
          {mode === 'projects' && '모든 프로젝트'}
          {mode === 'create' && '새 프로젝트 만들기'}
          {mode === 'templates' && '템플릿 둘러보기'}
        </div>
        {(mode === 'home' || mode === 'projects' || mode === 'templates') && (
          <div className="dash-search">
            <span className="dash-search-icon">🔎</span>
            <input className="dash-search-input" placeholder={mode==='templates'? '템플릿 검색' : '프로젝트 검색'} value={q} onChange={e=> setQ(e.target.value)} />
            {mode !== 'templates' && (
              <select className="btn dash-filter" value={sort} onChange={e=> setSort(e.target.value as any)}>
                <option value="recent">최신순</option>
                <option value="name">이름순</option>
              </select>
            )}
          </div>
        )}
      </div>

      {mode === 'home' ? (
        <>
          {/* simplified home: no top-right buttons to reduce duplication */}
          <div className="home-intro">
            <div className="home-intro-title">이미지에서 데이터까지, 차트를 더 빠르게</div>
            <div className="home-intro-sub">캔버스에 이미지를 올리면 AI가 데이터와 Vega‑Lite 차트를 제안합니다. 템플릿으로 시작하고 색상과 레이블을 즉시 수정해 보세요.</div>
          </div>
          <div className="feature-grid">
            <div className="step-card">
              <div className="step-emoji">🖼️</div>
              <div className="step-title">이미지 업로드</div>
              <div className="step-desc">스크린샷/사진을 드래그 앤 드롭하면 분석을 시작합니다.</div>
            </div>
            <div className="step-card">
              <div className="step-emoji">🤖</div>
              <div className="step-title">AI 변환</div>
              <div className="step-desc">데이터 테이블과 Vega‑Lite 스펙을 자동 생성합니다.</div>
            </div>
            <div className="step-card">
              <div className="step-emoji">🎛️</div>
              <div className="step-title">간편 편집/내보내기</div>
              <div className="step-desc">색상/레이블을 수정하고 JSON/CSV로 저장하세요.</div>
            </div>
          </div>
          <div className="dash-section-title">빠른 시작</div>
          <div className="feature-grid">
            <div className="step-card" onClick={()=> (window as any).routerNavigate?.('/create')} style={{ cursor:'pointer' }}>
              <div className="step-emoji" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '28px' }}>📊</div>
              <div className="step-title">새 프로젝트</div>
              <div className="step-desc">이미지 업로드 또는 템플릿 선택</div>
            </div>
            <div className="step-card" onClick={()=> (window as any).routerNavigate?.('/templates')} style={{ cursor:'pointer' }}>
              <div className="step-emoji" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '28px' }}>🎨</div>
              <div className="step-title">템플릿</div>
              <div className="step-desc">몇 번의 클릭으로 시작</div>
            </div>
            <div className="step-card" onClick={()=> (window as any).routerNavigate?.('/projects')} style={{ cursor:'pointer' }}>
              <div className="step-emoji" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '28px' }}>📁</div>
              <div className="step-title">프로젝트</div>
              <div className="step-desc">최근 작업으로 이동</div>
            </div>
          </div>
          <div className="dash-section-title">최근 프로젝트</div>
          <div className="dash-grid">
            {filtered.slice(0,6).map((p)=> (
              <div key={p.id} className="dash-card">
                <div className="thumb" style={p.imageSrc ? { backgroundImage:`url(${p.imageSrc})`, backgroundSize:'cover', backgroundPosition:'center' } : undefined} />
                <div className="meta">
                  <div className="name" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>{p.name}</span>
                    <span>
                      <button className="icon-btn" title="열기" onClick={()=> onOpen(p.id)}>↗</button>
                      <button className="icon-btn" title="삭제" onClick={()=> onDelete(p.id)}>🗑️</button>
                    </span>
                  </div>
                  <div className="sub">{new Date(p.updatedAt).toLocaleString()} 저장됨</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : mode === 'projects' ? (
        <>
          <div className="dash-section-title">최근</div>
          <div className="dash-grid">
            {projects.length === 0 ? (
              <div className="muted">아직 프로젝트가 없습니다. 왼쪽의 <span style={{ whiteSpace:'nowrap' }}>‘만들기’</span>에서 시작해 보세요.</div>
            ) : (
              filtered.map((p)=> (
                <div key={p.id} className="dash-card">
                  <div className="thumb" style={p.imageSrc ? { backgroundImage:`url(${p.imageSrc})`, backgroundSize:'cover', backgroundPosition:'center' } : undefined} />
                  <div className="meta">
                    <div className="name" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span>{p.name}</span>
                      <span>
                        <button className="icon-btn" title="열기" onClick={()=> { (window as any).routerNavigate?.(`/project/${p.id}`); onOpen(p.id); }}>↗</button>
                        <button className="icon-btn" title="이름 변경" onClick={()=> { const name = prompt('프로젝트 이름', p.name) || p.name; (window as any).renameProject?.(p.id, name); }}>✏️</button>
                        <button className="icon-btn" title="다운로드" onClick={()=> (window as any).downloadProject?.(p.id)}>⬇</button>
                        <button className="icon-btn" title="삭제" onClick={()=> onDelete(p.id)}>🗑️</button>
                      </span>
                    </div>
                    <div className="sub">{new Date(p.updatedAt).toLocaleString()} 저장됨</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : mode === 'create' ? (
        <>
          <div className="dash-controls" style={{ marginTop: 0 }}>
            <div />
            <div className="dash-actions">
              <button className="btn" onClick={()=> { onCreateEmpty(); (window as any).routerNavigate?.('/projects'); }}>새 프로젝트</button>
              <button className="btn" onClick={onUploadClick}>이미지 업로드</button>
            </div>
          </div>
          <div className="dash-section-title">빠르게 시작하기 (템플릿)</div>
          <div className="dash-grid">
            <div className="dash-card" onClick={()=> onTemplate('Bar Chart', { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { category: "A", value: 28 }, { category: "B", value: 55 }, { category: "C", value: 43 } ] }, mark: "bar", encoding: { x: { field: "category", type: "nominal", axis: { title: null } }, y: { field: "value", type: "quantitative", axis: { grid: true } }, color: { field: "category", type: "nominal" } }, width: 520, height: 320 })}>
              <div className="thumb" style={{ backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHg9IjIwIiB5PSI4MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjgwIiB5PSI0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRUE0NDQ0Ii8+CjxyZWN0IHg9IjE0MCIgeT0iNjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzEwQjk4MSIvPgo8dGV4dCB4PSI0MCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDAwIiBmb250LXNpemU9IjEyIj5BPC90ZXh0Pgo8dGV4dCB4PSIxMDAiIHk9IjExMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwMCIgZm9udC1zaXplPSIxMiI+QjwvdGV4dD4KPHRleHQgeD0iMTYwIiB5PSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwMDAiIGZvbnQtc2l6ZT0iMTIiPkM8L3RleHQ+Cjwvc3ZnPgo=")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="meta"><div className="name">막대 차트</div><div className="sub">기본 카테고리/값</div></div>
            </div>
            <div className="dash-card" onClick={()=> onTemplate('Line Chart', { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { x: 1, y: 3 }, { x: 2, y: 7 }, { x: 3, y: 5 }, { x: 4, y: 9 } ] }, mark: { type: "line", interpolate: "monotone" }, encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative", axis: { grid: true } } }, width: 520, height: 320 })}>
              <div className="thumb" style={{ backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yMCA5MEw2MCAzMEwxMDAgNzBMMTQwIDUwTDE4MCAxMCIgc3Ryb2tlPSIjNjM2NkYxIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSI5MCIgcj0iNCIgZmlsbD0iIzYzNjZGMTIiLz4KPGNpcmNsZSBjeD0iNjAiIGN5PSIzMCIgcj0iNCIgZmlsbD0iIzYzNjZGMTIiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNzAiIHI9IjQiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iMTQwIiBjeT0iNTAiIHI9IjQiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iMTgwIiBjeT0iMTAiIHI9IjQiIGZpbGw9IiM2MzY2RjEiLz4KPC9zdmc+Cg==")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="meta"><div className="name">라인 차트</div><div className="sub">연속형 x/y</div></div>
            </div>
            <div className="dash-card" onClick={()=> onTemplate('Pie Chart', { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { c: "A", v: 4 }, { c: "B", v: 6 }, { c: "C", v: 3 } ] }, mark: { type: "arc" }, encoding: { theta: { field: "v", type: "quantitative" }, color: { field: "c", type: "nominal" } }, width: 480, height: 320 })}>
              <div className="thumb" style={{ backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMDAgMTBBOTAgOTAgMCAwIDEgMTY5LjY0IDQwLjM2QTkwIDkwIDAgMCAxIDEwMCAxMDBaIiBmaWxsPSIjNjM2NkYxIi8+CjxwYXRoIGQ9Ik0xNjkuNjQgNDAuMzZBOTAgOTAgMCAwIDEgMTY5LjY0IDc5LjY0QTkwIDkwIDAgMCAxIDEwMCAxMDBaIiBmaWxsPSIjRUE0NDQ0Ii8+CjxwYXRoIGQ9Ik0xNjkuNjQgNzkuNjRBOTAgOTAgMCAwIDEgMTAwIDEwQTkwIDkwIDAgMCAxIDEwMCAxMDBaIiBmaWxsPSIjMTBCOTgxIi8+Cjx0ZXh0IHg9IjEzNSIgeT0iNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwMDAiIGZvbnQtc2l6ZT0iMTIiPkE8L3RleHQ+Cjx0ZXh0IHg9IjE0NSIgeT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwMDAiIGZvbnQtc2l6ZT0iMTIiPkI8L3RleHQ+Cjx0ZXh0IHg9IjEyNSIgeT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwMDAiIGZvbnQtc2l6ZT0iMTIiPkM8L3RleHQ+Cjwvc3ZnPgo=")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="meta"><div className="name">파이 차트</div><div className="sub">도메인/라벨 포함</div></div>
            </div>
            <div className="dash-card" onClick={()=> onTemplate('Scatter Plot', { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { x: 1, y: 3, size: 10 }, { x: 2, y: 7, size: 30 }, { x: 3, y: 5, size: 20 }, { x: 4, y: 9, size: 25 } ] }, mark: "point", encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" }, size: { field: "size", type: "quantitative" } }, width: 520, height: 320 })}>
              <div className="thumb" style={{ backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjQwIiBjeT0iOTAiIHI9IjgiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iODAiIGN5PSI0MCIgcj0iMTIiIGZpbGw9IiNFQTRENDQiLz4KPGNpcmNsZSBjeD0iMTIwIiBjeT0iNjAiIHI9IjEwIiBmaWxsPSIjMTBCOTgxIi8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjIwIiByPSIxMSIgZmlsbD0iI0Y1OTAwIi8+Cjwvc3ZnPgo=")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="meta"><div className="name">산점도</div><div className="sub">크기별 버블</div></div>
            </div>
            <div className="dash-card" onClick={()=> onTemplate('Area Chart', { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { x: 1, y: 3 }, { x: 2, y: 7 }, { x: 3, y: 5 }, { x: 4, y: 9 } ] }, mark: { type: "area", interpolate: "monotone", opacity: 0.6 }, encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } }, width: 520, height: 320 })}>
              <div className="thumb" style={{ backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yMCA5MEw2MCAzMEwxMDAgNzBMMTQwIDUwTDE4MCAxMEwyMDAgMTBMMjAwIDEyMEwyMCAxMjBaIiBmaWxsPSIjNjM2NkYxIiBmaWxsLW9wYWNpdHk9IjAuNiIvPgo8cGF0aCBkPSJNMjAgOTBMNjAgMzBMMTAwIDcwTDE0MCA1MEwxODAgMTAiIHN0cm9rZT0iIzYzNjZGMTIiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="meta"><div className="name">면적 차트</div><div className="sub">투명도 적용</div></div>
            </div>
            <div className="dash-card" onClick={()=> onTemplate('Donut Chart', { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { c: "A", v: 4 }, { c: "B", v: 6 }, { c: "C", v: 3 } ] }, mark: { type: "arc", innerRadius: 60 }, encoding: { theta: { field: "v", type: "quantitative" }, color: { field: "c", type: "nominal" } }, width: 480, height: 320 })}>
              <div className="thumb" style={{ backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMDAgMTBBOTAgOTAgMCAwIDEgMTY5LjY0IDQwLjM2QTkwIDkwIDAgMCAxIDEwMCAxMDBaIiBmaWxsPSIjNjM2NkYxIi8+CjxwYXRoIGQ9Ik0xNjkuNjQgNDAuMzZBOTAgOTAgMCAwIDEgMTY5LjY0IDc5LjY0QTkwIDkwIDAgMCAxIDEwMCAxMDBaIiBmaWxsPSIjRUE0NDQ0Ii8+CjxwYXRoIGQ9Ik0xNjkuNjQgNzkuNjRBOTAgOTAgMCAwIDEgMTAwIDEwQTkwIDkwIDAgMCAxIDEwMCAxMDBaIiBmaWxsPSIjMTBCOTgxIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjU1IiByPSIzMCIgZmlsbD0iI0ZGRiIvPgo8dGV4dCB4PSIxMzUiIHk9IjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDAwIiBmb250LXNpemU9IjEyIj5BPC90ZXh0Pgo8dGV4dCB4PSIxNDUiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDAwIiBmb250LXNpemU9IjEyIj5CPC90ZXh0Pgo8dGV4dCB4PSIxMjUiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDAwIiBmb250LXNpemU9IjEyIj5DPC90ZXh0Pgo8L3N2Zz4K")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="meta"><div className="name">도넛 차트</div><div className="sub">내부 구멍 포함</div></div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="dash-section-title">템플릿 모음</div>
          <div className="dash-grid">
            {templateItems.map((label, i)=> {
              const thumbnails: any = {
                '누적 막대': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHg9IjIwIiB5PSI2MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRUE0NDQ0Ii8+CjxyZWN0IHg9IjgwIiB5PSI0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjgwIiB5PSIyMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRUE0NDQ0Ii8+CjxyZWN0IHg9IjE0MCIgeT0iNjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzYzNjZGMTIiLz4KPHJlY3QgeD0iMTQwIiB5PSI0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRUE0NDQ0Ii8+Cjwvc3ZnPgo=',
                '그룹 막대': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHg9IjIwIiB5PSI2MCIgd2lkdGg9IjE1IiBoZWlnaHQ9IjYwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjQwIiB5PSI4MCIgd2lkdGg9IjE1IiBoZWlnaHQ9IjQwIiBmaWxsPSIjRUE0NDQ0Ii8+CjxyZWN0IHg9IjgwIiB5PSI0MCIgd2lkdGg9IjE1IiBoZWlnaHQ9IjgwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjEwMCIgeT0iNjAiIHdpZHRoPSIxNSIgaGVpZ2h0PSI2MCIgZmlsbD0iI0VBNEQ0NCIvPgo8cmVjdCB4PSIxNDAiIHk9IjIwIiB3aWR0aD0iMTUiIGhlaWdodD0iMTAwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjE2MCIgeT0iNDAiIHdpZHRoPSIxNSIgaGVpZ2h0PSI4MCIgZmlsbD0iI0VBNEQ0NCIvPgo8L3N2Zz4K',
                '산점도': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjQwIiBjeT0iOTAiIHI9IjgiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iODAiIGN5PSI0MCIgcj0iMTIiIGZpbGw9IiNFQTRENDQiLz4KPGNpcmNsZSBjeD0iMTIwIiBjeT0iNjAiIHI9IjEwIiBmaWxsPSIjMTBCOTgxIi8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjIwIiByPSIxMSIgZmlsbD0iI0Y1OTAwIi8+Cjwvc3ZnPgo=',
                '히트맵': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjM1IiBoZWlnaHQ9IjM1IiBmaWxsPSIjRkZEREREIiBzdHJva2U9IiNDQ0MiIHN0cm9rZS13aWR0aD0iMSIvPgo8cmVjdCB4PSI4MCIgeT0iNDAiIHdpZHRoPSIzNSIgaGVpZ2h0PSIzNSIgZmlsbD0iI0ZGQUFBQSIgc3Ryb2tlPSIjQ0NDIiBzdHJva2Utd2lkdGg9IjEiLz4KPHJlY3QgeD0iMTIwIiB5PSI0MCIgd2lkdGg9IjM1IiBoZWlnaHQ9IjM1IiBmaWxsPSIjRkY2NjY2IiBzdHJva2U9IiNDQ0MiIHN0cm9rZS13aWR0aD0iMSIvPgo8cmVjdCB4PSI0MCIgeT0iODAiIHdpZHRoPSIzNSIgaGVpZ2h0PSIzNSIgZmlsbD0iI0ZGQUFBQSIgc3Ryb2tlPSIjQ0NDIiBzdHJva2Utd2lkdGg9IjEiLz4KPHJlY3QgeD0iODAiIHk9IjgwIiB3aWR0aD0iMzUiIGhlaWdodD0iMzUiIGZpbGw9IiNGRjMzMzMiIHN0cm9rZT0iI0NDQyIgc3Ryb2tlLXdpZHRoPSIxIi8+CjxyZWN0IHg9IjEyMCIgeT0iODAiIHdpZHRoPSIzNSIgaGVpZ2h0PSIzNSIgZmlsbD0iI0ZGQUFBQSIgc3Ryb2tlPSIjQ0NDIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+Cg==',
                '도넛': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjYwIiByPSI0NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjM2NkYxIiBzdHJva2Utd2lkdGg9IjI1IiBzdHJva2UtZGFzaGFycmF5PSIxNDEgMjgyIiAvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSI2MCIgcj0iNDUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0VBNEQ0NCIgc3Ryb2tlLXdpZHRoPSIyNSIgc3Ryb2tlLWRhc2hhcnJheT0iOTQgMjgyIiBzdHJva2UtZGFzaG9mZnNldD0iLTE0MSIgLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNjAiIHI9IjQ1IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMEI5ODEiIHN0cm9rZS13aWR0aD0iMjUiIHN0cm9rZS1kYXNoYXJyYXk9IjQ3IDI4MiIgc3Ryb2tlLWRhc2hvZmZzZXQ9Ii0yMzUiIC8+Cjwvc3ZnPgo=',
                '라인': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yMCA5MEw2MCAzMEwxMDAgNzBMMTQwIDUwTDE4MCAxMCIgc3Ryb2tlPSIjNjM2NkYxIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSI5MCIgcj0iNCIgZmlsbD0iIzYzNjZGMTIiLz4KPGNpcmNsZSBjeD0iNjAiIGN5PSIzMCIgcj0iNCIgZmlsbD0iIzYzNjZGMTIiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNzAiIHI9IjQiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iMTQwIiBjeT0iNTAiIHI9IjQiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iMTgwIiBjeT0iMTAiIHI9IjQiIGZpbGw9IiM2MzY2RjEiLz4KPC9zdmc+Cg==',
                '면적': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yMCA5MEw2MCAzMEwxMDAgNzBMMTQwIDUwTDE4MCAxMEwyMDAgMTBMMjAwIDEyMEwyMCAxMjBaIiBmaWxsPSIjNjM2NkYxIiBmaWxsLW9wYWNpdHk9IjAuNiIvPgo8cGF0aCBkPSJNMjAgOTBMNjAgMzBMMTAwIDcwTDE0MCA1MEwxODAgMTAiIHN0cm9rZT0iIzYzNjZGMTIiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K',
                '파레토': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHg9IjIwIiB5PSI4MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjYwIiB5PSI2MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjEwMCIgeT0iNzAiIHdpZHRoPSIzMCIgaGVpZ2h0PSI1MCIgZmlsbD0iIzYzNjZGMTIiLz4KPHJlY3QgeD0iMTQwIiB5PSI5MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjNjM2NkYxIi8+CjxwYXRoIGQ9Ik0yMCA4MEw1MCA1MEw4MCAzMEwxMTAgMjBMMTQwIDE1IiBzdHJva2U9IiNGRjAwNkUiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K',
                '버블': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjQwIiBjeT0iOTAiIHI9IjgiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iODAiIGN5PSI0MCIgcj0iMTIiIGZpbGw9IiNFQTRENDQiLz4KPGNpcmNsZSBjeD0iMTIwIiBjeT0iNjAiIHI9IjEwIiBmaWxsPSIjMTBCOTgxIi8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjIwIiByPSIxMSIgZmlsbD0iI0Y1OTAwIi8+Cjwvc3ZnPgo=',
                '박스플롯': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHg9IjQwIiB5PSI2MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjNjM2NkYxIiBmaWxsLW9wYWNpdHk9IjAuMyIvPgo8bGluZSB4MT0iNDAiIHkxPSI0MCIgeDI9IjEyMCIgeTI9IjQwIiBzdHJva2U9IiM2MzY2RjEiIHN0cm9rZS13aWR0aD0iMiIvPgo8bGluZSB4MT0iNDAiIHkxPSIxMDAiIHgyPSIxMjAiIHkyPSIxMDAiIHN0cm9rZT0iIzYzNjZGMTIiIHN0cm9rZS13aWR0aD0iMiIvPgo8bGluZSB4MT0iODAiIHkxPSI0MCIgeDI9IjgwIiB5Mj0iMTAwIiBzdHJva2U9IiM2MzY2RjEiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K',
                '히스토그램': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHg9IjIwIiB5PSI4MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjQ1IiB5PSI2MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjcwIiB5PSI0MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9Ijk1IiB5PSI2MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjNjM2NkYxIi8+CjxyZWN0IHg9IjEyMCIgeT0iODAiIHdpZHRoPSIyMCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzYzNjZGMTIiLz4KPHJlY3QgeD0iMTQ1IiB5PSI5MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjNjM2NkYxIi8+Cjwvc3ZnPgo=',
                '워드클라우드': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+Cjx0ZXh0IHg9IjUwIiB5PSI0MCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzYzNjZGMTIiPkRhdGE8L3RleHQ+Cjx0ZXh0IHg9IjEyMCIgeT0iNjAiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiNFQTRENDQiPkNoYXJ0PC90ZXh0Pgo8dGV4dCB4PSI4MCIgeT0iODAiIGZvbnQtc2l6ZT0iMjIiIGZpbGw9IiMxMEI5ODEiPlZpc3VhbDwvdGV4dD4KPHRleHQgeD0iMTQwIiB5PSIzMCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0Y1OTAwIj5HcmFwaDwvdGV4dD4KPC9zdmc+Cg=='
              };
              
              return (
              <div key={i} className="dash-card" onClick={()=>{
                // create a dummy project with sample data by template label
                const samples: any = {
                    '누적 막대': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { category: "Q1", sales: 100, profit: 30 }, { category: "Q2", sales: 120, profit: 40 }, { category: "Q3", sales: 90, profit: 25 }, { category: "Q4", sales: 110, profit: 35 } ] }, mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "sales", type: "quantitative" }, color: { field: "profit", type: "quantitative", scale: { scheme: "viridis" } } }, width: 400, height: 300 },
                    '그룹 막대': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { category: "A", value: 28, group: "X" }, { category: "A", value: 15, group: "Y" }, { category: "B", value: 55, group: "X" }, { category: "B", value: 32, group: "Y" }, { category: "C", value: 43, group: "X" }, { category: "C", value: 25, group: "Y" } ] }, mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" }, color: { field: "group", type: "nominal" }, column: { field: "group", type: "nominal" } }, width: 200, height: 300 },
                    '산점도': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { x: 1, y: 3, size: 10, category: "A" }, { x: 2, y: 7, size: 30, category: "B" }, { x: 3, y: 5, size: 20, category: "A" }, { x: 4, y: 9, size: 25, category: "B" }, { x: 5, y: 2, size: 15, category: "A" } ] }, mark: "point", encoding: { x: { field: "x", type: "quantitative", scale: { zero: false } }, y: { field: "y", type: "quantitative", scale: { zero: false } }, size: { field: "size", type: "quantitative" }, color: { field: "category", type: "nominal" } }, width: 400, height: 300 },
                    '히트맵': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { day: "Mon", hour: 0, value: 1 }, { day: "Mon", hour: 6, value: 3 }, { day: "Mon", hour: 12, value: 5 }, { day: "Mon", hour: 18, value: 2 }, { day: "Tue", hour: 0, value: 2 }, { day: "Tue", hour: 6, value: 4 }, { day: "Tue", hour: 12, value: 6 }, { day: "Tue", hour: 18, value: 3 }, { day: "Wed", hour: 0, value: 1 }, { day: "Wed", hour: 6, value: 2 }, { day: "Wed", hour: 12, value: 4 }, { day: "Wed", hour: 18, value: 2 } ] }, mark: "rect", encoding: { x: { field: "day", type: "ordinal" }, y: { field: "hour", type: "ordinal" }, color: { field: "value", type: "quantitative", scale: { scheme: "reds" } } }, width: 400, height: 300 },
                    '도넛': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { category: "Desktop", value: 45 }, { category: "Mobile", value: 30 }, { category: "Tablet", value: 15 }, { category: "Other", value: 10 } ] }, mark: { type: "arc", innerRadius: 50 }, encoding: { theta: { field: "value", type: "quantitative" }, color: { field: "category", type: "nominal", scale: { scheme: "category20" } } }, width: 300, height: 300 },
                    '라인': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { month: "Jan", temperature: 2 }, { month: "Feb", temperature: 4 }, { month: "Mar", temperature: 8 }, { month: "Apr", temperature: 15 }, { month: "May", temperature: 20 }, { month: "Jun", temperature: 25 } ] }, mark: { type: "line", point: true }, encoding: { x: { field: "month", type: "ordinal" }, y: { field: "temperature", type: "quantitative" }, color: { value: "#1f77b4" } }, width: 400, height: 300 },
                    '면적': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { year: 2010, value: 100 }, { year: 2011, value: 120 }, { year: 2012, value: 90 }, { year: 2013, value: 110 }, { year: 2014, value: 130 }, { year: 2015, value: 140 } ] }, mark: { type: "area", interpolate: "monotone", opacity: 0.7 }, encoding: { x: { field: "year", type: "ordinal" }, y: { field: "value", type: "quantitative" }, color: { value: "#ff7f0e" } }, width: 400, height: 300 },
                    '파레토': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { category: "A", value: 40 }, { category: "B", value: 30 }, { category: "C", value: 20 }, { category: "D", value: 10 } ] }, layer: [ { mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" }, color: { value: "#1f77b4" } } }, { transform: [{ window: [{ op: "sum", field: "value", as: "sum" }], frame: [null, 0] }, { calculate: "datum.value/datum.sum", as: "percent" }], mark: { type: "line", color: "#ff7f0e" }, encoding: { x: { field: "category", type: "nominal" }, y: { field: "percent", type: "quantitative", scale: { domain: [0, 1] } } } } ], width: 400, height: 300 },
                    '버블': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { x: 1, y: 3, size: 10, category: "A" }, { x: 2, y: 7, size: 30, category: "B" }, { x: 3, y: 5, size: 20, category: "A" }, { x: 4, y: 9, size: 25, category: "B" }, { x: 5, y: 2, size: 15, category: "A" } ] }, mark: "point", encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" }, size: { field: "size", type: "quantitative", scale: { range: [50, 500] } }, color: { field: "category", type: "nominal" } }, width: 400, height: 300 },
                    '박스플롯': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { category: "A", value: 1 }, { category: "A", value: 2 }, { category: "A", value: 3 }, { category: "A", value: 4 }, { category: "A", value: 5 }, { category: "B", value: 2 }, { category: "B", value: 3 }, { category: "B", value: 4 }, { category: "B", value: 5 }, { category: "B", value: 6 } ] }, mark: "boxplot", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" } }, width: 300, height: 300 },
                    '히스토그램': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { value: 1 }, { value: 2 }, { value: 2 }, { value: 3 }, { value: 3 }, { value: 3 }, { value: 4 }, { value: 4 }, { value: 5 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }, { value: 10 } ] }, mark: "bar", encoding: { x: { bin: { maxbins: 10 }, field: "value", type: "quantitative" }, y: { aggregate: "count", type: "quantitative" } }, width: 400, height: 300 },
                    '워드클라우드': { $schema: "https://vega.github.io/schema/vega-lite/v5.json", data: { values: [ { word: "Data", size: 20 }, { word: "Visualization", size: 15 }, { word: "Chart", size: 18 }, { word: "Analysis", size: 12 }, { word: "Graph", size: 16 }, { word: "Statistics", size: 14 } ] }, mark: "text", encoding: { text: { field: "word", type: "nominal" }, size: { field: "size", type: "quantitative", scale: { range: [10, 30] } }, color: { field: "size", type: "quantitative", scale: { scheme: "viridis" } } }, width: 400, height: 300 }
                } as any;
                const spec = samples[label] || samples['라인'];
                (window as any).setHomeTab?.('create');
                // use onTemplate to create immediately
                onTemplate(label, spec);
              }}>
                  <div className="thumb" style={{ backgroundImage: `url("${thumbnails[label] || thumbnails['라인']}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="meta"><div className="name">{label}</div><div className="sub">데이터 선택 후 생성</div></div>
              </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


