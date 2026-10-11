import { defineStore } from "pinia";
import { ref } from "vue";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "../lib/firebase";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

// NOTE: intentionally NOT persisted. Firebase keeps its own session in
// IndexedDB; `ready` below tells the router guard when the restored
// session has been resolved, avoiding stale logged-in flashes.
export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const error = ref<string | null>(null);

  function toAuthUser(u: User): AuthUser {
    return {
      uid: u.uid,
      email: u.email ?? "",
      displayName: u.displayName ?? "",
    };
  }

  function friendlyError(code: string): string {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Try logging in instead.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }

  function init() {
    // Auth is optional: if Firebase web config is absent (e.g. env not
    // set yet), stay logged-out instead of crashing app startup.
    try {
      onAuthStateChanged(getFirebaseAuth(), (u) => {
        user.value = u ? toAuthUser(u) : null;
        ready.value = true;
      });
    } catch (e) {
      console.warn("Auth disabled:", (e as Error).message);
      ready.value = true;
    }
  }

  async function getIdToken(): Promise<string | null> {
    const current = getFirebaseAuth().currentUser;
    return current ? current.getIdToken() : null;
  }

  // Best-effort: record the user in Firestore. Never blocks login.
  async function syncUser(u: User): Promise<void> {
    try {
      const token = await u.getIdToken();
      await fetch(`${import.meta.env.VITE_API_URL}/auth/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn("User sync failed:", e);
    }
  }

  async function register(
    name: string,
    email: string,
    password: string
  ): Promise<boolean> {
    busy.value = true;
    error.value = null;
    try {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      user.value = toAuthUser({ ...cred.user, displayName: name.trim() || cred.user.displayName } as User);
      await syncUser(cred.user);
      return true;
    } catch (e: unknown) {
      error.value = friendlyError((e as { code?: string }).code ?? "");
      return false;
    } finally {
      busy.value = false;
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    busy.value = true;
    error.value = null;
    try {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      user.value = toAuthUser(cred.user);
      await syncUser(cred.user);
      return true;
    } catch (e: unknown) {
      error.value = friendlyError((e as { code?: string }).code ?? "");
      return false;
    } finally {
      busy.value = false;
    }
  }

  async function loginWithGoogle(): Promise<boolean> {
    busy.value = true;
    error.value = null;
    try {
      const cred = await signInWithPopup(
        getFirebaseAuth(),
        new GoogleAuthProvider()
      );
      user.value = toAuthUser(cred.user);
      await syncUser(cred.user);
      return true;
    } catch (e: unknown) {
      error.value = friendlyError((e as { code?: string }).code ?? "");
      return false;
    } finally {
      busy.value = false;
    }
  }

  async function logout(): Promise<void> {
    await signOut(getFirebaseAuth());
    user.value = null;
  }

  return {
    user,
    ready,
    busy,
    error,
    init,
    getIdToken,
    register,
    login,
    loginWithGoogle,
    logout,
  };
});
