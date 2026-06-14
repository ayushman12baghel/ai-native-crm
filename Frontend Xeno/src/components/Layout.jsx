import { Outlet, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/",              label: "Dashboard" },
  { to: "/new-campaign",  label: "New campaign" },
  { to: "/analytics",     label: "Analytics" },
  { to: "/customers",     label: "Customers" },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0e0e10] text-zinc-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="w-full bg-[#161616] border-b border-zinc-800 shrink-0">
        <div className="w-full px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9" />
                <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9" />
                <path d="M12 3v18" />
              </svg>
            </div>
            <span className="font-bold text-lg text-white">Xeno CRM</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-1 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white border-b-2 border-indigo-500"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-[#161616]">
            <div className="px-4 py-3 space-y-1">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area with padding for smaller card sizes */}
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full flex-1 px-6 sm:px-10 lg:px-16 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}