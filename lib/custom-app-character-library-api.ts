"use client";

/** Native Character / CharacterWorldGroup bridge for Custom Apps. */
import type { Character } from "./character-types";
import {
  createCharacter,
  loadCharacters,
  saveCharacters,
} from "./character-storage";
import { normalizeTimeZone } from "./character-time";
import {
  DEFAULT_CHARACTER_WORLD_ID,
  loadCharacterWorldGroups,
  saveCharacterWorldGroups,
  createCharacterWorldGroup,
  deleteCharacterWorldGroup,
  moveCharacterToWorld,
  type CharacterWorldGroup,
  type CharacterWorldRelation,
} from "./character-world-storage";
import { removeCharacterChatReferences } from "./character-chat-cleanup";
import {
  backupCharacterVersion,
  clearCharacterVersions,
  overwriteCharacterVersion,
} from "./character-version-storage";

export type CharacterSummaryListInput = {
  page?: number;           // 1-based, default 1
  pageSize?: number;       // default 20, clamp 1..25
  search?: string;         // name + tags only
  worldId?: string | null; // empty/omitted => all worlds
};

export type CharacterSummary = {
  id: string;
  name: string;
  avatarPreview: string | null;
  hasAvatar: boolean;
  tags: string[];
  updatedAt: string;
  worldId: string;
  relationshipCount: number; // incident directed-relation records
};

export type CharacterSummaryListOutput = {
  items: CharacterSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CharacterCreateInput = {
  name: string;
  persona?: string;
  avatar?: string | null;
  personality?: string | null;
  briefPersona?: string | null;
  timeZone?: string | null;
  tags?: string[];
  worldId?: string | null;
};

export type CharacterUpdatePatch = {
  name?: string;
  persona?: string;
  avatar?: string | null;
  personality?: string | null;
  briefPersona?: string | null;
  timeZone?: string | null;
  tags?: string[] | null;
  polaroidStyle?: number | null;
  polaroidSize?: "random" | "small" | "medium" | "large" | null;
  polaroidImageX?: number | null;
  polaroidImageY?: number | null;
  polaroidImageZoom?: number | null;
};

export type CharacterUpdateInput = {
  id: string;
  patch: CharacterUpdatePatch;
  versionMode?: "overwrite" | "backup";
};

export type CharacterWorldListOutput = {
  worlds: Array<CharacterWorldGroup & {
    members: Array<{ id: string; name: string; avatarPreview: string | null }>;
  }>;
};

const UPDATE_KEYS = new Set([
  "name", "persona", "avatar", "personality", "briefPersona", "timeZone", "tags",
  "polaroidStyle", "polaroidSize", "polaroidImageX", "polaroidImageY", "polaroidImageZoom",
]);

const CREATE_KEYS = new Set([
  "name", "persona", "avatar", "personality", "briefPersona", "timeZone", "tags", "worldId",
]);

const PARK_COLS = 10;
const PARK_X0 = 120;
const PARK_Y0 = 120;
const PARK_DX = 180;
const PARK_DY = 200;
const PARK_SCAN_LIMIT = 500;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stableHash(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function chooseCharacterParkingPosition(
  characters: Character[],
  memberIds: string[],
  excludeCharacterId?: string,
): { canvasX: number; canvasY: number; canvasRot: number; canvasZIndex: number } {
  const members = new Set(memberIds);
  const occupied = characters.filter(character =>
    character.id !== excludeCharacterId
    && members.has(character.id)
    && isFiniteNumber(character.canvasX)
    && isFiniteNumber(character.canvasY)
  );
  for (let slot = 0; slot < PARK_SCAN_LIMIT; slot += 1) {
    const col = slot % PARK_COLS;
    const row = Math.floor(slot / PARK_COLS);
    const x = PARK_X0 + col * PARK_DX;
    const y = PARK_Y0 + row * PARK_DY;
    const collides = occupied.some(item =>
      Math.abs((item.canvasX as number) - x) < 130
      && Math.abs((item.canvasY as number) - y) < 150
    );
    if (collides) continue;
    const maxZ = occupied.reduce(
      (max, item) => isFiniteNumber(item.canvasZIndex) ? Math.max(max, item.canvasZIndex) : max,
      99,
    );
    // caller sets rotation from the target character id after create, not Math.random.
    return { canvasX: x, canvasY: y, canvasRot: 0, canvasZIndex: Math.min(1_000_000, maxZ + 1) };
  }
  throw new Error("世界画布没有可用安全停车位。");
}

export function applyDeterministicRotation(position: ReturnType<typeof chooseCharacterParkingPosition>, characterId: string) {
  return { ...position, canvasRot: (stableHash(characterId) % 9) - 4 };
}

const AVATAR_PREVIEW_CACHE_LIMIT = 64;
const avatarPreviewCache = new Map<string, string | null>();

function rememberAvatarPreview(key: string, value: string | null): string | null {
  avatarPreviewCache.delete(key);
  avatarPreviewCache.set(key, value);
  while (avatarPreviewCache.size > AVATAR_PREVIEW_CACHE_LIMIT) {
    const oldest = avatarPreviewCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    avatarPreviewCache.delete(oldest);
  }
  return value;
}

async function buildAvatarPreview(character: Character): Promise<string | null> {
  const avatar = character.avatar?.trim();
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (!/^data:image\//i.test(avatar)) return null;

  const key = `${character.id}|${character.updatedAt}`;
  if (avatarPreviewCache.has(key)) {
    const cached = avatarPreviewCache.get(key) ?? null;
    avatarPreviewCache.delete(key);
    avatarPreviewCache.set(key, cached);
    return cached;
  }
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return rememberAvatarPreview(key, null);
  }

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("角色头像预览解码失败。"));
      next.src = avatar;
    });
    const scale = Math.min(1, 96 / Math.max(1, image.naturalWidth || image.width, image.naturalHeight || image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("角色头像预览画布不可用。");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/webp", 0.72);
    return rememberAvatarPreview(key, preview === avatar ? null : preview);
  } catch {
    return rememberAvatarPreview(key, null);
  }
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => String(item ?? "").trim()).filter(Boolean))).slice(0, 80);
}

