"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { User, LogOut, Menu } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Practice", href: "/practice-tests" },
    { name: "Mocks", href: "/mock-tests" },
    { name: "PYQs", href: "/pyq-tests" },
    { name: "Revision", href: "/revision", isRevision: true },
    { name: "Performance", href: "/performance" },
    { name: "Pricing", href: "/pricing" },
    { name: "Current Affairs", href: "/current-affairs" },
  ];

  if (profile?.role === 'admin') {
    navLinks.push({ name: "Admin", href: "/admin" });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/80 backdrop-blur-md shadow-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-display font-bold text-2xl tracking-tight text-primary">Prepwise</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`text-sm font-medium transition-colors relative py-1 flex items-center gap-1.5 ${
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.name}
                    {link.isRevision && user && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />
                    )}
                    {isActive && (
                      <span className="absolute left-0 -bottom-[21px] w-full h-[2px] bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(255,191,0,0.5)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Auth Section */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-card shadow-surface flex items-center justify-center hover:shadow-surface-hover transition-all duration-300">
                      <User className="h-4 w-4" />
                    </div>
                    <span>{profile?.name || user.email?.split('@')[0]}</span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 shadow-surface hover:shadow-surface-hover rounded-md"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm font-bold bg-primary text-primary-foreground hover:scale-[0.98] transition-transform ease-snappy px-5 py-2 rounded-md"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground p-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card shadow-border absolute top-[72px] left-0 w-full animate-in slide-in-from-top-4 fade-in duration-300 ease-snappy">
          <div className="px-4 py-6 space-y-2">
            {navLinks.map((link) => (
               <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
               >
                 {link.name}
               </Link>
            ))}
            
            {!user && (
              <div className="pt-6 mt-4 border-t border-white/5 flex flex-col gap-3">
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/login" className="text-center py-3 text-foreground shadow-surface hover:shadow-surface-hover rounded-lg font-medium">Login</Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/signup" className="text-center py-3 bg-primary text-primary-foreground rounded-lg font-bold">Sign Up</Link>
              </div>
            )}
            {user && (
              <div className="pt-6 mt-4 border-t border-white/5 flex flex-col gap-3">
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/profile" className="text-center py-3 text-foreground shadow-surface hover:shadow-surface-hover rounded-lg font-medium">Profile</Link>
                <button onClick={() => { setIsMobileMenuOpen(false); logout(); }} className="text-center py-3 text-muted-foreground bg-white/5 rounded-lg font-medium">Logout</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
