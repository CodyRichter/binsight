import { Badge, Button } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { Link } from "react-router";
import classes from "./TagList.module.css";

interface TagListProps {
  tags: string[];
  tagHref?: (tag: string) => string;
  onRemoveTag?: (tag: string) => void;
  onAddTag?: () => void;
}

export function TagList({ tags, tagHref, onRemoveTag, onAddTag }: TagListProps) {
  return (
    <div className={classes.list}>
      {tags.map((tag) => (
        <span key={tag} className={classes.item}>
          {tagHref ? (
            <Badge component={Link} to={tagHref(tag)} className={classes.interactive}>
              {tag}
            </Badge>
          ) : (
            <Badge>{tag}</Badge>
          )}
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
