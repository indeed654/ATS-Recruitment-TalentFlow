export { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";

export const startGoogleLogin = () => {
  window.location.href = "/api/auth/google";
};
