import { useEffect, useRef } from "react";

const usePrevious = <T>(value: T, initialValue: T): T => {
  const ref = useRef<T>(initialValue);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const useEffectDebugger = <T extends unknown[]>(
  effectHook: () => void,
  dependencies: T,
  dependencyNames: Array<string | number> = []
): void => {
  const previousDeps = usePrevious<T>(dependencies, [] as unknown as T);

  const changedDeps = dependencies.reduce<
    Record<string, { before: unknown; after: unknown }>
  >((accum, dependency, index) => {
    if (dependency !== previousDeps[index]) {
      const keyName = dependencyNames[index] ?? index;
      return {
        ...accum,
        [String(keyName)]: {
          before: previousDeps[index],
          after: dependency,
        },
      };
    }

    return accum;
  }, {});

  if (Object.keys(changedDeps).length > 0) {
    console.log("[use-effect-debugger] ", changedDeps);
  }

  // dependencies are provided dynamically by the caller; eslint cannot verify them here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => effectHook(), dependencies);
};
