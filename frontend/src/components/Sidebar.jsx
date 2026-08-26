import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { LogoMark } from './Logo.jsx';

// --- Icons (inline SVG, 20x20, stroke-based) ---
const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  qr: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
    </svg>
  ),
  edit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 15l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  students: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  admin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  faculty: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  ),
  sun: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" />
    </svg>
  ),
  moon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// Tooltip rendered into document.body via portal, so it can never
// affect the sidebar's own scroll/overflow behaviour.
function PortalTooltip({ label, anchorRef, visible }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (visible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    } else {
      setPos(null);
    }
  }, [visible, anchorRef]);

  if (!visible || !pos) return null;

  return createPortal(
    <span
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
      className="pointer-events-none whitespace-nowrap rounded bg-tooltip text-white text-xs font-medium px-2 py-1 z-[9999] shadow-lg"
    >
      {label}
    </span>,
    document.body
  );
}

function NavItem({ to, end, icon, label, collapsed, onClick }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NavLink
        ref={ref}
        to={to}
        end={end}
        onClick={onClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
            collapsed ? 'justify-center' : ''
          } ${isActive ? 'glass-btn bg-forestGlass text-white' : 'text-ink/80 hover:bg-white/20'}`
        }
      >
        <span className="shrink-0">{icon}</span>
        {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
      </NavLink>
      {collapsed && <PortalTooltip label={label} anchorRef={ref} visible={hovered} />}
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { admin, logout, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const logoutRef = useRef(null);
  const settingsRef = useRef(null);
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [settingsHovered, setSettingsHovered] = useState(false);

  function go(path) {
    setMobileOpen(false);
    navigate(path);
  }

  function handleLogout() {
    setMobileOpen(false);
    logout();
  }

  const themeLabel = theme === 'dark' ? 'Light mode' : 'Dark mode';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 bg-card border-r border-rule flex flex-col overflow-x-hidden
          transition-all duration-200 ease-in-out
          ${collapsed ? 'md:w-16' : 'md:w-56'}
          ${mobileOpen ? 'w-56 translate-x-0' : 'w-56 -translate-x-full md:translate-x-0'}
        `}
      >
        {/* Top: logo + collapse toggle */}
        <div className={`h-16 flex items-center border-b border-rule ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <button onClick={() => go('/dashboard')} className="flex items-center gap-2 shrink-0">
            <LogoMark size={30} />
            {!collapsed && (
              <span className="font-display font-600 text-forestDark text-sm whitespace-nowrap">
                Present Hoon Sir!
              </span>
            )}
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden md:flex items-center justify-center w-6 h-6 text-ink/50 hover:text-ink"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? null : icons.chevronLeft}
          </button>
        </div>

        {/* Collapsed-state expand handle */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex items-center justify-center py-1.5 text-ink/50 hover:text-ink border-b border-rule"
            aria-label="Expand sidebar"
          >
            {icons.chevronRight}
          </button>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1">
          <NavItem to="/dashboard" end icon={icons.dashboard} label="Dashboard" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          <NavItem to="/generate-qr" icon={icons.qr} label="Generate QR" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          <NavItem to="/edit-attendance" icon={icons.edit} label="Edit Attendance" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          <NavItem to="/reports" icon={icons.reports} label="Reports" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          <NavItem to="/students" icon={icons.students} label="View Students" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          <NavItem to="/faculties" icon={icons.faculty} label="Manage Faculty" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          {isSuperAdmin && (
            <NavItem to="/admins" icon={icons.admin} label="Manage Admin" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          )}
        </nav>

        {/* Bottom: admin name + settings + logout */}
        <div className="border-t border-rule py-3 px-2 space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-xs font-mono text-ink/50 truncate">{admin?.name}</p>
          )}
          <div
            className="relative"
            onMouseEnter={() => setSettingsHovered(true)}
            onMouseLeave={() => setSettingsHovered(false)}
          >
            <button
              ref={settingsRef}
              onClick={() => go('/settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-ink/70 hover:text-forest hover:bg-white/20 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <span className="shrink-0">{icons.settings}</span>
              {!collapsed && <span className="text-sm font-medium">Settings</span>}
            </button>
            {collapsed && <PortalTooltip label="Settings" anchorRef={settingsRef} visible={settingsHovered} />}
          </div>
          <div
            className="relative"
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
          >
            <button
              ref={logoutRef}
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-ink/70 hover:text-brick hover:bg-white/20 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <span className="shrink-0">{icons.logout}</span>
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
            {collapsed && <PortalTooltip label="Logout" anchorRef={logoutRef} visible={logoutHovered} />}
          </div>
        </div>
      </aside>

      {/* Mobile top bar with hamburger (only visible on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-rule flex items-center px-4 z-20">
        <button onClick={() => setMobileOpen(true)} className="text-ink/80" aria-label="Open menu">
          {icons.menu}
        </button>
        <span className="ml-3 font-display font-600 text-forestDark text-sm">Present Hoon Sir!</span>
        <button
          onClick={toggleTheme}
          className="ml-auto text-ink/70"
          aria-label={themeLabel}
        >
          {theme === 'dark' ? icons.sun : icons.moon}
        </button>
      </div>
    </>
  );
}