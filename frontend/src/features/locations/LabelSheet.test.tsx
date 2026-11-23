import { notifications } from "@mantine/notifications";
import { act, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { answer, signedIn } from "@/lib/testing/routeTesting";
import { LabelSheet } from "./LabelSheet";

afterEach(() => {
  act(() => notifications.clean());
  vi.unstubAllGlobals();
});

function stubPrinter(
  printAddress: string | null,
  printed: () => Promise<Response> = () => Promise.resolve(answer(200, { code: "WQA-G5P" })),
) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    if (path === "/api/auth/status") return Promise.resolve(answer(200, signedIn));
    if (init?.method === "POST") return printed();
    return Promise.resolve(answer(200, { print_address: printAddress }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const noop = () => undefined;

test("with a printer set up, Direct Print sends the label and Download stays", async () => {
  const fetchMock = stubPrinter("http://printer.local/print");
  const { user } = renderWithTheme(<LabelSheet code="WQA-G5P" opened onClose={noop} />);
  await user.click(await screen.findByRole("button", { name: "Direct Print" }));
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/labels/WQA-G5P/print",
    expect.objectContaining({ method: "POST" }),
  );
  expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
    "href",
    "/api/labels/WQA-G5P/image",
  );
});

test("with no printer set up, Download is the only way to print", async () => {
  const fetchMock = stubPrinter(null);
  renderWithTheme(<LabelSheet code="WQA-G5P" opened onClose={noop} />);
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(await screen.findByRole("link", { name: "Download" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Direct Print" })).toBeNull();
  expect(screen.queryByText("Open to print")).toBeNull();
});

function printCalls(fetchMock: ReturnType<typeof stubPrinter>) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").length;
}

test("Direct Print shows Printing while the label is on its way, and a second tap does nothing", async () => {
  let finish: (response: Response) => void = noop;
  const fetchMock = stubPrinter(
    "http://printer.local/print",
    () => new Promise((done) => (finish = done)),
  );
  const { user } = renderWithTheme(<LabelSheet code="WQA-G5P" opened onClose={noop} />);
  await user.click(await screen.findByRole("button", { name: "Direct Print" }));
  const printing = await screen.findByRole("button", { name: "Printing" });
  expect(printing).toHaveAttribute("aria-busy", "true");
  await user.click(printing);
  expect(printCalls(fetchMock)).toBe(1);
  act(() => finish(answer(200, { code: "WQA-G5P" })));
  expect(await screen.findByRole("status")).toHaveTextContent("Printed WQA-G5P");
});

test("a printed label closes the sheet, is confirmed, and can be printed again", async () => {
  const fetchMock = stubPrinter("http://printer.local/print");
  const onClose = vi.fn();
  const { user } = renderWithTheme(<LabelSheet code="WQA-G5P" opened onClose={onClose} />);
  await user.click(await screen.findByRole("button", { name: "Direct Print" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Printed WQA-G5P");
  expect(onClose).toHaveBeenCalledOnce();
  await user.click(screen.getByRole("button", { name: "Print again" }));
  await vi.waitFor(() => expect(printCalls(fetchMock)).toBe(2));
});

test("a printer that fails says why, keeps the sheet open, and offers Retry", async () => {
  const failed = {
    error: { code: "print_failed", message: "The label was not printed: it answered 500." },
  };
  const fetchMock = stubPrinter("http://printer.local/print", () =>
    Promise.resolve(answer(502, failed)),
  );
  const onClose = vi.fn();
  const { user } = renderWithTheme(<LabelSheet code="WQA-G5P" opened onClose={onClose} />);
  await user.click(await screen.findByRole("button", { name: "Direct Print" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The label was not printed: it answered 500.",
  );
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Direct Print" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Retry" }));
  await vi.waitFor(() => expect(printCalls(fetchMock)).toBe(2));
});
