import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../../utils/firebase";
import { confirmTeamCheckIn, type CheckInPlayer, type TeamAssignment } from "./team-assignment";

export async function registerCheckIn(
  assignment: TeamAssignment,
  name: string,
  photo: File | null,
): Promise<void> {
  const normalizedName = name.trim();
  const safeName = normalizedName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "jugador";
  let photoUrl: string | null = null;

  if (photo) {
    const storageRef = ref(storage, `checkins/${assignment.teamId}/${Date.now()}_${safeName}.jpg`);
    const uploadResult = await uploadBytes(storageRef, photo);
    photoUrl = await getDownloadURL(uploadResult.ref);
  }

  const player: CheckInPlayer = {
    name: normalizedName,
    photo: photoUrl,
    createdAt: new Date().toISOString(),
  };
  await confirmTeamCheckIn(assignment, player);
}
