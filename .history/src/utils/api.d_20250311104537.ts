declare module "@/utils/api" {
  export declare function refreshToken(): Promise<string | null>;

  export function getRefreshTokenFromDB(): Promise<string | null>;
  export function isJwtExpired(token: string): boolean;
  export function getUserRole(): string | null;
  export function syncRefreshToken(): Promise<void>;
  export function preventIndexedDBCleanup(): Promise<void>;
  export function fixRefreshTokenStorage(): Promise<void>;
  export function getRefreshTokenExpirationFromDB(): Promise<string | null>;
}


export {}; // ✅ Indique que ce fichier est un module TypeScript
