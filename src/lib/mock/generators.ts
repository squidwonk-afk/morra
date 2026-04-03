function paragraph(...parts: string[]) {
  return parts.join(" ");
}

export function mockArtistIdentity(input: Record<string, unknown>) {
  const name = String(input.name ?? "Artist");
  const genre = String(input.genre ?? "experimental");
  const influences = String(input.influences ?? "diverse influences");
  const mood = String(input.mood ?? "raw emotion");
  return {
    section_overview: paragraph(
      `${name} occupies a decisive lane in ${genre}, threading ${mood} through arrangements that feel live and urgent.`,
      `Listeners who map ${name} against ${influences} will hear a through-line: detail-first writing with rhythm-forward hooks.`
    ),
    reasoning: paragraph(
      `Positioning leans into contrast—soft verses vs. abrupt drops—so DSP editorial and press can pitch “dynamic ${genre} storyteller.”`,
      `The bio stack below is written to be excerpted: short pulls for Spotify, longer narrative for blogs and festival one-sheets.`
    ),
    bio: paragraph(
      `${name} builds songs like set pieces: intro tension, release, aftermath.`,
      `Rooted in ${genre}, the work folds in ${influences} without pastiche—each reference becomes a texture, not a quote.`,
      `On stage and on record, ${mood} is the constant; production choices amplify micro-phrases instead of burying them.`,
      `Current chapter: independent releases with collaborator-led visuals and lyric-forward social drops.`,
      `For bookers and editors: ${name} is pitching featured slots that reward narrative artists, not trend-chasers.`
    ),
    epk: `${name} — Electronic Press Kit\n\nABOUT:\n${name} is a ${genre} act synthesizing ${influences} into ${mood}-driven songs.\n\nNOTABLE:\n• Consistent DSP growth quarter over quarter\n• DIY visuals aligned to lyrical motifs\n• Open to sync and remix packs\n\nCONTACT:\nBooking and press via official channels / link hub.`,
    social: `${mood} in motion.\n${genre} wiring + honest bars.\nLate-night studio energy.\nNew chapter: bigger rooms, same detail.\n${influences} buried in the mix, not on the sleeve.\nFans of raw hooks: this week's drop is for you.\nPress: ask for the stripped live take.`,
    hashtags: `#${genre.replace(/\s+/g, "")} #NewMusic #IndieArtist #Underground #EPK`,
    press: `FOR RELEASE: ${name} sharpens their ${genre} signature with melodies that read on first listen and deepen on repeat—ideal for features prioritizing songwriter-led acts.`,
    action_plan: [
      `Refresh Spotify bio + pin a 30s live clip within 48h.`,
      `Pitch 3 indie playlists with a one-line hook tied to "${mood}".`,
      "Draft a 90s BTS Reel showing the session stem stack.",
      "Email two local press contacts with the EPK excerpt + streaming link.",
      "Schedule a fan Q&A answering lyrical references from the latest drop.",
      "Update Link hub with press quotes + high-res portrait.",
      "Book one stripped performance for content capture.",
      "Outline a two-song release arc for the next 60 days.",
    ],
  };
}

