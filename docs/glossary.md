# Glossary

One word per concept. Use these words, spelled this way, in code, the API,
MCP tools, the interface and documents. If a concept is missing, add it here
before naming it in code.

## Places

| Term              | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| **Location**      | Anything that can hold items or other locations. The only word for a place. |
| **Location type** | What kind of location it is: `site`, `room`, `furniture`, `shelf`, `bin`, `drawer`, `box`. A fixed list. |
| **Icon**          | The picture shown for a location in rows and on its page: one picked from the built-in set, or else its type's icon. |
| **Site**          | A location with no parent: the home, a storage unit, a car. |
| **Bin**           | A location of type `bin`. In prose, "bin" is also used loosely for any labeled container; in code it means only the type. |
| **Parent**        | The location that directly contains a location.            |
| **Path**          | A location's chain of names from its site down, e.g. `Garage > Shelf 2 > Bin B-014`. |
| **Summary**       | An optional one-line description of a location's contents, for locations not worth itemizing. |
| **Move**          | Changing an item's home location, or a location's parent. A location moves with everything inside it. |
| **Recently used** | The last few locations things were moved to on this device, offered first when moving. |

## Labels

| Term            | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| **Label**       | The physical sticker: a QR code plus a readable code.        |
| **Code**        | The short permanent identifier on a label, e.g. `B-014`. Never reused. |
| **Blank label** | A label that has been generated but not yet attached to a location. |
| **Claim**       | Attaching a blank label to a location the first time it is scanned. |
| **Unclaim**     | Turning a claimed label back into a blank label, to undo a claim. |
| **Label address** | The web address a QR code holds: the app's address plus `/l/` plus the code. |
| **Scanner**     | The camera inside the app, at `/scan` and in the move sheet, reading labels' QR codes. |

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
| **Duplicate**     | Adding a copy of an item beside it, to record a similar thing: its name, category, tags and descriptive details, but not its serial number, attachments, links or status. |
| **Category**      | The one kind of thing an item is, e.g. cable, tool.        |
| **Tag**           | A keyword on an item. An item can have many.               |
| **Link**          | A relationship between two items: `belongs_with` or `part_of`. |
| **Selection**     | The items ticked in one list, for a bulk edit.             |
| **Bulk edit**     | Moving, tagging, recategorizing or changing the status of a selection in one change. |
| **Attachment**    | A photo, file or web link stored against an item or location. |
| **Photo**         | An attachment that is an image shown as the item's or location's picture. |
| **File**          | An attachment that is a PDF or image kept as it was sent, such as a receipt or a manual. |
| **Web link**      | An attachment that is a web address, such as a manual's page; not a Link between items. |

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
| **Restore**       | Bringing a deleted item or location back into view, where it was. A restored location comes back empty. |
| **Merge**         | Folding one location into another: its items, the locations inside it, its checks and, if the other has none, its label move across, then it is deleted. Folding one item into another, when it was recorded twice: its quantity is added, its tags joined, its details fill only what the other lacks, its attachments and links move across, then it is deleted. |
| **Reorder**       | Changing where a location comes among the locations beside it. |
| **Preview**       | What an MCP tool returns in place of acting, when the action deletes, merges or changes many records. |
| **Confirmation**  | The single-use token returned with a preview, sent back to make the action happen. |

## Finding

| Term             | Meaning                                                     |
| ---------------- | ----------------------------------------------------------- |
| **Search**       | Finding items and locations across the whole home from typed words or a label code. |
| **Search result** | One item or location a search found, with the parts of its name that matched (its **marks**). |
| **Typo tolerance** | Search still matching a word typed with a letter wrong, missing, extra or swapped. |
| **Filter**       | A condition a search keeps items to: location (and everything inside it), category, tag, status or warranty. |
| **View**         | A built-in list across the whole home: Lent out, Missing, Warranty expiring soon, Return window closing, Recently added, Recently moved, Not checked in a long time, Possible duplicates, Archive. |
| **Possible duplicates** | Items sharing a name, ignoring case, anywhere in the home. |
| **Saved search** | A search the owner has kept and may pin.                    |
| **Pin**          | Putting a saved search first on `/views` and in the navigation. |

## Access and running

| Term               | Meaning                                                   |
| ------------------ | --------------------------------------------------------- |
| **Owner**          | The one person who uses the app.                          |
| **Login session**  | What keeps one device signed in: a secret in a cookie, ended by signing out. |
| **MCP credential** | The revocable secret Claude uses to reach the MCP server. |
| **App address**    | The permanent web address of an install.                  |
| **Data directory** | The one folder holding the database, attachments and backups. |
| **Backup**         | A copy of the database and every stored file, taken daily into the data directory; the newest 14 are kept. Restoring one is done on the server, not in the app. |
| **Export**         | One zip of everything in the home: the data as JSON and CSV, with every photo and file. |
| **Import**         | Adding items, and the locations they name, from a CSV file, as one change to undo. |
| **Insurance list** | A printable list of every item still owned, in the home or one location, with its photos, serial number, price and receipts, and their total. The requirements' "insurance export". |
| **Contents sheet** | A printable page of what a location holds, grouped by the location inside it each thing is kept in. |

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