function validateAvatar(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const clean = value.trim();
  if (!clean) return null;
  if (!/^data:image\//i.test(clean) && !/^https?:\/\//i.test(clean)) {
    throw new Error("角色头像只允许 data:image 或 http(s) URL。");
  }
  // For data URLs, enforce decoded payload <= native 600 KiB target.
  if (/^data:/i.test(clean)) {
    const comma = clean.indexOf(",");
    if (comma < 0) throw new Error("角色头像 data URL 无效。");
    const header = clean.slice(0, comma);
    const payload = clean.slice(comma + 1);
    let bytes: number;
    if (/;base64/i.test(header)) {
      const compact = payload.replace(/\s/g, "");
      if (!/^[a-z0-9+/]*={0,2}$/i.test(compact)) throw new Error("角色头像 data URL 无效。");
      bytes = Math.max(0, Math.floor(compact.length * 3 / 4) - (compact.endsWith("==") ? 2 : compact.endsWith("=") ? 1 : 0));
    } else {
      try {
        bytes = new TextEncoder().encode(decodeURIComponent(payload)).byteLength;
      } catch {
        throw new Error("角色头像 data URL 无效。");
      }
    }
    if (bytes > 600 * 1024) {
      throw new Error("角色头像超过 600KB，请先压缩。");
    }
  }
  return clean;
}

