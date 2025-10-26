import React, { useEffect, useRef } from "react";
import embed, { VisualizationSpec } from "vega-embed";

function withZoomPan(spec: any): any {
  try {
    const s = JSON.parse(JSON.stringify(spec));
    s.selection = s.selection || {};
    // Enhanced zoom and pan with better controls
    s.selection.grid = { 
      type: "interval", 
      bind: "scales",
      on: "[mousedown[!event.ctrlKey], window:mouseup] > window:mousemove!",
      translate: "[mousedown[!event.ctrlKey], window:mouseup] > window:mousemove!",
      zoom: "wheel![!event.ctrlKey]"
    } as any;
    return s;
  } catch { return spec; }
}

export default function ChartView({ spec, aspect, palette }: { spec: any | null, aspect?: number, palette?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !spec) return;
    const clone: any = JSON.parse(JSON.stringify(spec));

    // Measure container to drive responsive sizing
    const containerWidth = Math.max(0, ref.current.clientWidth || 0);
    const containerHeight = Math.max(0, ref.current.clientHeight || 0);

    // Target size: fill container with padding and enforce readable minimums
    const PAD = 80; // room for axes/labels
    const targetWidth = Math.max(800, Math.min(1200, containerWidth - PAD));
    const targetHeight = Math.max(500, Math.min(900, containerHeight - PAD));

    // If spec doesn't provide size, use container-driven size; otherwise clamp to readable range
    if (!clone.width) clone.width = targetWidth; else clone.width = Math.max(600, Math.min(1200, clone.width));
    if (!clone.height) clone.height = targetHeight; else clone.height = Math.max(400, Math.min(900, clone.height));

    // Enable better autosize behavior
    clone.autosize = { type: "fit", contains: "padding" };
    clone.config = clone.config || {};
    clone.config.view = { stroke: null };

    // Add more padding to prevent clipping
    clone.padding = { left: 40, right: 40, top: 40, bottom: 40 };
    
    if (palette && palette.length) {
      clone.config.range = clone.config.range || {};
      clone.config.range.category = palette;
      if (clone.encoding?.color) {
        clone.encoding.color.scale = clone.encoding.color.scale || {};
        if (!clone.encoding.color.scale.range) clone.encoding.color.scale.range = palette;
      }
    }
    // Improve axis label readability and overlap handling
    const values = Array.isArray(clone?.data?.values) ? clone.data.values : null;
    const uniqueCount = (field?: string) => {
      if (!values || !field) return undefined;
      try { return new Set(values.map((v:any)=> v?.[field])).size; } catch { return undefined; }
    };

    const enhanceAxis = (encKey: 'x'|'y') => {
      const enc = clone.encoding?.[encKey];
      if (!enc) return;
      const axisType = String(enc.type || '').toLowerCase();
      const axis: any = { ...(enc.axis || {}), labelOverlap: 'greedy', labelLimit: 160, labelSeparation: 6 };
      if (axisType === 'nominal' || axisType === 'ordinal') {
        const count = uniqueCount(enc.field);
        const approxSlots = Math.max(1, Math.floor(((encKey==='x'? clone.width : clone.height) - 120) / 40));
        if (count && count > approxSlots) {
          axis.labelAngle = encKey==='x' ? -40 : 0;
          axis.labelAlign = encKey==='x' ? 'right' : axis.labelAlign;
        } else {
          axis.labelAngle = 0;
        }
      }
      if (!clone.encoding) clone.encoding = {} as any;
      clone.encoding[encKey] = { ...(enc as any), axis };
    };
    enhanceAxis('x');
    enhanceAxis('y');
    const vspec = withZoomPan(clone) as VisualizationSpec;
    console.log('ChartView: Starting embed for spec:', spec);
    embed(ref.current, vspec, { actions: false, renderer: "canvas" }).then(() => {
      console.log('ChartView: Embed completed successfully');
        // Trigger thumbnail update after chart is rendered
        setTimeout(() => {
          try {
            const canvas = ref.current?.querySelector('canvas') as HTMLCanvasElement | null;
            if (!canvas) {
              console.log('ChartView: Canvas not found for thumbnail');
              return;
            }
            const dataUrl = canvas.toDataURL('image/png');
            console.log('ChartView: Generated thumbnail via chartRendered event');
            // Dispatch custom event to notify parent components
            window.dispatchEvent(new CustomEvent('chartRendered', { detail: { dataUrl } }));
          } catch (e) {
            console.error('ChartView thumbnail generation error:', e);
          }
        }, 200); // Reduced from 500ms to 200ms
    }).catch((error) => {
      console.error('ChartView embed error:', error);
    });
  }, [spec]);
  const style: React.CSSProperties = { 
    minHeight: 500, 
    width: '100%', 
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  if (aspect && aspect > 0) (style as any).aspectRatio = String(aspect);
  return <div className="w-full" style={style} ref={ref} />;
}


