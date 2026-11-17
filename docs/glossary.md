# Glossary

One word per concept. Use these words, spelled this way, in code, the API,
MCP tools, the interface and documents. If a concept is missing, add it here
before naming it in code.

## Places

| Term              | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| **Location**      | Anything that can hold items or other locations. The only word for a place. |
| **Location type** | What kind of location it is: `site`, `room`, `furniture`, `shelf`, `bin`, `drawer`, `box`. A fixed list. |
| **Site**          | A location with no parent: the home, a storage unit, a car. |
| **Bin**           | A location of type `bin`. In prose, "bin" is also used loosely for any labeled container; in code it means only the type. |
| **Parent**        | The location that directly contains a location.            |
| **Path**          | A location's chain of names from its site down, e.g. `Garage > Shelf 2 > Bin B-014`. |
| **Summary**       | An optional one-line description of a location's contents, for locations not worth itemizing. |

## Labels

| Term            | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| **Label**       | The physical sticker: a QR code plus a readable code.        |
| **Code**        | The short permanent identifier on a label, e.g. `B-014`. Never reused. |
| **Blank label** | A label that has been generated but not yet attached to a location. |
| **Claim**       | Attaching a blank label to a location the first time it is scanned. |
| **Unclaim**     | Turning a claimed label back into a blank label, to undo a claim. |
| **Label address** | The web address a QR code holds: the app's address plus `/l/` plus the code. |

## Items

| Term              | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| **Item**          | A thing being tracked.                                     |
| **Quantity**      | How many of an item there are. A plain count, possibly approximate. |
| **Home location** | The location an item lives in and returns to. An item keeps it while in use, lent out or missing. |
| **Status**        | Where an item is in its life: `in_place`, `in_use`, `lent_out`, `missing`, `sold`, `given_away`, `thrown_away`. |
| **Lent to**       | The name of whoever has a lent-out item. Free text.        |
| **Archive**       | Items whose status is `sold`, `given_away` or `thrown_away`. Still searchable. |
| **Inbox**         | Items missing a name or a home location.                   |
| **Add several**   | Adding several items at once by name, one per line, as one change. |
| **Add by photo**  | Adding an item with a photo and no name; it is named later. |
| **Likely duplicate** | An item already in the destination with the name being typed, ignoring case. |
| **Add to existing** | Raising a likely duplicate's quantity by one instead of adding a second item. |
| **Category**      | The one kind of thing an item is, e.g. cable, tool.        |
| **Tag**           | A keyword on an item. An item can have many.               |
| **Link**          | A relationship between two items: `belongs_with` or `part_of`. |
| **Attachment**    | A photo, file or web link stored against an item or location. |
| **Photo**         | An attachment that is an image shown as the item's or location's picture. |

## Keeping it true

| Term             | Meaning                                                     |
| ---------------- | ----------------------------------------------------------- |
| **Check**        | A record that someone confirmed a location's direct contents at a point in time. |
| **Last checked** | The time of a location's most recent check.                 |
| **Check mode**   | Ticking through a location's items one by one, producing a check. |

## Changes

| Term              | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| **History entry** | A record of one change: what changed, when, and by which actor. |
| **Actor**         | Who made a change: `app` (the owner in the interface) or `mcp` (Claude). |
| **Undo**          | Reversing a history entry.                                 |
| **Delete**        | Removing an item or location from view. Deleted things can be restored. Different from archive. |
| **Preview**       | What an MCP tool returns in place of acting, when the action deletes, merges or changes many records. |
| **Confirmation**  | The single-use token returned with a preview, sent back to make the action happen. |

## Finding

| Term             | Meaning                                                     |
| ---------------- | ----------------------------------------------------------- |
| **View**         | A built-in list across the whole home, e.g. lent out, missing. |
| **Saved search** | A search the owner has kept and may pin.                    |

## Access and running

| Term               | Meaning                                                   |
| ------------------ | --------------------------------------------------------- |
| **Owner**          | The one person who uses the app.                          |
| **Login session**  | What keeps one device signed in: a secret in a cookie, ended by signing out. |
| **MCP credential** | The revocable secret Claude uses to reach the MCP server. |
| **App address**    | The permanent web address of an install.                  |
| **Data directory** | The one folder holding the database, attachments and backups. |

## Words not to use

| Do not write                          | Write instead        | Why                         |
| ------------------------------------- | -------------------- | --------------------------- |
| container, storage, place, spot, area | location             | One word for a place.       |
| label (for a keyword)                 | tag                  | A label is the sticker.     |
| tag (for a sticker)                   | label                | A tag is a keyword.         |
| asset, product, thing, object, entry  | item                 | One word for a tracked thing. |
| stock, inventory level, count (of one item) | quantity       | Stock management is a non-goal. A count of records is still a count. |
| ID, number (for what is on a label)   | code                 | Internal identifiers are separate and never shown. |
| verify, audit, review, confirm (contents) | check            | One word for confirming contents. Confirmation is the MCP step. |
| user, account, member                 | owner                | There is one person.        |
| remove (when it can be restored)      | delete, or archive   | They are different actions. |
