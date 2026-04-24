import type { AudioState } from './audio/state'

// In a global.d.ts or a specific declaration file
declare global {
  interface Window {
    debug: string;
    audioState: AudioState;
    // Dev tool: swap the leader ship's mesh for one of the extras meshes
    // by key (e.g. window.setMesh('quakeWall')). Pass null to restore.
    setMesh: (key: string | null) => void;
  }
}

// This ensures the type definition is global and available in all files
export { };
