export const OUTFIT_PARTICIPANT_IDS = [
  "participante1",
  "participante2",
  "participante3",
  "participante4",
] as const;

export const TEAM_IDS = ["rojo", "azul", "verde", "amarillo"] as const;

export type OutfitParticipantId = (typeof OUTFIT_PARTICIPANT_IDS)[number];
export type TeamId = (typeof TEAM_IDS)[number];

export type OutfitParticipant = { name: string; description: string };
export type OutfitParticipants = Record<OutfitParticipantId, OutfitParticipant>;
export type TeamScores = Record<TeamId, number>;

export const TEAM_COLORS: Record<TeamId, string> = {
  rojo: "#ef4444",
  azul: "#3b82f6",
  verde: "#22c55e",
  amarillo: "#facc15",
};

export const EMPTY_TEAM_SCORES: TeamScores = {
  rojo: 0,
  azul: 0,
  verde: 0,
  amarillo: 0,
};

export function createEmptyOutfitParticipants(): OutfitParticipants {
  return Object.fromEntries(
    OUTFIT_PARTICIPANT_IDS.map((id) => [id, { name: "", description: "" }]),
  ) as OutfitParticipants;
}
