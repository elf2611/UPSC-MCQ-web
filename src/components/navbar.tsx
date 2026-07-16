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
    { name: "Practice Tests", href: "/practice-tests" },
    { name: "Mock Tests", href: "/mock-tests" },
    { name: "Revision", href: "/revision", isRevision: true },
    { name: "Performance", href: "/performance" },
    { name: "Pricing", href: "/pricing" },
    { name: "Daily Current Affairs", href: "/current-affairs" },
  ];

  if (profile?.role === 'admin') {
    navLinks.push({ name: "Admin Panel", href: "/admin" });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121212]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif font-bold text-2xl tracking-tight text-primary">Prepwise</span>
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
                    className={`text-sm font-medium transition-colors relative pb-1 flex items-center gap-1.5 ${
                      isActive ? "text-primary" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    {link.isRevision && <span className="text-base">📚</span>}
                    {link.name}
                    {link.isRevision && user && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
                    )}
                    {isActive && (
                      <span className="absolute left-0 bottom-0 w-full h-[2px] bg-primary rounded-t-full" />
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
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-white/10">
                      <User className="h-4 w-4" />
                    </div>
                    <span>{profile?.name || user.email?.split('@')[0]}</span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="text-sm text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2 border border-white/10 hover:border-white/20 rounded-md"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-5 py-2 rounded-md"
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
              className="text-gray-300 hover:text-white p-2"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#121212] border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
               <Link
                key={link.name}
                href={link.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
               >
                 {link.name}
               </Link>
            ))}
            
            {!user && (
              <div className="pt-4 flex flex-col gap-2 px-3">
                <Link href="/login" className="text-center py-2 text-gray-300 border border-white/10 rounded-md">Login</Link>
                <Link href="/signup" className="text-center py-2 bg-primary text-primary-foreground rounded-md">Sign Up</Link>
              </div>
            )}
            {user && (
              <div className="pt-4 flex flex-col gap-2 px-3">
                <Link href="/profile" className="text-center py-2 text-gray-300 border border-white/10 rounded-md">Profile</Link>
                <button onClick={() => logout()} className="text-center py-2 text-gray-400 bg-white/5 rounded-md">Logout</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
