import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { pathSegments } from "./pathSegments";
import { useUnlink, type LinkedItem } from "./useItemLinks";
import type { Item } from "./useItems";
import { useAccess } from "@/lib/api/useAccess";

const sections: { kind: LinkedItem["kind"]; title: string }[] = [
  { kind: "belongs_with", title: "Belongs with" },
  { kind: "part_of", title: "Part of" },
  { kind: "part", title: "Parts" },
];

interface ItemLinksProps {
  item: Item;
  links: LinkedItem[];
}

/** The items linked to this one, a section for each kind of link that has any. */
export function ItemLinks({ item, links }: ItemLinksProps) {
  const { canEdit } = useAccess();
  const unlink = useUnlink(item);
  return sections.map(({ kind, title }) => {
    const linked = links.filter((each) => each.kind === kind);
    if (linked.length === 0) return null;
    return (
      <ListSection key={kind} title={title} count={linked.length}>
        {linked.map((each) => (
          <ItemRow
            key={each.link_id}
            name={each.item.name}
            to={`/items/${each.item.id}`}
            path={pathSegments(each.item.path)}
            photoUrl={each.item.photo_url ?? undefined}
            status={each.item.status}
            lentTo={each.item.lent_to ?? undefined}
            onRemoveLink={canEdit ? () => unlink(each) : undefined}
          />
        ))}
      </ListSection>
    );
  });
}
