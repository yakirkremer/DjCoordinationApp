# Kramer Music - DJ Pool & Preview App (Status & Roadmap)

This file serves as the ground-truth context for Cursor AI to understand the current architecture, database layout, file ingestion mechanisms, and UI state.

---

## 🛠️ Architecture & Core Stack
- **Frontend:** React (Vite, TailwindCSS)
- **Design:** Pioneer XDJ-AZ inspired luxury UI (cyan/gold on black, LCD typography, browser + deck layout)
- **Branding:** KREMER logo (`public/kremer-logo.png`) in app header
- **Audio Engine:** Wavesurfer.js (deck-style player with smart cue ranges)
- **Data Layer:** Local file-based JSON database (`public/data/catalog.json`)
- **Client Session:** `localStorage` per-client feedback, preferences, and login codes
- **Form Schema:** Admin-editable wizard definition stored in `localStorage`
- **Ingestion & MIR (Music Information Retrieval):** Python script with `librosa` and `mutagen` for automated wave-form analysis.

---

## 📂 File System Layout & Music Organization
Instead of a single raw music directory, tracks are segmented into explicit genre folders on the disk.

```text
public/music/
├── Israeli/
│   └── analyzed/     <-- Finished, analyzed MP3 files
├── Loazi/
│   └── analyzed/
├── Mizrahit/
│   └── analyzed/
├── Oldies/
│   └── analyzed/
├── Hip Hop/
│   └── analyzed/
├── Regatton/
│   └── analyzed/
├── Trance/
│   └── analyzed/
└── Techno/
    └── analyzed/
```

---

## ⚙️ Ingestion Pipeline (`scan_music.py`)
- **Workflow:** The user drops a raw MP3 into a specific genre root directory (e.g., `public/music/Techno/my_track.mp3`).
- **Processing:** The script runs, executes `analyzer.py` which uses `librosa` (Digital Signal Processing) to locate the highest energy spike (the Drop).
- **Cues Determination:** Sets `startTime` to 15 seconds before the Drop (the Build-up) and `endTime` to 45 seconds after the Drop.
- **Execution:** Moves the verified MP3 physically into that genre's `analyzed/` subfolder, generates a unique ID, maps the correct bucket based on the directory name, and records it to `catalog.json`.
- **Re-analyze mode:** Running `python scan_music.py --reanalyze` loops through existing tracks and resets cue points without overriding explicit user edits (like title changes).

---

## 🎨 UI / Layout
- **App shell:** Full-height flex column — header (fixed) → scrollable main → deck player (in-flow footer, does not overlap catalog).
- **Catalog (`TrackList`):** XDJ-AZ **BROWSER** screen with column headers (Title, Artist, Genre, Preview, Rate, Note), genre folder chips, row highlight for selected/playing tracks.
- **Player (`GlobalPlayer`):** **Deck A** unit with LCD track info, waveform, transport button, and CUE IN/OUT strip (editable in admin, read-only for couples).
- **Theme tokens:** Defined in `src/index.css` — `xdj-cyan`, `xdj-gold`, `xdj-orange`, `.panel-luxury`, `.xdj-browser`, `.xdj-deck`, `.chip-xdj`, etc.
- **Fonts:** Inter (UI) + JetBrains Mono (LCD labels, times, browser chrome).

---

## 📊 Current UI Components (Atomic Design)
All UI components are tightly decoupled in `src/components/`:

| Component | Role |
|-----------|------|
| `DJPoolDemo.jsx` | Global app state, flex layout shell, admin/couple routing |
| `PreferencesWizard.jsx` | Schema-driven multi-step wizard (next/back/skip) |
| `DynamicWizardStep.jsx` | Renders a custom question step from form schema |
| `DynamicQuestionField.jsx` | Single dynamic field (text, textarea, date, select) |
| `WizardProgress.jsx` | Step progress bar (labels from schema) |
| `WizardStepGenres.jsx` | Genre selection + 1–5 star style ratings |
| `WizardStepEnergy.jsx` | Energy level: chill / mixed / party |
| `WizardStepPhases.jsx` | Per-phase genre mapping (reception, dancing, dessert, hora) |
| `WizardStepPlaylists.jsx` | Must-play, do-not-play lists + DJ notes |
| `WizardStepSummary.jsx` | Dynamic recap + finish/skip |
| `CategorySelector.jsx` | Style filter with per-genre 1–5 ratings |
| `CategoryStyleRow.jsx` | Genre toggle chip + star rating row |
| `TrackList.jsx` | XDJ browser table; hides missing files |
| `StarRating.jsx` | 1–5 star rating atom |
| `TrackCommentInput.jsx` | Per-track note input atom |
| `TrackFeedback.jsx` | Composes stars + comment for each row |
| `ClientLogin.jsx` | Couple login via DJ-provided access code |
| `ClientManager.jsx` | Admin CRUD for wedding clients |
| `FormBuilder.jsx` | Admin form editor — steps, questions, reorder |
| `AdminTabNav.jsx` | Admin tabs: CATALOG / CLIENTS / FORM / INSIGHTS |
| `AdminTable.jsx` | Editable cue points, titles, deletes |
| `AdminDashboard.jsx` | Preferences summary + category breakdown + 5-star list |
| `ClientPreferencesSummary.jsx` | Read-only admin view of couple's answers |
| `CategoryBreakdown.jsx` | Genre selection % + style star ratings |
| `FiveStarList.jsx` | Perfect-rated tracks with comments |
| `GlobalPlayer.jsx` | XDJ deck footer player (Wavesurfer) |

