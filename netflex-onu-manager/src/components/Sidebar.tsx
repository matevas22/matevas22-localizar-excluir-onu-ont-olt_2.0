// src/components/Sidebar.tsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Activity,
  User,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { UserData } from "../types";

interface SidebarProps {
  user: UserData;
  onLogout: () => void;
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex bg-[#0a0a0a] border-r border-white/10 flex-col h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/5 h-16">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-emerald-500 tracking-tighter whitespace-nowrap overflow-hidden">
              NETFLEX
            </h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ${
              isCollapsed ? "mx-auto" : ""
            }`}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <item.icon
                  size={20}
                  className={`${isActive ? "text-emerald-500" : ""} shrink-0`}
                />

                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200">
                    {item.label}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10 shadow-xl">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div
            className={`flex items-center gap-3 px-2 py-2 mb-1 rounded-xl hover:bg-white/5 transition-colors ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">
                  {user.username}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">
                  {user.role}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-400/10 transition-all ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? "Sair" : ""}
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">Sair</span>}
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
