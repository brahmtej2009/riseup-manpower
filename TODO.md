# Remaining work

**Status: worked through on the night of 14 September 2026.**
Unticked items below are the ones still open.

To be carried out once the countdown reaches **11:30 PM IST, 14 September 2026**.

The brand colour was changed from red to blue ahead of that (migration 006,
`#1877D9`). The navy structure stays.

Guiding rules for every item below:
- Prefer **centred** layouts over left-aligned walls of text.
- More breathing room. Nothing cramped, nothing cluttered.
- New theme only: deep navy, blue accent, uppercase display headings.
- No invented copy. No em dashes.
- Prefer a new page over a popup or a crammed sidebar.

---

## 1. Public site still on the old blue styling

These were built before the theme change and have not been brought across.

- [x] `PageHeader` component rebuilt dark/navy and centred, breadcrumb centred
      under the title.
- [x] **Announcements list** (`/announcements`) - centre the heading and filter
      row, widen the gutters, restyle the category pills and the search box.
- [x] **Announcement detail** (`/announcements/[slug]`) - centre the article
      column, restyle the sidebar CTA card to navy, check `prose-ru` colours
      against the red accent.
- [x] **Team page** (`/team`) - centre the grid, give the cards more room.
- [x] **Contact page** (`/contact`) - currently a two-column split that reads as
      cluttered. Centre it: form in the middle, contact details as a calm row
      underneath rather than a sidebar.
- [x] **Register pages** (employer + candidate) - centre the form shell, restyle
      the step indicator, move the "would you rather call" card below the form
      instead of beside it.
- [x] **Cards** - `AnnouncementCard`, `TeamCard`, `ServiceCard` still carry
      blue-era hover and ring colours.
- [x] **Form controls** - `fields.tsx` and `FormShell.tsx` use `brand-600` for
      focus rings and the active step. Check contrast on white.
- [x] **404 page** - restyle to navy.
- [x] **Footer** - verify the navy version reads well and is not top-heavy now
      that a column was removed.
- [x] **WhatsApp floating button** - check the green still sits well against
      the blue and the navy.

## 2. Make it respond to the mouse

The site is static once it has loaded. Add restrained, good-taste pointer
interaction. Nothing gimmicky, nothing that fights the content.

- [x] **Cards lift and tilt slightly toward the cursor** - announcement cards,
      team cards, service cards. Small rotation, spring easing, resets on leave.
- [x] **Buttons get a cursor-following sheen** - a soft highlight that tracks
      the pointer across the primary buttons.
- [x] **Hero responds to the pointer** - the background photograph drifts a few
      pixels against the cursor (parallax), the heading stays put.
- [x] **Team photographs** - subtle zoom and a name/role reveal on hover, done
      with motion rather than a hard swap.
- [x] **Nav underline follows the pointer** across the header links, not just
      the active page.
- [x] **Announcement cards** - the cover image pans slightly under the cursor.
- [x] **Statistics** - each figure lifts a little when pointed at.
- [ ] **Custom cursor affordance** on interactive surfaces where it helps.
- [x] Every one of these must be disabled under `prefers-reduced-motion`, and
      must not fire on touch devices where there is no pointer. Use
      `@media (hover: hover) and (pointer: fine)`.

## 3. Admin

- [x] **Click through the rebuilt messages inbox** in a browser. Never verified:
      open/close, mark read, flag, archive, delete, internal note.
- [x] **Click through `/admin/users/new`**. Never verified: role presets,
      permission tick-boxes, password suggest, create.
- [x] **Submissions tabs** - make Employers / Candidates read as two clear
      buttons at the top, as asked, rather than three small pills.
- [x] **Submissions** de-cluttered, two clear buttons at the top.
- [ ] Dashboard and Settings are still fairly dense. Worth another pass if the
      client still finds them busy.
- [~] **Announcement editor** - the editor mounts and the full toolbar renders.
      Ctrl+V paste and drag-and-drop still have not been driven by hand, because
      the test browser cannot put an image on the clipboard. Worth one manual
      check before handover.
- [x] **Media library** - the seed writes files to disk without `media` rows, so
      the library looks empty on a demo install. Backfill them in the seed.

## 4. Verification

- [x] Full click-through of every admin screen. Found and fixed a crash on
      the Media library (a function was being passed from a server component
      to a client one).
- [x] Mobile pass over every public page.
- [x] Re-run the security sweep (admin redirects, exports, upload, CSRF,
      traversal) after the routing changes.
- [x] Check `/llms.txt` output and the JSON-LD blocks render valid.
- [x] Confirm no em dashes have crept back in.
- [x] Confirm nothing red is left anywhere except genuine error and delete
      states, which stay rose.
