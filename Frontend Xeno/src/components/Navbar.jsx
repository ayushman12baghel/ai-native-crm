import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wand2,
  BarChart3,
  Users,
  Database,
} from 'lucide-react';

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/new-campaign',  icon: Wand2,           label: 'New campaign' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics' },
  { to: '/customers',     icon: Users,           label: 'Customers' },
  { to: '/data-ingestion',icon: Database,        label: 'Data Ingestion' },
];

export default function Navbar() {
  return (
    <header className="w-full bg-[#0e0e10] border-b border-zinc-800/40 shrink-0">
      <div className="w-full px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9" />
              <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9" />
              <path d="M12 3v18" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-100">
            Xeno CRM
          </span>
        </div>

        {/* Nav links — centered with generous spacing */}
        <nav className="flex items-center gap-6">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right spacer for balance */}
        <div className="w-[140px]" />
      </div>
    </header>
  );
}
