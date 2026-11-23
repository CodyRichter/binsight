# 0026: Labels are 3x2 and print to a print address

Status: Accepted.

## Context

Labels were a 2x3 portrait card built on wide black bars. On a thermal
label printer, the common way to print stickers at home, those bars came
out faded and patchy at any speed or darkness, and the card had to be
rotated to fit 3x2 stock. Printing meant downloading the PNG and sending it
on from another app.

## Decision

- A label is a 3x2-inch landscape PNG at 300 dpi. Its only solid fills are
  narrow: a bar down each side and the small pill behind the code. A thin
  rule all round was tried first and printed too faint to read as a border.
- An admin can set one print address in settings. Direct Print makes the
  backend POST the label's PNG to it as the request body (`image/png`) and
  report whether it was accepted. Binsight knows nothing about printer
  models, sizes or protocols: the print server behind the address does.
- The backend sends the request, not the browser, so a print server on
  plain `http` inside the home works from the app on `https`, and the app
  keeps no CORS.
- Printing needs an editor, because it uses up a label. Setting the print
  address is admin-only and has no MCP tool, because it chooses where the
  server sends requests.

## Why

- Thermal printers are the cheap, durable way to make bin labels, and they
  cannot print wide black areas evenly.
- One address and one plain POST work with any print server, including a
  few lines of script in front of a printer.

## Cost

- Labels already printed in the old 2x3 design still scan (the address in
  the QR code is unchanged) but look different from new ones.
- A print server must accept a PNG body. Anything needing another shape
  needs a small adapter in front of it.
