import React, { useRef, useState } from "react";

type CreatePageProps = {
  onUpload: (file: File, dataUrl?: string, instruction?: string) => void;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onCreateRandomChart: () => void;
  onGenerateRandomChart: () => void;
  busy: boolean;
};

export default function CreatePage({ onUpload, input, setInput, onSend, onCreateRandomChart, onGenerateRandomChart, busy }: CreatePageProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<{file: File, dataUrl: string} | null>(null);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage({ file, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  const handleSend = () => {
    if (uploadedImage) {
      // 이미지가 있으면 이미지와 명령어를 함께 전송
      onUpload(uploadedImage.file, uploadedImage.dataUrl, input.trim());
      setUploadedImage(null);
      setInput(""); // 입력 필드 비우기
    } else {
      // 이미지가 없으면 명령어만 전송
      onSend();
    }
  };

  return (
    <div className="center" style={{ height: "100%" }}>
      <div 
        className="create-panel"
        onDragOver={(e)=>{ e.preventDefault(); }}
        onDrop={(e)=>{ 
          e.preventDefault(); 
          const f=e.dataTransfer.files?.[0]; 
          if (f) { 
            handleImageUpload(f); 
          } 
        }}
      >
        <div className="create-title">새 프로젝트 만들기</div>
        <div className="create-sub">이미지를 업로드하거나 텍스트 명령어로 차트를 생성하세요.</div>
        
        {/* 이미지 미리보기 영역 */}
        {uploadedImage && (
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={uploadedImage.dataUrl} 
                alt="업로드된 이미지" 
                style={{ 
                  maxWidth: '300px', 
                  maxHeight: '200px', 
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  objectFit: 'contain'
                }} 
              />
              <button 
                onClick={removeImage}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="create-actions" style={{ flexWrap:'wrap', gap:8 }}>
          {!uploadedImage && (
            <>
              <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>+ 이미지 업로드</button>
              <button className="btn" onClick={onGenerateRandomChart} disabled={busy}>🎲 랜덤 차트 생성</button>
            </>
          )}
          <input 
            ref={fileRef} 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => { 
              if (!e.target.files) return; 
              handleImageUpload(e.target.files[0]); 
            }} 
          />
          <input 
            className="create-input" 
            placeholder={uploadedImage ? "이미지와 함께 명령 입력 (예: 색상을 초록으로)" : "명령 입력 (예: 막대 그래프를 만들어줘, 파이 차트로)"} 
            value={input} 
            onChange={e=>setInput(e.target.value)} 
            onKeyDown={e=> e.key==='Enter' && !busy && handleSend()} 
            disabled={busy}
          />
          <button className="btn" onClick={handleSend} disabled={(!input.trim() && !uploadedImage) || busy}>
            {busy ? '처리 중...' : (uploadedImage ? '이미지로 변환' : '생성')}
          </button>
        </div>
        
        <div className="create-hints">
          {uploadedImage ? (
            <>
              <span className="chip">예: 색상을 초록으로</span>
              <span className="chip">예: 막대를 가로로</span>
              <span className="chip">예: 파이 → 도넛</span>
            </>
          ) : (
            <>
              <span className="chip">예: 막대 그래프를 만들어줘</span>
              <span className="chip">예: 파이 차트로</span>
              <span className="chip">예: 라인 차트 생성</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


