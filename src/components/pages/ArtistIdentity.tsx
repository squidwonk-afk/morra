"use client";

import { useState } from "react";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMorraUser } from "@/contexts/MorraUserContext";
import {
  toolBlockReasonFromResponse,
  type ToolBlockReason,
} from "@/lib/client/tool-api-error";

export function ArtistIdentity() {
  const { refresh } = useMorraUser();
  const [limitOpen, setLimitOpen] = useState(false);
  const [blockReason, setBlockReason] =
    useState<ToolBlockReason>("insufficient_credits");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    genre: "",
    influences: "",
    mood: "",
    lyrics: "",
  });
  const [outputs, setOutputs] = useState({
    bio: "",
    epk: "",
    social: "",
    hashtags: "",
    press: "",
  });

  async function handleGenerate() {
    setLoading(true);
    try {
      const r = await fetch("/api/tools/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          genre: formData.genre,
          influences: formData.influences,
          mood: formData.mood,
          lyrics: formData.lyrics,
        }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        error?: string;
        result?: { output?: Record<string, string> };
      };
      if (!r.ok) {
        const br = toolBlockReasonFromResponse(r.status, j);
        if (br) {
          setBlockReason(br);
          setLimitOpen(true);
          return;
        }
        toast.error(j.error || "Generation failed");
        return;
      }
      const o = j.result?.output ?? {};
      setOutputs({
        bio: String(o.bio ?? ""),
        epk: String(o.epk ?? ""),
        social: String(o.social ?? ""),
        hashtags: String(o.hashtags ?? ""),
        press: String(o.press ?? ""),
      });
      setGenerated(true);
      toast.success("Content generated successfully!");
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleSave = () => {
    toast.success("Saved to your library!");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <LimitReachedModal
        isOpen={limitOpen}
        onClose={() => setLimitOpen(false)}
        blockReason={blockReason}
      />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-[#00FF94]">Artist</span> Identity Generator
        </h1>
        <p className="text-xl text-[#A0A0A0]">
          Create compelling bios, EPKs, and promotional content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-[#00FF94]" size={20} />
              Tell Us About You
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Artist Name</Label>
                <Input
                  id="name"
                  placeholder="Your artist name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  placeholder="e.g., Dark Pop, Hip Hop, Electronic"
                  value={formData.genre}
                  onChange={(e) => setFormData({...formData, genre: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="influences">Musical Influences</Label>
                <Input
                  id="influences"
                  placeholder="Artists or styles that inspire you"
                  value={formData.influences}
                  onChange={(e) => setFormData({...formData, influences: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="mood">Mood / Vibe</Label>
                <Input
                  id="mood"
                  placeholder="e.g., Dark, Energetic, Melancholic"
                  value={formData.mood}
                  onChange={(e) => setFormData({...formData, mood: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="lyrics">Lyrics Sample (Optional)</Label>
                <Textarea
                  id="lyrics"
                  placeholder="Paste some of your lyrics to help capture your style"
                  value={formData.lyrics}
                  onChange={(e) => setFormData({...formData, lyrics: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] min-h-[120px]"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || !formData.name || !formData.genre}
              className="w-full mt-6 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)] hover:shadow-[0_0_30px_rgba(0,255,148,0.5)] transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 animate-spin" size={20} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={20} />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Generated Content</h2>
              {generated && (
                <Button
                  onClick={handleSave}
                  variant="outline"
                  size="sm"
                  className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
                >
                  <Save className="mr-2" size={16} />
                  Save All
                </Button>
              )}
            </div>

            {!generated ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#00FF94]/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="text-[#00FF94]" size={32} />
                </div>
                <p className="text-[#A0A0A0]">
                  Fill in the form and click generate to create your content
                </p>
              </div>
            ) : (
              <Tabs defaultValue="bio" className="w-full">
                <TabsList className="w-full bg-[#0A0A0A] border border-[#00FF94]/20">
                  <TabsTrigger value="bio" className="flex-1">Bio</TabsTrigger>
                  <TabsTrigger value="epk" className="flex-1">EPK</TabsTrigger>
                  <TabsTrigger value="social" className="flex-1">Social</TabsTrigger>
                  <TabsTrigger value="hashtags" className="flex-1">Tags</TabsTrigger>
                  <TabsTrigger value="press" className="flex-1">Press</TabsTrigger>
                </TabsList>

                <TabsContent value="bio" className="mt-4">
                  <div className="relative p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-[#A0A0A0] whitespace-pre-wrap leading-relaxed">
                      {outputs.bio}
                    </p>
                    <Button
                      onClick={() => handleCopy(outputs.bio)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-[#00FF94] hover:bg-[#00FF94]/10"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="epk" className="mt-4">
                  <div className="relative p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-[#A0A0A0] whitespace-pre-wrap leading-relaxed">
                      {outputs.epk}
                    </p>
                    <Button
                      onClick={() => handleCopy(outputs.epk)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-[#00FF94] hover:bg-[#00FF94]/10"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="social" className="mt-4">
                  <div className="relative p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-[#A0A0A0] whitespace-pre-wrap leading-relaxed">
                      {outputs.social}
                    </p>
                    <Button
                      onClick={() => handleCopy(outputs.social)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-[#00FF94] hover:bg-[#00FF94]/10"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="hashtags" className="mt-4">
                  <div className="relative p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-[#A0A0A0] whitespace-pre-wrap leading-relaxed">
                      {outputs.hashtags}
                    </p>
                    <Button
                      onClick={() => handleCopy(outputs.hashtags)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-[#00FF94] hover:bg-[#00FF94]/10"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="press" className="mt-4">
                  <div className="relative p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    <p className="text-[#A0A0A0] whitespace-pre-wrap leading-relaxed">
                      {outputs.press}
                    </p>
                    <Button
                      onClick={() => handleCopy(outputs.press)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-[#00FF94] hover:bg-[#00FF94]/10"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}