import type { Character } from "../../adapters/characters";

// ANON-FORK: Character is already a public account projection; never read the native phone snapshot.
export function resolveCharacterXiaohongshuDisplayName(character:Pick<Character,"id"|"name">):string{return character.name;}
