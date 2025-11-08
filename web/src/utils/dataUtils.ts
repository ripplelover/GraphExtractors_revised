export function findDataValues(obj: any): any[] | null {
  if (!obj) return null;
  if (obj.data?.values && Array.isArray(obj.data.values)) return obj.data.values;
  if (obj.layer && Array.isArray(obj.layer)) {
    for (const layer of obj.layer) {
      const found = findDataValues(layer);
      if (found) return found;
    }
  }
  if (obj.spec) return findDataValues(obj.spec);
  return null;
}

export function findColorEncoding(obj: any): any {
  if (!obj) return null;
  if (obj.encoding?.color) return obj.encoding.color;
  if (obj.layer && Array.isArray(obj.layer)) {
    for (const layer of obj.layer) {
      const found = findColorEncoding(layer);
      if (found) return found;
    }
  }
  if (obj.spec) return findColorEncoding(obj.spec);
  return null;
}

export function updateDataValues(obj: any, newValues: any[]): any {
  if (!obj) return obj;
  if (obj.data?.values && Array.isArray(obj.data.values)) {
    obj.data.values = newValues;
    return obj;
  }
  if (obj.layer && Array.isArray(obj.layer)) {
    for (const layer of obj.layer) {
      if (layer.data?.values && Array.isArray(layer.data.values)) {
        layer.data.values = newValues;
        return obj;
      }
    }
  }
  if (obj.spec) return updateDataValues(obj.spec, newValues);
  return obj;
}

// Returns a color range array suitable for editing, inferring from spec when missing.
export function getEditableColorRange(spec: any, appPalette: string[] = []): string[] {
  const colorEnc = findColorEncoding(spec);
  const encType = colorEnc?.type || colorEnc?.scale?.type;
  // Only for nominal/ordinal; numeric color scales are not edited here
  if (encType && encType === 'quantitative') return [];
  const scale = colorEnc?.scale || {};
  if (Array.isArray(scale.range) && scale.range.length) return scale.range.slice();
  // If config.range.category exists, prefer it
  const cfgRange = spec?.config?.range?.category;
  if (Array.isArray(cfgRange) && cfgRange.length) return cfgRange.slice();
  // Map common scheme names to concrete arrays (first 10)
  if (typeof scale.scheme === 'string') {
    const m: Record<string, string[]> = {
      category10: ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'],
      tableau10:  ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab']
    };
    if (m[scale.scheme]) return m[scale.scheme].slice();
  }
  // Fall back to app-level saved palette
  if (Array.isArray(appPalette) && appPalette.length) return appPalette.slice();
  // Default safe palette
  return ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab'];
}

// Writes the provided range back into the spec's color encoding, creating scale if needed
export function setColorRange(spec: any, newRange: string[]): any {
  const next = JSON.parse(JSON.stringify(spec));
  const colorEnc = findColorEncoding(next);
  if (!colorEnc) return next;
  colorEnc.scale = colorEnc.scale || {};
  colorEnc.scale.range = newRange.slice();
  // Remove conflicting scheme if present
  if (colorEnc.scale.scheme) delete colorEnc.scale.scheme;
  return next;
}

// Derive the active category domain from the spec or data
export function getCategoryDomain(spec: any): string[] {
  const colorEnc = findColorEncoding(spec);
  const domain: any[] | undefined = colorEnc?.scale?.domain;
  if (Array.isArray(domain) && domain.length) return domain.map(v => String(v));
  const field = colorEnc?.field;
  const values = findDataValues(spec) || [];
  if (field && Array.isArray(values)) {
    const uniq = Array.from(new Set(values.map((r:any)=> r?.[field]).filter((v:any)=> v!==undefined))).map(String);
    return uniq;
  }
  return [];
}

// Pair domain and range so UI shows only colors currently used
export function getDomainRangePair(spec: any, appPalette: string[] = []): { domain: string[]; range: string[] } {
  const domain = getCategoryDomain(spec);
  const baseRange = getEditableColorRange(spec, appPalette);
  const range = baseRange.slice(0, Math.max(0, domain.length || baseRange.length));
  return { domain, range };
}

