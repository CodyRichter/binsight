import classes from "./CodeChip.module.css";

interface CodeChipProps {
  code: string;
  large?: boolean;
}

export function CodeChip({ code, large = false }: CodeChipProps) {
  return (
    <span className={classes.chip} data-large={large || undefined}>
      {code}
    </span>
  );
}
