import { Button } from "@mantine/core";
import {
  IconArrowLeft,
  IconChevronRight,
  IconHome,
  IconRefresh,
  IconScan,
  IconSearch,
} from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router";
import { ListSection } from "./ListSection";
import { summarizeError } from "./routeErrorSummary";
import { ValueRow } from "./ValueRow";
import classes from "./RouteError.module.css";

interface RouteErrorProps {
  error: unknown;
  standalone?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  onScan?: () => void;
}

function notFoundSuggestions(onGoHome?: () => void, onScan?: () => void) {
  const focusSearch = () =>
    document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  const rows = [
    onGoHome && { icon: IconHome, title: "Home", hint: "Browse all locations", onClick: onGoHome },
    {
      icon: IconSearch,
      title: "Search",
      hint: "Find items, label codes, or notes",
      onClick: focusSearch,
    },
    onScan && {
      icon: IconScan,
      title: "Scan a label",
      hint: "Open a bin directly with the camera",
      onClick: onScan,
    },
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <ListSection title="Where to go">
      {rows.map(({ icon: RowIcon, title, hint, onClick }) => (
        <li key={title}>
          <button type="button" className={classes.row} onClick={onClick}>
            <RowIcon aria-hidden size={20} className={classes.rowIcon} />
            <span className={classes.rowText}>
              <span className={classes.rowTitle}>{title}</span>
              <span className={classes.rowHint}>{hint}</span>
            </span>
            <IconChevronRight aria-hidden size={20} className={classes.rowIcon} />
          </button>
        </li>
      ))}
    </ListSection>
  );
}

export function RouteError({
  error,
  standalone = true,
  onRetry,
  onGoHome,
  onScan,
}: RouteErrorProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const info = summarizeError(error, pathname);
  const Heading = standalone ? "h1" : "h2";

  return (
    <div className={classes.error}>
      <div className={classes.header}>
        <Heading className={classes.heading} tabIndex={-1}>
          {info.title}
        </Heading>
        <p className={classes.summary}>{info.summary}</p>
        <div className={classes.actions}>
          {info.kind === "notFound" ? (
            <>
              {onGoHome && (
                <Button variant="primary" leftSection={<IconHome aria-hidden />} onClick={onGoHome}>
                  Go home
                </Button>
              )}
              <Button leftSection={<IconArrowLeft aria-hidden />} onClick={() => navigate(-1)}>
                Go back
              </Button>
            </>
          ) : (
            <>
              {onRetry && (
                <Button
                  variant="primary"
                  leftSection={<IconRefresh aria-hidden />}
                  onClick={onRetry}
                >
                  Try again
                </Button>
              )}
              {onGoHome && (
                <Button leftSection={<IconHome aria-hidden />} onClick={onGoHome}>
                  Go home
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {info.kind === "notFound" ? (
        notFoundSuggestions(onGoHome, onScan)
      ) : (
        <ListSection title="Details">
          <ValueRow name="Status">
            <span className={classes.tabular}>{info.statusLabel}</span>
          </ValueRow>
          <ValueRow name="Address">{pathname}</ValueRow>
          {info.detail && <ValueRow name="Message">{info.detail}</ValueRow>}
        </ListSection>
      )}
    </div>
  );
}
