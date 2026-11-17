import { describe, expect, it } from "vitest";
import { claudeCodeCommand } from "./claudeCodeCommand";

describe("claudeCodeCommand", () => {
  it("points Claude Code at this address's MCP server with the secret as a bearer token", () => {
    const command = claudeCodeCommand("http://binsight.home:8000", "s3cret");
    expect(command).toContain(" http://binsight.home:8000/mcp ");
    expect(command).toContain('--header "Authorization: Bearer s3cret"');
    expect(command.startsWith("claude mcp add --transport http binsight ")).toBe(true);
  });
});
