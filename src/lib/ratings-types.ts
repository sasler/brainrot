export interface RatingsStorageState {
  available: boolean;
  writable: boolean;
  reason: string | null;
  missingEnvVars: string[];
}
