import { createAuthStore } from "./auth-store-core";
import type { AuthUser } from "./types";

// "tlm.*" is already in users' browsers — changing the prefix would sign everyone out.
const store = createAuthStore<AuthUser>("tlm");

export const subscribeSession = store.subscribeSession;
export const getToken = store.getToken;
export const getUserSnapshot = store.getUserSnapshot;
export const getServerUserSnapshot = store.getServerUserSnapshot;
export const setSession = store.setSession;
export const clearSession = store.clearSession;

/** Named for this app's existing call sites; `store.getUser` is the same read. */
export const getStoredUser = store.getUser;
