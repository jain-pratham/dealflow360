"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  TrendingUp,
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  FileText,
  Settings,
  LogOut,
  Layers,
  BarChart3,
  Boxes,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getMenuItemsForRole, NavItem } from "@/config/navigation-config";
import { getRoleDisplayName } from "@/lib/role-utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading, logout } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const navItems: NavItem[] = getMenuItemsForRole(role);

  // Accordion behavior: auto-open the submenu containing the active route
  useEffect(() => {
    const activeParent = navItems.find((item) =>
      item.children?.some((child) => child.href === pathname)
    );
    if (activeParent) {
      setOpenSubmenus({ [activeParent.title]: true });
    }
  }, [pathname, role]);

  // Single-expansion accordion toggle
  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => (prev[title] ? {} : { [title]: true }));
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-[#0B2545] dark:bg-[#111318] text-white border-r border-white/10 transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
    >
      {/* Brand Header & Toggle */}
      <div className="relative flex items-center h-16 px-4 border-b border-white/10 justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-white/95 px-2.5 py-1 rounded-xl shadow-md flex items-center justify-center shrink-0 border border-white/20">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-7 w-auto max-w-[120px] object-contain"
              />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-sm tracking-wide text-white leading-tight">
                DEALFLOW<span className="text-[#F4882E]">360</span>
              </span>
              <span className="text-[10px] text-slate-300 font-medium tracking-wider uppercase">
                Enterprise CRM
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto bg-white/95 p-1 px-1.5 rounded-xl shadow-md flex items-center justify-center border border-white/20">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-6 w-auto max-w-[32px] object-contain"
            />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F4882E] hover:bg-[#e07722] text-white flex items-center justify-center shadow-lg border border-white/20 transition-transform active:scale-95 cursor-pointer z-50"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {isLoading ? (
          <div className="space-y-2 px-1 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-9 w-full bg-white/10 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          navItems.map((item) => {
          const isActive = item.href ? pathname === item.href : false;
          const hasChildren = item.children && item.children.length > 0;
          const isSubOpen = openSubmenus[item.title];

          if (hasChildren) {
            const hasChildActive = item.children?.some((sub) => pathname === sub.href);
            return (
              <div key={item.title} className="space-y-1">
                <button
                  onClick={() => toggleSubmenu(item.title)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ease-in-out cursor-pointer ${
                    hasChildActive || isSubOpen
                      ? "text-white bg-white/10 font-semibold"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#F4882E] transition-transform duration-200">{item.icon}</span>
                    {!collapsed && <span>{item.title}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-500 ease-in-out ${
                        isSubOpen ? "rotate-180 text-white" : "text-white/50"
                      }`}
                    />
                  )}
                </button>

                {!collapsed && (
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out origin-top ${
                      isSubOpen
                        ? "max-h-40 opacity-100 mt-1 mb-1 scale-y-100"
                        : "max-h-0 opacity-0 mt-0 mb-0 pointer-events-none scale-y-95"
                    }`}
                  >
                    <div className="ml-4 pl-3 border-l border-white/10 space-y-1 bg-black/20 rounded-lg p-1.5">
                      {item.children?.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.title}
                            href={sub.href}
                            className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
                              isSubActive
                                ? "bg-[#0D69B2] text-white font-semibold shadow-sm"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {sub.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.title}
              href={item.href || "#"}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-[#F4882E] text-white font-semibold shadow-md shadow-orange-500/20"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-white" : "text-slate-300"}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.title}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#EC2091] text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })
        )}
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#0D69B2] flex items-center justify-center font-bold text-xs text-white uppercase border border-white/20 shrink-0">
                {user?.email?.slice(0, 2) || "DF"}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-white truncate">
                  {getRoleDisplayName(user?.role)}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.email || "admin@dealflow360.com"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white shadow-md shadow-red-500/30 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full p-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white shadow-md shadow-red-500/30 flex items-center justify-center transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
