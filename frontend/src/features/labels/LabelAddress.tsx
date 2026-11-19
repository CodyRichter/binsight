import { Navigate, useParams } from "react-router";
import { locationCode } from "@/features/locations";

/** Where a label's QR code lands: the page of the location whose code it holds. */
export function LabelAddress() {
  const { code = "" } = useParams();
  return <Navigate replace to={`/locations/${encodeURIComponent(locationCode(code) ?? code)}`} />;
}