### Hooks & Lib
| File | Role |
|------|------|
| `hooks/useTrackFeedback.js` | Ratings, comments, categories, categoryRatings, preferences — per client |
| `hooks/useClients.js` | Client database CRUD + login session |
| `hooks/useFormSchema.js` | Admin CRUD for wizard form schema |
| `lib/categories.js` | Official 8 genre bucket list |
| `lib/preferences.js` | Default preferences schema, energy levels, event phases |
| `lib/defaultFormSchema.js` | Default wizard steps + question types |
| `lib/formSchemaStorage.js` | `localStorage` load/save for form schema |
| `lib/formAnswers.js` | Get/set/validate dynamic question answers |
| `lib/trackFeedbackStorage.js` | `localStorage` load/save for full client session |
| `lib/feedbackAnalytics.js` | Pure helpers for admin dashboard |
| `lib/clientStorage.js` | `localStorage` load/save for clients |

---

## 💾 localStorage Keys

| Key | Purpose |
|-----|---------|
| `kramer-music-clients-v1` | All wedding clients (name, login code) |
| `kramer-music-active-client-v1` | Currently logged-in client session |
| `kramer-music-form-schema-v1` | Admin-editable wizard form definition |
| `kramer-music-track-feedback-v1-{clientId}` | Per-client ratings, comments, categories, preferences |

### Client session blob (`kramer-music-track-feedback-v1-{clientId}`)

```js
{
  ratings: { "track_id": 5 },
  comments: { "track_id": "Play during dessert" },
  selectedCategories: ["Israeli", "Trance"],
  categoryRatings: { "Israeli": 5, "Trance": 3 },
  preferences: {
    wizardCompleted: true,
    eventDate: "2026-09-15",
    eventLocation: "אולם הרודס, תל אביב",
    energyLevel: "mixed",
    phases: {
      reception: ["Israeli", "Oldies"],
      dancing: ["Trance", "Techno"],
      dessert: ["Loazi"],
      hora: ["Mizrahit"]
    },
    mustPlay: ["שיר כניסה - ..."],
    doNotPlay: ["אסור לנגן - ..."],
    djNotes: "הערות חופשיות",
    customAnswers: {
      "custom.q_abc123": "תשובה לשאלה מותאמת"
    }
  }
}
```

### Form schema blob (`kramer-music-form-schema-v1`)

```js
{
  version: 1,
  steps: [
    {
      id: "event-details",
      stepType: "questions",       // "questions" | "genres" | "energy" | "phases" | "playlists" | "summary"
      title: "פרטי האירוע",
      description: "...",
      questions: [
        { id: "eventDate", type: "date", label: "תאריך האירוע", required: true, fieldKey: "eventDate" },
        { id: "eventLocation", type: "text", label: "מיקום האירוע", required: true, fieldKey: "eventLocation" }
      ]
    },
    { id: "genres", stepType: "genres", title: "...", questions: [] },
  ]
}
```

**Question types for custom fields:** `text`, `textarea`, `date`, `select`  
**Built-in step types** (title/description editable; content is system-driven): `genres`, `energy`, `phases`, `playlists`, `summary`

---

## 🔄 User Flows

### Couple
1. Log in with DJ-provided access code
2. Complete (or skip) the **Preferences Wizard** (rendered from admin form schema)
3. Select and rate music styles (1–5 stars per genre)
4. Browse catalog in XDJ browser, preview tracks, rate and comment
5. Use **ערוך העדפות** in header to re-open wizard (ratings preserved)

### Admin
| Tab | Purpose |
|-----|---------|
| **CATALOG** | Edit tracks, cue points, filenames; export `catalog.json` |
| **CLIENTS** | Create/delete clients, copy login codes |
| **FORM** | Edit wizard steps, add custom questions, reorder steps, reset to default |
| **INSIGHTS** | Per-client: event details, custom answers, genre ratings, 5-star tracks |

---

## 🛑 Guards & Safety Protocols
- **Missing Files Guard:** HEAD check on catalog load; `isMissing: true` if MP3 absent on disk.
- **View Masking:** Couple `TrackList` filters `isMissing` tracks; `AdminTable` highlights them in red.
- **Persistence Race Fix:** Client feedback saves on user action only (not on empty mount).
- **Layout:** Player is in-flow (not `position: fixed`) so catalog scroll is never hidden behind the deck.

---

## ✅ Completed Features
1. **State Persistence** — Ratings, comments, categories, categoryRatings, and preferences per client.
2. **Client Sessions** — Admin creates clients; couples log in with access codes.
3. **Wedding Preferences Wizard** — Multi-step form (event details, genres, energy, phases, playlists, summary).
4. **Style Ratings** — 1–5 stars per music genre (in wizard and `CategorySelector`).
5. **Track Comments** — Per-track notes in browser rows.
6. **Admin Analytics** — INSIGHTS tab: preferences, genre breakdown, 5-star track list.
7. **Admin Form Builder** — FORM tab: edit steps, add custom questions, reorder, reset schema.
8. **Dynamic Wizard** — Couple form renders from admin-defined schema at runtime.
9. **XDJ-AZ UI** — Luxury browser + deck player design.
10. **KREMER Branding** — Logo header.

---

## 🎯 Future Ideas
- Export couple feedback + preferences as PDF/JSON for the DJ
- Backend / database sync for multi-device access
- Drag-and-drop step reordering in form builder
- BPM / key columns in browser (if added to catalog ingestion)