export async function listCustomAppCharacterSummaries(
  input: CharacterSummaryListInput,
): Promise<CharacterSummaryListOutput> {
  const characters = loadCharacters();
  const worlds = loadCharacterWorldGroups();
  const worldByCharacter = new Map<string, string>();
  const relationCount = new Map<string, number>();

  for (const world of worlds) {
    for (const id of world.memberIds) worldByCharacter.set(id, world.id);
    for (const relation of world.relations) {
      relationCount.set(relation.fromCharacterId, (relationCount.get(relation.fromCharacterId) ?? 0) + 1);
      relationCount.set(relation.toCharacterId, (relationCount.get(relation.toCharacterId) ?? 0) + 1);
    }
  }

  const pageSize = Math.min(25, Math.max(1, Math.trunc(Number(input.pageSize) || 20)));
  const query = String(input.search ?? "").trim().toLocaleLowerCase();
  const worldId = String(input.worldId ?? "").trim();

  const filtered = characters.filter(character => {
    if (worldId && worldByCharacter.get(character.id) !== worldId) return false;
    if (!query) return true;
    return character.name.toLocaleLowerCase().includes(query)
      || (character.tags ?? []).some(tag => tag.toLocaleLowerCase().includes(query));
  });

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const requested = Math.max(1, Math.trunc(Number(input.page) || 1));
  const page = totalPages > 0 ? Math.min(requested, totalPages) : 1;
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  const items = await Promise.all(slice.map(async character => ({
    id: character.id,
    name: character.name,
    avatarPreview: await buildAvatarPreview(character),
    hasAvatar: Boolean(character.avatar),
    tags: [...(character.tags ?? [])],
    updatedAt: character.updatedAt,
    worldId: worldByCharacter.get(character.id) ?? DEFAULT_CHARACTER_WORLD_ID,
    relationshipCount: relationCount.get(character.id) ?? 0,
  })));

  return { items, total, page, pageSize, totalPages };
}

export async function createCustomAppCharacter(input: CharacterCreateInput) {
  const unknown = Object.keys(input && typeof input === "object" ? input : {}).filter(key => !CREATE_KEYS.has(key));
  if (unknown.length) throw new Error(`characters.create 不允许字段：${unknown.join(", ")}`);
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("characters.create 需要非空 name。");

  const worlds = loadCharacterWorldGroups();
  const requestedWorldId = String(input.worldId ?? "").trim() || DEFAULT_CHARACTER_WORLD_ID;
  const targetWorld = worlds.find(world => world.id === requestedWorldId);
  if (!targetWorld) throw new Error("characters.create 指定的 worldId 不存在。");

  const avatar = validateAvatar(input.avatar) ?? null;
  const character = createCharacter({
    name,
    persona: String(input.persona ?? ""),
    avatar,
    personality: String(input.personality ?? "").trim() || undefined,
    briefPersona: String(input.briefPersona ?? "").trim() || undefined,
    timeZone: normalizeTimeZone(input.timeZone) || undefined,
    tags: normalizeTags(input.tags),
    polaroidStyle: 0,
    polaroidSize: "random",
    polaroidImageX: 50,
    polaroidImageY: 50,
    polaroidImageZoom: 1,
  });

  const position = applyDeterministicRotation(
    chooseCharacterParkingPosition(loadCharacters(), targetWorld.memberIds),
    character.id,
  );
  Object.assign(character, position);

  saveCharacters([...loadCharacters(), character]);
  if (requestedWorldId !== DEFAULT_CHARACTER_WORLD_ID) {
    moveCharacterToWorld(character.id, requestedWorldId);
  } else {
    // force CharacterWorld normalization/event after character creation
    saveCharacterWorldGroups(loadCharacterWorldGroups());
  }
  return { character, worldId: requestedWorldId };
}

