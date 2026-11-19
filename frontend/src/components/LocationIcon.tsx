import { useLocationIcon, type LocationType } from "./locationIcons";

interface LocationIconProps {
  type: LocationType;
  icon?: string | null;
  size: number;
  className?: string;
}

/** A location's icon: the one chosen for it, or its type's. Always beside words that name it. */
export function LocationIcon({ type, icon, size, className }: LocationIconProps) {
  const Shown = useLocationIcon(type, icon);
  return <Shown aria-hidden size={size} className={className} />;
}