- [ ] Clean-room test not run: it would delete the demo data currently loaded.
      Do it on a copy of the folder before handover.

## 5. Documentation

- [x] `PROJECT-SCOPE.txt` - add the social feed, the AI/SEO work and the new
      theme. Send the updated copy over.
- [x] `README.md` - document `hero_gallery`, the Instagram token, `llms.txt` and
      the AI crawler setting.

---

## Known gaps, deliberately left

- The Alexa-style About / What We Do / Current Openings / Blogs pages are not
  here, because invented pages were cut on request. Say the word to add any.
- Hero rotating words default to empty rather than inventing words for the
  client. The field is in Settings > Home page.
- The update system has not been run end to end, as it needs a real git remote.

---

## 6. Light and dark mode, the new front page, gallery and logos

Worked through on 15 September 2026, after the client said the site was not
attractive and that the front page should not be black.

### Two modes
- [x] The whole palette moved onto semantic CSS variables (`--bg`, `--surface`,
      `--line`, `--fg` and friends) in `globals.css`, exposed through Tailwind
      as `surface` / `surface-page` / `surface-soft` / `surface-alt`, `line`,
      `line-strong` and a now variable-driven `ink`.
- [x] Light is the default. Dark is a full re-skin, not an inversion.
- [x] The admin panel is pinned to light with `.admin-scope`, so it is
      unaffected whichever mode the website is in.
- [x] The mode is chosen before the first paint by a small inline script
      (`src/lib/theme.ts`), so there is no flash of the wrong colours.
- [x] The visitor's choice is kept in `localStorage` on their own device. No
      cookie, nothing sent to the server.
- [x] Sun / moon switch in the header, which the company can hide.
- [x] The brand colour set in the admin panel still overrides the palette at
      runtime in both modes.

### The front page
- [x] Hero rebuilt: it is no longer a dark photograph with words on top. Text on
      the left, a tall photo frame on the right with a slow cross-fade and a ken
      burns drift, a second offset frame, and a card that lifts off the corner
      showing the first figure from the admin panel.
- [x] Header and footer taken off navy and onto the theme variables.
- [x] `PageHeader` is now a soft band that follows the mode.
- [x] More motion: scroll progress line in the header, drifting colour clouds,
      pointer parallax on the photographs, staggered reveals, counters, hover
      sheen. All of it still stops under `prefers-reduced-motion`.

### Sections the client asked for
- [x] **What we do** now renders on the home page from the Services screen,
      with its icon, summary and key points.
- [x] **Photo gallery**, managed at `/admin/gallery`: upload several at once,
      title and caption each one, reorder, hide, remove. Shown on the home page
      as a grid that opens full size with arrow keys and Escape.
- [x] **Client logo row**, managed at `/admin/themes/logos`: a row that slides
      left forever. Every logo is scaled to one height and keeps its own width,
      so a long wordmark and a square badge sit together evenly. Height, speed
      and the grey treatment are all settings.

### Themes screen
- [x] `/admin/themes` with the live website beside the controls.
- [x] The website settings moved off Settings: `theme`, `branding`, `home` and
      `stats` are now owned by Themes, and Settings refuses to write them.
- [x] The preview is the real site in an iframe, with desktop / tablet / phone
      widths and a light / dark switch.
- [x] "Edit text on the page" outlines every editable piece of wording. Select
      one, change it, save, and the preview reloads showing it live. Only keys
      on the `PREVIEW_FIELDS` allow-list can be written this way.
- [x] Row add-ons are cards linking to the Gallery and Client logos screens,
      showing how many are in each and whether the section is switched on.
- [x] New permission group: Themes and appearance (`theme.view`, `theme.edit`),
      plus Photo gallery (`gallery.view`, `gallery.edit`, `gallery.delete`).

### Verification done
- [x] `tsc --noEmit` clean, production build clean, no server errors.
- [x] No horizontal overflow at 375, 820 or 1280 px.
- [x] Fixed a real bug found in testing: the hero grid used `1.04fr` tracks,
      which let the heading push the column 493 px wide inside a 375 px phone.
      Now `minmax(0, ...)` with `min-w-0`.
- [x] Fixed the skip link, which would have been white on white in dark mode.
- [x] Every colour token verified to flip correctly in both modes.
- [x] Em dashes removed from the last places migration 005 missed, including
      the job designations on the team page (migration 008), and from the seed
      script so a fresh install cannot reintroduce them.

### Still open
- [ ] The admin screens above have not been clicked through in a browser this
      round, because that needs a signed-in session. Worth one pass over
      Themes, Photo gallery and Client logos before handover.
- [ ] No client logos are seeded. Inventing company logos would imply clients
      the company may not have, so the row stays empty until real ones are
      uploaded.
