import React, { useEffect, useRef } from "react";
import embed, { VisualizationSpec } from "vega-embed";

function withZoomPan(spec: any): any {
  try {
    const s = JSON.parse(JSON.stringify(spec));
    s.selection = s.selection || {};
    s.selection.grid = { type: "interval", bind: "scales" } as any;
    return s;
  } catch { return spec; }
}

export default function ChartView({ spec, aspect, palette }: { spec: any | null, aspect?: number, palette?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !spec) return;
    const clone: any = JSON.parse(JSON.stringify(spec));
    
    // Calculate available width and height
    const containerWidth = ref.current.clientWidth;
    const containerHeight = ref.current.clientHeight;
    const maxWidth = Math.min(containerWidth - 40, 800); // Leave some padding
    const maxHeight = Math.min(containerHeight - 40, 600); // Leave some padding
    
    // Set responsive sizing with better constraints
    const originalWidth = clone.width || 400;
    const originalHeight = clone.height || 300;
    
    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    
    // Determine final dimensions
    let finalWidth = originalWidth;
    let finalHeight = originalHeight;
    
    if (originalWidth > maxWidth) {
      finalWidth = maxWidth;
      finalHeight = maxWidth / aspectRatio;
    }
    
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = maxHeight * aspectRatio;
    }
    
    clone.width = Math.max(200, finalWidth); // Minimum width
    clone.height = Math.max(150, finalHeight); // Minimum height
    clone.autosize = { type: "fit", contains: "padding" };
    clone.config = clone.config || {};
    clone.config.view = { stroke: null };
    if (palette && palette.length) {
      clone.config.range = clone.config.range || {};
      clone.config.range.category = palette;
      if (clone.encoding?.color) {
        clone.encoding.color.scale = clone.encoding.color.scale || {};
        if (!clone.encoding.color.scale.range) clone.encoding.color.scale.range = palette;
      }
    }
    // Improve axis label angles for readability
    if (clone.encoding?.x && (String(clone.encoding.x.type).toLowerCase() === "nominal" || String(clone.encoding.x.type).toLowerCase() === "ordinal")) {
      clone.encoding.x.axis = { ...(clone.encoding.x.axis || {}), labelAngle: 0 };
    }
    if (clone.encoding?.y && (String(clone.encoding.y.type).toLowerCase() === "nominal" || String(clone.encoding.y.type).toLowerCase() === "ordinal")) {
      clone.encoding.y.axis = { ...(clone.encoding.y.axis || {}), labelAngle: 0 };
    }
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
  const style: React.CSSProperties = { minHeight: 420 };
  if (aspect && aspect > 0) (style as any).aspectRatio = String(aspect);
  return <div className="w-full" style={style} ref={ref} />;
}


