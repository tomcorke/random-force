import { useRef } from "react";

import DiceRoller from "../components/DiceRoller";
import type { DiceRollerHandle } from "../components/DiceRoller";

export function useDiceRoller() {
  const diceRef = useRef<DiceRollerHandle | null>(null);

  const rollDice = () => {
    return diceRef.current?.roll() ?? Promise.reject("DiceRoller not mounted");
  };

  function DiceRollerComponent() {
    // debug: render-time indicator
    console.debug("useDiceRoller: rendering DiceRollerComponent");
    return <DiceRoller ref={diceRef} />;
  }

  return { rollDice, DiceRollerComponent };
}

export default useDiceRoller;