// Write both domain and range back, keeping them aligned
export function setDomainRange(spec: any, domain: string[], range: string[]): any {
  const next = JSON.parse(JSON.stringify(spec));
  const colorEnc = findColorEncoding(next);
  if (!colorEnc) return next;
  colorEnc.type = colorEnc.type || 'nominal';
  colorEnc.scale = colorEnc.scale || {};
  colorEnc.scale.domain = domain.slice();
  colorEnc.scale.range = range.slice(0, domain.length);
  if (colorEnc.scale.scheme) delete colorEnc.scale.scheme;
  return next;
}

// Extract colors actually used by the chart
export function getActiveColors(spec: any, appPalette: string[] = []): string[] {
  try {
    const colorEnc = findColorEncoding(spec);
    // If quantitative gradient, don't expose palette editor
    const encType = String(colorEnc?.type || '').toLowerCase();
    if (encType === 'quantitative') return [];
    // If categorical encoding exists, respect its range or config, trimmed to domain size
    if (colorEnc) {
      const { domain, range } = getDomainRangePair(spec, appPalette);
      if (range && range.length) return range.slice(0, domain.length || range.length);
    }
    // Otherwise, collect constant mark colors per layer
    const colors = new Set<string>();
    const walk = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      const mark = obj.mark;
      if (mark) {
        const c = (typeof mark === 'object' ? (mark.color || (mark.fill ?? null)) : null) as string | null;
        if (typeof c === 'string') colors.add(c);
      }
      if (Array.isArray(obj.layer)) obj.layer.forEach(walk);
      if (obj.spec) walk(obj.spec);
    };
    walk(spec);
    if (colors.size) return Array.from(colors);
    // Last resort: config or app palette
    const cfg = spec?.config?.range?.category;
    if (Array.isArray(cfg) && cfg.length) return cfg.slice();
    if (Array.isArray(appPalette) && appPalette.length) return appPalette.slice();
    return ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab'];
  } catch {
    return [];
  }
}

// Apply colors back to spec depending on how colors are defined
export function setActiveColors(spec: any, colors: string[]): any {
  const next = JSON.parse(JSON.stringify(spec));
  const colorEnc = findColorEncoding(next);
  if (colorEnc && String(colorEnc.type || '').toLowerCase() !== 'quantitative') {
    colorEnc.scale = colorEnc.scale || {};
    colorEnc.scale.range = colors.slice();
    if (colorEnc.scale.scheme) delete colorEnc.scale.scheme;
    return next;
  }
  // No color encoding: set mark colors layer-wise (cycling colors)
  const list: any[] = [];
  const gather = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.mark && (!obj.encoding || !obj.encoding.color)) list.push(obj);
    if (Array.isArray(obj.layer)) obj.layer.forEach(gather);
    if (obj.spec) gather(obj.spec);
  };
  gather(next);
  list.forEach((node, i) => {
    const color = colors[i % Math.max(1, colors.length)];
    if (typeof node.mark === 'object') {
      node.mark.color = color;
      node.mark.fill = color;
    } else {
      node.mark = { type: node.mark || 'bar', color };
    }
  });
  return next;
}

// Set nominal/ordinal axis sort order to match the order of data.values for the field
export function setAxisOrderFromValues(spec: any): any {
  const next = JSON.parse(JSON.stringify(spec));
  const values = findDataValues(next) || [];

  const applyToNode = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const enc = node.encoding || {};
    (['x','y'] as const).forEach((ch) => {
      const e: any = enc[ch];
      const t = String(e?.type || '').toLowerCase();
      const f = e?.field;
      if ((t === 'nominal' || t === 'ordinal') && typeof f === 'string' && values.length) {
        const order = Array.from(new Set(values.map((r:any)=> r?.[f]).filter((v:any)=> v!==undefined))).map(String);
        node.encoding = node.encoding || {};
        // 1) 명시적 sort 배열
        node.encoding[ch] = { ...(e || {}), sort: order };
        // 2) scale.domain에도 동일 순서 설정 (일부 조합에서 sort 무시되는 경우 방지)
        const scale = { ...((node.encoding[ch] as any).scale || {}) };
        scale.domain = order.slice();
        (node.encoding[ch] as any).scale = scale;
      }
    });
    if (Array.isArray(node.layer)) node.layer.forEach(applyToNode);
    if (node.spec) applyToNode(node.spec);
  };

  applyToNode(next);
  return next;
}

