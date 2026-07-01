"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?redirect=${pathname}`);
      } else if (adminOnly) {
        // Hardcoded admin emails check
        const adminEmails = ["admin@prepwise.com"];
        if (!user.email || !adminEmails.includes(user.email)) {
          router.push("/");
        }
      }
    }
  }, [user, loading, router, pathname, adminOnly]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || (adminOnly && (!user.email || !["admin@prepwise.com"].includes(user.email)))) {
    return null;
  }

  return <>{children}</>;
}
