import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { answer, signedIn } from "@/lib/testing/routeTesting";
import { LabelSheet } from "./LabelSheet";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubPrinter(printAddress: string | null) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    if (path === "/api/auth/status") return Promise.resolve(answer(200, signedIn));
    if (init?.method === "POST") return Promise.resolve(answer(200, { code: "WQA-G5P" }));
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
