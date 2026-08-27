import type { ChoiceQuestion, WrittenQuestion } from "@/lib/school/types";

const letters = ["a", "b", "c", "d"] as const;

export function single(
  id: string,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explain: string,
): ChoiceQuestion {
  return {
    id,
    kind: "single",
    prompt,
    options: options.map((text, index) => ({
      id: letters[index],
      text,
    })) as ChoiceQuestion["options"],
    correct: [letters[correctIndex]],
    explain,
  };
}

export function multi(
  id: string,
  prompt: string,
  options: [string, string, string, string],
  correctIndexes: number[],
  explain: string,
): ChoiceQuestion {
  return {
    id,
    kind: "multi",
    prompt,
    options: options.map((text, index) => ({
      id: letters[index],
      text,
    })) as ChoiceQuestion["options"],
    correct: correctIndexes.map((index) => letters[index]),
    explain,
  };
}

export function written(
  id: string,
  prompt: string,
  accepted: string[],
  explain: string,
  extra?: { unit?: string; hint?: string },
): WrittenQuestion {
  return { id, kind: "written", prompt, accepted, explain, ...extra };
}
