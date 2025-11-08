// Spec fixer extracted from App.tsx to keep App lean
export function fixSpec(s: any): any {
  try {
    const spec = JSON.parse(JSON.stringify(s));
    // normalize only when the label suggests percentage
    if (spec?.encoding?.y && spec?.encoding?.color) {
      const y = spec.encoding.y;
      const looksPercent = y?.title && String(y.title).match(/%|percent|퍼센트|비율/i);
      if (looksPercent) {
        if (!y.stack) y.stack = 'normalize';
      } else if (y?.stack === 'normalize') {
        // avoid unintended normalization
        delete y.stack;
      }
    }
    // label improvements
    if (spec?.encoding?.x) {
      spec.encoding.x.axis = { ...(spec.encoding.x.axis || {}), labelAngle: 0, labelOverlap: true, labelLimit: 140 };
    }
    if (spec?.encoding?.y) {
      spec.encoding.y.axis = { ...(spec.encoding.y.axis || {}), labelOverlap: true };
    }
    return spec;
  } catch { return s; }
}

