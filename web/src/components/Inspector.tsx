import React from "react";

export default function Inspector({ spec, onChange }: { spec: any | null; onChange: (s: any) => void }) {
  if (!spec) return <aside className="border bg-white" style={{ width: 300 }} />;
  const next = (path: string[], value: any) => {
    const copy = JSON.parse(JSON.stringify(spec));
    let cur: any = copy;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] = cur[path[i]] ?? {};
    cur[path[path.length - 1]] = value;
    onChange(copy);
  };
  const xField = spec?.encoding?.x?.field ?? "";
  const yField = spec?.encoding?.y?.field ?? "";
  const colorField = spec?.encoding?.color?.field ?? "";
  return (
    <aside className="border bg-white" style={{ width: 300, display: "flex", flexDirection: "column" }}>
      <div className="p-3 border-b" style={{ fontWeight: 600 }}>Inspector</div>
      <div className="p-3" style={{ display: "grid", gap: 12 }}>
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
      </div>
    </aside>
  );
}


