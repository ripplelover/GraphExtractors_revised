export function setPrimaryColor(spec: any, color: string) {
  const next = JSON.parse(JSON.stringify(spec));
  if (!next.config) next.config = {};
  next.config.range = next.config.range || {};
  next.config.range.category = [color, "#6baed6", "#74c476", "#fd8d3c", "#9e9ac8", "#fdd0a2"];
  if (next.mark && typeof next.mark === "object") next.mark.color = color;
  return next;
}

export function convertBarToPie(spec: any) {
  const next = JSON.parse(JSON.stringify(spec));
  next.mark = { type: "arc" };
  next.encoding = next.encoding || {};
  const x = next.encoding.x || next.encoding.column;
  const y = next.encoding.y || next.encoding.size || next.encoding.theta;
  next.encoding.theta = { field: y?.field || "value", type: "quantitative", aggregate: y?.aggregate };
  next.encoding.color = { field: x?.field || "category", type: "nominal" };
  delete next.encoding.x; delete next.encoding.y;
  next.view = { stroke: null };
  return next;
}

export function convertPieToBar(spec: any) {
  const next = JSON.parse(JSON.stringify(spec));
  next.mark = { type: "bar" };
  const theta = next.encoding?.theta;
  const color = next.encoding?.color;
  next.encoding = {
    x: { field: color?.field || "category", type: "nominal" },
    y: { field: theta?.field || "value", type: "quantitative", aggregate: theta?.aggregate }
  };
  return next;
}

// Ensure nominal color encoding for categories so each bar/segment has distinct colors
export function ensureCategoricalColors(spec: any) {
  const next = JSON.parse(JSON.stringify(spec));
  const enc = next.encoding || {};
  const x = enc.x; const y = enc.y;
  const hasColor = Boolean(enc.color);
  const markHasFixedColor = Boolean(next?.mark && typeof next.mark === 'object' && next.mark.color);
  const xType = (x?.type || '').toLowerCase();
  const likelyCategoryField = (xType === "nominal" || xType === "ordinal") ? x.field : (enc.column?.field || enc.row?.field);
  // Build category order from data.values in appearance order
  let categoryOrder: string[] | null = null;
  try {
    if (next?.data?.values && likelyCategoryField) {
      const seen = new Set<string>();
      categoryOrder = [];
      for (const row of next.data.values as any[]) {
        const v = row[likelyCategoryField];
        if (typeof v === "string" && !seen.has(v)) { seen.add(v); categoryOrder.push(v); }
      }
    }
  } catch {}
  // Only inject categorical color when we do NOT already have a fixed mark color
  if (!hasColor && !markHasFixedColor && likelyCategoryField) {
    next.encoding = { ...enc, color: { field: likelyCategoryField, type: "nominal", scale: {} } };
  }
  // Apply explicit domain and x.sort to preserve original order
  if (categoryOrder && categoryOrder.length > 0) {
    next.encoding = next.encoding || {};
    if (next.encoding.color) {
      next.encoding.color.scale = next.encoding.color.scale || {};
      next.encoding.color.scale.domain = categoryOrder;
    }
    if (next.encoding.x && (String(next.encoding.x.type).toLowerCase() === "nominal" || String(next.encoding.x.type).toLowerCase() === "ordinal")) {
      next.encoding.x.sort = categoryOrder;
    }
  }
  // provide a pleasant default palette if not present
  next.config = next.config || {};
  next.config.range = next.config.range || {};
  if (!next.config.range.category) {
    next.config.range.category = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"];
  }
  return next;
}


