"use client";

import type { Character } from "@/lib/character-types";

/** Geometry deliberately stays in world coordinates, matching the original canvas. */
type Relation = {
  key: string;
  aId: string;
  bId: string;
  labels: readonly string[];
};
type PositionedCharacter = Pick<Character, "id" | "canvasX" | "canvasY">;
type PositionedRelation = {
  relation: Relation;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** The relation label is a 200x30 foreignObject centered on a line midpoint. */
const HORIZONTAL_PAD = 112;
const VERTICAL_PAD = 24;
const POLAROID_CENTER_OFFSET = 60;

/**
 * Return the smallest practical SVG rectangle containing all valid relation
 * endpoints and their interactive 200x30 labels. No relation => no SVG at all.
 * Unlike the previous 10000x10000 surface, this scales with actual content.
 */
export function computeCanvasRelationLayout(
  relations: readonly Relation[],
  characters: readonly PositionedCharacter[],
): { left: number; top: number; width: number; height: number; lines: PositionedRelation[] } | null {
  if (!relations.length) return null;
  const byId = new Map(characters.map(character => [character.id, character]));
  const lines: PositionedRelation[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const relation of relations) {
    const a = byId.get(relation.aId);
    const b = byId.get(relation.bId);
    if (a?.canvasX === undefined || a.canvasY === undefined || b?.canvasX === undefined || b.canvasY === undefined) continue;
    const x1 = a.canvasX + POLAROID_CENTER_OFFSET;
    const y1 = a.canvasY + POLAROID_CENTER_OFFSET;
    const x2 = b.canvasX + POLAROID_CENTER_OFFSET;
    const y2 = b.canvasY + POLAROID_CENTER_OFFSET;
    if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
    minX = Math.min(minX, x1, x2);
    minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2);
    maxY = Math.max(maxY, y1, y2);
    lines.push({ relation, x1, y1, x2, y2 });
  }
  if (!lines.length) return null;

  const left = Math.floor(minX - HORIZONTAL_PAD);
  const top = Math.floor(minY - VERTICAL_PAD);
  return {
    left,
    top,
    width: Math.max(1, Math.ceil(maxX + HORIZONTAL_PAD - left)),
    height: Math.max(1, Math.ceil(maxY + VERTICAL_PAD - top)),
    lines,
  };
}

/** All coordinates and click targets reproduce the previous relation SVG. */
export function CanvasRelationOverlay({
  relations,
  characters,
  isEditing,
  onEditPair,
}: {
  relations: readonly Relation[];
  characters: readonly PositionedCharacter[];
  isEditing: boolean;
  onEditPair: (aId: string, bId: string) => void;
}) {
  const layout = computeCanvasRelationLayout(relations, characters);
  if (!layout) return null;

  return (
    <svg
      className="absolute pointer-events-none overflow-visible"
      width={layout.width}
      height={layout.height}
      style={{ left: layout.left, top: layout.top, zIndex: 99999 }}
    >
      <g transform={`translate(${-layout.left} ${-layout.top})`}>
        {layout.lines.map(({ relation, x1, y1, x2, y2 }) => (
          <g key={relation.key}>
            {/* Preserve original line styling and connection endpoints. */}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.04)" strokeWidth="2" transform="translate(1, 1.5)" strokeDasharray="6 3" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#222222" strokeWidth="1.5" opacity={0.9} strokeDasharray="6 3" />
            <g transform={`translate(${x1}, ${y1})`}>
              <circle cx="1.5" cy="2" r="4.5" fill="rgba(0,0,0,0.12)" />
              <circle cx="0" cy="0" r="4.5" fill="#111111" />
              <circle cx="-1.5" cy="-1.5" r="1.5" fill="#555555" opacity={0.9} />
            </g>
            <g transform={`translate(${x2}, ${y2})`}>
              <circle cx="1.5" cy="2" r="4.5" fill="rgba(0,0,0,0.12)" />
              <circle cx="0" cy="0" r="4.5" fill="#111111" />
              <circle cx="-1.5" cy="-1.5" r="1.5" fill="#555555" opacity={0.9} />
            </g>
            <foreignObject
              x={(x1 + x2) / 2 - 100}
              y={(y1 + y2) / 2 - 15}
              width={200}
              height={30}
              className="overflow-visible pointer-events-none"
            >
              <div className="flex items-center justify-center w-full h-full pointer-events-none">
                <span
                  className={`bg-[#111111] px-2 py-0.5 text-[11px] text-white border border-[#333333] rounded-[4px] font-bold ${isEditing ? 'cursor-pointer pointer-events-auto hover:bg-[#222222] transition-colors' : 'pointer-events-none'}`}
                  style={{
                    fontFamily: '"Courier New", monospace',
                    boxShadow: '1px 2px 4px rgba(0,0,0,0.06)',
                    transform: 'rotate(-2deg)',
                  }}
                  onClick={isEditing ? () => onEditPair(relation.aId, relation.bId) : undefined}
                >
                  {relation.labels.join(" / ")}
                </span>
              </div>
            </foreignObject>
          </g>
        ))}
      </g>
    </svg>
  );
}