export function mockRollout(input: Record<string, unknown>) {
  const title = String(input.releaseTitle ?? "Untitled Release");
  const date = String(input.releaseDate ?? "TBD");
  const genre = String(input.genre ?? "your genre");
  return {
    section_executive: paragraph(
      `This plan treats “${title}” as a narrative product: each week signals momentum, not noise.`,
      `We anchor social proof early, convert attention with pre-save, then sprint through release week with platform-native content.`
    ),
    section_opportunities: paragraph(
      `${genre} audiences respond to velocity loops—short-form teases that reveal lyrical stakes.`,
      `DSPs reward consistency: weekly content + pitch notes that mirror the story in your distributor dashboard.`,
      `Secondary wins: remix reach-outs after week one, UGC prompts using a signature ad-lib.`
    ),
    reasoning: paragraph(
      `Sequencing moves from private validation (premieres, inner-circle DMs) to public repetition (hooks on TikTok, IG reels).`,
      `That mirrors how casual listeners adopt tracks—first curiosity, then familiarity, then playlist saves.`,
      `The platformStrategy object below keeps each network’s language native so you are not broadcasting identical cuts everywhere.`,
      `Promotion spikes align with weekend listening curves while keeping weekday studio drops for core fans.`,
    ),
    phases: [
      {
        week: "-5",
        focus: "Lock creative + distributor metadata",
        tasks: ["Final master lint (true peak / LUFS)", "Artwork master 3000×3000 + alternative 1:1", "ISRC + credits sheet"],
      },
      {
        week: "-3",
        focus: "Pre-save + narrative seeding",
        tasks: ["SmartURL with pre-save", "Lyric-card set (9 slides)", "DM 12 collaborators for shares"],
      },
      {
        week: "-2",
        focus: "Short-form velocity",
        tasks: ["TikTok 3-hook challenge", "Studio-truth capcut (no polish)", "Tease 8-bar loop on Reels"],
      },
      {
        week: "-1",
        focus: "Hype compression",
        tasks: ["Countdown stories", "Playlist pitch via distributor", "Email mini-list (100–300 superfans)"],
      },
      {
        week: "0",
        focus: `Release day — ${title}`,
        tasks: ["Go-live checklist", "Thank-you live (5 min)", "Add Spotify Canvas within 6h"],
      },
    ],
    platformStrategy: {
      tiktok: paragraph(
        `Post 2×/day: one lyric-forward, one process-forward. Use native text; avoid cross-post watermarks.`,
        `Pin the comment that explains the song’s thesis—drives replays.`
      ),
      instagram: paragraph(
        `Carousel for story depth; Reels for hook extraction. Alternate face-to-camera vs. b-roll.`,
        `Story polls asking “which bar hits hardest?” to train the algorithm on engagement depth.`
      ),
      spotify: paragraph(
        `Canvas 3–8s loop synced on downbeat. Pitch as ${genre} + mood descriptors matching the hook syllable count.`,
        `Update bio with one memorable metaphor from the single—editors quote metaphors, not adjectives.`
      ),
    },
    promotionIdeas: [
      "Acoustic one-take in unusual acoustic space (stairwell, parking deck).",
      "Fan-sourced visual motifs compiled into a collage cover-variant.",
      "Paid micro-influencer package: 5 creators, same hook, different contexts.",
      "Localized playlist swap with two peer artists in adjacent cities.",
      "QR-coded flyers at 3 small venues leading to private voice memo from artist.",
      "Discord / group-chat preview with timestamped reactions.",
      "Day-3 remix stem pack drop to SoundCloud producers.",
      "Charity tie-in stream (transparent donation receipt) for narrative press.",
    ],
    action_checklist: [
      "Confirm distributor release time + timezone.",
      "Export lyric .txt for pitching and SEO snippets.",
      "Build press thumb drive (WAV + one-sheet + portrait).",
      "Schedule three posts per platform for day -3 through day +2.",
      "Create spreadsheet of 25 creator handles to DM with personalized line.",
      "Record vertical B-roll: hands, gear LEDs, meter bounce.",
      "Set Google alert on artist + track title.",
      "Pre-write five reply templates for comment moderation.",
      "Book photography slot for alternate single art.",
      "Post-release: submit to three niche newsletters.",
    ],
    risks_and_mitigations: [
      { risk: "Algorithm fatigue if hooks repeat verbatim", mitigation: "Rotate three distinct 12s clips with different intros." },
      { risk: "Playlist pitch rejection", mitigation: "Tighten genre tags + add live performance proof link." },
      { risk: "Low pre-save", mitigation: "Trade exclusive voice note for pre-save screenshot proofs." },
      { risk: "Burnout on posting cadence", mitigation: "Batch film 10 clips in one 3-hour block." },
    ],
    summary: `Rollout for “${title}” targeting ${date}; adjust to distributor confirmation and local scene holidays.`,
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
    "Add a mid-verse pivot word to signal a tonal shift before the bridge.",
    words < 8
      ? "Paste a longer verse for deeper metrics (mock output scales with length)."
      : "Tighten repeated function words in bars 3–5.",
    "Experiment with internal rhyme on stressed syllables only.",
  ];
  return {
    section_overview: paragraph(
      "The excerpt foregrounds mood over plot—listeners get atmosphere before narrative stakes.",
      words < 8
        ? "Expand the pasted lyrics so cadence and rhyme metrics stabilize."
        : "There is enough text to discuss pocket, rhyme hubs, and hook durability with confidence."
    ),
    reasoning: paragraph(
      "Scores reflect syllable stress alignment and end-rhyme variance—two levers casual listeners notice first.",
      "Suggestions prioritize bar-level edits before structural rewrites to keep the artist’s voice intact."
    ),
    emotion: {
      primary: "Reflective",
      secondary: "Hopeful",
      intensity: Math.min(100, Math.max(40, Math.round(55 + (words % 20)))),
      description: paragraph(
        "The section reads as introspective with an upward lift; repeated qualifiers can dull the arc—trim two adjectives.",
        "Imagery clusters around interior monologue; add one external concrete noun per verse to widen the lens.",
        "Mock depth scales with input length; longer pulls unlock cadence maps."
      ),
    },
    rhyme: {
      density: rhymeDensity,
      scheme: words > 40 ? "Multisyllabic end rhymes with internal echoes" : "Emerging pattern; add couplet anchors in lines 2/4",
      quality: rhymeDensity > 70 ? "Strong" : "Good",
      feedback: paragraph(
        "Rhyme hinges land predictably on 2 and 4—consider slant rhymes on 3 to delay resolution.",
        "Assonance is your friend in softer sections; lean on it when perfect rhymes feel boxy."
      ),
    },
    flow: {
      rating: flowRating,
      patterns: "Varied syllable counts with light syncopation (simulated pocket map)",
      suggestions,
    },
    improvements: suggestions.map((suggestion, index) => ({
      line: `Focus area ${index + 1}`,
      issue: "Iterative polish",
      suggestion,
    })),
    excerptAnalyzed: text.slice(0, 280) + (text.length > 280 ? "…" : ""),
    scores: { overall: 7.2, writing: 7.0, flow: 6.8, originality: 7.5 },
  };
}

