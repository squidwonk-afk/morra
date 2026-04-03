"use client";

import { useEffect, useMemo, useState } from "react";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Image as ImageIcon,
  Sparkles,
  Copy,
  Palette,
  Store,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useMorraUser } from "@/contexts/MorraUserContext";
import {
  toolBlockReasonFromResponse,
  type ToolBlockReason,
} from "@/lib/client/tool-api-error";

type CoverOut = {
  description: string;
  composition: string;
  colorPalette: { name: string; hex: string; use: string }[];
  elements: string[];
  references: string[];
  aiPrompt: string;
};

const emptyCover: CoverOut = {
  description: "",
  composition: "",
  colorPalette: [],
  elements: [],
  references: [],
  aiPrompt: "",
};

type Service = {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: string | number;
  contactInfo: string;
  artistUsername: string;
};

export function CoverStudio() {
  const { me, refresh } = useMorraUser();
  const [limitOpen, setLimitOpen] = useState(false);
  const [blockReason, setBlockReason] =
    useState<ToolBlockReason>("insufficient_credits");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    mood: "",
    style: "",
    colors: "",
  });
  const [concept, setConcept] = useState<CoverOut>(emptyCover);

  // Marketplace
  const [marketBusy, setMarketBusy] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  const myUserId = me?.user?.id ?? null;
  const myServices = useMemo(
    () => (myUserId ? services.filter((s) => s.userId === myUserId) : []),
    [services, myUserId]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    price: "",
    contactInfo: "",
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    contactInfo: "",
  });

  async function loadMarketplace() {
    setMarketBusy(true);
    try {
      const r = await fetch("/api/artist-services", { credentials: "include" });
      const j = (await r.json()) as { ok?: boolean; services?: Service[]; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not load marketplace");
        return;
      }
      setServices(j.services ?? []);
    } catch {
      toast.error("Network error");
    } finally {
      setMarketBusy(false);
    }
  }

  async function createService() {
    setCreateBusy(true);
    try {
      const r = await fetch("/api/artist-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || null,
          price: createForm.price.trim() || "0",
          contactInfo: createForm.contactInfo.trim() || null,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; service?: Service; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not create listing");
        return;
      }
      toast.success("Listing created");
      if (j.service) {
        const svc = j.service as Service;
        setServices((prev) => {
          const uname = me?.user?.username ?? "";
          return [{ ...svc, artistUsername: svc.artistUsername || uname }, ...prev];
        });
      }
      setCreateOpen(false);
      setCreateForm({
        title: "",
        description: "",
        price: "",
        contactInfo: "",
      });
      await loadMarketplace();
    } catch {
      toast.error("Network error");
    } finally {
      setCreateBusy(false);
    }
  }

  async function saveEdit() {
    if (!editId) return;
    setEditBusy(true);
    try {
      const r = await fetch(`/api/artist-services/${encodeURIComponent(editId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          price: editForm.price.trim() || "0",
          contactInfo: editForm.contactInfo.trim() || null,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not update listing");
        return;
      }
      toast.success("Listing updated");
      setEditId(null);
      await loadMarketplace();
    } catch {
      toast.error("Network error");
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this listing?")) return;
    try {
      const r = await fetch(`/api/artist-services/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        toast.error(j.error || "Could not delete listing");
        return;
      }
      toast.success("Listing deleted");
      await loadMarketplace();
    } catch {
      toast.error("Network error");
    }
  }

  useEffect(() => {
    void loadMarketplace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    setLoading(true);
    try {
      const r = await fetch("/api/tools/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          mood: formData.mood,
          style: formData.style,
          colors: formData.colors,
        }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        error?: string;
        result?: { output?: CoverOut };
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
      const o = j.result?.output;
      if (o) {
        setConcept({
          description: String(o.description ?? ""),
          composition: String(o.composition ?? ""),
          colorPalette: Array.isArray(o.colorPalette) ? o.colorPalette : [],
          elements: Array.isArray(o.elements) ? o.elements : [],
          references: Array.isArray(o.references) ? o.references : [],
          aiPrompt: String(o.aiPrompt ?? ""),
        });
      }
      setGenerated(true);
      toast.success("Concept generated!");
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

  return (
    <div className="max-w-7xl mx-auto">
      <LimitReachedModal
        isOpen={limitOpen}
        onClose={() => setLimitOpen(false)}
        blockReason={blockReason}
      />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-[#00FF94]">Cover Art</span> Studio
        </h1>
        <p className="text-xl text-[#A0A0A0]">
          Generate detailed visual concepts for your album artwork
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ImageIcon className="text-[#00FF94]" size={20} />
              Vision Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Song/Album Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Night Thoughts"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="mood">Mood / Feeling</Label>
                <Input
                  id="mood"
                  placeholder="e.g., Dark, Dreamy, Aggressive"
                  value={formData.mood}
                  onChange={(e) => setFormData({...formData, mood: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="style">Visual Style</Label>
                <Input
                  id="style"
                  placeholder="e.g., Minimalist, Abstract, Photography"
                  value={formData.style}
                  onChange={(e) => setFormData({...formData, style: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>

              <div>
                <Label htmlFor="colors">Color Preferences (Optional)</Label>
                <Input
                  id="colors"
                  placeholder="e.g., Neon green, black, purple"
                  value={formData.colors}
                  onChange={(e) => setFormData({...formData, colors: e.target.value})}
                  className="mt-2 bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || !formData.title || !formData.mood}
              className="w-full mt-6 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]"
            >
              {loading ? "Generating..." : "Generate Concept"}
            </Button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
          {!generated ? (
            <div className="p-12 rounded-2xl bg-[#121212] border border-[#00FF94]/20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00FF94]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-[#00FF94]" size={32} />
              </div>
              <p className="text-[#A0A0A0]">
                Fill in your vision details to generate a detailed cover concept
              </p>
            </div>
          ) : (
            <>
              {/* Concept Description */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4">Concept Overview</h3>
                <p className="text-[#A0A0A0] leading-relaxed">
                  {concept.description}
                </p>
              </div>

              {/* Composition */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4">Composition</h3>
                <p className="text-[#A0A0A0]">{concept.composition}</p>
              </div>

              {/* Color Palette */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Palette className="text-[#00FF94]" size={20} />
                  Color Palette
                </h3>
                <div className="space-y-3">
                  {concept.colorPalette.map((color, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg shadow-lg border border-[#00FF94]/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{color.name}</p>
                        <p className="text-sm text-[#A0A0A0]">{color.hex} • {color.use}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Elements */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4">Visual Elements</h3>
                <ul className="space-y-2">
                  {concept.elements.map((element, index) => (
                    <li key={index} className="flex items-start gap-3 text-[#A0A0A0]">
                      <span className="text-[#00FF94]">•</span>
                      <span>{element}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* References */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4">Style References</h3>
                <ul className="space-y-2">
                  {concept.references.map((ref, index) => (
                    <li key={index} className="text-[#A0A0A0]">
                      → {ref}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Prompt */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#00FF94]/10 to-[#9BFF00]/10 border border-[#00FF94]/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">AI Image Prompt</h3>
                  <Button
                    onClick={() => handleCopy(concept.aiPrompt)}
                    variant="ghost"
                    size="sm"
                    className="text-[#00FF94] hover:bg-[#00FF94]/10"
                  >
                    <Copy size={16} className="mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-[#A0A0A0] leading-relaxed p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                  {concept.aiPrompt}
                </p>
                <p className="text-xs text-[#A0A0A0] mt-3">
                  Use this prompt with Midjourney, DALL-E, or Stable Diffusion to generate your cover art
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20 max-h-[70vh] flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 flex-shrink-0">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <Store className="text-[#00FF94]" size={22} />
            Artist marketplace
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={marketBusy}
              onClick={() => void loadMarketplace()}
              className="border-[#00FF94]/30 text-[#00FF94] hover:bg-[#00FF94]/10"
            >
              <RefreshCw className={marketBusy ? "mr-2 animate-spin" : "mr-2"} size={16} />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => setCreateOpen((v) => !v)}
              className="bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
            >
              <Plus className="mr-2" size={16} />
              {createOpen ? "Close" : "New listing"}
            </Button>
          </div>
        </div>

        {createOpen ? (
          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10 mb-4 flex-shrink-0">
            <h4 className="font-semibold mb-4">Create listing</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="svc-title">Title</Label>
                <Input
                  id="svc-title"
                  placeholder="e.g. Neon cover art pack"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="mt-2 bg-[#121212] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
              <div>
                <Label htmlFor="svc-price">Price</Label>
                <Input
                  id="svc-price"
                  placeholder="e.g. 120 or $120"
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  className="mt-2 bg-[#121212] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
              <div>
                <Label htmlFor="svc-contact">Contact info</Label>
                <Input
                  id="svc-contact"
                  placeholder="email, IG, or booking link"
                  value={createForm.contactInfo}
                  onChange={(e) => setCreateForm({ ...createForm, contactInfo: e.target.value })}
                  className="mt-2 bg-[#121212] border-[#00FF94]/20 focus:border-[#00FF94]"
                />
              </div>
              <div>
                <Label htmlFor="svc-desc">Description</Label>
                <Textarea
                  id="svc-desc"
                  placeholder="Deliverables, turnaround, style notes"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="mt-2 bg-[#121212] border-[#00FF94]/20 focus:border-[#00FF94] min-h-[100px]"
                />
              </div>
              <Button
                type="button"
                disabled={createBusy || createForm.title.trim().length === 0}
                onClick={() => void createService()}
                className="w-full bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90"
              >
                {createBusy ? "Publishing…" : "Publish listing"}
              </Button>
            </div>
          </div>
        ) : null}

        {myServices.length ? (
          <div className="mb-4 flex-shrink-0">
            <h4 className="font-semibold mb-2">My listings</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myServices.map((s) => {
                const isEditing = editId === s.id;
                return (
                  <div key={s.id} className="p-3 rounded-lg bg-[#0A0A0A] border border-[#00FF94]/10">
                    {!isEditing ? (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{s.title}</p>
                          <p className="text-xs text-[#A0A0A0]">Price: {String(s.price)}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditId(s.id);
                              setEditForm({
                                title: s.title,
                                description: s.description,
                                price: String(s.price ?? ""),
                                contactInfo: s.contactInfo ?? "",
                              });
                            }}
                            className="border-[#00FF94]/30 text-[#00FF94] h-8"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void deleteService(s.id)}
                            className="border-red-500/40 text-red-400 h-8"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="bg-[#121212] border-[#00FF94]/20 text-sm"
                        />
                        <Input
                          placeholder="Price"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="bg-[#121212] border-[#00FF94]/20 text-sm"
                        />
                        <Input
                          placeholder="Contact"
                          value={editForm.contactInfo}
                          onChange={(e) => setEditForm({ ...editForm, contactInfo: e.target.value })}
                          className="bg-[#121212] border-[#00FF94]/20 text-sm"
                        />
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="bg-[#121212] border-[#00FF94]/20 text-sm min-h-[72px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={editBusy || !editForm.title.trim()}
                            onClick={() => void saveEdit()}
                            className="bg-[#00FF94] text-[#0A0A0A]"
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditId(null)}
                            className="border-[#00FF94]/30"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-3 overflow-y-auto flex-1 min-h-[200px] pr-1">
          {services.length === 0 ? (
            <p className="text-sm text-[#A0A0A0]">No listings yet. Be the first to publish one.</p>
          ) : (
            services.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-[#707070] mt-1">
                  @{s.artistUsername || "artist"}
                </p>
                {s.description ? (
                  <p className="text-sm text-[#A0A0A0] mt-2 whitespace-pre-wrap">{s.description}</p>
                ) : null}
                <p className="text-sm text-[#00FF94] mt-2 font-medium">Price: {String(s.price)}</p>
                {s.contactInfo ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-[#A0A0A0] whitespace-pre-wrap break-all">{s.contactInfo}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-[#00FF94]/30 text-[#00FF94]"
                      onClick={() => {
                        void navigator.clipboard.writeText(s.contactInfo);
                        toast.success("Contact copied");
                      }}
                    >
                      <Copy size={12} className="mr-1" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-[#707070] mt-2">No contact info listed</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
