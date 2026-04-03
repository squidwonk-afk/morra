"use client";

import { useState } from "react";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { StructuredToolSections, JsonKeyValueCard } from "@/components/tools/StructuredToolSections";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { useMorraUser } from "@/contexts/MorraUserContext";
import {
  toolBlockReasonFromResponse,
  type ToolBlockReason,
} from "@/lib/client/tool-api-error";

const timelineData = [
  {
    week: "Week 1 (4 weeks out)",
    tasks: [
      { task: "Announce release date", platform: "All socials", done: false },
      { task: "Post studio behind-the-scenes", platform: "Instagram Stories", done: false },
      { task: "Update bio with release info", platform: "All platforms", done: false },
    ]
  },
  {
    week: "Week 2 (3 weeks out)",
    tasks: [
      { task: "Release teaser clip", platform: "TikTok, Reels", done: false },
      { task: "Share lyric snippet", platform: "Twitter, Instagram", done: false },
      { task: "Engage with similar artists", platform: "All platforms", done: false },
    ]
  },
  {
    week: "Week 3 (2 weeks out)",
    tasks: [
      { task: "Drop cover art reveal", platform: "Instagram, Twitter", done: false },
      { task: "Share pre-save link", platform: "All platforms", done: false },
      { task: "Post making-of content", platform: "YouTube, Instagram", done: false },
    ]
  },
  {
    week: "Week 4 (Release week)",
    tasks: [
      { task: "Final countdown posts", platform: "All socials", done: false },
      { task: "Release music video/visualizer", platform: "YouTube", done: false },
      { task: "Go live to celebrate release", platform: "Instagram/TikTok", done: false },
      { task: "Thank supporters & share", platform: "All platforms", done: false },
    ]
  },
];

type WeekBlock = {
  week: string;
  tasks: { task: string; platform: string; done: boolean }[];
};

