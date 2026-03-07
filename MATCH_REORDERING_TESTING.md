# Match Reordering Feature - Testing Guide

## Overview
This document provides testing instructions for the new drag-and-drop match reordering feature in the Quinipolo SurveyForm.

## Feature Summary
- **Location**: SurveyForm (when creating a new quinipolo)
- **Functionality**: Drag-and-drop reordering of matches
- **Lock Feature**: Match 15 can be locked/unlocked with a toggle
- **Platform Support**: Desktop (mouse), Mobile web (touch), Capacitor iOS/Android

---

## Desktop Testing (Mouse/Trackpad)

### Basic Drag-and-Drop
1. Navigate to `/survey-form`
2. Fill in at least 2 matches with team names
3. Hover over the drag handle (☰ icon) on the left of any match
   - Icon should change color from gray to blue
   - Cursor should change to `grab`
4. Click and hold the drag handle
5. Drag the match up or down
   - Match should have reduced opacity (0.5)
   - Other matches should smoothly shift position
6. Release to drop
   - Match order should update
   - All match numbers should update correctly

### Match 15 Lock Feature
1. Scroll to Match 15 (the last match)
2. Notice the lock icon (🔒) on the right side
3. Try to drag Match 15 while locked
   - Drag should be prevented
   - Warning toast should appear: "Match 15 is locked. Unlock it to reorder."
4. Click the lock icon to unlock
   - Icon should change to 🔓
5. Now try to drag Match 15
   - Should work normally
6. Drag another match to position 15
   - The match at position 15 should automatically get `isGame15: true`
7. Lock it again and verify the blue border appears

### Visual Feedback
- **Hover**: Drag handle color changes to blue, slight scale increase
- **Dragging**: Active item has 0.5 opacity, elevated shadow
- **Locked Match 15**: Blue border around the match (30% opacity)
- **Tooltip**: Info alert should appear on first visit explaining the feature

### Keyboard Accessibility
1. Tab through the form to a drag handle
2. Press Space or Enter to activate drag mode
3. Use arrow keys to move the match up/down
4. Press Space or Enter again to drop
5. Verify screen reader announces position changes

---

## Mobile Web Testing (Touch)

### Browser Access
1. Open Chrome/Safari on mobile device
2. Navigate to `http://localhost:3001/survey-form` (or your dev URL)
3. Or use Chrome DevTools device emulation:
   - Open DevTools (F12)
   - Click "Toggle device toolbar" (Ctrl+Shift+M)
   - Select a mobile device (iPhone 14, Pixel 7, etc.)

### Touch Gestures
1. Long-press (250ms) on the drag handle
   - Visual feedback should appear (ripple effect)
   - Match should "lift" slightly (scale 1.02)
2. Drag finger up or down
   - Match should follow finger position
   - Other matches should smoothly reorder
3. Release finger to drop
   - Match should settle into new position

### Touch Target Size
- Verify drag handles are at least 48x48px (for accessibility)
- Verify lock toggle is easily tappable
- Test on various screen sizes (320px, 375px, 414px widths)

### Scroll Behavior
1. Fill all 15 matches
2. Try scrolling the page normally
   - Should scroll without triggering drag
3. Long-press on drag handle and move
   - Should drag, not scroll
4. Verify no conflicts with native scroll gestures

---

## Capacitor iOS Testing

### Prerequisites
```bash
cd quinipolo-fe
npx cap sync ios
npx cap open ios
```

### Testing on iOS Simulator
1. Build and run in Xcode
2. Navigate to SurveyForm
3. Test long-press drag gesture
4. Verify haptic feedback (if implemented)
5. Test with VoiceOver enabled:
   - Settings > Accessibility > VoiceOver > On
   - Navigate to drag handles
   - Verify proper ARIA labels are announced

### Edge Cases
- Test during phone call (status bar changes height)
- Test with Dynamic Type enabled (larger text)
- Test in landscape orientation
- Test with Reduce Motion enabled (animations should be minimal)

---

## Capacitor Android Testing

### Prerequisites
```bash
cd quinipolo-fe
npx cap sync android
npx cap open android
```

### Testing on Android Emulator
1. Build and run in Android Studio
2. Navigate to SurveyForm
3. Test long-press drag gesture (250ms delay)
4. Verify touch feedback (ripple effect)
5. Test with TalkBack enabled:
   - Settings > Accessibility > TalkBack > On
   - Navigate to drag handles
   - Verify proper content descriptions

### Device-Specific Testing
- Test on different screen sizes (phone vs tablet)
- Test on devices with hardware navigation buttons
- Test with gesture navigation enabled
- Test on devices with notches/cutouts

---

## Functional Test Cases

### Test Case 1: Basic Reordering
**Steps:**
1. Add 15 matches
2. Drag Match 1 to position 5
3. Submit the form

**Expected:**
- Match order persists in submitted data
- `isGame15` flag only on position 15
- No duplicate match numbers

### Test Case 2: Match 15 Lock Toggle
**Steps:**
1. Fill 15 matches
2. Try to drag Match 15 (locked)
3. Unlock Match 15
4. Drag it to position 10
5. Drag another match to position 15

**Expected:**
- Locked drag shows warning
- Unlocked drag works
- New match at position 15 gets `isGame15: true`

