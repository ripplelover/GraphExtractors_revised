import React from 'react';

type JsonEditorDrawerProps = {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onClose: () => void;
};

export default function JsonEditorDrawer({ value, onChange, onApply, onClose }: JsonEditorDrawerProps) {
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>Vega-Lite JSON</div>
          <div className="flex gap-2">
            <button className="btn" onClick={onApply}>Apply</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="drawer-body">
          <textarea
            value={value}
            onChange={e=>onChange(e.target.value)}
            style={{ width:'100%', height:'100%', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize:13 }}
          />
        </div>
      </div>
    </>
  );
}

