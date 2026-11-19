import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { EditableText } from "./EditableText";

function renderName(multiline?: boolean) {
  const onSave = vi.fn();
  const rendered = renderWithTheme(
    <EditableText value="Patch cables" label="Name" multiline={multiline} onSave={onSave} />,
  );
  return { ...rendered, onSave };
}

async function startEditing(user: ReturnType<typeof renderName>["user"]) {
  await user.click(screen.getByRole("button", { name: "Name: Patch cables" }));
  return screen.getByRole("textbox", { name: "Name" });
}

test("Enter saves the trimmed text", async () => {
  const { user, onSave } = renderName();
  await user.clear(await startEditing(user));
  await user.keyboard("  Network cables {Enter}");
  expect(onSave).toHaveBeenCalledWith("Network cables");
});

test("leaving the field saves", async () => {
  const { user, onSave } = renderName();
  await user.type(await startEditing(user), " box");
  await user.tab();
  expect(onSave).toHaveBeenCalledWith("Patch cables box");
});

test("Escape restores the text without saving", async () => {
  const { user, onSave } = renderName();
  await user.type(await startEditing(user), " box{Escape}");
  expect(onSave).not.toHaveBeenCalled();
  expect(await startEditing(user)).toHaveValue("Patch cables");
});

test("an unchanged value is not saved", async () => {
  const { user, onSave } = renderName();
  await startEditing(user);
  await user.keyboard("{Enter}");
  const field = await startEditing(user);
  await user.clear(field);
  await user.type(field, "  Patch cables  {Enter}");
  expect(onSave).not.toHaveBeenCalled();
});

test("multiline text takes Enter as a new line and saves on leaving", async () => {
  const { user, onSave } = renderName(true);
  await user.type(await startEditing(user), "{Enter}Cat 6");
  expect(onSave).not.toHaveBeenCalled();
  await user.tab();
  expect(onSave).toHaveBeenCalledWith("Patch cables\nCat 6");
});

test("Enter and Escape return focus to the button", async () => {
  const { user } = renderName();
  await user.type(await startEditing(user), " box{Enter}");
  expect(screen.getByRole("button", { name: "Name: Patch cables" })).toHaveFocus();
  await user.type(await startEditing(user), " two{Escape}");
  expect(screen.getByRole("button", { name: "Name: Patch cables" })).toHaveFocus();
});

function renderDate() {
  const onSave = vi.fn();
  const rendered = renderWithTheme(
    <EditableText
      value=""
      label="Purchase date"
      invitation="Add a purchase date"
      type="date"
      onSave={onSave}
    />,
  );
  return { ...rendered, onSave };
}

test("a date typed as written and saved with Enter is kept as that day", async () => {
  const { user, onSave } = renderDate();
  await user.click(screen.getByRole("button", { name: "Purchase date: Add a purchase date" }));
  await user.keyboard("2027-03-01{Enter}");
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave).toHaveBeenCalledWith("2027-03-01");
});

test("Escape leaves a date as it was", async () => {
  const { user, onSave } = renderDate();
  await user.click(screen.getByRole("button", { name: "Purchase date: Add a purchase date" }));
  await user.keyboard("2027-03-01{Escape}");
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Purchase date: Add a purchase date" })).toHaveFocus();
});

test("picking a day in the calendar saves it once", async () => {
  const { user, onSave } = renderDate();
  await user.click(screen.getByRole("button", { name: "Purchase date: Add a purchase date" }));
  await user.keyboard("2027-03-01");
  await user.click(await screen.findByRole("button", { name: /^15 March 2027$/ }));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave).toHaveBeenCalledWith("2027-03-15");
});

test("without onSave the value reads as plain text, and an empty one shows nothing", () => {
  const { container } = renderWithTheme(
    <>
      <EditableText value="Patch cables" label="Name" />
      <EditableText value="" label="Notes" invitation="Add notes" />
    </>,
  );
  expect(screen.getByText("Patch cables")).toBeVisible();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(container).not.toHaveTextContent("Add notes");
});