export function mockCover(input: Record<string, unknown>) {
  const title = String(input.title ?? "Untitled");
  const mood = String(input.mood ?? "atmospheric");
  const style = String(input.style ?? "modern underground");
  const colors = String(input.colors ?? "neon green, deep black, acid yellow");
  const c1 = paragraph(
    `Glitch portrait: fractured symmetry around the eyes, CRT bloom, ${mood} haze.`,
    `Typography minimal—one word from the title as acid-yellow vector strokes.`
  );
  const c2 = paragraph(
    `Type-forward minimal: grotesk condensed title, 90% negative space, single ${colors.split(",")[0]?.trim() || "neon"} accent rule.`,
    `Micro texture: paper grain at 8% opacity for tactility on DSP thumbnails.`
  );
  const c3 = paragraph(
    `Analog collage: ripped tape edges, sticker chaos, hand arrows pointing at a central void representing the hook.`,
    `Color clash intentional; keep one anchor neutral to preserve legibility at 160px.`
  );
  const colorPalette = [
    { name: "Neon core", hex: "#00FF94", use: "Primary glow + UI accents on DSP banner" },
    { name: "Void black", hex: "#0A0A0A", use: "Background sink for contrast" },
    { name: "Acid edge", hex: "#9BFF00", use: "Secondary highlights + sticker pops" },
    { name: "Mist gray", hex: "#2A2A2A", use: "Depth layers behind portrait fractures" },
    { name: "Alert magenta", hex: "#FF2D9F", use: "Optional tour variant alt cover" },
    { name: "Paper white", hex: "#F4F4F4", use: "Negative highlight strokes on type-forward concept" },
  ];
  return {
    section_overview: paragraph(
      `Visual identity narratives the single before the first kick—${mood} is legible at thumbnail scale.`,
      `Three lanes let you A/B test: tech-forward, typographic, maximal DIY.`
    ),
    reasoning: paragraph(
      `${style} references anchor the art director without locking you to a single era.`,
      `Palette pulls from your stated colors but enforces one neutral spine so Spotify cropping never kills hierarchy.`
    ),
    description: paragraph(c1, c2, c3),
    composition: paragraph(
      "Primary focal circle at golden-ratio intersection; secondary text hugs lower third safe zone.",
      "Reserve 12% top margin for platform UI overlays; keep faces/eyes out of extreme corners."
    ),
    colorPalette,
    elements: [
      "Scan-line texture 15% blend",
      "Hand-drawn arrow motif",
      "Sticker halftone cluster",
      "Oversized condensed title",
      "Film grain pass",
      "Duotone shadow lift",
      "Single recurring shape (circle or triangle)",
      "Lyric fragment as micro-type",
      "Noise band masking",
      "Gradient spine vertical",
      "Cutout portrait layer",
      "High-pass edge on typography",
      "Optional parental-advisory lockup spacer",
    ],
    references: [
      `Early-2000s ${style} flyers (abstract)`,
      "Brutalist Swiss grids reinterpreted in music merch",
      "Analog photocopy zine culture",
      "Neo-noir film posters (silhouette tension)",
    ],
    concepts: [c1, c2, c3],
    aiPrompt: paragraph(
      `Album cover for "${title}". ${style} aesthetic, ${mood} mood.`,
      `Palette: ${colors}. High resolution, clean typography hierarchy, cinematic lighting, no IP-infringing likenesses.`
    ),
    design_brief_for_designer: paragraph(
      `Deliver 3000×3000 master + 1080×1920 motion still. Safe margins documented.`,
      `Flagship concept: glitch portrait + acid type; alternates explore collage and pure type.`
    ),
  };
}

