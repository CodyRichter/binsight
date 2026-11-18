import {
  ControlsSpecimen,
  DesignFrame,
  FieldsSpecimen,
  HeaderSpecimen,
  OverlaysSpecimen,
  PageStatesSpecimen,
  RowsSpecimen,
  TokensSpecimen,
  ValuesSpecimen,
} from "@/features/design";

export function DesignPage() {
  return (
    <DesignFrame>
      <TokensSpecimen />
      <ControlsSpecimen />
      <FieldsSpecimen />
      <OverlaysSpecimen />
      <RowsSpecimen />
      <HeaderSpecimen />
      <ValuesSpecimen />
      <PageStatesSpecimen />
    </DesignFrame>
  );
}
