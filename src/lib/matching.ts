export type SkillLevel = "weak" | "medium" | "strong" | "expert";

export type MatchingSkill = {
  user_id: string;
  skill_id: string;
  level: SkillLevel;
  skills?: { name?: string } | null;
};

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const LEVEL_VALUE: Record<SkillLevel, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
  expert: 4,
};

export function cosineSkillSimilarity(a: MatchingSkill[], b: MatchingSkill[]): number {
  const aMap = new Map(a.map((s) => [s.skill_id, LEVEL_VALUE[s.level]]));
  const bMap = new Map(b.map((s) => [s.skill_id, LEVEL_VALUE[s.level]]));
  const ids = new Set([...aMap.keys(), ...bMap.keys()]);
  if (ids.size === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (const id of ids) {
    const av = aMap.get(id) ?? 0;
    const bv = bMap.get(id) ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function complementarySkillScore(mySkills: MatchingSkill[], theirSkills: MatchingSkill[]) {
  const myWeak = new Map(mySkills.filter((s) => s.level === "weak").map((s) => [s.skill_id, s.skills?.name ?? s.skill_id]));
  const myStrong = new Map(mySkills.filter((s) => s.level === "strong" || s.level === "expert").map((s) => [s.skill_id, s.skills?.name ?? s.skill_id]));
  const theirWeak = new Set(theirSkills.filter((s) => s.level === "weak").map((s) => s.skill_id));

  const theyTeach = theirSkills
    .filter((s) => (s.level === "strong" || s.level === "expert") && myWeak.has(s.skill_id))
    .map((s) => s.skills?.name ?? s.skill_id);
  const iTeach = theirSkills
    .filter((s) => s.level === "weak" && myStrong.has(s.skill_id))
    .map((s) => myStrong.get(s.skill_id) ?? s.skill_id);

  const teachCoverage = myWeak.size ? Math.min(1, theyTeach.length / myWeak.size) : 0;
  const learnCoverage = theirWeak.size ? Math.min(1, iTeach.length / theirWeak.size) : 0;
  return { score: teachCoverage * 0.6 + learnCoverage * 0.4, theyTeach, iTeach };
}

export function calculateHybridMatchScore(parts: {
  complementary: number;
  jaccard: number;
  cosine: number;
  availability: number;
  department: number;
}): number {
  return Math.round((
    0.45 * parts.complementary +
    0.20 * parts.jaccard +
    0.15 * parts.cosine +
    0.10 * parts.availability +
    0.10 * parts.department
  ) * 100);
}
