import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { brands } from '@portfolio/brands';
import { projects } from '../content/projects';

export function ProjectsMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) setOpen(false);
    };
    const el = root.current;
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    el?.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      el?.removeEventListener('focusout', onFocusOut);
    };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      <button ref={button} type="button" className="menu-btn" aria-expanded={open} aria-controls="projects-menu" onClick={() => setOpen((o) => !o)}>
        Projetos
      </button>
      <ul id="projects-menu" className="menu-list" hidden={!open}>
        {projects.map((p) => (
          <li key={p.slug}>
            <NavLink to={p.demoPath}>
              <span className="menu-mark" aria-hidden="true" style={{ background: brands[p.brand].color.accent }} />
              {p.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
