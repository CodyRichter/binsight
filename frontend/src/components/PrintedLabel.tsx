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
    <span className={classes.frame} data-large={large || undefined}>
      <img className={classes.image} src={imageUrl} alt={`Label ${code}`} />
    </span>
  );
}
