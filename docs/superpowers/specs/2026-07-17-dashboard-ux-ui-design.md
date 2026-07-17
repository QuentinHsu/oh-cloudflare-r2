# Dashboard UX/UI Redesign

## Summary

Redesign the authenticated R2 file manager around the layout and component language of shadcn-vue's `dashboard-01` example. The redesign keeps the current file-management capabilities and API contracts while making navigation, scanning, selection, and mobile operation clearer and faster.

The interface supports light, dark, and system themes plus Simplified Chinese and English. The first locale follows the browser language, and an explicit user choice persists across sessions.

## Goals

- Reproduce the useful shell and interaction patterns from `dashboard-01` without copying irrelevant analytics content.
- Make the folder hierarchy the primary navigation surface.
- Replace hover-dependent and mode-dependent actions with discoverable controls.
- Present files and folders in a compact, accessible data table.
- Preserve all current upload, preview, copy, rename, move, delete, and batch workflows.
- Provide intentional desktop, tablet, and mobile layouts.
- Make every redesigned surface work in light and dark themes.
- Provide complete Simplified Chinese and English UI copy.

## Non-goals

- Do not add charts or storage analytics that have no current product value.
- Do not add a database, KV store, or global storage-statistics endpoint.
- Do not change the existing file API contracts or public blob/image URLs.
- Do not add new file operations for virtual folders.
- Do not introduce TanStack Table when existing search, sort, and selection state is sufficient.

## Reference Adaptation

The redesign adapts, rather than literally copies, the reference dashboard:

| `dashboard-01` element     | R2 Dashboard use                                                      |
| -------------------------- | --------------------------------------------------------------------- |
| Application sidebar        | Brand, upload action, folder tree, appearance, locale, user menu      |
| Quick Create               | Upload files                                                          |
| Header and sidebar trigger | Current path breadcrumb and responsive navigation                     |
| Metric cards               | Current-directory file count, total size, folder count, latest update |
| Data table                 | Combined file and folder listing                                      |
| Row actions                | Copy, preview, rename, move, and delete workflows                     |
| Mobile sidebar             | Drawer containing the same folder hierarchy                           |

The visual language remains close to shadcn-vue: neutral surfaces, restrained borders, compact controls, clear typography, semantic state colors, and limited decorative treatment.

## Information Architecture

### Sidebar

The sidebar is the primary navigation surface.

- A compact R2 Dashboard brand switcher sits at the top.
- Upload is the primary sidebar action and remains visible without scrolling.
- The folder tree starts at the root and uses collapsible nested nodes.
- The current directory has a persistent selected state.
- Folder counts may be shown only when they are already available from loaded data; the UI must not imply unavailable global counts.
- Theme, locale, and user controls live at the bottom.
- Desktop users can collapse the sidebar.
- Mobile users open the same content in a drawer.

### Main Header

The sticky main header contains:

- the sidebar trigger;
- a breadcrumb for the current path;
- compact search, locale, theme, and account access where space permits.

The breadcrumb remains horizontally scrollable on narrow screens rather than wrapping into multiple header rows.

### Current-directory Summary

Four cards summarize only the currently loaded directory:

1. number of files, with image count as supporting information;
2. total size of files directly in the directory;
3. number of direct child folders;
4. most recently updated file and relative time.

These values are computed from the existing directory response before search filtering. No new backend request is introduced. Empty directories show valid zero states rather than hiding the cards.

### File Table

Folders and files share one table, with folders ordered before files according to the existing view rules.

Desktop columns:

- selection;
- name;
- type;
- size;
- updated time;
- row menu.

Folder rows navigate into the folder. Image file names open preview. The row menu is always present, so actions do not depend on hover. Unsupported actions are omitted instead of shown disabled.

The table toolbar contains current-folder search, sort field, sort direction, optional column visibility, and active selection information.

## Interaction Design

### Selection and Batch Operations

- Checkboxes are always available; there is no separate batch-selection mode.
- Selecting one or more files reveals a bulk toolbar.
- Bulk actions include move, delete, and clear selection.
- Folder rows are not selectable because the current backend operates on files.
- Partial batch success preserves the accurate remaining selection and refreshes the directory index.

### File Actions

The row menu exposes only applicable actions:

- preview for supported images;
- copy raw URL;
- copy Markdown for images;
- rename;
- move;
- delete.

Destructive actions use an accessible `AlertDialog` rather than `window.confirm`. Dialog button labels and completion messages use the same action vocabulary.

### Upload

- Upload remains available through the primary sidebar button, the page action, drag and drop, and the empty state.
- The upload dialog shows the selected file count and target directory.
- The existing 50-file request limit and path validation remain unchanged.
- While an upload is running, duplicate confirmation is prevented and progress text remains visible.

### Feedback States

- Initial and directory-change loading use table and card skeletons.
- Request failures show a concise explanation and a retry action.
- An empty directory explains that no files exist and offers upload.
- A search with no matches shows the query, result count, and clear-search action.
- Upload and operation outcomes continue to use toasts.
- Partial success uses an explicit warning state rather than a generic success message.

## Responsive Behavior

### Desktop

- Persistent collapsible sidebar.
- Four summary cards in one row when space permits.
- Full table columns.

### Tablet

- Narrow or collapsible sidebar.
- Two-column summary grid.
- Optional table columns collapse before the name and action columns.

