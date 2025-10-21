import React, { useRef } from "react";

type CreatePageProps = {
  onUpload: (file: File, dataUrl?: string) => void;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
};

export default function CreatePage({ onUpload, input, setInput, onSend }: CreatePageProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="center" style={{ height: "100%" }}>
      <div
        className="create-panel"
        onDragOver={(e)=>{ e.preventDefault(); }}
        onDrop={(e)=>{ e.preventDefault(); const f=e.dataTransfer.files?.[0]; if (f) { const r=new FileReader(); r.onload=()=> onUpload(f, r.result as string); r.readAsDataURL(f); } }}
      >
        <div className="create-title">프로젝트에 이미지를 추가하세요</div>
        <div className="create-sub">이미지를 끌어다 놓거나 업로드하고, 지시어를 입력해 차트를 수정하세요.</div>
        <div className="create-actions" style={{ flexWrap:'wrap', gap:8 }}>
          <button className="btn" onClick={() => fileRef.current?.click()}>+ 이미지 업로드</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (!e.target.files) return; const f=e.target.files[0]; const r=new FileReader(); r.onload=()=> onUpload(f, r.result as string); r.readAsDataURL(f); }} />
          <input className="create-input" placeholder="명령 입력 (예: 색상을 초록으로, 라인 차트로)" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=> e.key==='Enter' && onSend()} />
          <button className="btn" onClick={onSend}>Send</button>
        </div>
        <div className="create-hints">
          <span className="chip">예: 색상을 초록으로</span>
          <span className="chip">예: 막대를 가로로</span>
          <span className="chip">예: 파이 → 도넛</span>
        </div>
      </div>
    </div>
  );
}


