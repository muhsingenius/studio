"use client";

import React, { useState, useEffect } from "react";
import SidebarNav from "./SidebarNav";
import Header from "./Header";
import Logo from "./Logo";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true); // Always collapse on mobile for consistency
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar & Mobile Off-canvas Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-all duration-300 ease-in-out md:static md:z-auto",
          isMobile ? "w-64 transform" : (sidebarCollapsed ? "w-16" : "w-64"),
          isMobile && !mobileSidebarOpen ? "-translate-x-full" : "",
          isMobile && mobileSidebarOpen ? "translate-x-0 shadow-xl" : ""
        )}
      >
        <div className={cn("flex items-center justify-between h-16 border-b", sidebarCollapsed && !isMobile ? "px-0" : "px-4")}>
           <Logo collapsed={sidebarCollapsed && !isMobile} />
          {!isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(sidebarCollapsed ? "mx-auto" : "")}>
              {sidebarCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          )}
        </div>
        <SidebarNav collapsed={sidebarCollapsed && !isMobile} />
      </aside>

      {/* Mobile Overlay for Sidebar */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={isMobile ? toggleSidebar : undefined} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="container mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
