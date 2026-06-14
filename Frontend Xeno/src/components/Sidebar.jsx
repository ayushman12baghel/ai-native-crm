import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wand2,
  BarChart3,
  Users,
} from 'lucide-react';

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/new-campaign',  icon: Wand2,           label: 'New campaign' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics' },
  { to: '/customers',     icon: Users,           label: 'Customers' },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 flex flex-col bg-[#161616] border-r border-zinc-800/80">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-7">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9" />
            <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9" />
            <path d="M12 3v18" />
          </svg>
        </div>
        <span className="text-base font-bold tracking-tight text-white">
          Xeno CRM
        </span>
      </div>

      {/* Nav — generous spacing between items */}
      <nav className="flex flex-col gap-1 px-3 mt-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'text-white bg-zinc-800/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-indigo-500' : 'text-zinc-500'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="px-6 py-5 border-t border-zinc-800/40">
        <p className="text-[11px] text-zinc-600">Xeno Mini CRM</p>
        <p className="text-[11px] text-zinc-700 mt-0.5">v1.0 · AI-Native</p>
      </div>
    </aside>
  );
}