export function updateCustomAppCharacter(input: CharacterUpdateInput) {
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("characters.update 需要 id。");
  const patch = input.patch && typeof input.patch === "object" ? input.patch as Record<string, unknown> : {};
  const unknown = Object.keys(patch).filter(key => !UPDATE_KEYS.has(key));
  if (unknown.length) throw new Error(`characters.update 不允许字段：${unknown.join(", ")}`);
  if (Object.keys(patch).length === 0) throw new Error("characters.update patch 不能为空。");

  const characters = loadCharacters();
  const existing = characters.find(item => item.id === id);
  if (!existing) throw new Error("characters.update 角色不存在。");

  const nextPatch: Partial<Character> = {};
  if ("name" in patch && patch.name !== undefined) nextPatch.name = String(patch.name ?? "").trim() || existing.name || "UNNAMED";
  if ("persona" in patch && patch.persona !== undefined) nextPatch.persona = String(patch.persona ?? "");
  if ("avatar" in patch && patch.avatar !== undefined) nextPatch.avatar = validateAvatar(patch.avatar as string | null) ?? null;
  if ("personality" in patch && patch.personality !== undefined) nextPatch.personality = String(patch.personality ?? "").trim() || undefined;
  if ("timeZone" in patch && patch.timeZone !== undefined) nextPatch.timeZone = normalizeTimeZone(patch.timeZone) || undefined;
  if ("tags" in patch && patch.tags !== undefined) nextPatch.tags = normalizeTags(patch.tags);

  if ("briefPersona" in patch && patch.briefPersona !== undefined) {
    const brief = String(patch.briefPersona ?? "").trim();
    nextPatch.briefPersona = brief || undefined;
    nextPatch.briefPersonaUpdatedAt = brief
      ? (brief !== (existing.briefPersona ?? "").trim() ? new Date().toISOString() : existing.briefPersonaUpdatedAt)
      : undefined;
  }

  if ("polaroidStyle" in patch && patch.polaroidStyle !== undefined) {
    const value = patch.polaroidStyle;
    nextPatch.polaroidStyle = value == null ? 0 : Math.max(0, Math.min(4, Math.round(Number(value) || 0)));
  }
  if ("polaroidSize" in patch && patch.polaroidSize !== undefined) {
    const value = patch.polaroidSize;
    if (value == null) nextPatch.polaroidSize = "random";
    else if (value === "random" || value === "small" || value === "medium" || value === "large") nextPatch.polaroidSize = value;
    else throw new Error("characters.update polaroidSize 无效。");
  }
  if ("polaroidImageX" in patch && patch.polaroidImageX !== undefined) {
    const value = patch.polaroidImageX;
    if (value != null && !Number.isFinite(Number(value))) throw new Error("characters.update polaroidImageX 无效。");
    nextPatch.polaroidImageX = value == null ? 50 : Math.max(0, Math.min(100, Number(value)));
  }
  if ("polaroidImageY" in patch && patch.polaroidImageY !== undefined) {
    const value = patch.polaroidImageY;
    if (value != null && !Number.isFinite(Number(value))) throw new Error("characters.update polaroidImageY 无效。");
    nextPatch.polaroidImageY = value == null ? 50 : Math.max(0, Math.min(100, Number(value)));
  }
  if ("polaroidImageZoom" in patch && patch.polaroidImageZoom !== undefined) {
    const value = patch.polaroidImageZoom;
    if (value != null && !Number.isFinite(Number(value))) throw new Error("characters.update polaroidImageZoom 无效。");
    nextPatch.polaroidImageZoom = value == null ? 1 : Math.max(1, Math.min(3, Number(value)));
  }

  // Validate all before touching version storage.
  const mode = input.versionMode === "backup" ? "backup" : "overwrite";
  const version = mode === "backup"
    ? backupCharacterVersion(existing, "manual", "Target Archives 修改前备份")
    : overwriteCharacterVersion(existing.id);

  const updated: Character = {
    ...existing,          // preserve unknown/future fields
    ...nextPatch,
    id: existing.id,     // immutable defense
    createdAt: existing.createdAt,
    wechatID: existing.wechatID,
    canvasX: existing.canvasX,
    canvasY: existing.canvasY,
    canvasRot: existing.canvasRot,
    canvasZIndex: existing.canvasZIndex,
    updatedAt: new Date().toISOString(),
  };
  saveCharacters(characters.map(item => item.id === id ? updated : item));
  return { character: updated, version };
}

export async function deleteCustomAppCharacter(input: { id: string }) {
  const id = String(input.id ?? "").trim();
  const characters = loadCharacters();
  if (!characters.some(item => item.id === id)) throw new Error("characters.delete 角色不存在。");

  // Native order — do not reorder.
  await removeCharacterChatReferences(id);
  clearCharacterVersions(id);
  saveCharacters(characters.filter(item => item.id !== id));

  // Native world storage lazily normalizes invalid members/relations; flush that
  // normalization now so the API mutation is complete before resolving.
  saveCharacterWorldGroups(loadCharacterWorldGroups());
  return { ok: true as const, id };
}

