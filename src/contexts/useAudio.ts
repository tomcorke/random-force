import { useContext } from "react";
import AudioContext from "./AudioContext";

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
};

export default useAudio;
