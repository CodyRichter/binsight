import { IconChevronRight } from "@tabler/icons-react";
import { Fragment } from "react";
import { Link } from "react-router";
import classes from "./Path.module.css";

export interface PathSegment {
  name: string;
  to: string;
}

interface PathProps {
  segments: PathSegment[];
  linked?: boolean;
}

export function Path({ segments, linked }: PathProps) {
  const Container = linked ? "nav" : "div";
  return (
    <Container className={classes.path} aria-label={linked ? "Path" : undefined}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && <IconChevronRight aria-hidden size={16} className={classes.separator} />}
          {linked ? (
            <Link className={classes.link} to={segment.to}>
              {segment.name}
            </Link>
          ) : (
            <span className={classes.segment}>{segment.name}</span>
          )}
        </Fragment>
      ))}
    </Container>
  );
}
