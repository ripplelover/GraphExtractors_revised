import { create } from "zustand";

type Role = "user" | "assistant";

interface AppState {
  spec: any | null;
  setSpec: (s: any | null) => void;
  originalImageSrc: string | null;
  originalImageSize?: { width: number; height: number } | null;
  setOriginalImageSrc: (s: string | null) => void;
  setOriginalImageSize?: (wh: { width: number; height: number } | null) => void;
  preferredPalette?: string[];
  setPreferredPalette?: (p: string[]) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  messages: { role: Role; text: string }[];
  messagesByProject: Record<string, { role: Role; text: string }[]>;
  addMsg: (m: { role: Role; text: string }) => void;
  // projects
  currentProjectId: string | null;
  projects: { id: string; name: string; spec: any | null; imageSrc?: string | null; imageSize?: { width: number; height: number } | null; originalImageSrc?: string | null; originalImageSize?: { width: number; height: number } | null; updatedAt: number }[];
  newProject: (name?: string) => string;
  saveProject: (name?: string) => string;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  setProjectThumb?: (id: string, dataUrl: string) => void;
  overlaysByProject?: Record<string, any[]>;
  setOverlaysForProject?: (id: string, items: any[]) => void;
  // excalidraw scenes per project
  excalidrawByProject?: Record<string, any>;
  setExcalidrawForProject?: (id: string, scene: any) => void;
  // whiteboard background preference per project
  whiteboardBgByProject?: Record<string, { mode: 'none'|'original'|'chart'; chartBgUrl?: string | null; show: boolean }>;
  setWhiteboardBgForProject?: (id: string, pref: { mode: 'none'|'original'|'chart'; chartBgUrl?: string | null; show: boolean }) => void;
  // ui
  homeTab: "home" | "projects" | "create" | "templates";
  setHomeTab: (t: "home" | "projects" | "create" | "templates") => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  palette: string[];
  setPalette: (p: string[]) => void;
  closeProject: () => void;
}

