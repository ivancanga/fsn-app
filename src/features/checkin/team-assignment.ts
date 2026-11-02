import { doc, runTransaction } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { CURRENT_FSN_DOCUMENT } from "./current-fsn";

const TEAM_IDS = ["rojo", "verde", "azul", "amarillo"] as const;
const MAX_PLAYERS_PER_TEAM = 8;
const MAX_DIFFERENCE = 3;
export const RESERVATION_TTL_MS = 10 * 60 * 1000;

export type TeamId = (typeof TEAM_IDS)[number];

type TeamReservation = {
  id: string;
  eventId: string;
  createdAt: number;
};

export type CheckInPlayer = {
  name: string;
  photo: string | null;
  createdAt: string;
};

type TeamData = {
  players?: CheckInPlayer[];
  pendingAssignments?: TeamReservation[];
};

export type TeamAssignment = {
  eventId: string;
  expiresAt: number;
  reservationId: string;
  teamId: TeamId;
};

export async function reserveBalancedTeam(eventId: string): Promise<TeamAssignment> {
  const reservationId = createReservationId();
  const now = Date.now();

  return runTransaction(db, async (transaction) => {
    const references = TEAM_IDS.map((teamId) => ({ teamId, reference: doc(db, "teams", teamId) }));
    const [eventSnapshot, ...snapshots] = await Promise.all([
      transaction.get(CURRENT_FSN_DOCUMENT),
      ...references.map(({ reference }) => transaction.get(reference)),
    ]);
    if (!eventSnapshot.exists() || eventSnapshot.data().eventId !== eventId) {
      throw new Error("La FSN activa cambió. Recargá la pantalla e intentá de nuevo.");
    }

    const teams = references.map(({ teamId, reference }, index) => {
      const data = snapshots[index].exists() ? (snapshots[index].data() as TeamData) : {};
      const reservations = (data.pendingAssignments ?? []).filter(
        (reservation) => reservation.eventId === eventId && now - reservation.createdAt < RESERVATION_TTL_MS,
      );
      return {
        teamId,
        reference,
        players: data.players ?? [],
        reservations,
      };
    });

    const counts = Object.fromEntries(
      teams.map(({ teamId, players, reservations }) => [teamId, players.length + reservations.length]),
    ) as Record<TeamId, number>;
    const eligibleTeams = getEligibleTeams(counts);

    if (eligibleTeams.length === 0) {
      throw new Error("Todos los equipos están llenos.");
    }

    const teamId = eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)];
    for (const team of teams) {
      const updatedReservations = team.teamId === teamId
        ? [...team.reservations, { id: reservationId, eventId, createdAt: now }]
        : team.reservations;

      if (updatedReservations.length !== (snapshots[TEAM_IDS.indexOf(team.teamId)].data() as TeamData | undefined)?.pendingAssignments?.length || team.teamId === teamId) {
        transaction.set(team.reference, { pendingAssignments: updatedReservations }, { merge: true });
      }
    }

    return { reservationId, teamId, eventId, expiresAt: now + RESERVATION_TTL_MS };
  });
}

function createReservationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function isTeamAssignmentExpired(assignment: TeamAssignment): boolean {
  return Date.now() >= assignment.expiresAt;
}

export async function confirmTeamCheckIn(assignment: TeamAssignment, player: CheckInPlayer): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const reference = doc(db, "teams", assignment.teamId);
    const [eventSnapshot, snapshot] = await Promise.all([
      transaction.get(CURRENT_FSN_DOCUMENT),
      transaction.get(reference),
    ]);
    if (!eventSnapshot.exists() || eventSnapshot.data().eventId !== assignment.eventId) {
      throw new Error("Esta reserva pertenece a otra FSN. Volvé a girar la ruleta.");
    }

    const data = snapshot.exists() ? (snapshot.data() as TeamData) : {};
    const reservations = (data.pendingAssignments ?? []).filter(
      (reservation) => reservation.id !== assignment.reservationId,
    );

    transaction.set(
      reference,
      {
        players: [...(data.players ?? []), player],
        pendingAssignments: reservations,
      },
      { merge: true },
    );
  });
}

export async function releaseTeamReservation(assignment: TeamAssignment): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const reference = doc(db, "teams", assignment.teamId);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) return;

    const data = snapshot.data() as TeamData;
    transaction.update(reference, {
      pendingAssignments: (data.pendingAssignments ?? []).filter(
        (reservation) => reservation.id !== assignment.reservationId,
      ),
    });
  });
}

function getEligibleTeams(counts: Record<TeamId, number>): TeamId[] {
  const values = Object.values(counts);
  const minCount = Math.min(...values);
  const maxCount = Math.max(...values);

  if (minCount >= MAX_PLAYERS_PER_TEAM) return [];
  if (maxCount - minCount < MAX_DIFFERENCE) {
    return TEAM_IDS.filter((teamId) => counts[teamId] < MAX_PLAYERS_PER_TEAM);
  }

  const threshold = minCount + MAX_DIFFERENCE - 1;
  return TEAM_IDS.filter(
    (teamId) => counts[teamId] <= threshold && counts[teamId] < MAX_PLAYERS_PER_TEAM,
  );
}
