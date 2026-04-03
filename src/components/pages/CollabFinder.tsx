"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Search, AtSign, Sparkles, Camera, Music2, Link as LinkIcon } from "lucide-react";

type Socials = {
  instagram: string;
  tiktok: string;
  soundcloud: string;
  spotify: string;
};

type Artist = {
  id: string;
  userId: string;
  username: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio: string;
  role: string;
  styles: string[];
  lookingFor: string[];
  socials: Socials;
};

type MyProfileRes = {
  ok?: boolean;
  profile?: {
    id: string;
    username: string | null;
    bio: string;
    role: string;
    styles: string[];
    lookingFor: string[];
  } | null;
  socials?: Socials | null;
  error?: string;
};

type BrowseRes = {
  ok?: boolean;
  artists?: Artist[];
  error?: string;
};

function splitTokens(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .slice(0, 50);
}

function uniq(tokens: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function safeHandle(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.startsWith("@") ? t : `@${t}`;
}

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function instagramUrl(handle: string): string | null {
  const h = handle.trim().replace(/^@/, "");
  return h ? `https://instagram.com/${h}` : null;
}

function tiktokUrl(handle: string): string | null {
  const h = handle.trim().replace(/^@/, "");
  return h ? `https://www.tiktok.com/@${h}` : null;
}

function soundcloudUrl(handleOrUrl: string): string | null {
  const t = handleOrUrl.trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const h = t.replace(/^@/, "");
  return `https://soundcloud.com/${h}`;
}

function spotifyUrl(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  return t.startsWith("http://") || t.startsWith("https://") ? t : null;
}

export function CollabFinder() {
  const [view, setView] = useState<"discover" | "profile">("discover");

  // Discover filters
  const [filters, setFilters] = useState({
    role: "",
    style: "",
    lookingFor: "",
  });
  const [searchBusy, setSearchBusy] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);

  // My profile
  const [loadBusy, setLoadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [form, setForm] = useState({
    role: "",
    stylesCsv: "",
    lookingForCsv: "",
    bio: "",
    instagram: "",
    tiktok: "",
    soundcloud: "",
    spotify: "",
  });

  const stylesTokens = useMemo(() => uniq(splitTokens(form.stylesCsv)), [form.stylesCsv]);
  const lookingForTokens = useMemo(
    () => uniq(splitTokens(form.lookingForCsv)),
    [form.lookingForCsv]
  );

  async function loadMine() {
    setLoadBusy(true);
    try {
      const r = await fetch("/api/artists/profile", { credentials: "include" });
      const j = (await r.json()) as MyProfileRes;
      if (!r.ok) {
        toast.error(j.error || "Could not load profile");
        return;
      }
      const p = j.profile ?? null;
      const s = j.socials ?? null;
      setForm({
        role: (p?.role ?? "") || "",
        stylesCsv: (p?.styles ?? []).join(", "),
        lookingForCsv: (p?.lookingFor ?? []).join(", "),
        bio: (p?.bio ?? "") || "",
        instagram: safeHandle(s?.instagram ?? ""),
        tiktok: safeHandle(s?.tiktok ?? ""),
        soundcloud: (s?.soundcloud ?? "") || "",
        spotify: (s?.spotify ?? "") || "",
      });
    } catch {
      toast.error("Network error");
    } finally {
      setLoadBusy(false);
    }
  }

  async function saveMine() {
    setSaveBusy(true);
    try {
      const r = await fetch("/api/artists/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: form.role.trim().toLowerCase() || undefined,
          styles: stylesTokens,
          lookingFor: lookingForTokens,
          bio: form.bio,
          instagram: form.instagram,
          tiktok: form.tiktok,
          soundcloud: form.soundcloud,
          spotify: form.spotify,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not save profile");
        return;
      }
      toast.success("Profile saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaveBusy(false);
    }
  }

  async function deleteMine() {
    if (!confirm("Delete your artist profile? This removes you from discovery.")) return;
    setSaveBusy(true);
    try {
      const r = await fetch("/api/artists/profile", {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not delete profile");
        return;
      }
      toast.success("Profile deleted");
      setForm({
        role: "",
        stylesCsv: "",
        lookingForCsv: "",
        bio: "",
        instagram: "",
        tiktok: "",
        soundcloud: "",
        spotify: "",
      });
    } catch {
      toast.error("Network error");
    } finally {
      setSaveBusy(false);
    }
  }

  async function runSearch() {
    setSearchBusy(true);
    try {
      const r = await fetch("/api/artists/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: filters.role.trim().toLowerCase() || null,
          style: filters.style.trim().toLowerCase() || null,
          lookingFor: filters.lookingFor.trim().toLowerCase() || null,
          limit: 24,
        }),
      });
      const j = (await r.json()) as BrowseRes;
      if (!r.ok) {
        toast.error(j.error || "Search failed");
        return;
      }
      setArtists(j.artists ?? []);
      toast.success("Results updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSearchBusy(false);
    }
  }

  useEffect(() => {
    // Load my profile lazily when user enters the tab.
    if (view === "profile") {
      void loadMine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-[#00FF94]">Collab</span> Finder
        </h1>
        <p className="text-xl text-[#A0A0A0]">Find artists and connect off-platform (privacy-first)</p>
      </div>

      <div className="flex gap-4 mb-8">
        <Button
          onClick={() => setView("discover")}
          variant={view === "discover" ? "default" : "outline"}
          className={
            view === "discover"
              ? "bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
              : "border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
          }
        >
          <Search className="mr-2" size={18} />
          Discover Artists
        </Button>
        <Button
          onClick={() => setView("profile")}
          variant={view === "profile" ? "default" : "outline"}
          className={
            view === "profile"
              ? "bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
              : "border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
          }
        >
          <Users className="mr-2" size={18} />
          My Profile
        </Button>
      </div>

      {view === "discover" ? (
        <div>
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 mb-8">
            <h2 className="text-xl font-bold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-role">Role</Label>
                <Input
                  id="filter-role"
                  placeholder="e.g. producer"
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
              <div>
                <Label htmlFor="filter-style">Style</Label>
                <Input
                  id="filter-style"
                  placeholder="e.g. dark pop"
                  value={filters.style}
                  onChange={(e) => setFilters({ ...filters, style: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
              <div>
                <Label htmlFor="filter-looking-for">Looking For</Label>
                <Input
                  id="filter-looking-for"
                  placeholder="e.g. vocalist"
                  value={filters.lookingFor}
                  onChange={(e) => setFilters({ ...filters, lookingFor: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  disabled={searchBusy}
                  onClick={() => void runSearch()}
                  className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
                >
                  <Search className="mr-2" size={18} />
                  {searchBusy ? "Searching…" : "Search"}
                </Button>
              </div>
            </div>
          </div>

          {artists.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#121212] border border-[#00FF94]/20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00FF94]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-[#00FF94]" size={32} />
              </div>
              <p className="text-[#A0A0A0]">
                No artists yet. Create your profile, then come back and search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {artists.map((a) => {
                const displayName = (a.display_name ?? "").trim() || "Artist";
                const initial = displayName.charAt(0).toUpperCase() || "A";
                const ig = instagramUrl(a.socials.instagram);
                const tt = tiktokUrl(a.socials.tiktok);
                const sc = soundcloudUrl(a.socials.soundcloud);
                const sp = spotifyUrl(a.socials.spotify);
                return (
                  <div
                    key={a.id}
                    className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 hover:border-[#00FF94]/50 hover:shadow-[0_0_30px_rgba(0,255,148,0.2)] transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      {a.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.avatar_url}
                          alt=""
                          className="w-16 h-16 rounded-full object-cover border border-[#00FF94]/30 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF94] to-[#9BFF00] flex items-center justify-center flex-shrink-0">
                          <span className="text-[#0A0A0A] font-bold text-xl">{initial}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-bold mb-0.5 truncate">{displayName}</p>
                        <p className="text-sm text-[#A0A0A0] truncate">@{a.username ?? "unknown"}</p>
                        <p className="text-[#A0A0A0] text-sm">
                          {a.role ? a.role : "artist"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {(a.styles ?? []).slice(0, 6).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="border-[#00FF94]/30 text-[#00FF94] bg-[#00FF94]/5"
                        >
                          {t}
                        </Badge>
                      ))}
                      {(a.lookingFor ?? []).slice(0, 4).map((t) => (
                        <Badge
                          key={`lf:${t}`}
                          variant="outline"
                          className="border-[#9BFF00]/30 text-[#9BFF00] bg-[#9BFF00]/5"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-[#A0A0A0] text-sm mb-4 whitespace-pre-wrap">
                      {a.bio || "No bio yet."}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                        disabled={!ig}
                        onClick={() => ig && openUrl(ig)}
                        className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 disabled:opacity-40"
                      >
                        <Camera className="mr-2" size={18} />
                        Instagram
                      </Button>
                      <Button
                        disabled={!tt}
                        onClick={() => tt && openUrl(tt)}
                        variant="outline"
                        className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10 disabled:opacity-40"
                      >
                        <AtSign className="mr-2" size={18} />
                        TikTok
                      </Button>
                      <Button
                        disabled={!sc}
                        onClick={() => sc && openUrl(sc)}
                        variant="outline"
                        className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10 disabled:opacity-40"
                      >
                        <Music2 className="mr-2" size={18} />
                        SoundCloud
                      </Button>
                      <Button
                        disabled={!sp}
                        onClick={() => sp && openUrl(sp)}
                        variant="outline"
                        className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10 disabled:opacity-40"
                      >
                        <LinkIcon className="mr-2" size={18} />
                        Spotify
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-3xl">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold">My Profile</h2>
              <Button
                type="button"
                variant="outline"
                disabled={loadBusy}
                onClick={() => void loadMine()}
                className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
              >
                {loadBusy ? "Loading…" : "Refresh"}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  placeholder="e.g. musician / producer / designer"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="styles">Styles</Label>
                <Input
                  id="styles"
                  placeholder="comma separated (e.g. indie, dark pop, hyperpop)"
                  value={form.stylesCsv}
                  onChange={(e) => setForm({ ...form, stylesCsv: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="lookingFor">Looking For</Label>
                <Input
                  id="lookingFor"
                  placeholder="comma separated (e.g. vocalist, mixing, cover art)"
                  value={form.lookingForCsv}
                  onChange={(e) => setForm({ ...form, lookingForCsv: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="What do you do, and what are you looking for?"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] min-h-[140px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ig">Instagram</Label>
                  <Input
                    id="ig"
                    placeholder="@handle"
                    value={form.instagram}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="tt">TikTok</Label>
                  <Input
                    id="tt"
                    placeholder="@handle"
                    value={form.tiktok}
                    onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                    className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="sc">SoundCloud</Label>
                  <Input
                    id="sc"
                    placeholder="soundcloud username or url"
                    value={form.soundcloud}
                    onChange={(e) => setForm({ ...form, soundcloud: e.target.value })}
                    className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="sp">Spotify</Label>
                  <Input
                    id="sp"
                    placeholder="spotify profile url"
                    value={form.spotify}
                    onChange={(e) => setForm({ ...form, spotify: e.target.value })}
                    className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] font-mono text-sm"
                  />
                </div>
              </div>

              <Button
                type="button"
                disabled={saveBusy}
                onClick={() => void saveMine()}
                className="w-full mt-6 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]"
              >
                {saveBusy ? "Saving…" : "Save Profile"}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={saveBusy}
                onClick={() => void deleteMine()}
                className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Delete Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

