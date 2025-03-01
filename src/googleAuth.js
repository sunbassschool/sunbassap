import { gapi } from "gapi-script";

const CLIENT_ID = "TON_CLIENT_ID"; // Remplace par ton vrai Client ID OAuth
const SCOPES = "https://www.googleapis.com/auth/meetings.recording https://www.googleapis.com/auth/drive.file";

export const initGoogleAuth = () => {
  return new Promise((resolve, reject) => {
    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          clientId: 866430632576-3nratu5mmc884s6ftcmis4erec6p4lis.apps.googleusercontent.com,
          scope: SCOPES,
        })
        .then(() => resolve(gapi.auth2.getAuthInstance()))
        .catch((err) => reject(err));
    });
  });
};

export const signIn = async () => {
  const authInstance = await initGoogleAuth();
  return authInstance.signIn();
};

export const signOut = async () => {
  const authInstance = await initGoogleAuth();
  authInstance.signOut();
};
