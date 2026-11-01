"use client";

import { TEAM_COLORS, TEAM_IDS, type TeamId, type TeamScores } from "../admin.types";

type TeamScoreEditorProps = {
  isSaving: boolean;
  scores: TeamScores;
  onSave: () => void;
  onScoreChange: (teamId: TeamId, score: number) => void;
};

export function TeamScoreEditor({ isSaving, scores, onSave, onScoreChange }: TeamScoreEditorProps) {
  return (
    <section className="mt-12 bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
      <h3 className="text-2xl font-bold mb-6 uppercase">Puntajes de equipos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEAM_IDS.map((teamId) => (
          <div key={teamId} className="bg-black/60 border border-white/20 rounded-xl p-4">
            <label className="block text-sm font-semibold mb-2 capitalize" style={{ color: TEAM_COLORS[teamId] }} htmlFor={`${teamId}-score`}>Equipo {teamId}</label>
            <input id={`${teamId}-score`} type="number" value={scores[teamId]} onChange={(event) => onScoreChange(teamId, Number.parseInt(event.target.value, 10) || 0)} className="w-full px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-white text-2xl font-bold text-center focus:outline-none focus:border-white/40" min="0" />
          </div>
        ))}
      </div>
      <button onClick={onSave} disabled={isSaving} className="mt-6 px-8 py-4 bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 rounded-xl font-bold text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? "Guardando..." : "Guardar puntajes"}</button>
    </section>
  );
}
