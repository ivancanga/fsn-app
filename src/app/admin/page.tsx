"use client";

import { useEffect, useState } from "react";
import { Logo } from "../styled";
import {
  loadOutfitImages,
  loadOutfitSettings,
  loadTeamScores,
  saveOutfitSettings,
  saveTeamScores,
  uploadOutfitImage,
} from "./admin-data";
import {
  createEmptyOutfitParticipants,
  EMPTY_TEAM_SCORES,
  type OutfitParticipantId,
  type OutfitParticipants,
  type TeamId,
  type TeamScores,
} from "./admin.types";
import { AdminLogin } from "./components/admin-login";
import { OutfitSettings } from "./components/outfit-settings";
import { TeamScoreEditor } from "./components/team-score-editor";

const ADMIN_PASSWORD = "123000";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [participants, setParticipants] = useState<OutfitParticipants>(createEmptyOutfitParticipants);
  const [showResults, setShowResults] = useState(false);
  const [imageUrls, setImageUrls] = useState<Partial<Record<OutfitParticipantId, string>>>({});
  const [uploading, setUploading] = useState<OutfitParticipantId | null>(null);
  const [savingOutfits, setSavingOutfits] = useState(false);
  const [teamScores, setTeamScores] = useState<TeamScores>(EMPTY_TEAM_SCORES);
  const [savingScores, setSavingScores] = useState(false);

  async function loadAdminData() {
    try {
      const [outfitSettings, images, scores] = await Promise.all([
        loadOutfitSettings(),
        loadOutfitImages(),
        loadTeamScores(),
      ]);
      setParticipants(outfitSettings.participants);
      setShowResults(outfitSettings.showResults);
      setImageUrls(images);
      setTeamScores(scores);
    } catch (error) {
      console.error("Error al cargar la administración:", error);
      alert("No pudimos cargar todos los datos de administración.");
    }
  }

  useEffect(() => {
    if (sessionStorage.getItem("adminAuth") !== ADMIN_PASSWORD) return;
    const timer = window.setTimeout(() => setIsAuthenticated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setTimeout(() => {
      void loadAdminData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      alert("Contraseña incorrecta");
      return;
    }
    sessionStorage.setItem("adminAuth", password);
    setIsAuthenticated(true);
  }

  function handleParticipantChange(id: OutfitParticipantId, field: "name" | "description", value: string) {
    setParticipants((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function handleUpload(id: OutfitParticipantId, image: File) {
    setUploading(id);
    try {
      const url = await uploadOutfitImage(id, image);
      setImageUrls((current) => ({ ...current, [id]: url }));
      alert("Imagen subida exitosamente");
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Error al subir la imagen");
    } finally {
      setUploading(null);
    }
  }

  async function handleSaveOutfits() {
    setSavingOutfits(true);
    try {
      await saveOutfitSettings(participants, showResults);
      alert("Datos guardados exitosamente");
    } catch (error) {
      console.error("Error al guardar datos de outfits:", error);
      alert("Error al guardar los datos");
    } finally {
      setSavingOutfits(false);
    }
  }

  async function handleSaveScores() {
    setSavingScores(true);
    try {
      await saveTeamScores(teamScores);
      alert("Puntajes guardados exitosamente");
    } catch (error) {
      console.error("Error al guardar puntajes:", error);
      alert("Error al guardar los puntajes");
    } finally {
      setSavingScores(false);
    }
  }

  if (!isAuthenticated) {
    return <AdminLogin password={password} onPasswordChange={setPassword} onSubmit={handleLogin} />;
  }

  return (
    <main className="min-h-screen text-white px-6 py-8 mb-24">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <header className="text-center space-y-3">
          <Logo><h1>FSN</h1></Logo>
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-bold mt-6 uppercase [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">Administración</h2>
            <button
              onClick={() => {
                sessionStorage.removeItem("adminAuth");
                setPassword("");
                setIsAuthenticated(false);
              }}
              className="px-4 py-2 text-sm bg-red-600/80 hover:bg-red-600 rounded-xl font-semibold transition-all duration-300"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <OutfitSettings
          imageUrls={imageUrls}
          isSaving={savingOutfits}
          isUploading={uploading}
          participants={participants}
          showResults={showResults}
          onParticipantChange={handleParticipantChange}
          onShowResultsChange={setShowResults}
          onSave={handleSaveOutfits}
          onUpload={handleUpload}
        />
        <TeamScoreEditor
          isSaving={savingScores}
          scores={teamScores}
          onSave={handleSaveScores}
          onScoreChange={(teamId: TeamId, score) => {
            setTeamScores((current) => ({ ...current, [teamId]: score }));
          }}
        />
      </div>
    </main>
  );
}
