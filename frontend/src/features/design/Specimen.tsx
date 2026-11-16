import { Stack, Title, type MantineSpacing } from "@mantine/core";
import type { ReactNode } from "react";

interface SpecimenProps {
  title: string;
  gap?: MantineSpacing;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Specimen({ title, gap = "lg", fullWidth, children }: SpecimenProps) {
  const gutter = fullWidth ? undefined : "lg";
  return (
    <Stack component="section" px={gutter} pt="2xl" gap={gap}>
      <Title order={2} px={fullWidth ? "lg" : undefined}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}