export function mockCollab(input: Record<string, unknown>) {
  const genre = String(input.genre ?? "alt-R&B");
  const location = String(input.location ?? "global");
  const matches = [
    {
      artist_name: "Nia Azure",
      genre_match_reason: paragraph(
        `Stacks ${genre} harmony pads with UK garage swing—your tempo pockets align on swung 16ths.`,
        `Her recent singles lean into breathy doubles where your mixes already carve space.`
      ),
      audience_estimate:
        "≈18–35k monthly listeners equivalent tier; TikTok 4–9k engaged; SoundCloud repost network active in EU time zones.",
      collab_potential_score: 9,
      why_valuable: paragraph(
        "Complementary hook registers—Nia leads with melody, you foreground low-mid texture.",
        "Shared playlist adjacency on three editorial lists reduces fan acquisition cost for both acts."
      ),
      outreach_strategy: paragraph(
        "Lead with a 20s mute reaction to her latest drop, propose a split session on a reference BPM you both used.",
        "Offer stems within 48h if she replies—signals seriousness."
      ),
    },
    {
      artist_name: "Velvet Fence",
      genre_match_reason: paragraph(
        `Live-band ${genre} with grittier amp chains; contrasts your polished low-end.`,
        `They chase crossover radio while maintaining underground cred—fits dual-release narratives.`
      ),
      audience_estimate: "≈40–80k ML tier; stronger on Apple Music US; touring mid-size rooms regionally.",
      collab_potential_score: 8,
      why_valuable: paragraph(
        "Their touring network gives you IRL conversion; your streaming velocity helps their DSP story.",
        "Brand risk is low—similar political quiet in public messaging."
      ),
      outreach_strategy: paragraph(
        "DM via mutual playlist curator if available; otherwise comment on live performance clip with specific mix compliment.",
        "Suggest a one-off SoundCloud joint first to validate workflow."
      ),
    },
    {
      artist_name: "Juno Park",
      genre_match_reason: paragraph(
        `Hyper-detailed vocal comping mirrors your production discipline while keeping the ${genre} pocket intact.`,
        "K-pop adjacent percussion layers add sparkle without breaking swing."
      ),
      audience_estimate: "≈8–15k ML; high save rate on niche editorial; strong Discord hub.",
      collab_potential_score: 7,
      why_valuable: paragraph(
        "Cult fan retention—smaller surface, higher repeat listens.",
        "Could anchor remix pack narrative."
      ),
      outreach_strategy: paragraph(
        "Email short form via Linktree contact with a private SoundCloud demo tied to their last hook phrase.",
        "Offer split publishing clarity upfront."
      ),
    },
    {
      artist_name: "Tape Runners",
      genre_match_reason: paragraph(
        `Tape-saturated mix aesthetic; overlaps your ${genre} low-end philosophy.`,
        "Beat tapes with rotating features—open pipeline."
      ),
      audience_estimate: "≈25k ML; YouTube beat breakdowns 12k subs.",
      collab_potential_score: 8,
      why_valuable: paragraph(
        "Cross-training audience: producer-forward viewers convert to artist follows.",
        "Their breakdown format educates while promoting your melodic choices."
      ),
      outreach_strategy: paragraph(
        "Propose a dual-camera session: them on stem isolation, you on vocal layering.",
        "Time-box collab to 10 days to respect cadence."
      ),
    },
    {
      artist_name: "Sable Young",
      genre_match_reason: paragraph(
        "Narrative-forward lyricism with cinematic scopes; bridges your melodic motifs with scene-setting.",
        `Similar ${location} time zone—easier real-time sessions.`
      ),
      audience_estimate: "≈12–22k ML; Instagram saves outperform peers in story formats.",
      collab_potential_score: 7,
      why_valuable: paragraph(
        "Joint content arc: lyric explainer series boosts retention.",
        "Gender-diverse billing helps festival pitch optics without tokenism if music aligns first."
      ),
      outreach_strategy: paragraph(
        "Voice memo intro referencing her second verse cadence; propose hook swap challenge.",
        "Include calendar hold for two remote writes."
      ),
    },
  ];

  const collabIdeas = [
    {
      title: "Split-Session Hook Trade",
      detailed_concept: paragraph(
        "Day 1: You send eight-bar loop; they topline remotely. Day 3: Swap—reharmonize their hook with your signature bass motif.",
        "Release as dual-single with merged artwork showing both DAW timelines."
      ),
      why_it_fits: `Mirrors your stated ${genre} focus while respecting asynchronous workflows in ${location}.`,
      execution_plan: paragraph(
        "1) Agree BPM + key. 2) Shared folder with labelled stems. 3) 48h feedback windows. 4) Joint mastering slot.",
        "5) Coordinate drop teaser tags."
      ),
      message_template: paragraph(
        `Hey [NAME]—loved how you handled the bridge on [THEIR TRACK].`,
        `I'm sitting on a ${genre} loop that feels like your cadence on bar 2. Open to a quick hook trade? I can send stems today. – [YOU]`,
        `Link: [YOUR STATION / DEMO]`
      ),
    },
    {
      title: "Remix Pack + Creator UGC Explosion",
      detailed_concept: paragraph(
        "Release stems at week two; commission three micro-creators + one peer remix.",
        "Fuel TikTok duet chain using signature ad-lib as green-screen prompt."
      ),
      why_it_fits: `Extends shelf life without new master spend; strong for ${genre} in ${location}.`,
      execution_plan: paragraph(
        "1) Stem pack tagging convention. 2) Creator brief PDF one-pager. 3) Deadline + usage rights. 4) Best-of montage on day 10.",
        "5) Revenue split pre-agreed."
      ),
      message_template: paragraph(
        `Subject: Stem drop collab — ${genre} pack`,
        `Hey [NAME], dropping stems for [TRACK]. If you want in, reply with your IG handle + I'll whitelist the folder. Credit split 50/50 publishing on new derivative. – [YOU]`
      ),
    },
    {
      title: "Live-to-Tape Social Sprint",
      detailed_concept: paragraph(
        "One-room performance video: live vocal + live beat rebuild.",
        "Slice into 6 verticals with different intros for algo testing."
      ),
      why_it_fits: `Shows live musicianship for fans skeptical of programmed ${genre} productions.`,
      execution_plan: paragraph(
        "1) Book room with stereo board feed. 2) Rehearse transitions. 3) Capture room tone. 4) Edit same-night stories.",
        "5) Debrief metrics after 72h."
      ),
      message_template: paragraph(
        `Hey [NAME], imagining a one-take kitchen set swapping roles mid-track. Wild if you're down—can route you a split guide vocal. – [YOU]`
      ),
    },
    {
      title: "Cross-City Swap Meet (Remote)",
      detailed_concept: paragraph(
        "You each flip a section of the other's demo unreleased section under NDA.",
        "Premiere on shared livestream with chat-chosen arrangement tweaks."
      ),
      why_it_fits: "Great when travel is impossible but fan overlap is regional.",
      execution_plan: paragraph(
        "1) NDA boilerplate. 2) Stems watermark. 3) Scheduled stream. 4) Voting mechanic. 5) Post-stream stem auction optional."
      ),
      message_template: paragraph(
        `NDA + swap idea: I'll send 16 bars if you reciprocate—stream reveal Friday? [YOU]`
      ),
    },
    {
      title: "Playlist Co-Op Swap",
      detailed_concept: paragraph(
        "Mutual placement in artist-curated playlists with narrative liners recorded as audio drops.",
        "Drives algorithmic association without payola."
      ),
      why_it_fits: "Low cost, high trust signals to DSPs.",
      execution_plan: paragraph(
        "1) Pick 25-track cap. 2) Exchange slot 7 vs slot 8 A/B. 3) Refresh weekly notes.",
        "4) Track save deltas."
      ),
      message_template: paragraph(
        `Got a ${genre} list doing 12k saves/mo—want slot trade? I'll feature your single with a voice intro if you reciprocate. [YOU]`
      ),
    },
    {
      title: "Charity Metric Stream",
      detailed_concept: paragraph(
        "Transparent donation milestone stream—every 1k listens unlocks pledged hours.",
        "Pairs emotional narrative with press hook."
      ),
      why_it_fits: `Differentiates in crowded ${genre} feeds when lyrical story fatigue sets in.`,
      execution_plan: paragraph(
        "1) Partner vetting. 2) Disclosure copy. 3) Receipt capture. 4) Post-event breakdown post."
      ),
      message_template: paragraph(
        `Exploring a release-week stream tying saves to volunteer hours—interested in co-headlining ethically? [YOU]`
      ),
    },
  ];

  return {
    section_overview: paragraph(
      `You are building a collab pipeline in ${genre} with geographic flavor from ${location}.`,
      "Targets balance reachable artists with narrative upside—not only marquee names."
    ),
    reasoning: paragraph(
      "Matches skew toward complementary arrangement pairs: different EQ profiles, shared pocket.",
      "Ideas escalate from low-friction remote work to public facing stunts once trust exists."
    ),
    section_action_plan: paragraph(
      "Day 1–2: Send three DMs using template variants; personal first line mandatory.",
      "Day 3–5: Schedule one call; finalize one micro-collab.",
      "Day 7: Publish proof-of-work snippet even if full drop is later."
    ),
    artistMatches: matches,
    collabIdeas,
  };
}

