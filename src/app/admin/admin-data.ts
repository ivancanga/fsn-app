import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../utils/firebase";
import {
  createEmptyOutfitParticipants,
  EMPTY_TEAM_SCORES,
  OUTFIT_PARTICIPANT_IDS,
  TEAM_IDS,
  type OutfitParticipantId,
  type OutfitParticipants,
  type TeamScores,
} from "./admin.types";

type OutfitDocument = {
  mostrarResultados?: boolean;
} & Partial<Record<OutfitParticipantId, { name?: string; description?: string; votes?: number }>>;

const outfitDocument = () => doc(db, "votation", "current");

export async function loadOutfitSettings(): Promise<{ participants: OutfitParticipants; showResults: boolean }> {
  const snapshot = await getDoc(outfitDocument());
  const participants = createEmptyOutfitParticipants();
  if (!snapshot.exists()) return { participants, showResults: false };

  const data = snapshot.data() as OutfitDocument;
  for (const id of OUTFIT_PARTICIPANT_IDS) {
    participants[id] = {
      name: data[id]?.name ?? "",
      description: data[id]?.description ?? "",
    };
  }
  return { participants, showResults: Boolean(data.mostrarResultados) };
}

export async function saveOutfitSettings(participants: OutfitParticipants, showResults: boolean): Promise<void> {
  const document = outfitDocument();
  const snapshot = await getDoc(document);
  if (!snapshot.exists()) {
    await setDoc(document, {
      mostrarResultados: showResults,
      ...Object.fromEntries(OUTFIT_PARTICIPANT_IDS.map((id) => [id, { ...participants[id], votes: 0 }])),
    });
    return;
  }

  const updates: Record<string, boolean | string> = { mostrarResultados: showResults };
  for (const id of OUTFIT_PARTICIPANT_IDS) {
    updates[`${id}.name`] = participants[id].name;
    updates[`${id}.description`] = participants[id].description;
  }
  await updateDoc(document, updates);
}

export async function loadOutfitImages(): Promise<Partial<Record<OutfitParticipantId, string>>> {
  const results = await Promise.all(OUTFIT_PARTICIPANT_IDS.map(async (id) => {
    try {
      return [id, await getDownloadURL(ref(storage, `outfits/${id}.jpg`))] as const;
    } catch {
      return null;
    }
  }));
  return Object.fromEntries(results.filter((result): result is readonly [OutfitParticipantId, string] => result !== null));
}

export async function loadTeamScores(): Promise<TeamScores> {
  const entries = await Promise.all(TEAM_IDS.map(async (id) => {
    const snapshot = await getDoc(doc(db, "teams", id));
    return [id, snapshot.exists() ? Number(snapshot.data().score) || 0 : 0] as const;
  }));
  return { ...EMPTY_TEAM_SCORES, ...Object.fromEntries(entries) };
}

export async function saveTeamScores(scores: TeamScores): Promise<void> {
  await Promise.all(TEAM_IDS.map((id) => setDoc(doc(db, "teams", id), { score: scores[id] }, { merge: true })));
}

export async function uploadOutfitImage(participantId: OutfitParticipantId, image: File): Promise<string> {
  const imageRef = ref(storage, `outfits/${participantId}.jpg`);
  await uploadBytes(imageRef, await resizeImage(image));
  return getDownloadURL(imageRef);
}

async function resizeImage(image: File): Promise<Blob> {
  const source = await createImageBitmap(image);
  const scale = Math.min(1, 800 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))),
    "image/jpeg",
    0.85,
  ));
}
