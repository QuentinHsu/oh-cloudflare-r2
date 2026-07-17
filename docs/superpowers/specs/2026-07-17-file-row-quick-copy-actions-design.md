# File Row Quick Copy Actions

## Summary

Promote the frequently used copy-link actions from the file row overflow menu to persistent inline actions. Keep the existing copy behavior and event contract unchanged.

## Interaction Design

- Every file row shows an inline icon button for copying the raw file URL.
- Image rows additionally show an inline icon button for copying Markdown.
- Both buttons remain visible without hover and expose localized tooltips and accessible names.
- Mobile targets are at least 44 by 44 CSS pixels; desktop targets may use the existing compact 36-pixel size.
- The overflow menu retains preview, rename, move, and delete actions only.
- Folder rows do not show copy actions.

## Component and Data Flow

`FileTable.vue` continues to emit the existing `copy-url` event with `CopyUrlPayload`. `FileManager.vue` and `useFilePreview` remain unchanged, so clipboard behavior, URL generation, localization, and toast feedback continue through the established path.

## Responsive Layout

The action column contains an inline flex group. The raw-link button is always present for files, the Markdown button is conditional for images, and the overflow trigger remains last. The column stays right-aligned and does not introduce a new table heading label.

## Testing

- Verify image rows expose raw-link and Markdown buttons as direct row actions.
- Verify non-image rows expose only the raw-link direct action.
- Verify neither copy action remains inside the overflow menu.
- Preserve existing payload assertions for raw and Markdown copy events.
- Verify explicit 44-pixel mobile and compact desktop target classes.

## Scope

No API, clipboard, URL, localization, selection, preview, or file-operation behavior changes are included.
