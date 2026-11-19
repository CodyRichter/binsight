import type { IconNode } from "@tabler/icons-react";

/** The shapes an outline icon is drawn with, from the file the build puts beside the app (decision 0019). */
export async function fetchIconDrawing(name: string): Promise<IconNode> {
  const response = await fetch(`/icons/${name}.json`);
  // An unknown name is answered with the app's page, as any unknown address is.
  if (!response.ok || !response.headers.get("Content-Type")?.includes("json")) {
    throw new Error(`There is no icon named ${name}.`);
  }
  return (await response.json()) as IconNode;
}
