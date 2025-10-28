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

