"use client";

import { useState } from "react";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useMorraUser } from "@/contexts/MorraUserContext";
import { Music, Sparkles, TrendingUp, Heart, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  toolBlockReasonFromResponse,
  type ToolBlockReason,
} from "@/lib/client/tool-api-error";

type Analysis = {
  emotion: {
    primary: string;
    secondary: string;
    intensity: number;
    description: string;
  };
  rhyme: {
    density: number;
    scheme: string;
    quality: string;
    feedback: string;
  };
  flow: {
    rating: number;
    patterns: string;
    suggestions: string[];
  };
  improvements: { line: string; issue: string; suggestion: string }[];
};

const emptyAnalysis: Analysis = {
  emotion: {
    primary: ",",
    secondary: ",",
    intensity: 0,
    description: "",
  },
  rhyme: { density: 0, scheme: "", quality: "", feedback: "" },
  flow: { rating: 0, patterns: "", suggestions: [] },
  improvements: [],
};

export function LyricAnalyzer() {
  const { refresh } = useMorraUser();
  const [limitOpen, setLimitOpen] = useState(false);
  const [blockReason, setBlockReason] =
    useState<ToolBlockReason>("insufficient_credits");
  const [lyrics, setLyrics] = useState("");
  /** Uses Mixtral + larger token cap when true (see AI_JOB_ROUTING). */
  const [advancedAnalysis, setAdvancedAnalysis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>(emptyAnalysis);

  async function handleAnalyze() {
    setLoading(true);
    try {
      const r = await fetch("/api/tools/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lyrics, advanced: advancedAnalysis }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        error?: string;
        result?: { output?: Analysis };
      };
      if (!r.ok) {
        const br = toolBlockReasonFromResponse(r.status, j);
        if (br) {
          setBlockReason(br);
          setLimitOpen(true);
          return;
        }
        toast.error(j.error || "Analysis failed");
        return;
      }
      if (j.result?.output) {
        setAnalysis(j.result.output as Analysis);
      }
      setAnalyzed(true);
      toast.success("Analysis complete!");
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
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
          <span className="text-[#00FF94]">Lyric</span> Analyzer
        </h1>
        <p className="text-xl text-[#A0A0A0]">
          Get AI-powered insights on your lyrics, flow, and emotional impact
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Music className="text-[#00FF94]" size={20} />
              Your Lyrics
            </h2>
            
            <Textarea
              placeholder="Paste your lyrics here...&#10;&#10;Line by line&#10;Verse after verse&#10;Let the AI analyze your flow"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="min-h-[400px] bg-[#0A0A0A] border-[#00FF94]/20 focus:border-[#00FF94] font-mono"
            />

            <div className="mt-4 flex items-center justify-between text-sm text-[#A0A0A0]">
              <span>{lyrics.split('\n').filter(l => l.trim()).length} lines</span>
              <span>{lyrics.split(' ').filter(w => w.trim()).length} words</span>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-[#A0A0A0] cursor-pointer">
              <input
                type="checkbox"
                checked={advancedAnalysis}
                onChange={(e) => setAdvancedAnalysis(e.target.checked)}
                className="rounded border-[#00FF94]/40"
              />
              Deeper analysis (Mixtral, higher quality, higher cost)
            </label>

            <Button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={loading || lyrics.length < 20}
              className="w-full mt-6 bg-[#00FF94] text-[#0A0A0A] hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]"
            >
              {loading ? "Analyzing..." : "Analyze Lyrics"}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {!analyzed ? (
            <div className="p-12 rounded-2xl bg-[#121212] border border-[#00FF94]/20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00FF94]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-[#00FF94]" size={32} />
              </div>
              <p className="text-[#A0A0A0]">
                Paste your lyrics and hit analyze to get detailed feedback
              </p>
            </div>
          ) : (
            <>
              {/* Emotional Analysis */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Heart className="text-[#00FF94]" size={20} />
                  Emotional Analysis
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#A0A0A0]">Primary Emotion</span>
                      <span className="font-bold text-[#00FF94]">{analysis.emotion.primary}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#A0A0A0]">Secondary</span>
                      <span className="font-bold">{analysis.emotion.secondary}</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#A0A0A0]">Intensity</span>
                        <span className="text-sm font-bold text-[#00FF94]">{analysis.emotion.intensity}%</span>
                      </div>
                      <Progress value={analysis.emotion.intensity} className="h-2" />
                    </div>
                  </div>
                  <p className="text-sm text-[#A0A0A0] p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    {analysis.emotion.description}
                  </p>
                </div>
              </div>

              {/* Rhyme Analysis */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="text-[#00FF94]" size={20} />
                  Rhyme Density
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#A0A0A0]">Density Score</span>
                      <span className="text-sm font-bold text-[#00FF94]">{analysis.rhyme.density}%</span>
                    </div>
                    <Progress value={analysis.rhyme.density} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#A0A0A0]">Scheme</span>
                      <span className="font-bold">{analysis.rhyme.scheme}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#A0A0A0]">Quality</span>
                      <span className="font-bold text-[#00FF94]">{analysis.rhyme.quality}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#A0A0A0] p-4 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10">
                    {analysis.rhyme.feedback}
                  </p>
                </div>
              </div>

              {/* Flow Analysis */}
              <div className="p-6 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="text-[#00FF94]" size={20} />
                  Flow Suggestions
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#A0A0A0]">Flow Rating</span>
                      <span className="text-sm font-bold text-[#00FF94]">{analysis.flow.rating}/100</span>
                    </div>
                    <Progress value={analysis.flow.rating} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    {analysis.flow.suggestions.map((suggestion, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-xl bg-[#0A0A0A] border border-[#00FF94]/10 text-sm text-[#A0A0A0]"
                      >
                        • {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Improvements */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#00FF94]/5 to-[#9BFF00]/5 border border-[#00FF94]/20">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="text-[#00FF94]" size={20} />
                  Improvement Suggestions
                </h3>
                <div className="space-y-3">
                  {analysis.improvements.map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-[#0A0A0A]/50">
                      <p className="font-semibold text-[#00FF94] mb-1">{item.line}</p>
                      <p className="text-sm text-[#A0A0A0] mb-2">Issue: {item.issue}</p>
                      <p className="text-sm">💡 {item.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
