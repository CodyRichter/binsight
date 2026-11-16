import {
  ControlsSpecimen,
  DesignFrame,
  FieldsSpecimen,
  HeaderSpecimen,
  OverlaysSpecimen,
  RowsSpecimen,
  TemplatesSpecimen,
  TokensSpecimen,
  ValuesSpecimen,
} from "@/features/design";

export function DesignPage() {
  return (
    <DesignFrame>
      <TemplatesSpecimen />
      <TokensSpecimen />
      <ControlsSpecimen />
      <FieldsSpecimen />
      <OverlaysSpecimen />
      <RowsSpecimen />
      <HeaderSpecimen />
      <ValuesSpecimen />
    </DesignFrame>
  );
}