export function listCustomAppCharacterWorlds(): CharacterWorldListOutput {
  const characters = loadCharacters();
  const byId = new Map(characters.map(character => [character.id, character]));
  return {
    worlds: loadCharacterWorldGroups().map(world => ({
      ...world,
      members: world.memberIds.map(id => byId.get(id)).filter(Boolean).map(character => ({
        id: character!.id,
        name: character!.name,
        // implementation should call a cached synchronous/async preview helper;
        // if list() stays sync, omit avatarPreview from members or set null.
        avatarPreview: null,
      })),
    })),
  };
}

export function createCustomAppCharacterWorld(input: { name?: string; description?: string }) {
  const world = createCharacterWorldGroup(String(input.name ?? ""));
  if (input.description !== undefined) {
    const worlds = loadCharacterWorldGroups();
    const now = new Date().toISOString();
    saveCharacterWorldGroups(worlds.map(item => item.id === world.id
      ? { ...item, description: String(input.description ?? ""), updatedAt: now }
      : item));
  }
  return { world: loadCharacterWorldGroups().find(item => item.id === world.id)! };
}

export function updateCustomAppCharacterWorld(input: { id: string; patch: { name?: string; description?: string } }) {
  const id = String(input.id ?? "").trim();
  const patch = input.patch && typeof input.patch === "object" ? input.patch as Record<string, unknown> : {};
  const unknown = Object.keys(patch).filter(key => key !== "name" && key !== "description");
  if (unknown.length) throw new Error(`characterWorlds.update 不允许字段：${unknown.join(", ")}`);
  if (Object.keys(patch).length === 0) throw new Error("characterWorlds.update patch 不能为空。");
  const worlds = loadCharacterWorldGroups();
  const existing = worlds.find(item => item.id === id);
  if (!existing) throw new Error("characterWorlds.update 世界不存在。");
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    name: "name" in patch ? (String(patch.name ?? "").trim() || existing.name) : existing.name,
    description: "description" in patch ? String(patch.description ?? "") : existing.description,
    updatedAt: now,
  };
  saveCharacterWorldGroups(worlds.map(item => item.id === id ? updated : item));
  return { world: updated };
}

export function deleteCustomAppCharacterWorld(input: { id: string }) {
  const id = String(input.id ?? "").trim();
  if (id === DEFAULT_CHARACTER_WORLD_ID) throw new Error("默认世界不能删除。");
  const existing = loadCharacterWorldGroups().find(item => item.id === id);
  if (!existing) throw new Error("characterWorlds.delete 世界不存在。");
  const movedCharacterIds = [...existing.memberIds];
  deleteCharacterWorldGroup(id);
  return { ok: true as const, deletedWorldId: id, movedCharacterIds };
}

export function moveCustomAppCharacter(input: { characterId: string; toWorldId: string }) {
  const characterId = String(input.characterId ?? "").trim();
  const toWorldId = String(input.toWorldId ?? "").trim();
  const characters = loadCharacters();
  const character = characters.find(item => item.id === characterId);
  if (!character) throw new Error("characterWorlds.moveCharacter 角色不存在。");
  const worlds = loadCharacterWorldGroups();
  const target = worlds.find(item => item.id === toWorldId);
  if (!target) throw new Error("characterWorlds.moveCharacter 目标世界不存在。");
  const fromWorldId = worlds.find(item => item.memberIds.includes(characterId))?.id ?? DEFAULT_CHARACTER_WORLD_ID;
  if (fromWorldId === toWorldId) return { ok: true as const, character, fromWorldId, toWorldId };

  const position = applyDeterministicRotation(
    chooseCharacterParkingPosition(characters, target.memberIds, characterId),
    character.id,
  );
  const parked = { ...character, ...position }; // layout-only: do not bump updatedAt
  saveCharacters(characters.map(item => item.id === characterId ? parked : item));
  moveCharacterToWorld(characterId, toWorldId); // removes invalid old-world relations
  return { ok: true as const, character: parked, fromWorldId, toWorldId };
}

