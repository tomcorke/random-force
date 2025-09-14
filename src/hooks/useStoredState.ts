import { useEffect, useState } from "react";
import z from "zod";

export const useStoredState = <Z extends z.ZodTypeAny, T extends z.infer<Z>>(
  key: string,
  initialValue: T,
  zodSchema: Z
) => {
  // Initial load from storage
  const storedValue = localStorage.getItem(key);

  let finalInitialValue = initialValue;
  if (storedValue) {
    const parsedValue = zodSchema.safeParse(JSON.parse(storedValue));
    if (parsedValue.success) {
      finalInitialValue = parsedValue.data as T;
    }
  }

  const [value, setValue] = useState<T>(finalInitialValue);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};
