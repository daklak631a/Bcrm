# Plan: B2B Advanced Workflow Upgrade

This plan details the upgrade for the advanced CRM pilot page to support robust user assignment selectors, a double-tick checklist approval process, and a relocated discussion pane.

## Overview
Improve usability of the advanced workflow B2B screen by replacing comma-separated plain text fields with tag/badge based selectors, implementing double-verification checklists, and placing the comments thread at the bottom in a wider container.

## Project Type
- **Type:** WEB (React / Next.js)
- **Primary Agent:** `frontend-specialist`

## Success Criteria
1. Comma-separated text fields for Assignee, Supervisors, Participants are replaced by searchable/clickable UI selectors.
2. Each checklist item has two checkboxes: Executor Completed ("Làm xong") and Supervisor Approved ("Đã duyệt").
3. Progress calculations and UI indicators count only fully-completed checklist items.
4. Comments section is moved from the right sidebar to a full-width section under the Kanban columns, linked from the sticky sub-navigation bar.

## File Structure
No new files are needed. The entire pilot screen resides in:
- [page.tsx](file:///e:/bcrm%202.0/app/advanced-workflow-pilot/page.tsx)

## Task Breakdown

### Task 1: Update Data Structure & Mock Data
- **Agent:** `frontend-specialist`
- **Details:** Modify types `WorkCard` and `initialCards` state to support `createdBy` and dual-checkbox checklists.
- **INPUT:** Existing `WorkCard` type.
- **OUTPUT:** Updated `WorkCard` interface and state objects with mock records conforming to new format.
- **VERIFY:** Types compile cleanly without typescript errors.

### Task 2: Create Badge and Selector UI for Roles
- **Agent:** `frontend-specialist`
- **Details:** Build selector component in the card details sidebar for Assignees, Supervisors, and Participants. Use a list of system mock users.
- **INPUT:** Static inputs.
- **OUTPUT:** Badges list with "x" button and dropdown selector.
- **VERIFY:** Adding/removing members updates cards state and updates the UI instantly.

### Task 3: Dual-Checkbox Checklist UI & Logic
- **Agent:** `frontend-specialist`
- **Details:** Replace the single checkbox list in `CardDetail` with two checkboxes ("Làm xong" & "Đã duyệt"). Update task status suggestion if all items are ticked.
- **INPUT:** Single checkbox code.
- **OUTPUT:** Pair of styled checkboxes with executor/approver roles.
- **VERIFY:** Supervisor checkbox is disabled until Executor checkbox is checked. Task progress indicator updates properly.

### Task 4: Move Comment Panel & Workspace Anchor Navigation
- **Agent:** `frontend-specialist`
- **Details:** Relocate comments from `CardDetail` to a wide `#workspace-discussion` section. Add anchor item in `WorkspaceAnchorNav`.
- **INPUT:** Comments in sidebar.
- **OUTPUT:** Comments at bottom, anchor nav button working.
- **VERIFY:** Sub-nav smoothly scrolls to bottom pane when clicking "Trao đổi công việc". Comment submission appends to selected card comments.

## Phase X: Verification
- [x] Run Next.js build: `npm run build`
- [x] No typescript compiler errors or linter warnings.
- [x] Run dev server `npm run dev` and perform manual verification.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-02
