export type CatalogI18nOverlay = {
  nameIt?: string;
  aliases?: string[];
};

export type CatalogI18nMap = Record<string, CatalogI18nOverlay>;

export type CatalogI18nFields = {
  nameIt: string | null;
  aliases: string[];
  imageUrlEnd: string | null;
};

const PHRASE_REPLACEMENTS: Array<[string, string]> = [
  ["close-grip front lat pulldown", "lat machine presa stretta"],
  ["wide-grip lat pulldown", "lat machine presa larga"],
  ["stiff-legged barbell deadlift", "stacco a gambe tese"],
  ["stiff-legged deadlift", "stacco a gambe tese"],
  ["stiff leg barbell good morning", "good morning a gambe tese"],
  ["decline barbell bench press", "panca declinata"],
  ["incline barbell bench press", "panca inclinata"],
  ["incline dumbbell bench press", "panca inclinata manubri"],
  ["close-grip barbell bench press", "panca presa stretta"],
  ["barbell bench press", "panca piana"],
  ["dumbbell bench press", "panca manubri"],
  ["incline bench press", "panca inclinata"],
  ["decline bench press", "panca declinata"],
  ["guillotine bench press", "panca guillotine"],
  ["bench press", "panca piana"],
  ["romanian deadlift", "stacco rumeno"],
  ["sumo deadlift", "stacco sumo"],
  ["axle deadlift", "stacco da terra"],
  ["cable deadlifts", "stacco ai cavi"],
  ["deadlifts", "stacco da terra"],
  ["deadlift", "stacco da terra"],
  ["standing military press", "military press"],
  ["dumbbell shoulder press", "military press manubri"],
  ["barbell shoulder press", "military press bilanciere"],
  ["military press", "military press"],
  ["overhead press", "military press"],
  ["shoulder press", "military press"],
  ["arnold dumbbell press", "arnold press"],
  ["side lateral raise", "alzate laterali"],
  ["cable seated lateral raise", "alzate laterali ai cavi"],
  ["lateral raise", "alzate laterali"],
  ["front dumbbell raise", "alzate frontali"],
  ["front raise", "alzate frontali"],
  ["rear delt fly", "alzate posteriori"],
  ["rear delt raise", "alzate posteriori"],
  ["bent over barbell row", "rematore con bilanciere"],
  ["one-arm dumbbell row", "rematore manubrio"],
  ["seated cable rows", "rematore ai cavi"],
  ["seated cable row", "rematore ai cavi"],
  ["upright barbell row", "rematore verticale"],
  ["upright row", "rematore verticale"],
  ["t-bar row", "rematore t-bar"],
  ["t bar row", "rematore t-bar"],
  ["bent over row", "rematore"],
  ["bent-over row", "rematore"],
  ["cable crossover", "incroci ai cavi"],
  ["dumbbell flyes", "croci manubri"],
  ["bodyweight flyes", "croci"],
  ["lying triceps press", "french press"],
  ["ez-bar skullcrusher", "french press"],
  ["skull crusher", "french press"],
  ["skullcrusher", "french press"],
  ["triceps pushdown", "pushdown tricipiti"],
  ["lat pulldown", "lat machine"],
  ["lat pull-down", "lat machine"],
  ["front lat pulldown", "lat machine"],
  ["wide-grip rear pull-up", "trazioni presa larga"],
  ["band assisted pull-up", "trazioni assistite"],
  ["weighted pull ups", "trazioni zavorrate"],
  ["weighted pull-ups", "trazioni zavorrate"],
  ["pull-ups", "trazioni"],
  ["pull-up", "trazioni"],
  ["pullups", "trazioni"],
  ["pullup", "trazioni"],
  ["chin-up", "trazioni supina"],
  ["chin up", "trazioni supina"],
  ["push-ups", "piegamenti"],
  ["push-up", "piegamenti"],
  ["pushups", "piegamenti"],
  ["pushup", "piegamenti"],
  ["dips - triceps version", "dip"],
  ["bench dips", "dip panca"],
  ["hip thrust", "hip thrust"],
  ["glute bridge", "glute bridge"],
  ["walking lunge", "affondi camminata"],
  ["dumbbell lunges", "affondi manubri"],
  ["barbell lunge", "affondi bilanciere"],
  ["lunges", "affondi"],
  ["lunge", "affondi"],
  ["standing calf raises", "alzate polpacci"],
  ["seated calf raise", "alzate polpacci da seduto"],
  ["calf raises", "alzate polpacci"],
  ["calf raise", "alzate polpacci"],
  ["leg extensions", "leg extension"],
  ["leg extension", "leg extension"],
  ["lying leg curls", "leg curl"],
  ["leg curls", "leg curl"],
  ["leg curl", "leg curl"],
  ["leg press", "leg press"],
  ["hyperextensions", "iperestensioni"],
  ["hyperextension", "iperestensione"],
  ["back extensions", "iperestensioni"],
  ["hanging leg raise", "sollevamenti gambe in sospensione"],
  ["face pull", "face pull"],
  ["good morning", "good morning"],
  ["preacher curl", "curl panca scott"],
  ["concentration curls", "curl concentrato"],
  ["concentration curl", "curl concentrato"],
  ["hammer curls", "hammer curl"],
  ["hammer curl", "hammer curl"],
  ["barbell curl", "curl bilanciere"],
  ["ez-bar curl", "curl ez"],
  ["ez bar curl", "curl ez"],
  ["wrist curl", "curl polsi"],
  ["reverse crunch", "crunch inverso"],
  ["cable crunch", "crunch ai cavi"],
  ["crunches", "crunch"],
  ["sit-up", "sit-up"],
  ["sit up", "sit-up"],
  ["ab rollout", "ab rollout"],
  ["ab roller", "ab roller"],
  ["goblet squat", "goblet squat"],
  ["hack squat", "hack squat"],
  ["front squat", "front squat"],
  ["box squat", "box squat"],
  ["smith machine squat", "squat al smith"],
  ["barbell squat", "squat"],
  ["barbell full squat", "squat"],
  ["bodyweight squat", "squat a corpo libero"],
  ["split squat", "squat bulgaro"],
  ["barbell shrug", "scrollate"],
  ["cable shrugs", "scrollate ai cavi"],
  ["shrugs", "scrollate"],
  ["shrug", "scrollate"],
  ["e-z curl bar", "bilanciere ez"],
  ["ez-bar", "bilanciere ez"],
  ["ez bar", "bilanciere ez"],
  ["medicine ball", "medicine ball"],
  ["exercise ball", "palla"],
  ["foam roll", "foam roller"],
  ["body only", "corpo libero"],
  ["bodyweight", "corpo libero"],
  ["body weight", "corpo libero"],
  ["smith machine", "smith machine"],
  ["kettlebells", "kettlebell"],
  ["kettlebell", "kettlebell"],
  ["dumbbells", "manubri"],
  ["dumbbell", "manubri"],
  ["barbell", "bilanciere"],
  ["cables", "cavi"],
  ["cable", "cavi"],
  ["machine", "macchina"],
  ["bands", "elastici"],
  ["band", "elastico"],
  ["close-grip", "presa stretta"],
  ["close grip", "presa stretta"],
  ["wide-grip", "presa larga"],
  ["wide grip", "presa larga"],
  ["medium grip", "presa media"],
  ["one-arm", "un braccio"],
  ["one arm", "un braccio"],
  ["single-arm", "un braccio"],
  ["single-leg", "una gamba"],
  ["one-leg", "una gamba"],
  ["behind the back", "dietro"],
  ["with bands", "con elastici"],
  ["with chains", "con catene"],
  ["on knees", "in ginocchio"],
  ["incline", "inclinata"],
  ["decline", "declinata"],
  ["seated", "da seduto"],
  ["standing", "in piedi"],
  ["lying", "sdraiato"],
  ["kneeling", "in ginocchio"],
  ["hanging", "in sospensione"],
  ["alternating", "alternato"],
  ["alternate", "alternato"],
  ["reverse", "inverso"],
  ["assisted", "assistito"],
  ["weighted", "zavorrato"],
  ["walking", "camminata"],
  ["flyes", "croci"],
  ["flye", "croci"],
  ["flies", "croci"],
  ["fly", "croci"],
  ["rows", "rematore"],
  ["row", "rematore"],
  ["dips", "dip"],
  ["dip", "dip"],
  ["crunch", "crunch"],
  ["plank", "plank"],
  ["squat", "squat"],
  ["curl", "curl"],
  ["press", "press"],
  ["raise", "alzate"],
  ["stretch", "stretching"],
];

