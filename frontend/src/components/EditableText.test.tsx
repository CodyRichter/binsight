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
