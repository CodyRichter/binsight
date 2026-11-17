import { Button, SegmentedControl, Text } from "@mantine/core";
import { useState } from "react";
import { PageState, type PageStatus } from "@/components/PageState";
import { RouteError } from "@/components/RouteError";
import { ApiError } from "@/lib/api/client";
import { Specimen } from "./Specimen";

const statuses = [
  { label: "Ready", value: "ready" },
  { label: "Loading", value: "loading" },
  { label: "Unreachable", value: "unreachable" },
  { label: "Unknown", value: "notFound" },
  { label: "Empty", value: "empty" },
];

const routeErrors = [
  { label: "404 route", value: "404" },
  { label: "500 error", value: "500" },
];

export function PageStatesSpecimen() {
  const [status, setStatus] = useState<PageStatus>("unreachable");
  const [routeErrorKind, setRouteErrorKind] = useState("404");
  const routeError =
    routeErrorKind === "404"
      ? { status: 404, statusText: "Not Found", data: null, internal: true }
      : new ApiError(500, "internal", "Unexpected server error.");

  return (
    <Specimen title="Page states" gap="lg">
      <SegmentedControl
        data={statuses}
        value={status}
        onChange={(value) => setStatus(value as PageStatus)}
      />
      <PageState
        status={status}
        delayMs={0}
        onRetry={() => setStatus("ready")}
        notFound={{
          statement: "No label has the code B-9999",
          action: <Button onClick={() => setStatus("ready")}>Scan another</Button>,
        }}
        empty={{
          statement: "This bin is empty",
          fact: "Add items above when you put things inside.",
        }}
      >
        <Text size="md">Loaded page content renders here with no layout shift.</Text>
      </PageState>
      <SegmentedControl data={routeErrors} value={routeErrorKind} onChange={setRouteErrorKind} />
      <RouteError
        error={routeError}
        standalone={false}
        onGoHome={() => setRouteErrorKind("500")}
        onRetry={() => setRouteErrorKind("404")}
        onScan={() => setRouteErrorKind("500")}
      />
    </Specimen>
  );
}
