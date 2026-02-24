// src/components/Sidebar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Activity,
  User,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { UserData } from "../types";

interface SidebarProps {
  user: UserData;
  onLogout: () => void;
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
  const location = useLocation();
  const navItems = [
    {
      path: "/home",
      icon: LayoutDashboard,
      label: "Painel",
      roles: ["tech", "admin"],
    },
    {
      path: "/locate",
      icon: Search,
      label: "Localizar",
      roles: ["tech", "admin"],
    },
    {
      path: "/diagnosis",
      icon: Activity,
      label: "Sinal",
      roles: ["tech", "admin"],
    },
    {
      path: "/olts",
      icon: Settings,
      label: "OLTs",
      roles: ["admin"],
    },
    { path: "/profile", icon: User, label: "Perfil", roles: ["tech", "admin"] },
    { path: "/admin", icon: Shield, label: "Admin", roles: ["admin"] },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-[#0a0a0a] border-r border-white/10 flex-col h-screen sticky top-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-emerald-500 tracking-tighter">
            NETFLEX
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.path
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.username}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#141414]/80 backdrop-blur-xl border-t border-white/10 px-2 py-2 z-50 flex justify-around items-center">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                location.pathname === item.path
                  ? "text-emerald-500"
                  : "text-zinc-500"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {item.label}
              </span>
            </Link>
          ))}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-1 p-2 text-red-500/70"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            Sair
          </span>
        </button>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 z-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-emerald-500 tracking-tighter">
          NETFLEX
        </h2>
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-xs">
          {user.username[0].toUpperCase()}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
