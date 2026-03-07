# Match Reordering - Quick Visual Guide

## 🎯 What You'll See

### 1. Drag Handles
Each match now has a **drag handle** (☰ icon) on the left side:

```
┌─────────────────────────────────────────────────┐
│ ☰  Match 1                                      │
│    Home Team: [Autocomplete]                    │
│    Away Team: [Autocomplete]                    │
└─────────────────────────────────────────────────┘
```

**Hover over it** → Icon turns blue  
**Click and drag** → Match moves with your mouse/finger  
**Release** → Match drops in new position

---

### 2. Match 15 Lock Toggle
The last match (Match 15) has a **lock icon** (🔒) on the right side:

```
┌─────────────────────────────────────────────────┐
│ ☰  Match 15 - Pleno                          🔒 │
│    Home Team: [Team A]                          │
│    Away Team: [Team B]                          │
└─────────────────────────────────────────────────┘
```

**Locked** (🔒):
- Cannot be dragged
- Stays at position 15
- Blue border indicates it's locked
- Drag attempt shows warning toast

**Unlocked** (🔓):
- Can be dragged anywhere
- Other matches can be dragged to position 15
- Last match becomes the new Match 15

---

### 3. First-Time Tooltip
When you first visit the form, you'll see:

```
ℹ️ Tip: You can drag matches to reorder them. Use the drag handle (☰) on the left side of each match.
                                                                                              [×]
```

Click [×] to dismiss. You won't see it again (stored in localStorage).

---

## 🖱️ Desktop Usage

1. **Hover** over drag handle → Changes color to blue
2. **Click and hold** → Match lifts slightly (shadow appears)
3. **Drag up/down** → Other matches smoothly shift
4. **Release** → Match settles into new position

### Keyboard Navigation (Accessibility)
1. **Tab** to drag handle
2. **Space/Enter** to grab match
3. **Arrow keys** to move up/down
4. **Space/Enter** to drop

---

## 📱 Mobile/Touch Usage

1. **Long-press** (250ms) on drag handle → Match lifts
2. **Drag finger** up/down → Match follows your finger
3. **Release** → Match drops in new position

**Note:** Scrolling still works normally - just scroll on the match content, not the drag handle.

---

## 🎨 Visual Feedback

### While Dragging:
- **Active match**: 50% opacity, elevated shadow
- **Other matches**: Smoothly animate to new positions
- **Drag overlay**: "Reordering match..." appears

### Locked Match 15:
- **Blue border** around the entire match (subtle, 30% opacity)
- **No drag handle** appears

---

## 🔄 Common Workflows

### Workflow 1: Auto-fill + Reorder
```
1. Click "Auto-fill Survey" button
2. Select 15 matches from scraper
3. Matches appear sorted by time
4. Drag matches to preferred order
5. Submit
```

### Workflow 2: Reorder Match 15
```
1. Scroll to Match 15
2. Click lock icon 🔒 to unlock (becomes 🔓)
3. Drag Match 15 to desired position
4. Drag another match to position 15
5. That match becomes new Match 15
6. Lock again if desired
```

### Workflow 3: Quick Swap
```
1. Drag Match 3 to Match 8's position
2. Matches 4-8 shift up
3. Match 3 is now at position 8
```

---

## 🚀 Try It Now!

1. Navigate to: `/survey-form`
2. Add at least 2 matches
3. Try dragging them around
4. Notice the smooth animations
5. Try the Match 15 lock/unlock

---

## 💡 Tips

- **Desktop**: Hover helps you find drag handles
- **Mobile**: The drag handle is at least 48x48px for easy tapping
- **Locked Match 15**: Look for the blue border
- **First time?**: The tooltip will guide you
- **Made a mistake?**: Just drag it back!

---

## 📋 Quick Reference

| Action | Desktop | Mobile |
|--------|---------|--------|
| Start drag | Click & hold | Long-press (250ms) |
| Move | Mouse movement | Finger movement |
| Cancel | ESC key | Move outside list |
| Drop | Release mouse | Release finger |
| Keyboard | Space/Arrows | N/A |

---

## ⚠️ What to Know

1. **Match numbers auto-update** after reordering
2. **isGame15 flag** automatically moves to position 15
3. **No data is lost** during reordering
4. **Validation errors** stay with the correct match
5. **Submit** sends the new order to backend

---

## 🎉 Enjoy Your New Feature!

You asked for match reordering, and now you have it! It's:
- ✅ Intuitive (drag and drop)
- ✅ Fast (smooth animations)
- ✅ Accessible (keyboard + screen reader support)
- ✅ Mobile-friendly (touch gestures)
- ✅ Safe (locked Match 15 by default)

Have fun organizing your quinipolos! 🎯