### Mobile

- Sidebar becomes a drawer.
- Summary prioritizes file count and total size; secondary cards may move below or be hidden behind a compact summary.
- The table keeps selection, name/type, and row action visible.
- Size and time move into row details or the action sheet.
- Interactive targets are at least 44 by 44 CSS pixels.
- No workflow depends on hover.

## Theme Design

The UI supports `light`, `dark`, and `system` through the existing color-mode module.

- Components use shadcn semantic tokens such as background, foreground, card, muted, border, accent, destructive, and ring.
- Feature components do not hard-code light-only or dark-only foreground and surface colors.
- Folder, file-type, selection, warning, success, and destructive states must retain sufficient contrast in both themes.
- Focus rings remain visible against every surface.
- Skeletons and overlays use semantic opacity rather than fixed gray values.
- The root background, sidebar, cards, table, dialogs, menus, and toasts are verified independently in both themes.

## Internationalization

Use `@nuxtjs/i18n` with Simplified Chinese (`zh-CN`) and English (`en`). Routes keep their current URLs by using a no-prefix strategy.

Locale behavior:

- On the first visit, use `zh-CN` when the browser preference resolves to Simplified Chinese; otherwise use English.
- A manual locale switch is available in the application shell.
- The explicit choice persists and takes precedence over browser detection on later visits.
- Locale switching does not navigate away from the current directory or clear selection.

All user-facing copy moves to locale resources, including:

- navigation and breadcrumbs;
- buttons, menus, labels, placeholders, tooltips, and table headers;
- loading, empty, error, partial-success, and confirmation states;
- toasts and dialog content;
- theme and language names;
- relative dates, file sizes, counts, and accessible labels.

Dates, numbers, and file sizes use locale-aware formatters. File and folder names remain unchanged.

## Component Structure

New or reshaped business components:

- `AppSidebar.vue`: brand, upload action, folder tree, appearance, locale, and account controls.
- `FileDashboardHeader.vue`: sidebar trigger and current-path breadcrumb.
- `FileStats.vue`: current-directory summary cards.
- `FileTable.vue`: combined listing, selection, sorting, and row menus.
- `FileBulkToolbar.vue`: batch actions and selection summary.
- `FileStatePanel.vue`: loading, failure, empty, and no-results states.
- `LanguageToggle.vue`: locale selection and accessible labels.

Existing upload, preview, rename, move, and batch-move dialogs remain separate components and receive localized copy plus the updated visual treatment.

Shadcn-vue components to add where absent:

- Sidebar;
- Breadcrumb;
- Table;
- Checkbox;
- Badge;
- Skeleton;
- Tooltip;
- Collapsible;
- AlertDialog.

Existing Button, Card, Dialog, DropdownMenu, Input, Select, ScrollArea, Avatar, Separator, and Sonner components remain in use.

## Data Flow

`FileManager.vue` remains the orchestration boundary:

1. Fetch the current directory and complete folder index through the existing APIs.
2. Pass the folder index and current path to the sidebar navigation.
3. Compute summary values from the unfiltered current-directory response.
4. Pass the directory response through existing search and sort state for the table.
5. Keep selection and operation state in the existing focused composables.
6. Refresh files and folder indexes through the current mutation callbacks.

No UI component calls file APIs directly. Components emit intent; composables perform operations and return state.

## Error Handling

- Directory-fetch failure must not render a misleading empty directory.
- Retry reuses the current path and preserves navigation context.
- File operation errors retain the current selection unless the server reports that an item completed successfully.
- Invalid or stale target paths are explained in the active locale.
- Missing translation keys fail visibly in development and fall back to English in production.
- Locale persistence failure does not block normal navigation; the active in-memory locale continues to work.

## Testing Strategy

### Unit and Component Tests

- Summary calculations for empty, mixed, and image-heavy directories.
- Folder navigation and sidebar expansion.
- Table selection without a separate selection mode.
- Bulk toolbar visibility and partial-success selection updates.
- Row-menu action availability by file type.
- Loading, fetch failure, empty directory, and no-results states.
- Mobile component state and sidebar drawer behavior.
- Theme controls and semantic component classes.
- Browser-locale detection, manual switching, and persistence.
- Simplified Chinese and English rendering for critical workflows.

### Regression Tests

- Upload, drag and drop, preview, URL copying, rename, move, delete, batch move, and batch delete.
- Path navigation and current-folder search/sort.
- Existing API contract and error handling tests.

### Verification

- Formatting, linting, Nuxt type checking, and Vitest.
- Node and Cloudflare module builds.
- Manual desktop and mobile checks in light and dark themes.
- Manual critical-flow checks in Simplified Chinese and English.

## Acceptance Criteria

- The authenticated file manager visibly follows the `dashboard-01` shell and component language.
- Every existing file workflow remains available without an extra batch-mode toggle.
- Folder navigation is available from a responsive sidebar tree.
- Current-directory summary cards require no new backend endpoint.
- All file actions are usable with keyboard, mouse, and touch.
- The interface has no hover-only critical actions.
- Light, dark, and system themes render every primary state correctly.
- First-visit locale follows browser preference, manual selection persists, and both supported locales cover all user-facing copy.
- Existing public resource URLs and file API contracts remain unchanged.
