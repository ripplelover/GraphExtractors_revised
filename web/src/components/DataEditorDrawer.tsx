import React, { useState } from 'react';
import { findColorEncoding, updateDataValues } from '../utils/dataUtils';

type DataEditorDrawerProps = {
  spec: any;
  setSpec: (s: any) => void;
  tableCols: string[];
  setTableCols: (cols: string[]) => void;
  tableRows: any[];
  setTableRows: (rows: any[]) => void;
  palette: string[];
  setPalette: (updater: any) => void;
  onClose: () => void;
  saveProject: () => void;
};

export default function DataEditorDrawer({ spec, setSpec, tableCols, setTableCols, tableRows, setTableRows, palette, setPalette, onClose, saveProject }: DataEditorDrawerProps) {
  const [draggingRowIndex, setDraggingRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top'|'bottom'|null>(null);

  function parseMaybeNumber(v:any){
    if (v === '' || v === null || v === undefined) return '';
    const n = Number(v);
    return isNaN(n) ? v : n;
  }

  function applyDataEditor() {
    try {
      const values = tableRows.map(r => {
        const obj: any = {};
        tableCols.forEach(c => { obj[c] = parseMaybeNumber((r as any)[c]); });
        return obj;
      });
      const next = JSON.parse(JSON.stringify(spec));
      updateDataValues(next, values);
      if (palette && palette.length) {
        const colorEnc = findColorEncoding(next);
        if (colorEnc) {
          colorEnc.scale = colorEnc.scale || {};
          colorEnc.scale.range = palette;
        }
      }
      setSpec(next);
      saveProject();
      onClose();
    } catch (e:any) {
      alert('데이터 적용 중 오류: ' + e.message);
    }
  }

  return (
    <div className="data-editor">
      <div className="head">
        <div>데이터 편집</div>
        <div className="flex gap-2">
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
      <div className="body">
        <div style={{ marginBottom:8, display:'flex', gap:8 }}>
          <button className="btn" onClick={()=> setTableRows([...tableRows, Object.fromEntries(tableCols.map(c=>[c,'' ]))])}>행 추가</button>
          <button className="btn" onClick={()=> tableRows.length>0 && setTableRows(tableRows.slice(0,-1))}>행 삭제</button>
          <button className="btn" onClick={()=> { const name = prompt('새 컬럼 이름', 'value'); if (!name) return; setTableCols([...tableCols, name]); setTableRows(tableRows.map(r=> ({...r, [name]: ''}))); }}>열 추가</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              {tableCols.map((c, i)=> (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r, ri)=> (
              <tr
                key={ri}
                onDragOver={(e)=>{ e.preventDefault(); const rect=(e.currentTarget as HTMLTableRowElement).getBoundingClientRect(); const pos = (e.clientY - rect.top) < rect.height/2 ? 'top' : 'bottom'; setDragOverRowIndex(ri); setDragOverPosition(pos as any); }}
                onDragLeave={()=> { setDragOverRowIndex(null); setDragOverPosition(null); }}
                onDrop={(e)=>{ e.preventDefault(); if (draggingRowIndex===null) return; let from = draggingRowIndex; let insertIndex = ri + (dragOverPosition==='bottom' ? 1 : 0); const arr=[...tableRows]; const [moved] = arr.splice(from,1); if (from < insertIndex) insertIndex -= 1; if (insertIndex < 0) insertIndex = 0; if (insertIndex > arr.length) insertIndex = arr.length; arr.splice(insertIndex,0,moved); setTableRows(arr); 
                  // Apply data changes immediately
                  try {
                    const values = arr.map(r => {
                      const obj: any = {};
                      tableCols.forEach(c => { obj[c] = parseMaybeNumber((r as any)[c]); });
                      return obj;
                    });
                    const next = JSON.parse(JSON.stringify(spec));
                    updateDataValues(next, values);
                    setSpec(next); saveProject();
                  } catch(err) { console.error('Failed to apply row reorder:', err); }
                  setDraggingRowIndex(null); setDragOverRowIndex(null); setDragOverPosition(null); }}
                className={`${draggingRowIndex===ri ? 'dragging' : ''} ${dragOverRowIndex===ri && dragOverPosition==='top' ? 'drag-over-top' : ''} ${dragOverRowIndex===ri && dragOverPosition==='bottom' ? 'drag-over-bottom' : ''}`}
              >
                <td className="row-drag-cell">
                  <span
                    className="row-drag-handle"
                    title="드래그하여 순서 변경"
                    draggable
                    onDragStart={(e)=>{ setDraggingRowIndex(ri); try { (e as any).dataTransfer.effectAllowed='move'; (e as any).dataTransfer.setData('text/plain', String(ri)); } catch {} }}
                    onDragEnd={()=> { setDraggingRowIndex(null); setDragOverRowIndex(null); setDragOverPosition(null); }}
                  >⋮⋮</span>
                </td>
                {tableCols.map((c, ci)=> (
                  <td key={ci}><input value={(r as any)[c]} onChange={e=>{ const v=e.target.value; setTableRows(prev=> prev.map((row, idx)=> idx===ri ? {...row, [c]: v} : row)); }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop:12 }}>
          <div className="muted" style={{ marginBottom:6 }}>팔레트</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {palette.map((col, i)=> (
              <input key={i} type="color" value={col} onChange={e=> setPalette((p:any)=> p.map((v:string,idx:number)=> idx===i ? e.target.value : v))} />
            ))}
            <button className="btn" onClick={()=> setPalette((p:any)=> [...p, '#4e79a7'])}>색상 추가</button>
            {palette.length>0 && <button className="btn" onClick={()=> setPalette((p:any)=> p.slice(0,-1))}>색상 제거</button>}
          </div>
        </div>
      </div>
      <div className="sticky-actions">
        <button className="btn" onClick={applyDataEditor}>적용</button>
      </div>
    </div>
  );
}

