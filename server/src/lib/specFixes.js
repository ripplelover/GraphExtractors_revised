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