export function mockChatReply(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("credit")) {
    return "Credits power each tool run. Free accounts get one generation every 24 hours without spending credits; after that, generations deduct from your balance. Level-ups can grant bonus credits.\n\nSummary: check your balance before a long session.\nSteps: open Pricing → buy a pack or upgrade if you plan multi-tool days.\nWatch-outs: mock mode doesn’t call live AI.";
  }
  if (m.includes("refer")) {
    return "Share your referral link from the Referrals page. When someone you referred completes qualifying activity, rewards may apply according to in-app rules—you may earn, but nothing is guaranteed.\n\nSummary: referrals combine credits and revenue-share rules.\nSteps: copy link → friend signs up → activity tracked in dashboard.\nWatch-outs: abuse checks may pause rewards.";
  }
  if (m.includes("pin") || m.includes("forgot")) {
    return "PINs are not recoverable by design. If you still know your PIN, change it in Settings. Otherwise you’ll need a new account.\n\nSummary: privacy-first auth tradeoff.\nSteps: Settings → security → update PIN while logged in.\nWatch-outs: support cannot bypass this.";
  }
  return `Thanks for the message: “${message.slice(0, 120)}${message.length > 120 ? "…" : ""}”. This assistant is running in mock mode; plug in your LLM later at /api/chat.

Summary: you're seeing static routing, not a live model.
Steps: set OPENROUTER_API_KEY and remove AI_PROVIDER=mock.
Watch-outs: responses won't reflect your saved artist profile until live mode.`;
}
