import classes from "./PrintItem.module.css";

interface PrintItemProps {
  name: string;
  quantity: number;
  /** A word after the name, such as the status of an item not in its place. */
  note?: string;
  details?: { name: string; value: string }[];
  photoUrls?: string[];
}

/** One item on a printed page: its name and quantity, then any details and photos it has. */
export function PrintItem({ name, quantity, note, details = [], photoUrls = [] }: PrintItemProps) {
  return (
    <li className={classes.item}>
      <div className={classes.title}>
        <span className={classes.quantity}>{quantity} ×</span>
        <span className={classes.name}>{name}</span>
        {note && <span className={classes.note}>{note}</span>}
      </div>
      {details.length > 0 && (
        <dl className={classes.details}>
          {details.map((detail) => (
            <div key={detail.name} className={classes.detail}>
              <dt>{detail.name}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {photoUrls.length > 0 && (
        <div className={classes.photos}>
          {photoUrls.map((url) => (
            <img key={url} className={classes.photo} src={url} alt="" />
          ))}
        </div>
      )}
    </li>
  );
}
