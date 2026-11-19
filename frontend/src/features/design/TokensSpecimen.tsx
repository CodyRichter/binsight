import {
  Box,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
  type MantineColorScheme,
} from "@mantine/core";
import { CodeChip } from "@/components/CodeChip";
import { Specimen } from "./Specimen";
import { colorTokens, type ColorToken } from "@/lib/theme/tokens";

const schemes = [
  { label: "Auto", value: "auto" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export function TokensSpecimen() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const names = Object.keys(colorTokens) as ColorToken[];
  return (
    <Specimen title="Tokens and type" gap="xl">
      <SegmentedControl
        data={schemes}
        value={colorScheme}
        onChange={(scheme) => setColorScheme(scheme as MantineColorScheme)}
      />
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        {names.map((name) => (
          <Group key={name} gap="sm" wrap="nowrap">
            <Box bg={`var(--bs-${name})`} p="lg" bdrs="sm" />
            <Text size="sm">{name}</Text>
          </Group>
        ))}
      </SimpleGrid>
      <Stack gap="sm">
        <Title order={1}>Network cables</Title>
        <Title order={2}>Items</Title>
        <Text size="md">Spare patch cables and adapters</Text>
        <Text size="sm" c="dimmed">
          Added 3 weeks ago
        </Text>
        <Group gap="md">
          <CodeChip code="K7Q-4MZ" />
          <CodeChip code="K7Q-4MZ" large />
        </Group>
      </Stack>
    </Specimen>
  );
}
