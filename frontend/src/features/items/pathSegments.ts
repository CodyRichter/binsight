import type { PathSegment } from "@/components/Path";
import type { components } from "@/types/api.generated";

type PathStep = components["schemas"]["PathStep"];

/** A path as links to each location on it, each read by its name. */
export function pathSegments(path: PathStep[]): PathSegment[] {
  return path.map((step) => ({ name: step.name, to: `/locations/${step.id}` }));
}
