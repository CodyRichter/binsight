import classes from "./PrintedLabel.module.css";

interface PrintedLabelProps {
  code: string;
  imageUrl: string;
  /** The column's width, as the label sheet shows it, rather than its size on a printed sheet. */
  large?: boolean;
}

/** A location's label as its image, so the paper or screen can be checked and scanned like the bin. */
export function PrintedLabel({ code, imageUrl, large = false }: PrintedLabelProps) {
  return (
    <img
      className={classes.label}
      data-large={large || undefined}
      src={imageUrl}
      alt={`Label ${code}`}
    />
  );
}
