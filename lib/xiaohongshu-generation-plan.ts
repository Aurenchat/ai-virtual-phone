/**
 * UI-only Xiaohongshu generation selector. No migration or saved setting changes.
 * "selected-posts" draws from the entire Float character library.
 * "all-posts" and "activity" use ONLY saved XHS participants.
 */
export type XiaohongshuGenerationMode = "npc" | "all-posts" | "selected-posts" | "activity";

export function resolveXiaohongshuGenerationCharacterIds(
  mode: XiaohongshuGenerationMode,
  participantIds: readonly string[],
  allCharacters: ReadonlyArray<{ id: string }>,
  selectedIds: readonly string[] = [],
): string[] {
  if (mode === "npc") return [];
  const allowed = new Set(allCharacters.map(character => character.id));
  const source = mode === "selected-posts" ? selectedIds : participantIds;
  return Array.from(new Set(source.filter(id => allowed.has(id))));
}
