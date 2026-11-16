import { screen } from "@testing-library/react";
import { IconUser } from "@tabler/icons-react";
import { expect, test } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { SideNavigation } from "./SideNavigation";

const views = [{ name: "Lent out", to: "/views/lent-out", count: 2, icon: IconUser }];

test("Views is lit on the list of views", () => {
  renderWithTheme(<SideNavigation current="views" inboxCount={0} views={views} />);
  expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(/^Views$/);
});

test("on one view only that view is lit", () => {
  renderWithTheme(
    <SideNavigation current="views" currentView="/views/lent-out" inboxCount={0} views={views} />,
  );
  expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Lent out");
});