const ALIAS_HINTS: Array<{ test: RegExp; aliases: string[] }> = [
  { test: /bench press/i, aliases: ["panca", "panca piana", "bench"] },
  { test: /incline/i, aliases: ["inclinata"] },
  { test: /decline/i, aliases: ["declinata"] },
  { test: /romanian deadlift/i, aliases: ["stacco rumeno", "rdl"] },
  { test: /deadlift/i, aliases: ["stacco", "stacco da terra", "deadlift"] },
  { test: /pull-?ups?|chin-?ups?/i, aliases: ["trazioni", "pull up", "chin up"] },
  { test: /lat pulldown|pulldown/i, aliases: ["lat machine", "lat pulldown"] },
  { test: /\brows?\b/i, aliases: ["rematore", "row"] },
  { test: /flye?s?|\bflies\b/i, aliases: ["croci", "fly"] },
  { test: /lunge/i, aliases: ["affondi", "lunge"] },
  { test: /hip thrust/i, aliases: ["hip thrust"] },
  { test: /\bdips?\b/i, aliases: ["dip", "dips"] },
  { test: /push-?ups?/i, aliases: ["piegamenti", "push up", "push-up"] },
  { test: /lateral raise|side lateral/i, aliases: ["alzate laterali"] },
  { test: /military press|overhead press|shoulder press/i, aliases: ["military press"] },
  { test: /skull\s?crusher|lying triceps press/i, aliases: ["french press", "skull crusher"] },
  { test: /shrug/i, aliases: ["scrollate", "shrug"] },
  { test: /calf/i, aliases: ["polpacci", "calf"] },
  { test: /crunch/i, aliases: ["crunch"] },
  { test: /plank/i, aliases: ["plank"] },
  { test: /squat/i, aliases: ["squat"] },
  { test: /curl/i, aliases: ["curl"] },
  { test: /dumbbell/i, aliases: ["manubri"] },
  { test: /barbell/i, aliases: ["bilanciere"] },
  { test: /cable/i, aliases: ["cavi"] },
];

