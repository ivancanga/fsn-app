import { doc } from "firebase/firestore";
import { db } from "../../utils/firebase";

export const CURRENT_FSN_DOCUMENT = doc(db, "settings", "currentFSN");

export function isValidFsnId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