function generateRelationId(): string {
  return `relation_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function validateRelationCandidate(world: CharacterWorldGroup, fromId: string, toId: string, label: string) {
  if (!fromId || !toId) throw new Error("关系必须指定 fromCharacterId / toCharacterId。");
  if (fromId === toId) throw new Error("角色不能与自己建立该关系。");
  const members = new Set(world.memberIds);
  if (!members.has(fromId) || !members.has(toId)) throw new Error("关系两端必须都是该世界的成员。");
  const cleanLabel = label.trim();
  if (!cleanLabel) throw new Error("关系 label 不能为空。");
  return cleanLabel;
}

export function createCustomAppCharacterRelation(input: {
  worldId: string; fromCharacterId: string; toCharacterId: string; label: string;
}) {
  const worlds = loadCharacterWorldGroups();
  const world = worlds.find(item => item.id === String(input.worldId ?? "").trim());
  if (!world) throw new Error("characterWorlds.createRelation 世界不存在。");
  const fromCharacterId = String(input.fromCharacterId ?? "").trim();
  const toCharacterId = String(input.toCharacterId ?? "").trim();
  const label = validateRelationCandidate(world, fromCharacterId, toCharacterId, String(input.label ?? ""));
  const relation: CharacterWorldRelation = {
    id: generateRelationId(),
    fromCharacterId,
    toCharacterId,
    label,
  };
  const updated = { ...world, relations: [...world.relations, relation], updatedAt: new Date().toISOString() };
  saveCharacterWorldGroups(worlds.map(item => item.id === world.id ? updated : item));
  return { relation };
}

export function updateCustomAppCharacterRelation(input: {
  worldId: string;
  relationId: string;
  patch: { fromCharacterId?: string; toCharacterId?: string; label?: string };
}) {
  const worlds = loadCharacterWorldGroups();
  const world = worlds.find(item => item.id === String(input.worldId ?? "").trim());
  if (!world) throw new Error("characterWorlds.updateRelation 世界不存在。");
  const relation = world.relations.find(item => item.id === String(input.relationId ?? "").trim());
  if (!relation) throw new Error("characterWorlds.updateRelation 关系不存在。");
  const patch = input.patch && typeof input.patch === "object" ? input.patch as Record<string, unknown> : {};
  const unknown = Object.keys(patch).filter(key => !["fromCharacterId","toCharacterId","label"].includes(key));
  if (unknown.length) throw new Error(`characterWorlds.updateRelation 不允许字段：${unknown.join(", ")}`);
  if (Object.keys(patch).length === 0) throw new Error("characterWorlds.updateRelation patch 不能为空。");

  const from = "fromCharacterId" in patch ? String(patch.fromCharacterId ?? "").trim() : relation.fromCharacterId;
  const to = "toCharacterId" in patch ? String(patch.toCharacterId ?? "").trim() : relation.toCharacterId;
  const label = validateRelationCandidate(world, from, to, "label" in patch ? String(patch.label ?? "") : relation.label);
  const updatedRelation: CharacterWorldRelation = { id: relation.id, fromCharacterId: from, toCharacterId: to, label };
  const updatedWorld = {
    ...world,
    relations: world.relations.map(item => item.id === relation.id ? updatedRelation : item),
    updatedAt: new Date().toISOString(),
  };
  saveCharacterWorldGroups(worlds.map(item => item.id === world.id ? updatedWorld : item));
  return { relation: updatedRelation }; // ID is preserved, never delete+create.
}

export function deleteCustomAppCharacterRelation(input: { worldId: string; relationId: string }) {
  const worlds = loadCharacterWorldGroups();
  const world = worlds.find(item => item.id === String(input.worldId ?? "").trim());
  if (!world) throw new Error("characterWorlds.deleteRelation 世界不存在。");
  const relationId = String(input.relationId ?? "").trim();
  if (!world.relations.some(item => item.id === relationId)) throw new Error("characterWorlds.deleteRelation 关系不存在。");
  const updatedWorld = {
    ...world,
    relations: world.relations.filter(item => item.id !== relationId),
    updatedAt: new Date().toISOString(),
  };
  saveCharacterWorldGroups(worlds.map(item => item.id === world.id ? updatedWorld : item));
  return { ok: true as const, relationId };
}
