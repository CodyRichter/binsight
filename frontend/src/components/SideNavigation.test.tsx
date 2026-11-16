import { screen } from "@testing-library/react";
import { IconClock, IconUser } from "@tabler/icons-react";
import { expect, test } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import type { NavSection } from "./navigation";
import { SideNavigation } from "./SideNavigation";

const viewItems = [{ name: "Lent out", to: "/views/lent-out", count: 2, icon: IconUser }];

function viewsSection(current: boolean, activeView?: string): NavSection {
  return {
    id: "views",
    title: "Views",
    to: "/views",
    current,
    items: viewItems.map((item) => ({ ...item, current: item.to === activeView })),
  };
}

test("Views is lit on the list of views", () => {
  renderWithTheme(<SideNavigation current="views" sections={[viewsSection(true)]} />);
  expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(/^Views$/);
});

test("on one view only that view is lit", () => {
  renderWithTheme(
    <SideNavigation current="views" sections={[viewsSection(false, "/views/lent-out")]} />,
  );
  expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Lent out");
});

test("without sections or inbox count the skeleton renders no placeholders", () => {
  const { container } = renderWithTheme(<SideNavigation current="home" />);
  expect(container.querySelector("svg[viewBox='0 0 32 32']")).toBeInTheDocument();
  expect(screen.getByText("Binsight")).toBeInTheDocument();
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.queryByText("Views")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Inbox" })).toHaveTextContent(/^Inbox$/);
});

test("extensible sections render their own group and entries", () => {
  const sections: NavSection[] = [
    viewsSection(false),
    {
      id: "saved",
      title: "Saved searches",
      items: [{ name: "Old bins", to: "/views/old", count: 4, icon: IconClock }],
    },
  ];
  renderWithTheme(<SideNavigation current="home" sections={sections} />);
  expect(screen.getByRole("group", { name: "Saved searches" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Old bins/ })).toBeInTheDocument();
});
