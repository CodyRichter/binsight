import { ActionIcon, Menu, Title } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { CodeChip } from "./CodeChip";
import { EditableText } from "./EditableText";
import { Path, type PathSegment } from "./Path";
import { StatusBadge, type Status } from "./StatusBadge";
import type { LocationType } from "./locationIcons";
import { Thumbnail } from "./Thumbnail";
import { timeAgo } from "./timeAgo";
import classes from "./PageHeader.module.css";

interface PageThumbnail {
  photoUrl?: string;
  locationType?: LocationType;
  locationIcon?: string | null;
  /** Makes the thumbnail a button with this name. */
  action?: { label: string; onClick: () => void };
}

interface PageHeaderProps {
  title: string;
  /** What an empty title reads, in muted text, such as "Unnamed". */
  untitled?: string;
  onRename?: (title: string) => void;
  parents?: PathSegment[];
  code?: string;
  /** Makes the code chip a button, named "Label {code}", that shows the label. */
  onCodeClick?: () => void;
  thumbnail?: PageThumbnail;
  status?: { status: Status; lentTo?: string };
  summary?: { value: string; onSave: (summary: string) => void };
  counts?: string[];
  /** Since when the page's thing has been as it is, read under the title: "Deleted 2 days ago". */
  since?: { words: string; at: Date };
  quantity?: ReactNode;
  actions?: ReactNode;
  menu?: ReactNode;
}

function metaLine({ counts = [], since }: PageHeaderProps): ReactNode {
  const words = since ? [...counts, `${since.words} ${timeAgo(since.at)}`] : counts;
  if (words.length === 0) return null;
  return (
    <div className={classes.meta}>
      {words.map((word) => (
        <span key={word} className={classes.count}>
          {word}
        </span>
      ))}
    </div>
  );
}

function codeChip({ code, onCodeClick }: PageHeaderProps): ReactNode {
  if (!code) return null;
  if (!onCodeClick) return <CodeChip code={code} large />;
  return (
    <button
      type="button"
      className={classes.codeButton}
      aria-label={`Label ${code}`}
      onClick={onCodeClick}
    >
      <CodeChip code={code} large />
    </button>
  );
}

function titleLine(props: PageHeaderProps): ReactNode {
  const { title, untitled, onRename } = props;
  return (
    <div className={classes.title}>
      <Title order={1} tabIndex={-1}>
        {onRename ? (
          <EditableText value={title} label="Name" invitation={untitled} onSave={onRename} />
        ) : (
          title || untitled
        )}
      </Title>
      {codeChip(props)}
    </div>
  );
}

function thumbnailControl({ action, ...picture }: PageThumbnail): ReactNode {
  const shown = <Thumbnail {...picture} large />;
  if (!action) return shown;
  return (
    <button
      type="button"
      className={classes.thumbnailButton}
      aria-label={action.label}
      onClick={action.onClick}
    >
      {shown}
    </button>
  );
}

function moreMenu(menu: ReactNode): ReactNode {
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="default" aria-label="More">
          <IconDotsVertical aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>{menu}</Menu.Dropdown>
    </Menu>
  );
}

function documentTitle({ title, untitled }: PageHeaderProps): string {
  return `${title || untitled} – Binsight`;
}

export function PageHeader(props: PageHeaderProps) {
  const { parents = [], thumbnail, status, summary, quantity, actions, menu } = props;
  return (
    <header className={classes.header}>
      <title>{documentTitle(props)}</title>
      <div className={classes.top}>
        {thumbnail && thumbnailControl(thumbnail)}
        <div className={classes.identity}>
          {parents.length > 0 && <Path segments={parents} linked />}
          {titleLine(props)}
          {status && <StatusBadge {...status} />}
          {summary && (
            <EditableText
              value={summary.value}
              label="Summary"
              invitation="Add a summary"
              onSave={summary.onSave}
            />
          )}
          {metaLine(props)}
          {quantity && <div className={classes.quantity}>{quantity}</div>}
        </div>
      </div>
      {(actions || menu) && (
        <div className={classes.actions}>
          {actions}
          {menu && moreMenu(menu)}
        </div>
      )}
    </header>
  );
}
