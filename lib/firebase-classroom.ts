import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type RemoteCloudEntry = {
  id: string;
  word: string;
  group: string;
  seat: string;
};

type ObservationRecordPayload = {
  activity: "observation";
  group: string;
  seat: string;
  first: string;
  second: string;
};

type ReadingNotePayload = {
  activity: "reading-note";
  group: string;
  seat: string;
  note: string;
  reactions: number;
};

export type RemoteLearningRecord = (ObservationRecordPayload | ReadingNotePayload) & {
  id: string;
};

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

function services() {
  if (!firebaseReady) throw new Error("Firebase 尚未設定");
  const app = getApps().length ? getApp() : initializeApp(config);
  return { auth: getAuth(app), db: getFirestore(app) };
}

async function signedIn() {
  const { auth } = services();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

export async function createClassroom(code: string) {
  const user = await signedIn();
  const { db } = services();
  await setDoc(doc(db, "sessions", code), {
    ownerUid: user.uid,
    open: true,
    paused: false,
    createdAt: serverTimestamp(),
    maxStudents: 30,
  });
}

export function subscribeClassroom(code: string, onEntries: (entries: RemoteCloudEntry[]) => void, onError: (message: string) => void) {
  if (!firebaseReady) return () => undefined;
  let unsubscribe: () => void = () => {};
  signedIn().then(() => {
    const { db } = services();
    const responseQuery = query(collection(db, "sessions", code, "responses"), orderBy("createdAt", "asc"));
    unsubscribe = onSnapshot(responseQuery, (snapshot) => {
      onEntries(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<RemoteCloudEntry, "id">) })));
    }, (error) => onError(error.message));
  }).catch((error: Error) => onError(error.message));
  return () => unsubscribe();
}

export function subscribeLearningRecords(code: string, onEntries: (entries: RemoteLearningRecord[]) => void, onError: (message: string) => void) {
  if (!firebaseReady) return () => undefined;
  let unsubscribe: () => void = () => {};
  signedIn().then(() => {
    const { db } = services();
    const recordQuery = query(collection(db, "sessions", code, "learningRecords"), orderBy("createdAt", "asc"));
    unsubscribe = onSnapshot(recordQuery, (snapshot) => {
      onEntries(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ObservationRecordPayload | ReadingNotePayload) })));
    }, (error) => onError(error.message));
  }).catch((error: Error) => onError(error.message));
  return () => unsubscribe();
}

export async function submitClassroomWord(code: string, entry: Omit<RemoteCloudEntry, "id">) {
  const user = await signedIn();
  const { db } = services();
  await addDoc(collection(db, "sessions", code, "responses"), {
    ...entry,
    uid: user.uid,
    createdAt: serverTimestamp(),
  });
}

export async function submitLearningRecord(code: string, entry: ObservationRecordPayload | ReadingNotePayload) {
  const user = await signedIn();
  const { db } = services();
  await addDoc(collection(db, "sessions", code, "learningRecords"), {
    ...entry,
    uid: user.uid,
    createdAt: serverTimestamp(),
  });
}

export async function reactToLearningRecord(code: string, recordId: string) {
  await signedIn();
  const { db } = services();
  await updateDoc(doc(db, "sessions", code, "learningRecords", recordId), { reactions: increment(1) });
}

export async function pauseClassroom(code: string, paused: boolean) {
  await signedIn();
  const { db } = services();
  await updateDoc(doc(db, "sessions", code), { paused });
}

export async function deleteClassroom(code: string) {
  await signedIn();
  const { db } = services();
  const responses = await getDocs(collection(db, "sessions", code, "responses"));
  const records = await getDocs(collection(db, "sessions", code, "learningRecords"));
  await Promise.all([...responses.docs, ...records.docs].map((item) => deleteDoc(item.ref)));
  await deleteDoc(doc(db, "sessions", code));
}
