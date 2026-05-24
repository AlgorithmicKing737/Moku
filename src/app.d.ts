declare global {
  namespace App {}
  const __APP_VERSION__: string
}

declare module '@capacitor/filesystem' {
  export const Filesystem: {
    readFile(options: { path: string; directory?: string }): Promise<{ data: string | Blob }>;
    writeFile(options: { path: string; data: string | Blob; directory?: string }): Promise<void>;
  };
  export const Directory: {
    Data: string;
  };
}

declare module '@capacitor/app' {
  export const App: {
    getInfo(): Promise<{ version: string }>;
  };
}

declare module '@capacitor/browser' {
  export const Browser: {
    open(options: { url: string }): Promise<void>;
  };
}

declare module 'capacitor-native-biometric' {
  export const NativeBiometric: {
    verifyIdentity(options: { reason?: string; title?: string }): Promise<void>;
    setCredentials(options: { username: string; password: string; server: string }): Promise<void>;
    getCredentials(options: { server: string }): Promise<{ username: string; password: string }>;
  };
}

declare module '@tauri-apps/plugin-dialog' {
  export function open(options?: { directory?: boolean; multiple?: boolean }): Promise<string | string[] | null>;
}

declare module '@tauri-apps/plugin-fs' {
  export function readFile(path: string): Promise<Uint8Array>;
  export function writeFile(path: string, data: Uint8Array): Promise<void>;
}

declare module '@tauri-apps/plugin-updater' {
  export function check(): Promise<{ available: boolean; version: string; body?: string; downloadAndInstall(): Promise<void> } | null>;
}

declare module '@tauri-apps/plugin-process' {
  export function relaunch(): Promise<void>;
}

export {}