export const useApp = create<AppState>((set) => ({
  spec: null,
  setSpec: (s) => set({ spec: s }),
  originalImageSrc: null,
  originalImageSize: null,
  setOriginalImageSrc: (s) => set({ originalImageSrc: s }),
  setOriginalImageSize: (wh) => set({ originalImageSize: wh }),
  preferredPalette: [],
  setPreferredPalette: (p) => set({ preferredPalette: p }),
  busy: false,
  setBusy: (b) => set({ busy: b }),
  messages: [],
  messagesByProject: (() => {
    try { return JSON.parse(localStorage.getItem('image2graph:messagesByProject') || '{}'); } catch { return {}; }
  })(),
  overlaysByProject: (() => {
    try { return JSON.parse(localStorage.getItem('image2graph:overlaysByProject') || '{}'); } catch { return {}; }
  })(),
  excalidrawByProject: (() => {
    try { return JSON.parse(localStorage.getItem('image2graph:excalidrawByProject') || '{}'); } catch { return {}; }
  })(),
  whiteboardBgByProject: (() => {
    try { return JSON.parse(localStorage.getItem('image2graph:whiteboardBgByProject') || '{}'); } catch { return {}; }
  })(),
  addMsg: (m) => set((st) => {
    const pid = st.currentProjectId || '_global';
    const existing = st.messagesByProject[pid] || [];
    const last = existing[existing.length - 1];
    if (last && last.role === m.role && last.text === m.text) return { messages: existing } as any;
    const updatedForPid = [...existing, m];
    const map = { ...st.messagesByProject, [pid]: updatedForPid };
    try { localStorage.setItem('image2graph:messagesByProject', JSON.stringify(map)); } catch {}
    return { messagesByProject: map, messages: updatedForPid } as any;
  }),
  currentProjectId: null,
  projects: (() => {
    try {
      const raw = localStorage.getItem("image2graph:projects");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })(),
  // restore last open project's messages if available
  ...( () => {
    try {
      const map = JSON.parse(localStorage.getItem('image2graph:messagesByProject') || '{}');
      // default to global messages if any
      const seed = map['_global'] || [];
      return { messages: seed };
    } catch { return {}; }
  })(),
  newProject: (name) => {
    const id = crypto.randomUUID();
    set((st) => {
      const proj = { id, name: name || `Untitled ${new Date().toLocaleString()}`, spec: null, imageSrc: null, imageSize: null, originalImageSrc: null, originalImageSize: null, updatedAt: Date.now() };
      const projects = [proj, ...st.projects];
      localStorage.setItem("image2graph:projects", JSON.stringify(projects));
      const map = { ...st.messagesByProject, [id]: [] };
      try { localStorage.setItem('image2graph:messagesByProject', JSON.stringify(map)); } catch {}
      return { projects, currentProjectId: id, spec: null, originalImageSrc: null, originalImageSize: null, messages: [], messagesByProject: map } as any;
    });
    return id;
  },
  saveProject: (name) => {
    let newId = "";
    set((st) => {
      const id = st.currentProjectId ?? crypto.randomUUID();
      newId = id;
      const idx = st.projects.findIndex((p) => p.id === id);
      const existingProject = st.projects[idx];
      // Preserve existing imageSrc and originalImageSrc if they exist
      const imageSrc = existingProject?.imageSrc || st.originalImageSrc;
      const originalImageSrc = existingProject?.originalImageSrc || st.originalImageSrc;
      const originalImageSize = existingProject?.originalImageSize || st.originalImageSize;
      const proj = { id, name: name || st.projects[idx]?.name || `Project ${new Date().toLocaleString()}`, spec: st.spec, imageSrc, imageSize: st.originalImageSize ?? null, originalImageSrc, originalImageSize, updatedAt: Date.now() };
      const projects = idx >= 0 ? [...st.projects.slice(0, idx), proj, ...st.projects.slice(idx + 1)] : [proj, ...st.projects];
      // Use requestIdleCallback for non-blocking localStorage save
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          try { localStorage.setItem("image2graph:projects", JSON.stringify(projects)); } catch {}
        });
      } else {
        setTimeout(() => {
          try { localStorage.setItem("image2graph:projects", JSON.stringify(projects)); } catch {}
        }, 0);
      }
      return { projects, currentProjectId: id };
    });
    return newId;
  },
  loadProject: (id) => set((st) => {
    const proj = st.projects.find((p) => p.id === id) || null;
    const msgsRaw = st.messagesByProject[id] || [];
    const msgs = msgsRaw.filter((m:any)=> !(typeof m.text === 'string' && m.text.startsWith('__overlays__')));
    // also clean persisted storage once
    try {
      const map = JSON.parse(localStorage.getItem('image2graph:messagesByProject') || '{}');
      if (Array.isArray(map[id])) {
        const filtered = map[id].filter((m:any)=> !(typeof m.text === 'string' && m.text.startsWith('__overlays__')));
        if (filtered.length !== map[id].length) {
          map[id] = filtered; localStorage.setItem('image2graph:messagesByProject', JSON.stringify(map));
        }
      }
    } catch {}
    return { currentProjectId: proj?.id ?? null, spec: proj?.spec ?? null, originalImageSrc: proj?.originalImageSrc ?? null, originalImageSize: proj?.originalImageSize ?? null, messages: msgs } as any;
  }),
  deleteProject: (id) => set((st) => {
    const projects = st.projects.filter((p) => p.id !== id);
    localStorage.setItem("image2graph:projects", JSON.stringify(projects));
    const currentProjectId = st.currentProjectId === id ? null : st.currentProjectId;
    const spec = currentProjectId ? st.spec : null;
    const map = { ...st.messagesByProject };
    delete map[id];
    try { localStorage.setItem('image2graph:messagesByProject', JSON.stringify(map)); } catch {}
    // cleanup whiteboard prefs and excalidraw scenes
    const wb = { ...(st.whiteboardBgByProject || {}) } as any;
    const ex = { ...(st.excalidrawByProject || {}) } as any;
    delete wb[id]; delete ex[id];
    try { localStorage.setItem('image2graph:whiteboardBgByProject', JSON.stringify(wb)); } catch {}
    try { localStorage.setItem('image2graph:excalidrawByProject', JSON.stringify(ex)); } catch {}
    const messages = currentProjectId ? (map[currentProjectId] || []) : [];
    return { projects, currentProjectId, spec, messagesByProject: map, messages, whiteboardBgByProject: wb, excalidrawByProject: ex } as any;
  }),
  renameProject: (id, name) => set((st) => {
    const projects = st.projects.map((p) => p.id === id ? { ...p, name, updatedAt: Date.now() } : p);
    localStorage.setItem("image2graph:projects", JSON.stringify(projects));
    return { projects };
  }),
  setProjectThumb: (id, dataUrl) => set((st) => {
    console.log('Setting thumbnail for project:', id);
    const projects = st.projects.map((p) => {
      if (p.id === id) {
        console.log('Updating thumbnail for project:', p.name, 'ID:', p.id);
        return { ...p, imageSrc: dataUrl, updatedAt: Date.now() };
      }
      return p;
    });
    // Use requestIdleCallback for non-blocking localStorage save
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        try { localStorage.setItem("image2graph:projects", JSON.stringify(projects)); } catch {}
      });
    } else {
      setTimeout(() => {
        try { localStorage.setItem("image2graph:projects", JSON.stringify(projects)); } catch {}
      }, 0);
    }
    return { projects } as any;
  }),
  setOverlaysForProject: (id, items) => set((st) => {
    const map = { ...(st.overlaysByProject || {}) , [id]: items } as any;
    try { localStorage.setItem('image2graph:overlaysByProject', JSON.stringify(map)); } catch {}
    return { overlaysByProject: map } as any;
  }),
  setExcalidrawForProject: (id, scene) => set((st) => {
    const map = { ...(st.excalidrawByProject || {}), [id]: scene } as any;
    try { localStorage.setItem('image2graph:excalidrawByProject', JSON.stringify(map)); } catch {}
    return { excalidrawByProject: map } as any;
  }),
  setWhiteboardBgForProject: (id, pref) => set((st) => {
    const map = { ...(st.whiteboardBgByProject || {}), [id]: pref } as any;
    try { localStorage.setItem('image2graph:whiteboardBgByProject', JSON.stringify(map)); } catch {}
    return { whiteboardBgByProject: map } as any;
  }),
  homeTab: (localStorage.getItem("image2graph:homeTab") as any) || "home",
  setHomeTab: (t) => set(() => { try { localStorage.setItem("image2graph:homeTab", t); } catch {} return { homeTab: t }; }),
  closeProject: () => set(() => ({ currentProjectId: null, spec: null, originalImageSrc: null, originalImageSize: null } as any)),
  theme: (localStorage.getItem("image2graph:theme") as any) || "light",
  setTheme: (t) => set(() => { localStorage.setItem("image2graph:theme", t); return { theme: t }; }),
  palette: (() => {
    try { return JSON.parse(localStorage.getItem("image2graph:palette") || "[]"); } catch { return []; }
  })(),
  setPalette: (p) => set(() => { localStorage.setItem("image2graph:palette", JSON.stringify(p)); return { palette: p }; })
}));


