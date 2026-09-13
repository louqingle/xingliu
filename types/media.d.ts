// WebRTC torch is supported by some browsers/devices but is not included
// in every version of TypeScript's DOM lib. Extend the browser type so
// MediaTrackConstraints can safely express the torch capability.
declare global {
  interface MediaTrackConstraintSet {
    torch?: boolean;
  }
}

export {};
