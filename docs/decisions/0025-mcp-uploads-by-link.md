# 0025: Claude sends photos and files through an upload link

Status: Accepted

## Context

MCP tools take their inputs as JSON, so a photo or file had to be sent as
base64 text inside the tool call. A phone photo is hundreds of thousands
of characters: Claude spends that many tokens writing it, one wrong
character spoils the image, and putting one photo on several items sends it
again each time. The MCP server is reached over HTTP
([decision 0010](0010-mcp-access.md)), so it cannot open a file on the
client's computer either.

## Decision

- `create_upload` (an MCP tool and an editor's route) hands out an upload:
  an unguessable address under `/api/attachments/uploads/`, good for one
  hour.
- The client sends the file there itself, as a multipart form with a `file`
  field, for example `curl -F file=@photo.jpg <upload_url>`. That address
  needs no sign-in or bearer token: knowing it is the permission. It takes
  one file, once, of at most 50 MB.
- Every MCP tool that took a photo or file as base64 (`add_item_photo`,
  `add_item_by_photo`, `attach_file`, `set_location_photo`) takes an
  `upload_id` instead. There is no base64 input left.
- An upload can be used by any number of tool calls until it expires, so one
  photo goes on several items with one upload. Each use stores its own copy
  as an attachment.
- An upload is not an attachment and not part of the home: no history, no
  export, no backup. Expired uploads and their files are deleted the next
  time one is created.

## Why

- The file's bytes go from the client's disk to the server without passing
  through Claude, so their size costs no tokens.
- An address that works without the bearer token means Claude never has to
  read the credential from the client's settings to send a file.
- Reusing one upload is what "this photo for every item in the drawer"
  needs.

## Cost

- A client must be able to make an HTTP request outside MCP, such as
  running `curl`. Claude Code can; Claude Desktop without a shell cannot
  attach photos or files through MCP.
- The upload address is a secret for an hour. Anyone who sees it in that
  hour can send the file in its place, if it has not been sent yet. It
  cannot change the home by itself: attaching still needs the credential.
