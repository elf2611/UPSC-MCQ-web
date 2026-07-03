"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  User, Mail, Phone, Shield, Calendar, Edit2,
  ChevronRight, ExternalLink, Clock, Bell, Zap
} from "lucide-react";
import Link from "next/link";

// ── Tabs ──────────────────────────────────────────────────────────────────
type TabKey = "account" | "subscription" | "history" | "preferences";

const TABS: { key: TabKey; label: string }[] = [
  { key: "account", label: "Account Details" },
  { key: "subscription", label: "Subscription" },
  { key: "history", label: "Test History" },
  { key: "preferences", label: "Preferences" },
];

export default function ProfilePage() {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("account");
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState("");
  const [negativeMarking, setNegativeMarking] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    setName(profile?.name || user?.displayName || "");
    if (profile?.negative_marking !== undefined) setNegativeMarking(profile.negative_marking);
    if (profile?.notifications_enabled !== undefined) setNotificationsEnabled(profile.notifications_enabled);
    if (profile?.autosave_enabled !== undefined) setAutosaveEnabled(profile.autosave_enabled);
  }, [profile, user]);

  const handleToggle = async (field: "negative_marking" | "notifications_enabled" | "autosave_enabled", value: boolean) => {
    if (!user) return;
    if (field === "negative_marking") setNegativeMarking(value);
    if (field === "notifications_enabled") setNotificationsEnabled(value);
    if (field === "autosave_enabled") setAutosaveEnabled(value);
    
    setSavingField(field);
    await supabase.from("profiles").update({ [field]: value }).eq("id", user.uid);
    setTimeout(() => setSavingField(null), 1000);
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data && data.length > 0) setHistory(data);
    };
    loadHistory();
  }, [user]);

  const handleSaveAccount = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ name, phone }).eq("id", user.uid);
    setSaveMsg("Profile updated!");
    setSaving(false);
    setEditMode(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
    : "January 2024";

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left: Profile Card ─────────────────────────────────────────── */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center sticky top-24">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,191,0,0.15)]">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-white mb-0.5">{name || "UPSC Aspirant"}</h2>
              <p className="text-sm text-gray-500 mb-3 truncate max-w-full">{user?.email}</p>

              {/* Plan badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5 ${profile?.plan === "premium" ? "bg-primary/15 border border-primary/30 text-primary" : "bg-white/5 border border-white/10 text-gray-400"}`}>
                {profile?.plan === "premium" ? <Zap className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                {profile?.plan === "premium" ? "Premium" : "Free Plan"}
              </div>

              <div className="w-full border-t border-white/5 pt-4 space-y-3 text-left">
                <div className="flex items-center gap-2.5 text-sm text-gray-400">
                  <Calendar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span>Member since {memberSince}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-400">
                  <Mail className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
              </div>

              <button
                onClick={() => { setActiveTab("account"); setEditMode(true); }}
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>

              <button
                onClick={() => logout()}
                className="mt-2 w-full py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </aside>

          {/* ── Right: Tabbed Content ──────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {saveMsg && (
              <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl">
                {saveMsg}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1 mb-6 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Account Details Tab ──────────────────────────────────────── */}
            {activeTab === "account" && (
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">Account Details</h3>
                  <button onClick={() => setEditMode(!editMode)} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> {editMode ? "Cancel" : "Edit"}
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wider">Full Name</label>
                    {editMode ? (
                      <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary/50 transition-colors" />
                    ) : (
                      <div className="flex items-center gap-3 py-2.5 px-4 bg-background border border-white/5 rounded-lg">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-300">{name || "—"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="flex items-center gap-3 py-2.5 px-4 bg-background border border-white/5 rounded-lg opacity-60 cursor-not-allowed">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-400">{user?.email}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 ml-1">Email cannot be changed.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wider">Phone Number</label>
                    {editMode ? (
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary/50 transition-colors" />
                    ) : (
                      <div className="flex items-center gap-3 py-2.5 px-4 bg-background border border-white/5 rounded-lg">
                        <Phone className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-400">{phone || "Not added"}</span>
                      </div>
                    )}
                  </div>

                  {editMode && (
                    <button onClick={handleSaveAccount} disabled={saving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 disabled:opacity-70 transition-colors">
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Subscription Tab ─────────────────────────────────────────── */}
            {activeTab === "subscription" && (
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-6">Subscription</h3>

                <div className={`p-5 rounded-xl border mb-6 ${profile?.plan === "premium" ? "bg-primary/5 border-primary/30" : "bg-background border-white/5"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {profile?.plan === "premium" ? <Zap className="w-5 h-5 text-primary" /> : <Shield className="w-5 h-5 text-gray-500" />}
                      <span className="font-bold text-white text-lg capitalize">{profile?.plan || "Free"} Plan</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${profile?.plan === "premium" ? "bg-primary/20 text-primary" : "bg-white/5 text-gray-400"}`}>
                      {profile?.plan === "premium" ? "Active" : "Free Tier"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{profile?.plan === "premium" ? "You have full access to all features including all mock tests, detailed analytics, and priority support." : "You have access to 100 free MCQs and 1 mock test. Upgrade to unlock everything."}</p>
                </div>

                {profile?.plan !== "premium" && (
                  <div className="border border-primary/20 rounded-xl p-5 bg-primary/5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-white font-bold text-lg mb-1">Upgrade to Premium</p>
                        <p className="text-gray-400 text-sm">Unlock 10,000+ MCQs, 50+ Mock Tests, and Advanced Analytics.</p>
                        <p className="text-primary font-extrabold text-2xl mt-2">₹999 <span className="text-sm text-gray-500 font-normal">/year</span></p>
                      </div>
                      <Link href="/pricing" className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(255,191,0,0.2)] whitespace-nowrap">
                        Upgrade Now <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Test History Tab ─────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-6">Test History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-xs text-gray-500 font-semibold pb-3 pr-4">Test Name</th>
                        <th className="text-left text-xs text-gray-500 font-semibold pb-3 pr-4">Date</th>
                        <th className="text-left text-xs text-gray-500 font-semibold pb-3 pr-4">Mode</th>
                        <th className="text-center text-xs text-gray-500 font-semibold pb-3 pr-4">Score</th>
                        <th className="text-right text-xs text-gray-500 font-semibold pb-3">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-4xl mb-3">📝</span>
                              <p className="text-gray-400 font-medium">No tests taken yet</p>
                              <p className="text-sm text-gray-500 mb-4">Start practicing to see your history here.</p>
                              <Link href="/practice-tests" className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-semibold hover:bg-primary/30 transition-colors">
                                Start Practice
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ) : history.map(t => {
                        const score = (t.score as number) || 0;
                        const total = (t.total as number) || 200;
                        const pct = Math.round((score / total) * 100);
                        return (
                          <tr key={t.id as string} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 pr-4 text-gray-300 font-medium">{t.name as string}</td>
                            <td className="py-3.5 pr-4 text-gray-500 text-xs whitespace-nowrap">{(t.date as string) || "—"}</td>
                            <td className="py-3.5 pr-4">
                              <span className="text-xs bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded capitalize">{t.mode as string}</span>
                            </td>
                            <td className="py-3.5 pr-4 text-center">
                              <span className={`font-bold ${pct >= 60 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400"}`}>{score.toFixed(1)}</span>
                              <span className="text-gray-600 text-xs ml-1">({pct}%)</span>
                            </td>
                            <td className="py-3.5 text-right">
                              <Link href={`/results?attempt_id=${t.id as string}`} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 justify-end">
                                View <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Preferences Tab ──────────────────────────────────────────── */}
            {activeTab === "preferences" && (
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-6">Preferences</h3>
                <div className="space-y-5">

                  <PrefToggle
                    title="Negative Marking"
                    desc="Enable -0.66 deduction for incorrect answers in practice mode."
                    icon={<Zap className="w-4 h-4 text-amber-400" />}
                    value={negativeMarking}
                    onChange={(v) => handleToggle("negative_marking", v)}
                    showSaved={savingField === "negative_marking"}
                  />

                  <PrefToggle
                    title="Test Notifications"
                    desc="Receive email reminders for new mock tests and daily quizzes."
                    icon={<Bell className="w-4 h-4 text-blue-400" />}
                    value={notificationsEnabled}
                    onChange={(v) => handleToggle("notifications_enabled", v)}
                    showSaved={savingField === "notifications_enabled"}
                  />

                  <PrefToggle
                    title="Auto-save Progress"
                    desc="Automatically save your answers during a test in case of disconnection."
                    icon={<Clock className="w-4 h-4 text-green-400" />}
                    value={autosaveEnabled}
                    onChange={(v) => handleToggle("autosave_enabled", v)}
                    showSaved={savingField === "autosave_enabled"}
                  />
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function PrefToggle({ title, desc, icon, value, onChange, showSaved }: { title: string; desc: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void; showSaved?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-background border border-white/5 rounded-xl hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{title}</p>
            {showSaved && <span className="text-xs text-green-400 transition-opacity">Saved ✓</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 mt-0.5 ${value ? "bg-primary" : "bg-white/10"}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-[26px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
