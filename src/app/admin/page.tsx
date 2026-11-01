"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../utils/firebase";
import { Logo } from "../styled";
import Image from "next/image";

const ADMIN_PASSWORD = "123000";
const PARTICIPANT_IDS = [
  "participante1",
  "participante2",
  "participante3",
  "participante4",
] as const;

const TEAM_IDS = ["rojo", "azul", "verde", "amarillo"] as const;
const TEAM_COLORS = {
  rojo: "#ef4444",
  azul: "#3b82f6",
  verde: "#22c55e",
  amarillo: "#facc15",
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [participants, setParticipants] = useState<Record<string, { name: string; description: string }>>({});
  const [showResults, setShowResults] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({
    rojo: 0,
    azul: 0,
    verde: 0,
    amarillo: 0,
  });
  const [savingScores, setSavingScores] = useState(false);

  useEffect(() => {
    const storedAuth = sessionStorage.getItem("adminAuth");
    if (storedAuth === ADMIN_PASSWORD) {
      const timer = window.setTimeout(() => {
        setIsAuthenticated(true);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, []);

  async function loadData() {
    try {
      const docRef = doc(db, "votation", "current");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setShowResults(Boolean(data.mostrarResultados));

        const participantsData: Record<string, { name: string; description: string }> = {};
        for (const id of PARTICIPANT_IDS) {
          participantsData[id] = {
            name: data[id]?.name || "",
            description: data[id]?.description || "",
          };
        }
        setParticipants(participantsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  async function loadImages() {
    const urls: Record<string, string> = {};
    for (const id of PARTICIPANT_IDS) {
      try {
        const imageRef = ref(storage, `outfits/${id}.jpg`);
        const url = await getDownloadURL(imageRef);
        urls[id] = url;
      } catch {
        console.log(`No image found for ${id}`);
      }
    }
    setImageUrls(urls);
  }

  async function loadTeamScores() {
    try {
      const scores: Record<string, number> = {};
      for (const teamId of TEAM_IDS) {
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const data = teamSnap.data();
          scores[teamId] = data.score || 0;
        } else {
          scores[teamId] = 0;
        }
      }
      setTeamScores(scores);
    } catch (error) {
      console.error("Error loading team scores:", error);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      const timer = window.setTimeout(() => {
        void loadData();
        void loadImages();
        void loadTeamScores();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", password);
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const handleImageUpload = async (participantId: string, file: File) => {
    if (!file) return;

    setUploading(participantId);
    try {
      // Optimize image before upload
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
      });

      const storageRef = ref(storage, `outfits/${participantId}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      setImageUrls(prev => ({ ...prev, [participantId]: url }));
      alert("Imagen subida exitosamente");
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir la imagen");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "votation", "current");
      const updates: Record<string, string | number | boolean> = {
        mostrarResultados: showResults,
      };

      for (const id of PARTICIPANT_IDS) {
        updates[`${id}.name`] = participants[id]?.name || "";
        updates[`${id}.description`] = participants[id]?.description || "";
        if (!updates[`${id}.votes`]) {
          updates[`${id}.votes`] = 0;
        }
      }

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, updates as { [x: string]: string | number | boolean });
      } else {
        await setDoc(docRef, updates);
      }

      alert("Datos guardados exitosamente");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error al guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScores = async () => {
    setSavingScores(true);
    try {
      for (const teamId of TEAM_IDS) {
        const teamRef = doc(db, "teams", teamId);
        await updateDoc(teamRef, {
          score: teamScores[teamId] || 0,
        });
      }
      alert("Puntajes guardados exitosamente");
    } catch (error) {
      console.error("Error saving scores:", error);
      alert("Error al guardar los puntajes");
    } finally {
      setSavingScores(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminAuth");
    setPassword("");
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen text-white px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo>
              <h1>FSN</h1>
            </Logo>
            <h2 className="text-3xl font-bold mt-6 uppercase [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">
              Admin
            </h2>
          </div>

          <form onSubmit={handleLogin} className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl">
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-semibold mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40"
                placeholder="Ingresá la contraseña"
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl font-bold transition-all duration-300"
            >
              Ingresar
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white px-6 py-8 mb-24">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <header className="text-center space-y-3">
          <Logo>
            <h1>FSN</h1>
          </Logo>
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-bold mt-6 uppercase [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">
              Administración de Outfits
            </h2>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-600/80 hover:bg-red-600 rounded-xl font-semibold transition-all duration-300"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <input
              type="checkbox"
              id="showResults"
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-black/60"
            />
            <label htmlFor="showResults" className="font-semibold">
              Mostrar resultados públicamente
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PARTICIPANT_IDS.map((id, index) => (
            <div
              key={id}
              className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl"
            >
              <h3 className="text-xl font-bold mb-4 uppercase">
                Participante #{index + 1}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={participants[id]?.name || ""}
                  onChange={(e) =>
                    setParticipants(prev => ({
                      ...prev,
                      [id]: { ...prev[id], name: e.target.value }
                    }))
                  }
                  className="w-full px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40"
                  placeholder="Nombre del participante"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Descripción
                </label>
                <textarea
                  value={participants[id]?.description || ""}
                  onChange={(e) =>
                    setParticipants(prev => ({
                      ...prev,
                      [id]: { ...prev[id], description: e.target.value }
                    }))
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40 resize-none"
                  placeholder="Descripción del outfit"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Foto
                </label>
                {imageUrls[id] && (
                  <div className="relative w-full aspect-square mb-4 rounded-xl overflow-hidden border border-white/20">
                    <Image
                      src={imageUrls[id]}
                      alt={participants[id]?.name || `Participante ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(id, file);
                  }}
                  disabled={uploading === id}
                  className="w-full px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer disabled:opacity-50"
                />
                {uploading === id && (
                  <p className="text-sm text-yellow-500 mt-2">Subiendo imagen...</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-green-600/80 hover:bg-green-600 border border-green-400/30 rounded-xl font-bold text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        <div className="mt-12 bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          <h3 className="text-2xl font-bold mb-6 uppercase">Puntajes de Equipos</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEAM_IDS.map((teamId) => (
              <div key={teamId} className="bg-black/60 border border-white/20 rounded-xl p-4">
                <label className="block text-sm font-semibold mb-2 capitalize" style={{ color: TEAM_COLORS[teamId] }}>
                  Equipo {teamId}
                </label>
                <input
                  type="number"
                  value={teamScores[teamId] || 0}
                  onChange={(e) => setTeamScores(prev => ({ ...prev, [teamId]: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 bg-black/60 border border-white/20 rounded-xl text-white text-2xl font-bold text-center focus:outline-none focus:border-white/40"
                  min="0"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveScores}
            disabled={savingScores}
            className="mt-6 px-8 py-4 bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 rounded-xl font-bold text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingScores ? "Guardando..." : "Guardar puntajes"}
          </button>
        </div>
      </div>
    </main>
  );
}
