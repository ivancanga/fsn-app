"use client";

import Image from "next/image";
import { OUTFIT_PARTICIPANT_IDS, type OutfitParticipantId, type OutfitParticipants } from "../admin.types";

type OutfitSettingsProps = {
  imageUrls: Partial<Record<OutfitParticipantId, string>>;
  isSaving: boolean;
  isUploading: OutfitParticipantId | null;
  participants: OutfitParticipants;
  showResults: boolean;
  onParticipantChange: (id: OutfitParticipantId, field: "name" | "description", value: string) => void;
  onShowResultsChange: (showResults: boolean) => void;
  onSave: () => void;
  onUpload: (id: OutfitParticipantId, image: File) => void;
};

export function OutfitSettings({ imageUrls, isSaving, isUploading, participants, showResults, onParticipantChange, onShowResultsChange, onSave, onUpload }: OutfitSettingsProps) {
  return (
    <>
      <section className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="showResults" checked={showResults} onChange={(event) => onShowResultsChange(event.target.checked)} className="w-5 h-5 rounded border-white/20 bg-black/60" />
          <label htmlFor="showResults" className="font-semibold">Mostrar resultados públicamente</label>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {OUTFIT_PARTICIPANT_IDS.map((id, index) => (
          <section key={id} className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4 uppercase">Participante #{index + 1}</h3>
            <label className="block text-sm font-semibold mb-2" htmlFor={`${id}-name`}>Nombre</label>
            <input id={`${id}-name`} type="text" value={participants[id].name} onChange={(event) => onParticipantChange(id, "name", event.target.value)} className="w-full px-4 py-2 mb-4 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40" placeholder="Nombre del participante" />
            <label className="block text-sm font-semibold mb-2" htmlFor={`${id}-description`}>Descripción</label>
            <textarea id={`${id}-description`} value={participants[id].description} onChange={(event) => onParticipantChange(id, "description", event.target.value)} rows={3} className="w-full px-4 py-2 mb-4 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40 resize-none" placeholder="Descripción del outfit" />
            <label className="block text-sm font-semibold mb-2" htmlFor={`${id}-image`}>Foto</label>
            {imageUrls[id] && <div className="relative w-full aspect-square mb-4 rounded-xl overflow-hidden border border-white/20"><Image src={imageUrls[id]} alt={participants[id].name || `Participante ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div>}
            <input
              id={`${id}-image`}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const image = event.target.files?.[0];
                if (image) onUpload(id, image);
              }}
              disabled={isUploading === id}
              className="w-full px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer disabled:opacity-50"
            />
            {isUploading === id && <p className="text-sm text-yellow-500 mt-2">Subiendo imagen...</p>}
          </section>
        ))}
      </div>
      <button onClick={onSave} disabled={isSaving} className="px-8 py-4 bg-green-600/80 hover:bg-green-600 border border-green-400/30 rounded-xl font-bold text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? "Guardando..." : "Guardar cambios"}</button>
    </>
  );
}
