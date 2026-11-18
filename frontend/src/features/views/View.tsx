import { SavedSearchResults } from "./SavedSearchResults";
import { ViewRows } from "./ViewRows";
import { isViewName } from "./viewWords";

/** `/views/{view}`: a built-in view, or a saved search by its identifier. */
export function View({ name }: { name: string }) {
  // A saved search's identifier never reads as a view's name, so the address can hold either.
  return isViewName(name) ? <ViewRows view={name} /> : <SavedSearchResults id={name} />;
}
