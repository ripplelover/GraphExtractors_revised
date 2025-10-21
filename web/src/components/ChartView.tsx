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
    
           // Calculate available width and height with better constraints
           const containerWidth = ref.current.clientWidth;
           const containerHeight = ref.current.clientHeight;
           
           // More conservative sizing to prevent clipping
           const maxWidth = Math.min(containerWidth - 60, 1000); // Reduced from 1200, more padding
           const maxHeight = Math.min(containerHeight - 60, 700); // Reduced from 800, more padding
           
           // Set responsive sizing with better constraints
           const originalWidth = clone.width || 400;
           const originalHeight = clone.height || 300;
           
           // Calculate aspect ratio
           const aspectRatio = originalWidth / originalHeight;
           
           // Determine final dimensions - prioritize showing the full chart
           let finalWidth = originalWidth;
           let finalHeight = originalHeight;
           
           // Scale down proportionally if too large - more aggressive scaling
           if (originalWidth > maxWidth || originalHeight > maxHeight) {
             const widthScale = maxWidth / originalWidth;
             const heightScale = maxHeight / originalHeight;
             const scale = Math.min(widthScale, heightScale) * 0.9; // Additional 10% reduction
             
             finalWidth = originalWidth * scale;
             finalHeight = originalHeight * scale;
           }
           
           // Ensure minimum readable size but not too large
           clone.width = Math.max(250, Math.min(800, finalWidth)); // Reduced max width
           clone.height = Math.max(180, Math.min(600, finalHeight)); // Reduced max height
    
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


