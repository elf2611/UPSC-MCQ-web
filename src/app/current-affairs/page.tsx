"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, ChevronRight, Newspaper, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface DateInfo {
  date: string;
  count: number;
}

export default function CurrentAffairsPage() {
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchDates() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/current-affairs/dates", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setDates(data.dates || []);
        }
      } catch (err) {
        console.error("Failed to fetch current affairs dates", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchDates();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const hasToday = dates.some(d => d.date === todayStr);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-primary" />
          Daily Current Affairs
        </h1>
        <p className="text-muted-foreground">
          Stay updated with daily generated questions based on the latest news.
        </p>
      </div>

      {dates.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Current Affairs Available</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Check back later. The daily current affairs questions have not been generated or approved yet.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Today's Section or the most recent */}
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Newspaper className="w-24 h-24" />
              </div>
              <h2 className="text-2xl font-bold mb-2 relative z-10">
                {hasToday ? "Today's Test" : "Latest Test"}
              </h2>
              <p className="text-muted-foreground mb-6 relative z-10">
                {dates[0].count} questions available for {new Date(dates[0].date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              <Link
                href={`/test-interface?mode=current-affairs&date=${dates[0].date}`}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-6 relative z-10"
              >
                Start Test <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Past 14 Days List */}
            {dates.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Past Days
                </h3>
                <div className="bg-card border rounded-xl overflow-hidden divide-y">
                  {dates.slice(1).map((d) => (
                    <Link
                      key={d.date}
                      href={`/test-interface?mode=current-affairs&date=${d.date}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-muted-foreground">{d.count} questions</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Info */}
          <div className="space-y-6">
            <div className="bg-muted/50 border rounded-xl p-6">
              <h3 className="font-semibold mb-3">Why Daily Practice?</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p>Current affairs make up a significant portion of the UPSC Prelims.</p>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p>Daily revision helps consolidate memory better than monthly cramming.</p>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p>Questions are designed with elimination tips to build your intuition.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
