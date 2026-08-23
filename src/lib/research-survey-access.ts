import { getTelegramStartParam } from "@/lib/panel-share";
import { RESEARCH_SURVEY_START_PARAMS } from "@/lib/research-survey";

export function isResearchSurveyStartParam(
  value: string | null | undefined,
): boolean {
  return Boolean(value && RESEARCH_SURVEY_START_PARAMS.has(value));
}

/** Hidden research questionnaire. Regular Mini App entry does not open this screen. */
export function isResearchSurveyLaunch(): boolean {
  if (typeof window === "undefined") return false;
  if (isResearchSurveyStartParam(getTelegramStartParam())) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("survey") === "1") return true;
    if (isResearchSurveyStartParam(params.get("startapp"))) return true;
  } catch {
    // ignore
  }
  return false;
}
