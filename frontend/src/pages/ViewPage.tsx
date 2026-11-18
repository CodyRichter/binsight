import { useParams } from "react-router";
import { View } from "@/features/views";

export function ViewPage() {
  return <View name={useParams().view ?? ""} />;
}
