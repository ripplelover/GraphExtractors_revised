// Minimal spec fixes - only remove invalid properties and improve axis format
export function fixSpec(spec) {
  if (!spec) return spec;
  const fixed = JSON.parse(JSON.stringify(spec));

  function cleanMark(mark) {
    if (!mark || typeof mark !== 'object') return mark;
    delete mark.orient;
    delete mark.height?.band;
    delete mark.width?.band;
    delete mark.baseline;
    return mark;
  }

  function fixAxisFormat(axis) {
    if (!axis || typeof axis !== 'object') return;
    if (axis.format === ',' || axis.format === ',') {
      axis.format = ',d';
    }
  }

  function cleanLayer(layer) {
    if (Array.isArray(layer)) return layer.map(cleanLayer);
    if (!layer || typeof layer !== 'object') return layer;
    if (layer.mark) layer.mark = cleanMark(layer.mark);
    if (layer.layer) layer.layer = cleanLayer(layer.layer);
    if (layer.encoding) {
      if (layer.encoding.x?.axis) fixAxisFormat(layer.encoding.x.axis);
      if (layer.encoding.y?.axis) fixAxisFormat(layer.encoding.y.axis);
    }
    return layer;
  }

  if (fixed.layer) fixed.layer = cleanLayer(fixed.layer);
  if (fixed.mark) fixed.mark = cleanMark(fixed.mark);
  if (fixed.encoding) {
    if (fixed.encoding.x?.axis) fixAxisFormat(fixed.encoding.x.axis);
    if (fixed.encoding.y?.axis) fixAxisFormat(fixed.encoding.y.axis);
  }
  return fixed;
}

// Strict sanitizer to prevent "creative" additions that often diverge from the source image
export function enforceStrictSpec(spec) {
  if (!spec) return spec;
  const out = JSON.parse(JSON.stringify(spec));

  // Force VL v6 schema
  out.$schema = 'https://vega.github.io/schema/vega-lite/v6.json';

  function isAbsoluteTextLayer(layer) {
    if (!layer || typeof layer !== 'object') return false;
    const markType = typeof layer.mark === 'string' ? layer.mark : layer.mark?.type;
    if (markType !== 'text') return false;
    const enc = layer.encoding || {};
    const xAxisNull = enc.x && (enc.x.axis === null || enc.x.axis === false);
    const yAxisNull = enc.y && (enc.y.axis === null || enc.y.axis === false);
    // Absolute positioned free text (hallucinated labels/watermarks)
    return Boolean(xAxisNull && yAxisNull);
  }

  // If using layered chart, drop absolute-positioned text overlays
  if (Array.isArray(out.layer)) {
    out.layer = out.layer.filter(l => !isAbsoluteTextLayer(l));
  }

  // Remove arbitrary background watermarks frequently added as top-level layer-less text
  if (!out.layer && isAbsoluteTextLayer(out)) {
    delete out.mark; // fall back to harmless spec
  }

  // Disallow unexpected top-level view tweaks that hide axes entirely unless explicitly specified
  if (out.view && typeof out.view === 'object') {
    // Allow null stroke, but remove other extraneous properties that sometimes appear
    const allowedViewKeys = new Set(['stroke']);
    Object.keys(out.view).forEach(k => { if (!allowedViewKeys.has(k)) delete out.view[k]; });
  }

  return out;
}

