"use client";

import Image from "next/image";
import React, { useMemo, useState, useEffect } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { onSnapshot } from "firebase/firestore";
import { storage } from "../../../utils/firebase";
import { CURRENT_FSN_DOCUMENT, isValidFsnId } from "../../../utils/current-fsn";
import {
  confirmTeamCheckIn,
  isTeamAssignmentExpired,
  releaseTeamReservation,
  reserveBalancedTeam,
  type TeamAssignment,
} from "../../../utils/team-assignment";
import { useRouter } from "next/navigation";
import { Logo } from "../../styled";

const teamColors = {
  Rojo: "#ef4444",
  Verde: "#22c55e",
  Azul: "#3b82f6",
  Amarillo: "#facc15",
};

// Cambia esto a false para deshabilitar la validación de check-in duplicado
const ENABLE_CHECK_IN_VALIDATION = true;
const CHECKED_IN_EVENT_STORAGE_KEY = "fsnCheckedInEventId";
const PENDING_ASSIGNMENT_STORAGE_KEY = "fsnPendingTeamAssignment";

function getTeamLabel(teamId: TeamAssignment["teamId"]): string {
  return teamId.charAt(0).toUpperCase() + teamId.slice(1);
}

const CheckIn = () => {
  const router = useRouter();
  const teams = useMemo(() => Object.keys(teamColors), []);
  const [playerName, setPlayerName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [assignment, setAssignment] = useState<TeamAssignment | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    let previousEventId: string | null = null;
    const unsubscribe = onSnapshot(
      CURRENT_FSN_DOCUMENT,
      (snapshot) => {
        const eventId = snapshot.data()?.eventId;
        if (!snapshot.exists() || !isValidFsnId(eventId)) {
          setActiveEventId(null);
          setEventError("No se encontró un ID de evento válido en settings/currentFSN.");
          return;
        }

        setActiveEventId(eventId);
        setEventError(null);
        if (previousEventId === eventId) return;

        let storedAssignment = sessionStorage.getItem(PENDING_ASSIGNMENT_STORAGE_KEY);
        if (previousEventId && previousEventId !== eventId) {
          setAssignment(null);
          setSelectedTeam(null);
          setHasSpun(false);
          setRotation(0);
          if (storedAssignment) {
            try {
              void releaseTeamReservation(JSON.parse(storedAssignment) as TeamAssignment).catch(console.error);
            } catch {
              // Ignore malformed data left in this tab's session storage.
            }
          }
          sessionStorage.removeItem(PENDING_ASSIGNMENT_STORAGE_KEY);
          storedAssignment = null;
        }
        previousEventId = eventId;

        sessionStorage.removeItem("hasCheckedIn");
        if (ENABLE_CHECK_IN_VALIDATION && sessionStorage.getItem(CHECKED_IN_EVENT_STORAGE_KEY) === eventId) {
          router.replace("/teams");
          return;
        }

        if (!storedAssignment) return;
        try {
          const pendingAssignment = JSON.parse(storedAssignment) as TeamAssignment;
          if (pendingAssignment.eventId !== eventId || isTeamAssignmentExpired(pendingAssignment)) {
            sessionStorage.removeItem(PENDING_ASSIGNMENT_STORAGE_KEY);
            void releaseTeamReservation(pendingAssignment).catch(console.error);
            return;
          }

          setAssignment(pendingAssignment);
          setSelectedTeam(getTeamLabel(pendingAssignment.teamId));
          setHasSpun(true);
        } catch {
          sessionStorage.removeItem(PENDING_ASSIGNMENT_STORAGE_KEY);
        }
      },
      (error) => {
        console.error("Error al leer la FSN activa:", error);
        setActiveEventId(null);
        setEventError("No pudimos leer la FSN activa desde Firebase. Revisá la conexión e intentá de nuevo.");
      },
    );

    return unsubscribe;
  }, [router]);

  const canRegister = !!activeEventId && !!playerName.trim() && !!selectedTeam && !!photoFile && !isRedirecting && !isSubmitting;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    try {
      // Optimize image before storing
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

      // Convert blob to File
      const optimizedFile = new File([blob], file.name, { type: 'image/jpeg' });

      // Create preview
      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreview(previewUrl);
      setPhotoFile(optimizedFile);
    } catch (error) {
      console.error("Error optimizing image:", error);
      // Fallback to original file if optimization fails
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setPhotoPreview(result);
        }
      };
      reader.readAsDataURL(file);
      setPhotoFile(file);
    }
  };

  const handleSpin = async () => {
    if (!activeEventId || isSpinning || hasSpun) return;

    setIsSpinning(true);
    try {
      const reservedAssignment = await reserveBalancedTeam(activeEventId);
      const selectedEligibleTeam = getTeamLabel(reservedAssignment.teamId);
      const randomIndex = teams.indexOf(selectedEligibleTeam);
      const segmentAngle = 360 / teams.length;
      const targetRotation = 5 * 360 - (randomIndex * segmentAngle + segmentAngle / 2);

      setAssignment(reservedAssignment);
      sessionStorage.setItem(PENDING_ASSIGNMENT_STORAGE_KEY, JSON.stringify(reservedAssignment));
      setHasSpun(true);
      setRotation(targetRotation);
      window.setTimeout(() => {
        setSelectedTeam(selectedEligibleTeam);
        setIsSpinning(false);
      }, 3500);
    } catch (error) {
      console.error("Error al asignar equipo:", error);
      alert(error instanceof Error ? error.message : "No pudimos asignar un equipo. Reintentá.");
      setIsSpinning(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canRegister || !assignment || !activeEventId) return;
    if (assignment.eventId !== activeEventId) {
      await releaseTeamReservation(assignment);
      sessionStorage.removeItem(PENDING_ASSIGNMENT_STORAGE_KEY);
      setAssignment(null);
      setSelectedTeam(null);
      setHasSpun(false);
      setStatusMessage("La FSN activa cambió. Girá la ruleta de nuevo.");
      return;
    }
    if (isTeamAssignmentExpired(assignment)) {
      await releaseTeamReservation(assignment);
      sessionStorage.removeItem(PENDING_ASSIGNMENT_STORAGE_KEY);
      setAssignment(null);
      setSelectedTeam(null);
      setHasSpun(false);
      setStatusMessage("La reserva venció. Girá la ruleta de nuevo.");
      return;
    }
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const safeName = playerName.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "jugador";
      let photoUrl: string | null = null;

      if (photoFile) {
        const storageRef = ref(storage, `checkins/${assignment.teamId}/${Date.now()}_${safeName}.jpg`);
        const uploadResult = await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(uploadResult.ref);
      }

      await confirmTeamCheckIn(assignment, {
        name: playerName.trim(),
        photo: photoUrl,
        createdAt: new Date().toISOString(),
      });
      setAssignment(null);
      sessionStorage.removeItem(PENDING_ASSIGNMENT_STORAGE_KEY);

      if (ENABLE_CHECK_IN_VALIDATION) {
        sessionStorage.setItem(CHECKED_IN_EVENT_STORAGE_KEY, activeEventId);
      }
      setIsRedirecting(true);

      setTimeout(() => {
        router.push("/teams");
      }, 2500);
    } catch (error) {
      console.error("Error al registrar check-in", error);
      setStatusMessage("No pudimos registrar tu check-in. Reintentá en un rato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-24 w-24 border-8 border-transparent border-t-white mb-8"></div>
        <h2 className="text-4xl font-bold text-white text-center [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)] mb-2">
          ¿Estás listo?
        </h2>
        <p className="text-5xl font-bold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">
          ¡A jugar! 💪
        </p>
      </div>
    );
  }

  return (
    <section className="mt-0 w-full max-w-4xl mx-auto bg-white/5 border border-white/30 rounded-3xl p-8 shadow-2xl text-white text-xl transform-gpu">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-4xl font-bold tracking-tight [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">Check-in</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className="block text-m font-semibold text-gray-300 mb-2 [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">👉 Tu nombre</label>
          <input
            type="text"
            placeholder=""
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            className="w-full rounded-2xl bg-white/10 border border-white/30 px-4 py-3 text-white text-2xl font-bold [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)] focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="block text-m font-semibold text-gray-300 [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">👉 Equipo</label>
            <button
              type="button"
              onClick={handleSpin}
              disabled={!activeEventId || isSpinning || hasSpun}
              className={`text-m rounded-full px-4 py-2 font-bold transition-all ${!activeEventId || isSpinning || hasSpun ? "bg-gray-500/60 text-white" : "bg-[#f3b0da] text-white hover:bg-[#f3b0da]/80"}`}
            >
              {isSpinning ? "Girando..." : hasSpun ? "Ya giraste" : activeEventId ? "Girar rueda" : "Cargando evento..."}
            </button>
          </div>

          <div className="relative flex items-center justify-center w-full aspect-square max-w-md mx-auto">
            <div
              className="w-full h-full rounded-full border-4 border-white/40 shadow-xl will-change-transform"
              style={{
                backgroundImage:
                  "conic-gradient(#ef4444 0deg 90deg, #22c55e 90deg 180deg, #3b82f6 180deg 270deg, #facc15 270deg 360deg)",
                transform: `rotate(${rotation}deg) translateZ(0)`,
                transition: "transform 3.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
            />
            <div className="pointer-events-none absolute top-[-12px] w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-white drop-shadow-lg z-10" style={{ filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 1))' }} />
            <div className="absolute flex items-center justify-center [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">
              <Logo size="small" color="white">
                <h1>FSN</h1>
              </Logo>
            </div>
          </div>

          {selectedTeam && (
            <div
              className="text-center text-3xl text-white font-bold mt-2 py-4 px-6 rounded-2xl min-h-[3rem]"
              style={{ backgroundColor: `${teamColors[selectedTeam as keyof typeof teamColors]}CC` }}
            >
              Tu equipo: {selectedTeam}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="block text-m font-semibold text-gray-300 [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">👉 Tu foto</label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="photo-upload"
            className="cursor-pointer rounded-2xl bg-white/10 border-2 border-white/30 px-6 py-4 text-center text-white hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-2xl">📸</span>
            <span className="font-semibold [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">
              {photoFile ? photoFile.name : "Seleccionar foto"}
            </span>
          </label>
          {photoPreview && (
            <div className="mt-4 flex flex-col items-center">
              <p className="text-m font-semibold text-gray-300 mb-2 [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">Vista previa</p>
              <div className="w-[9rem] h-[12rem] rounded-3xl border border-white/30 bg-black/60 shadow-xl overflow-hidden relative">
                <Image
                  src={photoPreview}
                  alt="Foto de check-in"
                  fill
                  sizes="144px"
                  className="object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canRegister || isSubmitting}
          className={`rounded-2xl px-6 py-4 font-bold text-2xl transition ${
            canRegister && !isSubmitting
              ? `text-white hover:opacity-90 shadow-lg ${
                  selectedTeam === "Rojo"
                    ? "bg-[#ef4444]"
                    : selectedTeam === "Verde"
                    ? "bg-[#22c55e]"
                    : selectedTeam === "Azul"
                    ? "bg-[#3b82f6]"
                    : selectedTeam === "Amarillo"
                    ? "bg-[#facc15]"
                    : "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"
                }`
              : "bg-gray-700/40 text-gray-500 cursor-not-allowed"
          }`}
          style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' }}
        >
          {isSubmitting ? "Registrando..." : "Registrarse"}
        </button>

        {statusMessage && <p className="text-center text-m text-gray-200/80 [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">{statusMessage}</p>}
        {eventError && <p role="alert" className="text-center text-m text-red-200 [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">{eventError}</p>}
      </form>
    </section>
  );
};

export default CheckIn;
