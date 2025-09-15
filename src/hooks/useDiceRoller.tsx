import { useRef } from "react";

import DiceRoller from "../components/DiceRoller";
import type { DiceRollerHandle, FaceSpec } from "../components/DiceRoller";

export function useDiceRoller() {
  const diceRef = useRef<DiceRollerHandle | null>(null);

  const rollDice = (faces: FaceSpec[] | null | undefined) => {
    return (
      diceRef.current?.roll(faces) ?? Promise.reject("DiceRoller not mounted")
    );
  };

  function DiceRollerComponent() {
    return <DiceRoller ref={diceRef} />;
  }

  return { rollDice, DiceRollerComponent };
}

export default useDiceRoller;