const SORTED_PHRASES = [...PHRASE_REPLACEMENTS].sort((a, b) => b[0].length - a[0].length);

export function deriveImageUrlEnd(imageUrl: string | null | undefined): string | null {
  if (typeof imageUrl !== "string" || imageUrl.length === 0) {
    return null;
  }

  if (imageUrl.endsWith("/0.jpg")) {
    return `${imageUrl.slice(0, -"/0.jpg".length)}/1.jpg`;
  }

  return null;
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function capitalizeItalian(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function translateExerciseName(englishName: string): string {
  const lowered = englishName.trim().toLowerCase();
  if (lowered.length === 0) {
    return englishName;
  }

  const locked: string[] = [];
  const translated = SORTED_PHRASES.reduce((current, [phrase, replacement]) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return current.replace(new RegExp(`\\b${escaped}\\b`, "gi"), () => {
      const token = `\u0000${locked.length}\u0000`;
      locked.push(replacement);
      return token;
    });
  }, lowered);

  const restored = translated.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => {
    return locked[Number(index)] ?? "";
  });

  const cleaned = restored
    .replace(/\s*[-–]\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();

  return capitalizeItalian(cleaned);
}

export function buildCatalogAliases(
  englishName: string,
  nameIt: string,
  extra: string[] = [],
): string[] {
  const hinted = ALIAS_HINTS.flatMap((hint) =>
    hint.test.test(englishName) ? hint.aliases : [],
  );

  return uniqueStrings([nameIt, englishName, ...hinted, ...extra]);
}

export function applyCatalogI18n(
  row: { id: string; name: string; imageUrl: string | null },
  overlay: CatalogI18nMap,
): CatalogI18nFields {
  const override = overlay[row.id];
  const nameIt = override?.nameIt?.trim() || translateExerciseName(row.name);
  const aliases = buildCatalogAliases(row.name, nameIt, override?.aliases ?? []);

  return {
    nameIt: nameIt.length > 0 ? nameIt : null,
    aliases,
    imageUrlEnd: deriveImageUrlEnd(row.imageUrl),
  };
}

export function catalogDisplayName(exercise: {
  name: string;
  nameIt?: string | null;
}): string {
  const italian = exercise.nameIt?.trim();
  return italian && italian.length > 0 ? italian : exercise.name;
}
