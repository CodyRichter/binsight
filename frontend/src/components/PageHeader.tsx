import { ActionIcon, Menu, Title } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { CheckedStamp } from "./CheckedStamp";
import { CodeChip } from "./CodeChip";
import { EditableText } from "./EditableText";
import { Path, type PathSegment } from "./Path";
import { StatusBadge, type Status } from "./StatusBadge";
import { Thumbnail } from "./Thumbnail";
import classes from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  onRename?: (title: string) => void;
  parents?: PathSegment[];
  code?: string;
  blankCode?: boolean;
  thumbnail?: { photoUrl?: string };
  status?: { status: Status; lentTo?: string };
  summary?: { value: string; onSave: (summary: string) => void };
  lastChecked?: Date | null;
  counts?: string[];
  actions?: ReactNode;
  menu?: ReactNode;
}

function metaLine(lastChecked: Date | null | undefined, counts: string[]): ReactNode {
  if (lastChecked === undefined && counts.length === 0) return null;
  return (
    <div className={classes.meta}>
      {lastChecked !== undefined && <CheckedStamp lastChecked={lastChecked} />}
      {counts.map((count) => (
        <span key={count} className={classes.count}>
          {count}
        </span>
      ))}
    </div>
  );
}

function titleLine(props: PageHeaderProps): ReactNode {
  const { title, code, blankCode, onRename } = props;
  return (
    <div className={classes.title}>
      <Title order={1} tabIndex={-1}>
        {onRename ? <EditableText value={title} label="Name" onSave={onRename} /> : title}
      </Title>
      {code && <CodeChip code={code} large blank={blankCode} />}
    </div>
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

export function PageHeader(props: PageHeaderProps) {
  const { parents = [], thumbnail, status, summary, actions, menu } = props;
  return (
    <header className={classes.header}>
      <title>{`${props.title} – Binsight`}</title>
      <div className={classes.top}>
        {thumbnail && <Thumbnail photoUrl={thumbnail.photoUrl} large />}
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
          {metaLine(props.lastChecked, props.counts ?? [])}
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
