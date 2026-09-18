# Rise Up Manpower

A full website and admin panel for a manpower recruitment and staffing
agency, built with Next.js and a self-contained SQLite database - no external
database server, no paid services required to run it, and nothing to
compile at install time.

**Who this is for.** Any staffing or recruitment firm that wants its own
branded site plus a private back office, without paying a monthly fee to a
website builder or a recruitment SaaS. Two kinds of visitor use the public
site - an employer who needs staff, and a candidate looking for work - and
neither ever creates an account. They fill one of two forms, and the
submission lands in the admin panel, where staff review it and approve it
into a permanent contact record. Everything else on the public site - the
logo, the colours, light or dark mode, the wording, the team, the services,
the photo gallery, the client logos, the posts - is edited from the admin
panel, not from the code.

## Features

- **Two public forms**, employer and candidate, each with the fields a real
  staffing agency actually asks for (industry, manpower type, skill level,
  a candidate's resume and photo, and so on) - not a generic contact form.
- **A private admin panel** at `/admin`: review and approve submissions into
  contacts, manage staff accounts with granular permissions, see visitor
  statistics, take backups, and apply updates.
- **A Themes screen** with the live website beside the controls: switch
  device width, switch light or dark mode, and edit wording by selecting it
  directly in the preview.
- **Light and dark mode**, chosen by the company and switchable by the
  visitor, with no flash of the wrong colours on load.
- **A photo gallery, a moving row of client logos, and a posts feed** (shown
  either as notice cards or as a square Instagram-style grid), all managed
  from the admin panel.
- **Granular staff permissions** - a new admin feature only needs a key added
  to one registry file, and the Users screen renders its own tick-boxes.
- **Security built in, not bolted on**: scrypt password hashing, signed
  HttpOnly session cookies, brute-force lockout, an allow-list HTML
  sanitiser, CSRF protection, and uploaded documents are sniffed for
  embedded scripts and macros before they are accepted - see **Security**
  below.
- **Privacy-respecting analytics** - visits are counted without storing an
  IP address or setting a tracking cookie.
- **Built for AI-assisted search**: `/llms.txt`, structured data, and a
  `robots.txt` that explicitly welcomes AI crawlers, all generated from the
  same settings a human editor uses.
- **A real update system**: `npm run update` backs up the database and
  uploads first, and rolls everything back automatically if anything about
  the update fails.

---

## Requirements

- **Node.js 22.5 or newer** (24 LTS recommended)

Nothing has to be compiled at install time. The database is SQLite through
Node's own built-in driver, so there is no build-tools step on the server.

---

## Setting it up

```bash
npm install      # also creates .env with a SESSION_SECRET, and the data folders
npm run migrate  # builds the database
npm run seed     # optional: fills the site with realistic demo data
npm run dev      # http://localhost:3000
```

For production:

```bash
npm run build
npm start
```

Sign in at **`/admin`**. After `npm run seed` the account is `admin` /
`ChangeMe@2026` - **change it immediately** from My account.

To create an administrator by hand:

```bash
npm run create-admin
```

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (runs migrations first) |
| `npm run build` | Runs migrations, then builds for production |
| `npm start` | Serves the built site |
| `npm run migrate` | Applies pending database migrations |
| `npm run migrate -- --status` | Shows the schema version and what is pending |
| `npm run seed` | Fills an empty site with demo data |
| `npm run seed:force` | Replaces existing content with demo data (asks first) |
| `npm run create-admin` | Creates or resets a super-admin account |
| `npm run backup` | Backs up the database and every uploaded file |
| `npm run backup -- --list` | Lists the backups |
| `npm run restore -- <name>` | Restores a backup (backs up the current state first) |
| `npm run update:check` | Checks the repository for a newer version, changes nothing |
| `npm run update` | Applies an update, with automatic rollback on failure |

---

## How the data is laid out

```
data/                 never committed; an update cannot touch it
  riseup.db           the database
  uploads/            every uploaded image and resume
  backups/            timestamped backups
  logs/               update logs
migrations/           numbered SQL files, applied once each, in order
```

Uploads deliberately live outside the code folder, so pulling new code can
never delete them.

---

## Updates

`npm run update` runs a fixed sequence and stops safely at any failure:

1. Check the repository for a newer version
2. **Back up the database and uploads**
3. Record the current commit for rollback
4. Pull the new code
5. Install any new packages
6. **Run migrations** - these only ever add tables, columns and settings;
   they never drop or reset existing data
7. Build
8. Verify (database integrity, schema version, admin accounts, build output)
9. Finish

If any step fails, the code is reset to the previous commit, the database is
restored from the backup taken at step 2, the previous version is rebuilt, and
a full log is written to `data/logs/`. The site is never left half-updated.

Migrations are append-only. Never edit one that has already shipped - the
runner stores a checksum and refuses to continue if a file changed. Add a new
numbered file instead.

---

## Security

- Passwords: scrypt with a per-password salt. They cannot be read back.
- Sessions: signed, HTTP-only, same-site cookies, held server-side and revocable.
- Six wrong passwords locks an account for fifteen minutes, and it is logged.
- Every admin page and every admin action checks its own permission on the
  server. Hiding a menu item is only cosmetic; the check is what matters.
- Announcement HTML is filtered through an allow-list on the way in and again
  on the way out, so a staff account cannot plant a script.
- Uploaded images are re-encoded, which strips anything hidden inside them.
  An SVG is rasterised rather than trusted, since markup can carry a script.
- Uploaded documents (resumes) are checked against their actual bytes, not
  the file name a visitor gave them, and are rejected outright if they
  contain a PDF action/script or a Word macro. The extension a document is
  saved under always comes from what it was sniffed as, never from the name
  on the file - so a file named to look like something harmless cannot be
  smuggled in under a different, more dangerous extension. Staff review a
  resume inside a sandboxed viewer in the admin panel itself; nothing in an
  uploaded file is ever able to run.
- State-changing requests must come from this site (origin check + same-site
  cookie), which closes off cross-site request forgery.
- `/admin` is never indexed and never cached.
- Visitor statistics store no IP address and set no tracking cookie.

Set `SESSION_SECRET` in `.env` before going live - `npm install` generates one,
but it must be the same value on every server if you run more than one.

---

## Deploying it

The build produces an ordinary Node.js server - there is no dependency on
any particular host. A small VPS or an office server is enough; SQLite means
there is no separate database to provision.

```bash
git clone <this repository> riseup-manpower
cd riseup-manpower
npm install
cp .env.example .env    # fill in SESSION_SECRET and NEXT_PUBLIC_SITE_URL
npm run migrate
npm run create-admin    # create the first staff account
npm run build
npm start                # or hand this off to a process manager
```

Keep it running with a process manager such as **pm2** or a **systemd**
service, so it restarts on its own after a crash or a server reboot:

```bash
pm2 start "npm start" --name riseup-manpower
pm2 save
```

Put it behind a reverse proxy (nginx, Caddy, or similar) for the actual
public domain and HTTPS certificate. If the proxy terminates HTTPS and
forwards to this app over plain HTTP on the same machine, nothing further is
needed - the app reads the proxy's own `x-forwarded-proto` header and sets
the session cookie correctly on its own. Only set `SESSION_COOKIE_SECURE` in
`.env` if a proxy is being used that does **not** send that header.

Take the domain (and only the domain) that the site is actually reached on,
and put it in `NEXT_PUBLIC_SITE_URL` - it is used for the sitemap, share
links and SEO tags.

`data/` holds everything that must survive an update: the database and every
uploaded file. Back it up on whatever schedule matters to the business -
`npm run backup` does it in one step, database and uploads together.

---

## How the website looks

Everything about the appearance is on one screen: **Admin > Themes**. The live
website sits beside the controls, at full width, tablet width or phone width,
and in either mode.

### Light and dark mode

The website has two complete modes. Light is the default. Under
**Themes > Appearance** you can choose which one a first-time visitor arrives
on, whether a phone already set to dark mode wins over that choice, and whether
to show the sun and moon switch in the header at all.

A visitor's choice is remembered in their own browser. Nothing is sent to the
server and no cookie is set, so it does not affect caching or privacy. The mode
is decided before the page is painted, so it never flashes the wrong colours.

The brand colour chosen under **Themes > Appearance** is used in both modes.

### Editing wording straight from the preview

On the Themes screen, press **Edit text on the page**. Every heading, button
label and intro that can be changed is outlined in the preview. Select one,
change it, and press save. The preview reloads showing it live on the website.

Only wording that is meant to be edited this way can be reached, whatever a
page claims. The list is `PREVIEW_FIELDS` in `src/lib/theme-groups.ts`.

### The hero photographs

Uploaded in **Themes > Home page > Hero background photos**. Add two or more
and they cross-fade in the tall frame beside the heading, with a slow zoom and
a drift against the mouse. Until any are added a brand gradient stands in, so
the page never looks broken.

`npm run seed` writes three drawn stand-ins so a demo install looks finished.
Replace them with real photographs before going live.

## Demo photographs

`npm run demo:photos` replaces the drawn placeholder images with real
photographs, so a demo install looks like a website rather than a wireframe.
It fills the hero, the photo gallery, the six team portraits and the cover
picture on every post.

**These are placeholders, not the company's photographs.** They come from two
free services that need no account:

- **loremflickr.com** for the scenes, chosen by keyword (factory, warehouse,
  construction, training and so on)
- **randomuser.me** for the staff portraits, which exists for exactly this
  purpose

The portraits are assigned in list order. They are pictures of strangers, not
of the people named beside them, so they must be replaced before the site goes
live. Everything is re-encoded through sharp on the way in, exactly as an
upload through the admin panel is, which strips the original metadata and
converts it to WebP.

Run it again at any time for a fresh set; it clears up after itself. Replace
the pictures properly from **Admin > Themes**, **Admin > Photo gallery**,
**Admin > Our team** and **Admin > Posts**.

## The photo gallery

**Admin > Photo gallery.** Upload several photographs at once, give each a
title and a caption, drag the order with the arrows, and hide any without
deleting it. They appear on the home page in a grid, and open full size with
the arrow keys and Escape.

How many appear on the home page, and the heading above them, are under
**Themes > Home page**. With no photographs the section does not appear.

## The moving row of client logos

**Admin > Themes > Row add-ons > Client logos.** The row slides steadily to the
left and never stops.

Every logo is scaled to one height and keeps its own width, so a long wordmark
and a square badge sit together evenly however they were supplied. A PNG with a
transparent background works best. The height, the speed of one full pass and
whether the logos are shown in grey until pointed at are all under
**Themes > Home page**.

Each logo can carry a website address, which makes it a link. The company name
is required because it is what a screen reader reads out in place of the image.

With no logos the row does not appear, and nothing is seeded, so it stays empty
until real client logos are uploaded.

## Pulling in social posts

**Settings > Social media** can show recent Instagram posts on the home page.
It needs an access token from a Meta developer app connected to the company's
Instagram **business or creator** account; Instagram no longer allows
anonymous feed reading. Paste the token, switch the section on, and use
**Test the connection** to check it. Posts are cached for an hour. With no
token the section simply does not appear.

## Being found, by search engines and by AI assistants

- `robots.txt` explicitly allows GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended and the rest, so assistants can read the site and recommend
  the company. Turn it off in **Settings > Search engines** if that is not
  wanted.
- `/llms.txt` is a plain-text brief written for AI assistants: what the firm
  does, services, contact details, where to send people, recent notices and any
  FAQs. Everything comes from the database, so an assistant cannot repeat a
  claim the company never made.
- Structured data (`EmploymentAgency`, `WebSite`, `FAQPage`, `NewsArticle`) is
  emitted on the relevant pages, again built only from real settings.
- Add question-and-answer pairs under **Settings > Search engines > Common
  questions**: one line for the question, the next for the answer, then a blank
  line. These feed both the FAQ rich result and `/llms.txt`.

## Configuration

Everything the public site shows is editable from **Settings** in the admin
panel: the logo, colours, company details, the hero heading, contact details,
the statistics, the social links, the form dropdowns, SEO tags, email alerts
and the update repository.

`.env` holds only what has to exist before the database does - see
`.env.example`.