### Test Case 3: Auto-fill + Reorder
**Steps:**
1. Click "Auto-fill Survey" button
2. Select 15 matches from scraper
3. Confirm
4. Drag matches to reorder
5. Submit

**Expected:**
- Auto-filled matches appear
- Reordering works correctly
- Submitted data reflects new order

### Test Case 4: Validation with Reordering
**Steps:**
1. Add some matches with errors (duplicate teams)
2. Reorder matches with errors
3. Fix errors
4. Reorder again

**Expected:**
- Error indicators stay with correct match
- Reordering doesn't clear/duplicate errors
- Form submission respects new order

### Test Case 5: Allow Repeated Teams + Reorder
**Steps:**
1. Toggle "Allow repeated teams" ON
2. Add matches with same teams
3. Reorder matches

**Expected:**
- Reordering works with repeated teams
- No validation errors appear

---

## Performance Testing

### Large Operations
1. Drag Match 1 to position 15
2. Measure time to complete reorder
   - Should be < 100ms
3. Rapidly drag multiple matches
   - UI should remain responsive
   - No visual glitches

### Memory Leaks
1. Perform 50+ drag operations
2. Check browser DevTools > Performance > Memory
3. Verify no significant memory increase

---

## Cross-Browser Testing

### Browsers to Test
- ✅ Chrome/Edge (Chromium) - Desktop & Mobile
- ✅ Firefox - Desktop & Mobile
- ✅ Safari - Desktop & iOS
- ✅ Samsung Internet - Android

### Known Issues to Watch For
- **Safari**: Touch delay might be different
- **Firefox**: DnD overlay rendering might differ
- **Old browsers**: Check for Pointer Events API support

---

## Accessibility Testing (WCAG 2.1)

### Checklist
- [ ] Keyboard navigation works (Tab, Space, Arrows)
- [ ] Screen reader announces drag/drop actions
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Touch targets are at least 48x48px
- [ ] Animations respect `prefers-reduced-motion`
- [ ] ARIA labels are descriptive

### Screen Reader Testing
**NVDA (Windows):**
```
Tab to drag handle → Should announce: "Drag to reorder, button"
Activate drag → Should announce: "Match grabbed"
Move → Should announce: "Match moved to position X"
Drop → Should announce: "Match dropped at position X"
```

**JAWS (Windows):** Similar to NVDA

**VoiceOver (macOS/iOS):** Similar announcements

**TalkBack (Android):** Similar announcements

---

## Regression Testing

### Areas to Verify
1. **Existing Form Functionality**
   - Team autocomplete still works
   - Date picker still works
   - Game type selection still works
   - Submit button still works
   - Error validation still works

2. **MatchAutoFillModal**
   - Auto-fill still populates matches
   - Pleno match still goes to position 15
   - Difficulty sorting still works

3. **Backend Integration**
   - POST to `/api/quinipolos` sends correct order
   - Quinipolo retrieval maintains order
   - Answer submission works with new order

---

## Bug Reporting Template

If you find a bug, report it with:
```
**Environment:**
- Device: [e.g., iPhone 14, Desktop Chrome]
- OS: [e.g., iOS 17, Windows 11]
- Browser: [e.g., Safari 17]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Video:**
[Attach if possible]

**Console Errors:**
[Paste any errors from browser console]
```

---

## Success Criteria

The feature is ready for production when:
- ✅ All desktop drag-and-drop tests pass
- ✅ All mobile touch tests pass (3+ devices)
- ✅ Capacitor iOS build works (1+ device)
- ✅ Capacitor Android build works (1+ device)
- ✅ All functional test cases pass
- ✅ No linter errors
- ✅ Build completes successfully
- ✅ Accessibility checklist complete
- ✅ No regression bugs found
- ✅ Performance is acceptable (< 100ms reorder)

---

## Notes

### Translation Keys Added
The following translation keys should be added to i18n files:
```json
{
  "match15.lockTooltip": "Lock the last match in position 15. When unlocked, you can reorder it freely, and the last match in the list will become Match 15.",
  "match15.unlockTooltip": "Match 15 is unlocked. You can reorder it freely. The last match in the list will become Match 15.",
  "match15.lockedWarning": "Match 15 is locked. Unlock it to reorder.",
  "reordering.tooltip": "Tip: You can drag matches to reorder them. Use the drag handle (☰) on the left side of each match."
}
```

### Local Storage Keys
- `hasSeenReorderingTooltip`: Set to "true" after user dismisses the tooltip

### CSS Classes Added
- `.dragHandle`, `.dragHandle.dragging`, `.dragHandle:hover`
- `.sortableItem`, `.sortableItem.dragging`, `.sortableItem.locked`
- `.matchList`, `.dragOverlay`

---

## Quick Test Checklist

For rapid verification during development:

```
Desktop:
[ ] Can drag matches up/down
[ ] Drag handle changes color on hover
[ ] Match 15 lock/unlock works
[ ] Tooltip appears on first visit
[ ] No console errors

Mobile (DevTools):
[ ] Long-press activates drag
[ ] Drag follows touch
[ ] No scroll conflicts
[ ] Touch targets are large enough

Build:
[ ] npm run build succeeds
[ ] No TypeScript errors
[ ] No linter warnings
```
