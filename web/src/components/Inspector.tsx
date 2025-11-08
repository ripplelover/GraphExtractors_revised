import React, { useState, useRef } from "react";

export default function Inspector({ spec, onChange }: { spec: any | null; onChange: (s: any) => void }) {
  const [showFullSpec, setShowFullSpec] = useState(false);
  const [specText, setSpecText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalSpec, setOriginalSpec] = useState<any>(null);
  
  // Store original spec on first render
  React.useEffect(() => {
    if (spec && !originalSpec) {
      setOriginalSpec(JSON.parse(JSON.stringify(spec)));
    }
  }, [spec, originalSpec]);
  
  if (!spec) return <aside className="border bg-white" style={{ width: 300 }} />;
  
  const next = (path: string[], value: any) => {
    const copy = JSON.parse(JSON.stringify(spec));
    let cur: any = copy;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] = cur[path[i]] ?? {};
    cur[path[path.length - 1]] = value;
    onChange(copy);
  };
  
  const handleEditFullSpec = () => {
    setSpecText(JSON.stringify(spec, null, 2));
    setIsEditing(true);
  };
  
  const handleSaveSpec = () => {
    try {
      const parsed = JSON.parse(specText);
      onChange(parsed);
      setIsEditing(false);
    } catch (e) {
      alert('Invalid JSON: ' + (e as Error).message);
    }
  };
  
  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        onChange(parsed);
        alert('File loaded successfully!');
      } catch (e) {
        alert('Failed to load file: ' + (e as Error).message);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };
  
  const handleSaveToFile = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vega-lite-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleExportImage = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Chart not found. Please wait for the chart to load.');
      return;
    }
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chart.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  
  const handleResetCanvas = () => {
    if (originalSpec && confirm('Are you sure you want to reset to the original spec?')) {
      onChange(JSON.parse(JSON.stringify(originalSpec)));
      setSpecText(JSON.stringify(originalSpec, null, 2));
    }
  };
  
  const xField = spec?.encoding?.x?.field ?? "";
  const yField = spec?.encoding?.y?.field ?? "";
  const colorField = spec?.encoding?.color?.field ?? "";
  
  return (
    <aside className="border bg-white" style={{ width: 300, display: "flex", flexDirection: "column" }}>
      <div className="p-3 border-b" style={{ fontWeight: 600 }}>Inspector</div>
      
      {!showFullSpec ? (
        <div className="p-3" style={{ display: "grid", gap: 12, flex: 1, overflow: "auto" }}>
          <div>
            <div className="text-sm" style={{ color: "#6b7280" }}>Title</div>
            <input className="border rounded px-2 py-1 w-full" value={spec.title ?? ""} onChange={(e) => next(["title"], e.target.value)} />
          </div>
          <div>
            <div className="text-sm" style={{ color: "#6b7280" }}>X Field</div>
            <input className="border rounded px-2 py-1 w-full" value={xField} onChange={(e) => next(["encoding","x","field"], e.target.value)} />
          </div>
          <div>
            <div className="text-sm" style={{ color: "#6b7280" }}>Y Field</div>
            <input className="border rounded px-2 py-1 w-full" value={yField} onChange={(e) => next(["encoding","y","field"], e.target.value)} />
          </div>
          <div>
            <div className="text-sm" style={{ color: "#6b7280" }}>Color Field</div>
            <input className="border rounded px-2 py-1 w-full" value={colorField} onChange={(e) => next(["encoding","color","field"], e.target.value)} />
          </div>
          <div>
            <div className="text-sm" style={{ color: "#6b7280" }}>Background</div>
            <input type="color" className="border rounded px-2 py-1 w-full" value={spec?.config?.background ?? "#ffffff"} onChange={(e) => next(["config","background"], e.target.value)} />
          </div>
          
          <div className="border-t pt-3" style={{ display: "grid", gap: 8 }}>
            <button 
              className="border rounded px-3 py-2 w-full" 
              onClick={() => {
                setShowFullSpec(true);
                setSpecText(JSON.stringify(spec, null, 2));
              }}
            >
              📄 Full Vega-Lite Spec
            </button>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button 
                className="border rounded px-2 py-1 text-sm" 
                onClick={handleOpenFile}
                title="Open Vega-Lite spec file"
              >
                📂 Open
              </button>
              <button 
                className="border rounded px-2 py-1 text-sm" 
                onClick={handleSaveToFile}
                title="Save spec to file"
              >
                💾 Save
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <button 
                className="border rounded px-2 py-1 text-sm" 
                onClick={handleExportImage}
                title="Export chart as image"
              >
                🖼️ Export
              </button>
              <button 
                className="border rounded px-2 py-1 text-sm" 
                onClick={handleResetCanvas}
                title="Reset to original spec"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="p-3 border-b" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button 
                className="border rounded px-3 py-1" 
                onClick={() => {
                  setShowFullSpec(false);
                  setIsEditing(false);
                }}
              >
                ← Back
              </button>
              {!isEditing ? (
                <button 
                  className="border rounded px-3 py-1" 
                  onClick={handleEditFullSpec}
                >
                  ✏️ Edit
                </button>
              ) : (
                <button 
                  className="border rounded px-3 py-1 bg-blue-600 text-white" 
                  onClick={handleSaveSpec}
                >
                  💾 Save
                </button>
              )}
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button 
                className="border rounded px-2 py-1 text-xs" 
                onClick={handleOpenFile}
                title="Open Vega-Lite spec file"
              >
                📂 Open
              </button>
              <button 
                className="border rounded px-2 py-1 text-xs" 
                onClick={handleSaveToFile}
                title="Save spec to file"
              >
                💾 Save To
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <button 
                className="border rounded px-2 py-1 text-xs" 
                onClick={handleExportImage}
                title="Export chart as image"
              >
                🖼️ Export
              </button>
              <button 
                className="border rounded px-2 py-1 text-xs" 
                onClick={handleResetCanvas}
                title="Reset to original spec"
              >
                🔄 Reset
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
            {isEditing ? (
              <textarea 
                className="border rounded px-2 py-2 w-full font-mono text-xs"
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
                style={{ height: "100%", minHeight: 400 }}
                spellCheck={false}
              />
            ) : (
              <pre className="font-mono text-xs" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(spec, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}


