import type { PathSegment } from "@/components/Path";
import type { components } from "@/types/api.generated";

type PathStep = components["schemas"]["PathStep"];

function stepName(step: PathStep): string {
  if (!step.label_code) return step.name;
  return `${step.type.charAt(0).toUpperCase()}${step.type.slice(1)} ${step.label_code}`;
}

/** A path as links to each location on it; a labeled location reads by its type and code. */
export function pathSegments(path: PathStep[]): PathSegment[] {
  return path.map((step) => ({ name: stepName(step), to: `/locations/${step.id}` }));
}
