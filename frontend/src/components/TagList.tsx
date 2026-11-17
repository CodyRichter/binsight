import { Badge, Button } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { Link } from "react-router";
import classes from "./TagList.module.css";

interface TagListProps {
  tags: string[];
  tagHref?: (tag: string) => string;
  onSelectTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onAddTag?: () => void;
}

function renderTag(
  tag: string,
  tagHref?: (tag: string) => string,
  onSelectTag?: (tag: string) => void,
) {
  if (tagHref) {
    return (
      <Badge component={Link} to={tagHref(tag)} className={classes.interactive}>
        {tag}
      </Badge>
    );
  }
  if (onSelectTag) {
    return (
      <Badge component="button" type="button" onClick={() => onSelectTag(tag)}>
        {tag}
      </Badge>
    );
  }
  return <Badge>{tag}</Badge>;
}

export function TagList({ tags, tagHref, onSelectTag, onRemoveTag, onAddTag }: TagListProps) {
  return (
    <div className={classes.list}>
      {tags.map((tag) => (
        <span key={tag} className={classes.item}>
          {renderTag(tag, tagHref, onSelectTag)}
          {onRemoveTag && (
            <button
              type="button"
              className={classes.remove}
              aria-label={`Remove tag ${tag}`}
              onClick={() => onRemoveTag(tag)}
            >
              <IconX aria-hidden size={14} />
            </button>
          )}
        </span>
      ))}
      {onAddTag && (
        <Button variant="subtle" onClick={onAddTag}>
          Add tag
        </Button>
      )}
    </div>
  );
}
