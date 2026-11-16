import { ActionIcon, Menu, Title } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { CheckedStamp } from "./CheckedStamp";
import { CodeChip } from "./CodeChip";
import { EditableText } from "./EditableText";
import { Path, type PathSegment } from "./Path";
import { Thumbnail } from "./Thumbnail";
import classes from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  onRename?: (title: string) => void;
  parents?: PathSegment[];
  code?: string;
  thumbnail?: { photoUrl?: string };
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

function titleLine(title: string, code?: string, onRename?: (title: string) => void): ReactNode {
  return (
    <div className={classes.title}>
      <Title order={1}>
        {onRename ? <EditableText value={title} label="Name" onSave={onRename} /> : title}
      </Title>
      {code && <CodeChip code={code} large />}
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
  const { title, parents = [], code, thumbnail, summary, actions, menu } = props;
  return (
    <header className={classes.header}>
      {thumbnail && <Thumbnail photoUrl={thumbnail.photoUrl} large />}
      {parents.length > 0 && <Path segments={parents} linked />}
      {titleLine(title, code, props.onRename)}
      {summary && (
        <EditableText
          value={summary.value}
          label="Summary"
          invitation="Add a summary"
          onSave={summary.onSave}
        />
      )}
      {metaLine(props.lastChecked, props.counts ?? [])}
      {(actions || menu) && (
        <div className={classes.actions}>
          {actions}
          {menu && moreMenu(menu)}
        </div>
      )}
    </header>
  );
}