export function RolloutPlanner() {
  const { refresh } = useMorraUser();
  const [limitOpen, setLimitOpen] = useState(false);
  const [blockReason, setBlockReason] =
    useState<ToolBlockReason>("insufficient_credits");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [formData, setFormData] = useState({
    releaseTitle: "",
    releaseDate: "",
    genre: "",
    platforms: "Spotify, Apple Music, SoundCloud, TikTok, Instagram",
    songDescription: "",
    lyrics: "",
  });
  const [planWeeks, setPlanWeeks] = useState<WeekBlock[]>([]);
  const [rolloutRaw, setRolloutRaw] = useState<Record<string, unknown> | null>(null);
  const [toolRunId, setToolRunId] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const title =
        formData.releaseTitle.trim() ||
        (formData.genre ? `${formData.genre} release` : "Release");
      const r = await fetch("/api/tools/rollout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          releaseTitle: title,
          releaseDate: formData.releaseDate,
          platforms: formData.platforms,
          songDescription: formData.songDescription,
          lyrics: formData.lyrics,
          genre: formData.genre,
        }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        error?: string;
        result?: {
          output?: { phases?: { week: string; focus: string; tasks: string[] }[] } & Record<string, unknown>;
          toolRunId?: string | null;
          qualityAttempts?: number;
        };
      };
      if (!r.ok) {
        const br = toolBlockReasonFromResponse(r.status, j);
        if (br) {
          setBlockReason(br);
          setLimitOpen(true);
          return;
        }
        toast.error(j.error || "Could not generate plan");
        return;
      }
      const out = j.result?.output ?? null;
      setRolloutRaw(out);
      setToolRunId(j.result?.toolRunId ?? null);
      const phases = out?.phases ?? [];
      setPlanWeeks(
        (Array.isArray(phases) ? phases : []).map((p) => ({
          week: `Phase ${p.week}: ${p.focus}`,
          tasks: p.tasks.map((t) => ({
            task: t,
            platform: formData.platforms,
            done: false,
          })),
        }))
      );
      setGenerated(true);
      const att = j.result?.qualityAttempts ?? 1;
      if (att > 1) {
        toast.message("Plan refined", { description: `Quality passes: ${att}` });
      }
      toast.success("Release plan generated!");
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function saveRolloutResult() {
    if (!toolRunId || !saveTitle.trim()) {
      toast.error("Add a title to save");
      return;
    }
    setSaveBusy(true);
    try {
      const r = await fetch("/api/saved-results", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolRunId, title: saveTitle.trim() }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Save failed");
        return;
      }
      toast.success("Saved to your library");
      setSaveTitle("");
    } catch {
      toast.error("Network error");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <LimitReachedModal
        isOpen={limitOpen}
        onClose={() => setLimitOpen(false)}
        blockReason={blockReason}
      />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-[#00FF94]">Release</span> Rollout Planner
        </h1>
        <p className="text-xl text-[#A0A0A0]">
          Build your strategic timeline for maximum impact
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 sticky top-24">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CalendarIcon className="text-[#00FF94]" size={20} />
              Release Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="rtitle">Release title</Label>
                <Input
                  id="rtitle"
                  placeholder="Single / EP name"
                  value={formData.releaseTitle}
                  onChange={(e) => setFormData({ ...formData, releaseTitle: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
              <div>
                <Label htmlFor="date">Release Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => setFormData({...formData, releaseDate: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  placeholder="e.g., Hip Hop, Electronic"
                  value={formData.genre}
                  onChange={(e) => setFormData({...formData, genre: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="platforms">Platform Focus</Label>
                <Input
                  id="platforms"
                  placeholder="Main platforms"
                  value={formData.platforms}
                  onChange={(e) => setFormData({...formData, platforms: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="songDescription">Song story / positioning</Label>
                <Textarea
                  id="songDescription"
                  placeholder="What is this track about? Who is it for?"
                  value={formData.songDescription}
                  onChange={(e) => setFormData({ ...formData, songDescription: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 min-h-[88px]"
                />
              </div>

              <div>
                <Label htmlFor="lyrics">Lyrics excerpt (optional)</Label>
                <Textarea
                  id="lyrics"
                  placeholder="Paste a verse + hook for narrative-driven promo ideas"
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 min-h-[100px]"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || (!formData.releaseDate && !formData.releaseTitle.trim())}
              className="w-full mt-6 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]"
            >
              {loading ? "Generating…" : "Generate Plan"}
            </Button>
            <p className="text-xs text-[#707070] mt-2">
              Add a release date or title so the model can anchor timelines.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          {!generated ? (
            <div className="p-12 rounded-2xl bg-[#121212] border border-[#00FF94]/20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00FF94]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-[#00FF94]" size={32} />
              </div>
              <p className="text-[#A0A0A0]">
                Enter your release details to generate a custom rollout plan
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {rolloutRaw ? <StructuredToolSections data={rolloutRaw} /> : null}

              {rolloutRaw &&
              rolloutRaw.platformStrategy &&
              typeof rolloutRaw.platformStrategy === "object" &&
              !Array.isArray(rolloutRaw.platformStrategy) ? (
                <div>
                  <h3 className="text-lg font-bold text-[#00FF94] mb-3">Platform strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(rolloutRaw.platformStrategy as Record<string, unknown>).map(
                      ([plat, val]) => (
                        <JsonKeyValueCard key={plat} title={plat} value={String(val ?? "")} />
                      )
                    )}
                  </div>
                </div>
              ) : null}

              {rolloutRaw && Array.isArray(rolloutRaw.promotionIdeas) ? (
                <Card className="p-5 bg-[#121212] border-[#00FF94]/20">
                  <h3 className="text-lg font-bold text-[#00FF94] mb-3">Promotion ideas</h3>
                  <ul className="list-decimal pl-5 space-y-2 text-[#D0D0D0] text-sm">
                    {(rolloutRaw.promotionIdeas as unknown[]).map((x, i) => (
                      <li key={i}>{String(x)}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {rolloutRaw && Array.isArray(rolloutRaw.action_checklist) ? (
                <Card className="p-5 bg-[#121212] border-[#00FF94]/20">
                  <h3 className="text-lg font-bold text-[#00FF94] mb-3">Action checklist</h3>
                  <ul className="list-decimal pl-5 space-y-2 text-[#D0D0D0] text-sm">
                    {(rolloutRaw.action_checklist as unknown[]).map((x, i) => (
                      <li key={i}>{String(x)}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/20 flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <Label>Save this plan</Label>
                  <Input
                    className="mt-2 bg-[#121212] border-[#00FF94]/20"
                    placeholder="Title"
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    disabled={!toolRunId}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveBusy || !toolRunId}
                  onClick={() => void saveRolloutResult()}
                  className="border-[#00FF94]/40 text-[#00FF94]"
                >
                  {saveBusy ? "Saving…" : "Save result"}
                </Button>
              </div>

              {(planWeeks.length ? planWeeks : timelineData).map((week, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 relative"
                >
                  <div className="absolute -left-3 top-8 w-6 h-6 rounded-full bg-[#00FF94] shadow-[0_0_20px_rgba(0,255,148,0.5)] flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#0A0A0A]" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4">{week.week}</h3>
                  <div className="space-y-3">
                    {week.tasks.map((item, taskIndex) => (
                      <div 
                        key={taskIndex}
                        className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10 hover:border-[#00FF94]/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded border-2 border-[#00FF94] flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold mb-1">{item.task}</p>
                            <p className="text-sm text-[#A0A0A0]">{item.platform}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#00FF94]/5 to-[#9BFF00]/5 border border-[#00FF94]/20">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="text-[#00FF94]" size={20} />
                  Pro Tips for Success
                </h3>
                <ul className="space-y-2 text-[#A0A0A0]">
                  <li className="flex items-start gap-2">
                    <Check className="text-[#00FF94] flex-shrink-0 mt-0.5" size={18} />
                    <span>Start building hype 4 weeks before release</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-[#00FF94] flex-shrink-0 mt-0.5" size={18} />
                    <span>Post consistently - at least 3-4 times per week</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-[#00FF94] flex-shrink-0 mt-0.5" size={18} />
                    <span>Engage with comments and DMs during rollout</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
