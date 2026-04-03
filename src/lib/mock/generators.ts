export function mockArtistIdentity(input: Record<string, unknown>) {
  const name = String(input.name ?? "Artist");
  const genre = String(input.genre ?? "experimental");
  const influences = String(input.influences ?? "diverse influences");
  const mood = String(input.mood ?? "raw emotion");
  return {
    bio: `Meet ${name}, a force in the ${genre} space. Drawing from ${influences}, they shape a sound that feels both familiar and new. Their work channels ${mood} with honest writing and bold production.`,
    epk: `${name}, Electronic Press Kit\n\nABOUT:\n${name} is an emerging ${genre} artist focused on emotionally resonant music.\n\nSOUND:\nInfluenced by ${influences}; characterized by ${mood} and intentional arrangement.\n\nCONNECT:\nSocial: @${name.toLowerCase().replace(/\s+/g, "_")}`,
    social: `${mood} energy. ${genre} roots. New chapter loading.`,
    hashtags: `#${genre.replace(/\s+/g, "")} #NewMusic #IndieArtist #Underground`,
    press: `FOR IMMEDIATE RELEASE, ${name} announces upcoming work blending ${genre} with ${mood} storytelling.`,
  };
}

export function mockRollout(input: Record<string, unknown>) {
  const title = String(input.releaseTitle ?? "Untitled Release");
  const date = String(input.releaseDate ?? "TBD");
  return {
    phases: [
      { week: "-8", focus: "Finalize masters & artwork", tasks: ["Stem export", "Art brief lock", "DSP profiles"] },
      { week: "-4", focus: "Pre-save + teaser", tasks: ["Pre-save link", "15s teaser cut", "Playlist pitch draft"] },
      { week: "-1", focus: "Hype window", tasks: ["Countdown stories", "Lyric cards", "Email blast"] },
      { week: "0", focus: `Release day, ${title}`, tasks: ["Go-live check", "Thank you posts", "Day 1 metrics"] },
    ],
    summary: `Rollout for “${title}” targeting ${date}. Adjust dates to your distributor confirmation.`,
  };
}

export function mockLyrics(input: Record<string, unknown>) {
  const text = String(input.lyrics ?? "").slice(0, 2000);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const rhymeDensity = Math.min(100, words > 0 ? Math.round((words % 17) + 55) : 40);
  const flowRating = Math.min(100, words > 0 ? Math.round((words % 23) + 50) : 45);
  const suggestions = [
    "Vary end-rhyme families in the hook to avoid predictability.",
    "Shorten line 2 in the second quatrain to improve pocket.",
    words < 8
      ? "Paste a longer verse for deeper metrics (mock output scales with length)."
      : "Strong imagery density for this length.",
  ];
  return {
    emotion: {
      primary: "Reflective",
      secondary: "Hopeful",
      intensity: Math.min(100, Math.max(40, Math.round(55 + (words % 20)))),
      description:
        "The section leans introspective with a lift toward resolution, tighten repeated phrases to sharpen the arc.",
    },
    rhyme: {
      density: rhymeDensity,
      scheme: words > 40 ? "Multisyllabic end rhymes with internal echoes" : "Emerging pattern, add couplet anchors",
      quality: rhymeDensity > 70 ? "Strong" : "Good",
      feedback:
        "Mock analysis: rhyme density scales with input length. Layer slant rhymes in the bridge for contrast.",
    },
    flow: {
      rating: flowRating,
      patterns: "Varied syllable counts with syncopation (simulated)",
      suggestions,
    },
    improvements: suggestions.map((suggestion, index) => ({
      line: `Focus area ${index + 1}`,
      issue: "Iterative polish",
      suggestion,
    })),
    excerptAnalyzed: text.slice(0, 280) + (text.length > 280 ? "…" : ""),
  };
}

export function mockCover(input: Record<string, unknown>) {
  const title = String(input.title ?? "Untitled");
  const mood = String(input.mood ?? "atmospheric");
  const style = String(input.style ?? "modern underground");
  const colors = String(input.colors ?? "neon green, deep black, acid yellow");
  const concepts = [
    {
      title: "Glitch portrait",
      palette: ["#00FF94", "#0A0A0A", "#9BFF00"],
      direction: `High-contrast ${mood} portrait with scan-line texture and subtle grain.`,
    },
    {
      title: "Type-forward minimal",
      palette: ["#121212", "#FFFFFF", "#00FF94"],
      direction: "Bold grotesk title, oversized tracking, single accent line.",
    },
    {
      title: "Collage chaos",
      palette: ["#ff00ff", "#00ccff", "#ffff00"],
      direction: "Ripped paper layers, sticker motifs, hand-drawn arrows.",
    },
  ];
  const designerBrief = `Target: “${title}”. Mood: ${mood}. Style: ${style}. Palette notes: ${colors}. Deliver 3000×3000 master, safe margins for DSP crops.`;
  const colorPalette = concepts.flatMap((c) =>
    c.palette.map((hex, i) => ({
      name: `${c.title} ${i + 1}`,
      hex,
      use: c.direction.slice(0, 48),
    }))
  );
  return {
    description: concepts.map((c) => `${c.title}: ${c.direction}`).join("\n\n"),
    composition:
      "Center-focused layout with symmetrical balance. Layered depth, intentional negative space for type.",
    colorPalette,
    elements: concepts.map((c) => c.direction),
    references: concepts.map((c) => `${c.title}, ${style} reference mix`),
    aiPrompt: `Create an album cover for "${title}". Style: ${style}. Mood: ${mood}. Colors: ${colors}. ${designerBrief}`,
    concepts,
    designerBrief,
  };
}

export function mockCollab(input: Record<string, unknown>) {
  const genre = String(input.genre ?? "alt-R&B");
  const location = String(input.location ?? "global");
  return {
    matches: [
      { handle: "@nightwave_prod", fit: 0.92, note: `Loves ${genre} textures; open to 50/50 splits.` },
      { handle: "@hollowvocals", fit: 0.87, note: "Looking for hooks + ad-lib layers." },
      { handle: "@808therapy", fit: 0.81, note: "Club tempo; prefers short collaboration cycles." },
    ],
    outreachTemplate: `Hey, heard your recent flip. I'm working on ${genre}-leaning demos (${location}); open to a single collab this month?`,
  };
}

export function mockChatReply(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("credit")) {
    return "Credits power each tool run. Free accounts get one generation every 24 hours without spending credits; after that, generations deduct from your balance. Level-ups can grant bonus credits.";
  }
  if (m.includes("refer")) {
    return "Share your referral link from the Referrals page. When someone you referred completes their first generation, the referral becomes active and rewards can apply to you, payouts are not enabled yet.";
  }
  if (m.includes("pin") || m.includes("forgot")) {
    return "PINs are not recoverable by design. If you still know your PIN, change it in Settings. Otherwise you’ll need a new account.";
  }
  return `Thanks for the message: “${message.slice(0, 120)}${message.length > 120 ? "…" : ""}”. This assistant is running in mock mode; plug in your LLM later at /api/chat.`;
}
