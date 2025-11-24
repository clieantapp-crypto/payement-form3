import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import {
  ref,
  onDisconnect,
  set,
  onValue,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { database, db } from "./firebase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const setupOnlineStatus = (userId: string) => {
  if (!userId) return;

  // Create a reference to this user's specific status node in Realtime Database
  const userStatusRef = ref(database, `/status/${userId}`);

  // Create a reference to the user's document in Firestore
  const userDocRef = doc(db, "pays", userId);

  // Set up the Realtime Database onDisconnect hook
  onDisconnect(userStatusRef)
    .set({
      state: "offline",
      lastChanged: rtdbServerTimestamp(),
    })
    .then(() => {
      // Update the Realtime Database when this client connects
      set(userStatusRef, {
        state: "online",
        lastChanged: rtdbServerTimestamp(),
      });

      // Update the Firestore document
      updateDoc(userDocRef, {
        online: true,
        lastSeen: serverTimestamp(),
      }).catch((error) =>
        console.error("Error updating Firestore document:", error)
      );
    })
    .catch((error) => console.error("Error setting onDisconnect:", error));

  // Listen for changes to the user's online status
  onValue(userStatusRef, (snapshot) => {
    const status = snapshot.val();
    if (status?.state === "offline") {
      // Update the Firestore document when user goes offline
      updateDoc(userDocRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch((error) =>
        console.error("Error updating Firestore document:", error)
      );
    }
  });
};