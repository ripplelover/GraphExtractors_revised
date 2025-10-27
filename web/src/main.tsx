import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { useApp } from "./store";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// expose tab setter for sidebar buttons (lightweight bridge)
try {
  Object.defineProperty(window as any, 'setHomeTab', { value: (t: 'projects'|'create'|'templates') => {
    try { (useApp.getState() as any).setHomeTab(t); } catch {}
  }, writable: false });
} catch {}

// simple hash navigation helper to mimic routes without dependency
try {
  Object.defineProperty(window as any, 'routerNavigate', { value: (path: string) => {
    location.hash = `#${path}`; // e.g., #/projects
    // also broadcast to store
    try {
      const clean = path.replace(/^\//, '');
      if (clean.startsWith('project/')) {
        const id = clean.split('/')[1];
        if (id) { (useApp.getState() as any).loadProject(id); }
        (useApp.getState() as any).setHomeTab('create');
      } else {
        // leaving project page: clear project context proactively
        try {
          const st = (useApp.getState() as any);
          if (st.closeProject) st.closeProject();
          else if (st.setSpec) st.setSpec(null);
        } catch {}
        const map: any = { projects: 'projects', create: 'create', templates: 'templates', home: 'home' };
        (useApp.getState() as any).setHomeTab(map[clean] || 'home');
      }
    } catch {}
    // ensure listeners react immediately even in some browsers
    try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch {}
  }, writable: false });
} catch {}

// keep store in sync with hash changes and initialize
window.addEventListener('hashchange', () => {
  try {
    const raw = (location.hash || '#/projects').replace(/^#/, '');
    const tab = raw.replace(/^\//, '');
    const map: any = { projects: 'projects', create: 'create', templates: 'templates', home: 'projects' };
    (useApp.getState() as any).setHomeTab(map[tab] || 'projects');
  } catch {}
});

try {
  const raw = (location.hash || '#/home').replace(/^#/, '');
  const tab = raw.replace(/^\//, '');
  const map: any = { projects: 'projects', create: 'create', templates: 'templates', home: 'home' };
  (useApp.getState() as any).setHomeTab(map[tab] || 'home');
} catch {}

// helpers for dashboard actions
try {
  Object.defineProperties(window as any, {
    renameProject: { value: (id: string, name: string) => {
      try { (useApp.getState() as any).renameProject(id, name); } catch {}
    } },
    downloadProject: { value: (id: string) => {
      try {
        const st = (useApp.getState() as any);
        const proj = st.projects.find((p: any)=> p.id === id);
        if (!proj) return;
        const blob = new Blob([JSON.stringify(proj.spec ?? {}, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `${proj.name || 'project'}.json`; a.click();
      } catch {}
    } },
    closeProject: { value: () => {
      try { (useApp.getState() as any).closeProject(); } catch {}
    } },
  });
} catch {}

// convenience: force to create page now
try {
  (window as any).goCreate = () => {
    try {
      const st = (useApp.getState() as any);
      if (st.closeProject) st.closeProject();
      if (st.setSpec) st.setSpec(null);
      if (st.setHomeTab) st.setHomeTab('create');
    } catch {}
    // Delay hash change to ensure state updates flush first
    setTimeout(() => {
      const target = '#/create';
      if (location.hash !== target) {
        // use replace to avoid history piling and ensure navigation
        location.replace(target);
      } else {
        // nudging hash to force change when already same
        location.hash = '#/home';
        location.replace(target);
      }
      try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch {}
      // second nudge on next frame for stubborn cases
      requestAnimationFrame(() => {
        try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch {}
      });
    }, 0);
  };
  (window as any).resetProject = () => {
    try {
      const st = (useApp.getState() as any);
      if (st.closeProject) st.closeProject();
      if (st.setSpec) st.setSpec(null);
    } catch {}
  };
} catch {}

