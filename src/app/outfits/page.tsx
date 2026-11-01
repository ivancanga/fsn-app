"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../utils/firebase";
import { Logo } from "../styled";

const STORAGE_KEY = "fsnVoteParticipant";

const PARTICIPANT_IDS = [
  "participante1",
  "participante2",
  "participante3",
  "participante4",
] as const;

type ParticipantId = (typeof PARTICIPANT_IDS)[number];
type ParticipantNode = {
  name?: string;
  description?: string;
  votes?: number;
};
type VoteDoc = {
  mostrarResultados?: boolean;
} & Partial<Record<ParticipantId, ParticipantNode>>;

type SyncState = "connecting" | "ready" | "syncing";

export default function OutfitsPage() {
  const [syncState, setSyncState] = useState<SyncState>("connecting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const voteDocRef = useMemo(() => doc(db, "votation", "current"), []);
  const [showResults, setShowResults] = useState(false);
  const [votesMap, setVotesMap] = useState<Record<string, number>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [descMap, setDescMap] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedVote = window.localStorage.getItem(STORAGE_KEY);
    if (storedVote) {
      const timer = window.setTimeout(() => {
        setSelectedId(storedVote);
        setHasVoted(true);
        setSyncState("ready");
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setSyncState("ready");
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadImages = async () => {
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
    };
    loadImages();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(voteDocRef, (snapshot) => {
      const data = snapshot.data() as VoteDoc | undefined;

      if (data) {
        setShowResults(Boolean(data?.mostrarResultados));

        let total = 0;
        const vMap: Record<string, number> = {};
        const nMap: Record<string, string> = {};
        const dMap: Record<string, string> = {};
        for (const id of PARTICIPANT_IDS) {
          const node = data?.[id];
          const name = typeof node?.name === "string" && node.name.trim() !== "" ? node.name : id;
          const votes = typeof node?.votes === "number" ? node.votes : 0;
          const desc = typeof node?.description === "string" ? node.description : "";
          nMap[id] = name;
          vMap[id] = votes;
          dMap[id] = desc;
          total += votes;
        }
        setNameMap(nMap);
        setDescMap(dMap);
        setVotesMap(vMap);
        setTotalVotes(total);
      } else {
        setTotalVotes(0);
        setVotesMap({});
        setNameMap({});
        setDescMap({});
        setShowResults(false);
      }
    });

    return () => unsubscribe();
  }, [voteDocRef]);

  const statusMessage = useMemo(() => {
    if (syncState === "connecting") return "Conectando...";
    if (syncState === "syncing") return "Sincronizando voto...";
    if (hasVoted) return "Voto registrado. Podés cambiarlo cuando quieras.";
    return "Listo para votar";
  }, [syncState, hasVoted]);

  const handleVote = async (optionId: string) => {
    if (syncState === "syncing") return;

    const previousId = selectedId;
    if (previousId === optionId) return;

    setSelectedId(optionId);
    setSyncState("syncing");

    try {
      await runTransaction(db, async (trx) => {
        const snap = await trx.get(voteDocRef);
        const data = (snap.exists() ? (snap.data() as VoteDoc) : undefined);

        const getVotes = (id: string) => {
          const node = data?.[id as ParticipantId];
          const val = node && typeof node.votes === "number" ? node.votes : 0;
          return Math.max(0, val);
        };

        const updates: Record<string, number | string> = {};

        const ensureName = (id: string) => {
          const currentName = data?.[id as ParticipantId]?.name;
          if (typeof currentName !== "string" || currentName.trim() === "") {
            updates[`${id}.name`] = nameMap[id] ?? id;
          }
        };

        const nextCount = getVotes(optionId) + 1;
        updates[`${optionId}.votes`] = nextCount;
        ensureName(optionId);

        if (previousId) {
          const prevCount = getVotes(previousId);
          const newPrev = prevCount > 0 ? prevCount - 1 : 0;
          updates[`${previousId}.votes`] = newPrev;
          ensureName(previousId);
        }

        if (snap.exists()) {
          trx.update(voteDocRef, updates);
        } else {
          trx.set(voteDocRef, updates, { merge: true });
        }
      });
      window.localStorage.setItem(STORAGE_KEY, optionId);
      setHasVoted(true);
      setSyncState("ready");
    } catch (error) {
      console.error("Error al registrar el voto:", error);
      alert("No se pudo registrar tu voto. Intenta de nuevo.");
      if (previousId) {
        setSelectedId(previousId);
        window.localStorage.setItem(STORAGE_KEY, previousId);
      } else {
        setSelectedId(null);
        window.localStorage.removeItem(STORAGE_KEY);
        setHasVoted(false);
      }
      setSyncState("ready");
    }
  };

  return (
    <main className="min-h-screen text-white px-6 py-8 mb-24">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <header className="text-center space-y-3">
          <Logo>
            <h1>FSN</h1>
          </Logo>
          <h2 className="text-4xl font-bold mt-6 uppercase [text-shadow:2px_2px_8px_rgba(0,0,0,0.9)]">
            Votación de Outfit
          </h2>
          <p className="text-xl text-white font-semibold max-w-2xl mx-auto [text-shadow:1px_1px_4px_rgba(0,0,0,0.8)]">
            Votos totales: {totalVotes}
          </p>
        </header>

        <div className={`flex items-center justify-center gap-2 p-4 rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm ${
          syncState === "connecting" ? "border-yellow-500/30" :
          syncState === "syncing" ? "border-blue-500/30" :
          "border-green-500/30"
        }`}>
          <span className={`inline-block w-2 h-2 rounded-full ${
            syncState === "connecting" ? "bg-yellow-500 animate-pulse" :
            syncState === "syncing" ? "bg-blue-500 animate-pulse" :
            "bg-green-500"
          }`} aria-hidden />
          <span className="text-xl font-semibold">{statusMessage}</span>
        </div>

        <p className="text-center text-2xl font-semibold text-white max-w-3xl mx-auto [text-shadow:1px_1px_4px_rgba(0,0,0,0.8)]">
          Votá por tu outfit favorito. Podés cambiar tu voto en cualquier momento. El ganador suma 15 puntos para su equipo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(showResults
            ? [...PARTICIPANT_IDS].sort(
                (a, b) => (votesMap[b as string] ?? 0) - (votesMap[a as string] ?? 0)
              )
            : PARTICIPANT_IDS
          ).map((id: ParticipantId) => {
            const isSelected = id === selectedId;
            const count = Math.max(0, Number(votesMap[id] ?? 0));
            const name = nameMap[id] ?? id;
            const desc = descMap[id] ?? "";
            const imageUrl = imageUrls[id];
            const index = PARTICIPANT_IDS.indexOf(id);
            const badge = `#${index >= 0 ? index + 1 : ""}`;
            return (
              <button
                key={id}
                type="button"
                className={`flex flex-col rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? "border-white/60 bg-white/10 shadow-2xl"
                    : "border-white/20 bg-black/40 hover:border-white/40 hover:bg-black/60"
                } ${syncState === "syncing" ? "opacity-50 cursor-wait" : "cursor-pointer"} backdrop-blur-sm`}
                onClick={() => handleVote(id)}
                disabled={syncState === "syncing"}
              >
                {imageUrl && (
                  <div className="relative w-full aspect-square">
                    <Image
                      src={imageUrl}
                      alt={name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4 flex flex-col gap-2 relative">
                  {isSelected && <div className="absolute top-2 right-2 text-2xl">✅</div>}
                  <div className="flex items-center justify-center">
                    <span className="inline-block px-3 py-1 text-sm font-bold uppercase tracking-wider text-black bg-[#FFE478] rounded-full border border-[#FFE478]/50">Participante {badge}</span>
                  </div>
                  <h3 className="text-xl font-bold uppercase [text-shadow:1px_1px_4px_rgba(0,0,0,0.8)]">{name}</h3>
                  {desc && <p className="text-sm text-white/80 [text-shadow:1px_1px_2px_rgba(0,0,0,0.8)]">{desc}</p>}
                  {showResults && (
                    <div className="text-lg font-bold text-white mt-2 pt-2 border-t border-white/20">
                      {count} {count === 1 ? "voto" : "votos"}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
