#!/usr/bin/env node
// npm run seed          fill an empty site with realistic demo data
// npm run seed:force    wipe the demo-able tables and re-seed (asks first)
//
// The plain `seed` refuses to run if real data is already present, so live
// data can never be destroyed by someone running it out of habit.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import Database from './lib/sqlite.mjs';
import {
  loadEnv,
  ensureDirs,
  DB_PATH,
  UPLOAD_DIR,
  MIGRATIONS_DIR,
  c,
  ok,
  fail,
  warn,
} from './lib/paths.mjs';
import { hashPassword } from './lib/password.mjs';
import { runMigrations, schemaVersion } from './lib/migrator.mjs';
import { writeHeroImages } from './lib/hero-images.mjs';

loadEnv();
ensureDirs();

const FORCE = process.argv.includes('--force');
const QUIET = process.argv.includes('--quiet');

const db = Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --------------------------------------------------------------------------
// helpers
// --------------------------------------------------------------------------
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pickN = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);
const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70);
}

function ref(prefix, n) {
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}-${ym}-${String(n).padStart(4, '0')}`;
}

function phone() {
  return `+91 ${int(70, 99)}${int(100, 999)} ${int(10000, 99999)}`;
}

// Files written during seeding, recorded in the media library at the end so
// the library is not mysteriously empty on a demo installation.
const writtenFiles = [];

/** Writes an SVG file to the uploads folder and returns its public path. */
function writeSvg(name, svg, folder = 'general') {
  const filename = `${name}-${crypto.randomBytes(4).toString('hex')}.svg`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const full = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(full, svg, 'utf8');

  writtenFiles.push({
    filename,
    original_name: `${name}.svg`,
    path: `/uploads/${filename}`,
    mime: 'image/svg+xml',
    size: fs.statSync(full).size,
    folder,
  });

  return `/uploads/${filename}`;
}

const AVATAR_COLORS = [
  ['#1552F0', '#3B82F6'],
  ['#0E7490', '#06B6D4'],
  ['#7C3AED', '#A78BFA'],
  ['#B45309', '#F59E0B'],
  ['#15803D', '#4ADE80'],
  ['#BE123C', '#FB7185'],
];

function avatarSvg(name) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const [a, b] = pick(AVATAR_COLORS);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="400" height="400" fill="url(#g)"/>
<text x="200" y="200" font-family="Segoe UI,Arial,sans-serif" font-size="150" font-weight="600"
 fill="#ffffff" fill-opacity=".92" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;
}

function coverSvg(title) {
  const [a, b] = pick(AVATAR_COLORS);
  const safe = title.replace(/[<>&]/g, '').slice(0, 46);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse">
<circle cx="2" cy="2" r="1.5" fill="#fff" fill-opacity=".18"/></pattern></defs>
<rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#p)"/>
<text x="70" y="330" font-family="Segoe UI,Arial,sans-serif" font-size="58" font-weight="700"
 fill="#fff" fill-opacity=".96">${safe}</text>
<text x="70" y="396" font-family="Segoe UI,Arial,sans-serif" font-size="26"
 fill="#fff" fill-opacity=".75">Rise Up Manpower</text></svg>`;
}

function logoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
<stop offset="0" stop-color="#0B3BC4"/><stop offset="1" stop-color="#3B82F6"/></linearGradient></defs>
<rect width="256" height="256" rx="56" fill="url(#g)"/>
<path d="M70 176V96a8 8 0 0 1 8-8h28a30 30 0 0 1 12 57l24 31h-26l-21-28h-9v28H70zm16-45h18a15 15 0 0 0 0-30H86v30z" fill="#fff"/>
<path d="M150 176V88h17v88h-17z" fill="#fff" fill-opacity=".55"/>
<path d="M176 176V88h17v88h-17z" fill="#fff" fill-opacity=".8"/>
</svg>`;
}

// --------------------------------------------------------------------------
// demo source data
// --------------------------------------------------------------------------
const COMPANIES = [
  ['Shakti Auto Components Pvt Ltd', 'Manufacturing', 'Pune', 'Maharashtra'],
  ['Nirman Infra Projects', 'Construction & Infrastructure', 'Noida', 'Uttar Pradesh'],
  ['Veer Logistics & Warehousing', 'Logistics & Warehousing', 'Bhiwandi', 'Maharashtra'],
  ['Grand Palm Hotels', 'Hospitality & Hotels', 'Jaipur', 'Rajasthan'],
  ['Suraksha Facility Services', 'Facility Management', 'Gurugram', 'Haryana'],
  ['Annapurna Food Products', 'Food Processing', 'Indore', 'Madhya Pradesh'],
  ['Dhanlaxmi Textiles Mill', 'Textile & Garments', 'Surat', 'Gujarat'],
  ['Mahesh Steel Fabricators', 'Manufacturing', 'Ludhiana', 'Punjab'],
  ['CarePoint Multispeciality Hospital', 'Healthcare', 'Nagpur', 'Maharashtra'],
  ['Royal Mart Retail Chain', 'Retail', 'Lucknow', 'Uttar Pradesh'],
  ['Precision Pharma Labs', 'Pharmaceutical', 'Hyderabad', 'Telangana'],
  ['Sunrise Packaging Industries', 'Manufacturing', 'Faridabad', 'Haryana'],
  ['Jai Bhavani Constructions', 'Construction & Infrastructure', 'Nashik', 'Maharashtra'],
  ['Silverline Business Park', 'Facility Management', 'Bengaluru', 'Karnataka'],
];

const FIRST = ['Ramesh','Suresh','Amit','Vijay','Rakesh','Santosh','Pradeep','Manoj','Dinesh','Ashok','Sunil','Rajesh','Kunal','Deepak','Anil','Sandeep','Ravi','Gopal','Mukesh','Naresh','Sita','Anita','Kavita','Sunita','Pooja','Rekha','Meena','Priya','Lakshmi','Neha'];
const LAST = ['Kumar','Sharma','Verma','Yadav','Singh','Patil','Gupta','Prasad','Jadhav','Chauhan','Mishra','Pandey','Das','Reddy','Naik','Shinde','Thakur','Rathore','Joshi','Nair'];

const CITIES = [
  ['Pune', 'Maharashtra'], ['Mumbai', 'Maharashtra'], ['Nagpur', 'Maharashtra'],
  ['Delhi', 'Delhi'], ['Noida', 'Uttar Pradesh'], ['Lucknow', 'Uttar Pradesh'],
  ['Kanpur', 'Uttar Pradesh'], ['Patna', 'Bihar'], ['Ranchi', 'Jharkhand'],
  ['Jaipur', 'Rajasthan'], ['Surat', 'Gujarat'], ['Ahmedabad', 'Gujarat'],
  ['Indore', 'Madhya Pradesh'], ['Ludhiana', 'Punjab'], ['Bengaluru', 'Karnataka'],
  ['Hyderabad', 'Telangana'], ['Kolkata', 'West Bengal'], ['Gurugram', 'Haryana'],
];

const CATEGORIES = ['Factory / Production Worker','Helper / Unskilled Labour','Machine Operator','Welder / Fitter','Electrician','Driver (LMV)','Driver (HMV)','Security Guard','Housekeeping Staff','Warehouse / Packing Staff','Store Keeper','Data Entry Operator','Office Assistant','Accountant','Supervisor','Technician','Cook / Kitchen Staff','Mason'];

const SKILLS = {
  'Welder / Fitter': ['Arc welding', 'MIG welding', 'Gas cutting', 'Blueprint reading'],
  Electrician: ['Panel wiring', 'Motor rewinding', 'LT maintenance', 'Fault finding'],
  'Machine Operator': ['CNC operation', 'Lathe', 'Press machine', 'Quality checking'],
  'Data Entry Operator': ['MS Excel', 'Typing 40 wpm', 'Tally', 'Email handling'],
  Accountant: ['Tally ERP', 'GST returns', 'Bank reconciliation', 'MS Excel'],
  default: ['Punctual', 'Team work', 'Basic reading and writing', 'Physically fit'],
};

const POSTS = [
  {
    title: 'Walk-in interview for 120 production operators - Pune plant',
    category: 'Recruitment',
    urgent: 1,
    pinned: 1,
    excerpt:
      'A walk-in drive is being held for 120 production operator posts at a Pune auto components plant. ITI and freshers both eligible.',
    body: `<p>A walk-in interview is being conducted for <strong>120 production operator posts</strong> at an auto components manufacturing plant in Chakan, Pune.</p>
<h3>Requirement</h3>
<ul><li>Posts: Machine Operator, Helper, Quality Checker</li><li>Qualification: 10th pass / ITI (any trade)</li><li>Age: 18 to 32 years</li><li>Experience: Freshers and experienced both may apply</li></ul>
<h3>Salary and facilities</h3>
<ul><li>Rs. 16,500 to Rs. 21,000 per month, in hand</li><li>PF and ESI as per rules</li><li>Canteen and bus facility provided</li><li>Overtime paid separately</li></ul>
<h3>Documents to bring</h3>
<p>Aadhaar card, PAN card, two passport size photographs, and the original of the highest qualification certificate. Candidates without documents will not be interviewed.</p>
<blockquote><p>Venue and dates are given below. There is no fee of any kind at any stage.</p></blockquote>
<table><tbody><tr><th>Date</th><th>Time</th><th>Venue</th></tr>
<tr><td>Every Monday and Thursday</td><td>10:00 AM to 3:00 PM</td><td>Rise Up Manpower office, Chakan</td></tr></tbody></table>`,
  },
  {
    title: 'Security guards required for a Gurugram business park',
    category: 'Recruitment',
    urgent: 0,
    pinned: 0,
    excerpt:
      'Forty security guards and four supervisors are required for a business park in Gurugram. Ex-servicemen preferred for supervisor posts.',
    body: `<p>We are recruiting <strong>40 security guards</strong> and <strong>4 security supervisors</strong> for a corporate business park in Gurugram.</p>
<h3>Eligibility</h3>
<ul><li>Height 168 cm or above for guards</li><li>Age 21 to 45 years</li><li>Police verification compulsory</li><li>Ex-servicemen preferred for supervisor posts</li></ul>
<h3>Terms</h3>
<ul><li>12 hour duty, rotational shifts</li><li>Rs. 18,000 per month for guards, Rs. 24,000 for supervisors</li><li>Uniform provided</li><li>Accommodation available on request</li></ul>
<p>Interested candidates may register through the candidate form on this website, or visit the office with documents.</p>`,
  },
  {
    title: 'Office closed on 2 October - Gandhi Jayanti',
    category: 'Notice',
    urgent: 0,
    pinned: 0,
    excerpt: 'The office will remain closed on 2 October. Urgent deployment requirements will be handled on call.',
    body: `<p>Our office will remain closed on <strong>2 October</strong> on account of Gandhi Jayanti.</p>
<p>Deployments already scheduled for that day will continue as planned. For urgent requirements, clients may contact their account manager directly on the phone.</p>
<p>Normal working resumes from the next working day at 9:30 AM.</p>`,
  },
  {
    title: 'Now supplying trained housekeeping teams in Bengaluru',
    category: 'Company Update',
    urgent: 0,
    pinned: 0,
    excerpt:
      'Our housekeeping and facility staffing service is now operating in Bengaluru, with a supervisor-led team model.',
    body: `<p>We have extended our housekeeping and facility staffing service to <strong>Bengaluru</strong>.</p>
<p>Teams are deployed on a supervisor-led model - one supervisor for every eight staff, with a written duty roster, uniform, and a monthly material plan agreed with the client.</p>
<h3>Available from</h3>
<ul><li>Whitefield and ITPL area</li><li>Electronic City</li><li>Outer Ring Road corridor</li></ul>
<p>Clients in these areas may send their requirement through the employer form and we will revert with a deployment plan and rates within 24 hours.</p>`,
  },
  {
    title: 'Documents every candidate must keep ready',
    category: 'Guidance',
    urgent: 0,
    pinned: 0,
    excerpt:
      'A short checklist of the documents needed at the time of registration and joining. Keeping these ready avoids delays.',
    body: `<p>Candidates registering with us are asked to keep the following ready. Having these in hand shortens the time between selection and joining.</p>
<h3>Always required</h3>
<ul><li>Aadhaar card</li><li>PAN card</li><li>Bank passbook or cancelled cheque</li><li>Four passport size photographs</li></ul>
<h3>Required where applicable</h3>
<ul><li>ITI or diploma certificate and mark sheet</li><li>Experience letter or salary slip from the previous employer</li><li>Driving licence, for driver posts</li><li>Police verification, for security posts</li></ul>
<p><strong>Please note:</strong> we do not charge candidates any registration, placement or processing fee. If anyone asks you for money in our name, report it to the office immediately.</p>`,
  },
  {
    title: 'Revised minimum wage rates applicable from this quarter',
    category: 'Compliance',
    urgent: 0,
    pinned: 0,
    excerpt:
      'Revised minimum wage rates have come into effect. Client invoices and worker wage registers have been updated accordingly.',
    body: `<p>The revised minimum wage notification has come into effect for the current quarter. All wage registers and client invoices have been updated.</p>
<p>Clients do not need to take any action. Revised rate sheets have been sent to every active account, and the difference, where applicable, is reflected from this month onward.</p>
<p>For any clarification on category-wise rates, please contact the compliance desk.</p>`,
  },
];

const TEAM = [
  ['Rajendra Kulkarni', 'Founder & Managing Director', 'Has spent twenty-two years in industrial staffing and handles the firm’s key client accounts personally.'],
  ['Sheetal Deshmukh', 'Head - Operations', 'Runs deployment and site coordination across all locations.'],
  ['Imran Qureshi', 'Manager - Recruitment', 'Leads sourcing, trade testing and candidate verification.'],
  ['Anita Bhosale', 'Manager - Compliance & Payroll', 'Handles PF, ESI, wage registers and statutory returns.'],
  ['Vikram Rathore', 'Client Relations', 'First point of contact for client requirements and escalations.'],
  ['Priya Menon', 'Executive - Candidate Support', 'Assists candidates through registration, documentation and joining.'],
];

const MESSAGES = [
  ['Arun Bhatia', 'arun.bhatia@sparkindustries.in', 'Requirement for 30 packers', 'We need 30 packing staff for our Bhiwandi warehouse from the 1st of next month. Please share your rates and the deployment timeline. Duty will be in two shifts.'],
  ['Meenakshi Rao', 'm.rao@carepointhosp.com', 'Housekeeping staff for hospital', 'Kindly send a proposal for 18 housekeeping staff and 2 supervisors for our Nagpur facility. We need people with hospital experience specifically.'],
  ['Sandeep Kadam', 'sandeepkadam91@gmail.com', 'Regarding my registration', 'I had registered as a welder two weeks back, reference number CAN-2608-0113. Please let me know if there is any opening in the Pune area.'],
  ['Farhan Shaikh', 'farhan@grandpalmhotels.com', 'Stewards and kitchen helpers', 'We are opening a new property in Jaipur in November and will need around 25 stewards and 12 kitchen helpers. Requesting a meeting to discuss.'],
  ['Deepa Nair', 'deepa.nair@precisionpharma.co.in', 'Compliance documentation', 'Could you share the PF and ESI challans for the last quarter for the staff deployed at our Hyderabad unit? Our audit is scheduled for next month.'],
  ['Harpreet Singh', 'hsingh.transport@gmail.com', 'HMV drivers available', 'I run a small transport agency and have 8 HMV drivers with valid licences looking for placement. Would you be interested in taking them on?'],
  ['Nilesh Patil', 'nilesh@jaibhavaniconstructions.in', 'Masons and helpers urgently', 'Urgently need 40 masons and 60 helpers for a site in Nashik. Work starts in 10 days. Please call back today if possible.'],
  ['Kavita Joshi', 'kavita.joshi22@outlook.com', 'Accountant position', 'I have 5 years of experience in Tally and GST filing. Am I eligible for any of the accountant openings you have listed?'],
];

// --------------------------------------------------------------------------
// safety check
// --------------------------------------------------------------------------
function countRealData() {
  const q = (sql) => {
    try {
      return db.prepare(sql).get().n;
    } catch {
      return 0;
    }
  };
  return {
    submissions: q('SELECT COUNT(*) AS n FROM submissions'),
    contacts: q('SELECT COUNT(*) AS n FROM contacts'),
    posts: q('SELECT COUNT(*) AS n FROM posts'),
    messages: q('SELECT COUNT(*) AS n FROM messages'),
    team: q('SELECT COUNT(*) AS n FROM team_members'),
    users: q('SELECT COUNT(*) AS n FROM users'),
  };
}

// --------------------------------------------------------------------------
// main
// --------------------------------------------------------------------------
async function main() {
  // The database must exist and be migrated before anything is inserted.
  if (schemaVersion(db) === 0) {
    console.log('Setting up the database first...');
    runMigrations(db, MIGRATIONS_DIR, (m) => console.log(m));
  } else {
    runMigrations(db, MIGRATIONS_DIR, () => {});
  }

  const before = countRealData();
  const contentRows =
    before.submissions + before.contacts + before.posts + before.messages + before.team;

  if (contentRows > 0 && !FORCE) {
    warn('This site already contains data. Demo data has NOT been added.');
    console.log(
      `      submissions ${before.submissions}, contacts ${before.contacts}, ` +
        `posts ${before.posts}, messages ${before.messages}, team ${before.team}`
    );
    console.log(`\n      To replace it with demo data anyway:  ${c.bold}npm run seed:force${c.reset}`);
    db.close();
    process.exit(0);
  }

  if (contentRows > 0 && FORCE && !QUIET) {
    warn('--force will DELETE all submissions, contacts, notes, posts,');
    warn('messages and team members, and replace them with demo data.');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const a = (await rl.question('Type DELETE to continue: ')).trim();
    rl.close();
    if (a !== 'DELETE') {
      console.log('Cancelled. Nothing was changed.');
      db.close();
      process.exit(0);
    }
  }

  const seed = db.transaction(() => {
    if (FORCE) {
      for (const t of ['contact_notes', 'contacts', 'submissions', 'posts', 'messages', 'team_members', 'media']) {
        db.prepare(`DELETE FROM ${t}`).run();
      }
      db.prepare("DELETE FROM users WHERE username LIKE 'demo_%'").run();
    }

    // -- admin accounts ----------------------------------------------------
    const adminUser = process.env.SEED_ADMIN_USERNAME || 'admin';
    const adminPass = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@2026';
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@riseupmanpower.com';

    let admin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUser);
    if (!admin) {
      const info = db
        .prepare(
          `INSERT INTO users (username, email, full_name, password_hash, role, is_super, permissions)
           VALUES (?, ?, ?, ?, 'super_admin', 1, '[]')`
        )
        .run(adminUser, adminEmail, 'System Administrator', hashPassword(adminPass));
      admin = { id: info.lastInsertRowid };
    }

    // A limited-permission demo account, to show the permission system.
    const managerPerms = JSON.stringify([
      'dashboard.view','submissions.view','submissions.approve','submissions.reject','submissions.export',
      'contacts.view','contacts.edit','contacts.export','notes.view','notes.create','notes.delete_own',
      'posts.view','posts.create','posts.edit','posts.publish',
      'team.view','team.edit','media.view','media.upload','messages.view','messages.manage','settings.view',
    ]);
    const manager = db
      .prepare(
        `INSERT OR IGNORE INTO users (username, email, full_name, password_hash, role, is_super, permissions, created_by)
         VALUES ('demo_manager', 'manager@riseupmanpower.com', 'Sheetal Deshmukh', ?, 'manager', 0, ?, ?)`
      )
      .run(hashPassword('Manager@2026'), managerPerms, admin.id);
    const managerId =
      manager.lastInsertRowid ||
      db.prepare("SELECT id FROM users WHERE username = 'demo_manager'").get()?.id;

    // -- branding ----------------------------------------------------------
    const setSetting = db.prepare(
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?"
    );
    // Stand-in photographs behind the hero, replaced from Settings later.
    const heroPaths = writeHeroImages(UPLOAD_DIR);
    setSetting.run(JSON.stringify(heroPaths), 'hero_gallery');
    for (const p of heroPaths) {
      const full = path.join(UPLOAD_DIR, path.basename(p));
      writtenFiles.push({
        filename: path.basename(p),
        original_name: 'hero background.svg',
        path: p,
        mime: 'image/svg+xml',
        size: fs.existsSync(full) ? fs.statSync(full).size : 0,
        folder: 'hero',
      });
    }

    const logoPath = writeSvg('logo', logoSvg());
    setSetting.run(logoPath, 'logo_path');
    setSetting.run(logoPath, 'favicon_path');
    setSetting.run('+91 98220 14567', 'phone_primary');
    setSetting.run('+91 20 4004 8890', 'phone_secondary');
    setSetting.run('919822014567', 'whatsapp_number');
    setSetting.run('info@riseupmanpower.com', 'email_primary');
    setSetting.run('careers@riseupmanpower.com', 'email_hr');
    setSetting.run('2nd Floor, Sai Corporate Centre', 'address_line1');
    setSetting.run('Near Chakan MIDC Gate No. 2', 'address_line2');
    setSetting.run('Pune', 'address_city');
    setSetting.run('Maharashtra', 'address_state');
    setSetting.run('410501', 'address_pincode');
    setSetting.run('https://www.facebook.com/', 'social_facebook');
    setSetting.run('https://www.instagram.com/', 'social_instagram');
    setSetting.run('https://www.linkedin.com/', 'social_linkedin');
    setSetting.run('https://www.youtube.com/', 'social_youtube');

    // -- team --------------------------------------------------------------
    const insTeam = db.prepare(
      `INSERT INTO team_members (name, designation, bio, photo_path, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, 1)`
    );
    TEAM.forEach(([name, role, bio], i) => {
      insTeam.run(name, role, bio, writeSvg('team', avatarSvg(name), 'team'), i + 1);
    });

    // -- posts -----------------------------------------------------
    const insAnn = db.prepare(
      `INSERT INTO posts
         (slug, title, excerpt, body_html, cover_path, category, tags, status, pinned, urgent,
          views, published_at, author_id, author_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    POSTS.forEach((a, i) => {
      const when = daysAgo(i * 4 + 1);
      insAnn.run(
        slugify(a.title),
        a.title,
        a.excerpt,
        a.body,
        writeSvg('cover', coverSvg(a.title), 'covers'),
        a.category,
        JSON.stringify([a.category.toLowerCase()]),
        a.pinned,
        a.urgent,
        int(40, 900),
        when,
        managerId,
        'Sheetal Deshmukh',
        when,
        when
      );
    });
    // One unpublished draft, so the admin list shows both states.
    insAnn.run(
      slugify('Diwali bonus and leave schedule - draft'),
      'Diwali bonus and leave schedule',
      'Draft notice about the bonus payout date and the holiday schedule.',
      '<p>Draft. The bonus payout date and the holiday schedule are still being confirmed with accounts.</p>',
      null,
      'Notice',
      '[]',
      0,
      0,
      0,
      null,
      managerId,
      'Sheetal Deshmukh',
      daysAgo(1),
      daysAgo(1)
    );
    db.prepare("UPDATE posts SET status='draft', published_at=NULL WHERE slug=?").run(
      slugify('Diwali bonus and leave schedule - draft')
    );

    // -- submissions + contacts -------------------------------------------
    const insSub = db.prepare(
      `INSERT INTO submissions
        (ref, type, status, name, email, phone, city, state, headline, data,
         photo_path, ip, review_note, reviewed_by, reviewed_at, contact_id, created_at, updated_at)
       VALUES (@ref, @type, @status, @name, @email, @phone, @city, @state, @headline, @data,
               @photo_path, @ip, @review_note, @reviewed_by, @reviewed_at, @contact_id, @created_at, @updated_at)`
    );
    const insContact = db.prepare(
      `INSERT INTO contacts
        (ref, type, status, name, email, phone, alt_phone, city, state, headline, data, tags,
         photo_path, submission_id, approved_by, approved_at, placed_at, created_at, updated_at)
       VALUES (@ref, @type, @status, @name, @email, @phone, @alt_phone, @city, @state, @headline,
               @data, @tags, @photo_path, @submission_id, @approved_by, @approved_at, @placed_at,
               @created_at, @updated_at)`
    );
    const insNote = db.prepare(
      `INSERT INTO contact_notes (contact_id, user_id, author_name, body, pinned, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    let subN = 0;
    let conN = 0;

    // Employers
    COMPANIES.forEach((comp, i) => {
      const [company, industry, city, state] = comp;
      const person = `${pick(FIRST)} ${pick(LAST)}`;
      const created = daysAgo(int(1, 150));
      const data = {
        company_name: company,
        industry,
        year_established: String(int(1998, 2021)),
        website: '',
        gst_no: `27${crypto.randomBytes(4).toString('hex').toUpperCase()}1Z5`,
        contact_person: person,
        designation: pick(['HR Manager', 'Proprietor', 'Plant Head', 'Admin Manager', 'Director']),
        email: `hr@${slugify(company.split(' ')[0])}.co.in`,
        phone: phone(),
        alt_phone: '',
        address_line: `Plot ${int(1, 90)}, ${pick(['MIDC', 'Industrial Area', 'Phase II', 'Sector 8'])}`,
        city,
        district: city,
        state,
        pincode: String(int(110001, 799999)),
        manpower_types: pickN(CATEGORIES, int(1, 3)),
        workers_required: String(int(5, 150)),
        skill_level: pick(['Unskilled', 'Semi-skilled', 'Skilled', 'Supervisory']),
        shift: pick(['General shift', 'Rotational shifts', '12 hour duty', 'Day shift']),
        salary_range: `Rs. ${int(14, 22)},000 - Rs. ${int(23, 38)},000`,
        work_location: `${city}, ${state}`,
        accommodation: pick(['Yes', 'No']),
        food: pick(['Yes', 'No', 'Canteen at subsidised rate']),
        urgency: pick(['Immediately', 'Within a week', 'Within 15 days', 'Within a month']),
        requirements:
          'Candidates must have valid Aadhaar and PAN. Prior experience in a similar industry preferred. Police verification required for stores and security posts.',
      };

      // Roughly two thirds of employers have been approved into contacts.
      const approved = i < 9;
      const status = approved ? 'approved' : i < 12 ? 'new' : pick(['new', 'reviewing', 'rejected']);
      subN++;
      const subRef = ref('EMP', subN);

      let contactId = null;
      if (approved) {
        conN++;
        const cInfo = insContact.run({
          ref: ref('CE', conN),
          type: 'employer',
          status: pick(['new', 'in_progress', 'in_progress', 'placed', 'on_hold']),
          name: person,
          email: data.email,
          phone: data.phone,
          alt_phone: '',
          city,
          state,
          headline: company,
          data: JSON.stringify(data),
          tags: JSON.stringify(pickN(['priority', 'repeat client', 'bulk', 'contract', 'new account'], int(0, 2))),
          photo_path: null,
          submission_id: null,
          approved_by: managerId,
          approved_at: created,
          placed_at: null,
          created_at: created,
          updated_at: created,
        });
        contactId = cInfo.lastInsertRowid;
      }

      const sInfo = insSub.run({
        ref: subRef,
        type: 'employer',
        status,
        name: person,
        email: data.email,
        phone: data.phone,
        city,
        state,
        headline: company,
        data: JSON.stringify(data),
        photo_path: null,
        ip: `10.0.${int(0, 255)}.${int(1, 254)}`,
        review_note: status === 'rejected' ? 'Could not verify the company address. Asked for GST certificate.' : null,
        reviewed_by: status === 'new' ? null : managerId,
        reviewed_at: status === 'new' ? null : created,
        contact_id: contactId,
        created_at: created,
        updated_at: created,
      });

      if (contactId) {
        db.prepare('UPDATE contacts SET submission_id = ? WHERE id = ?').run(
          sInfo.lastInsertRowid,
          contactId
        );
        if (Math.random() > 0.45) {
          insNote.run(
            contactId,
            managerId,
            'Sheetal Deshmukh',
            pick([
              'Spoke to the HR manager. Rates shared over email, awaiting confirmation.',
              'Client wants candidates with their own PPE. Informed the sourcing team.',
              'Payment terms agreed at 30 days from invoice. Confirmed on call.',
              'Site visit done. Accommodation is available for outstation workers.',
              'Requirement postponed by two weeks. Follow up at month end.',
            ]),
            0,
            created
          );
        }
      }
    });

    // Candidates
    for (let i = 0; i < 26; i++) {
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      const [city, state] = pick(CITIES);
      const category = pick(CATEGORIES);
      const created = daysAgo(int(1, 160));
      const exp = int(0, 14);
      const data = {
        full_name: name,
        guardian_name: `${pick(FIRST)} ${pick(LAST)}`,
        dob: `${int(1975, 2005)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
        gender: pick(['Male', 'Male', 'Male', 'Female']),
        email: `${slugify(name).replace('-', '.')}${int(11, 99)}@gmail.com`,
        phone: phone(),
        alt_phone: Math.random() > 0.6 ? phone() : '',
        address_line: `${int(1, 300)}, ${pick(['Shivaji Nagar', 'Gandhi Chowk', 'Nehru Colony', 'Station Road', 'Bhagat Singh Marg'])}`,
        city,
        district: city,
        state,
        pincode: String(int(110001, 799999)),
        qualification: pick(['10th pass', '12th pass', 'ITI', 'Diploma', 'Graduate', 'Below 10th']),
        certification: Math.random() > 0.6 ? pick(['ITI Fitter', 'ITI Electrician', 'Diploma in Mechanical', 'Fire safety certificate', 'Forklift licence']) : '',
        job_category: category,
        skills: SKILLS[category] || SKILLS.default,
        experience_years: String(exp),
        previous_employers: exp > 0 ? pick(COMPANIES)[0] : '',
        current_salary: exp > 0 ? `Rs. ${int(11, 26)},000` : '',
        expected_salary: `Rs. ${int(15, 34)},000`,
        preferred_locations: pickN(CITIES.map((cc) => cc[0]), int(1, 3)),
        relocate: pick(['Yes', 'Yes', 'No']),
        passport: pick(['No', 'No', 'Yes']),
        driving_licence: category.includes('Driver') ? pick(['LMV', 'HMV']) : pick(['', '', 'LMV']),
        languages: pickN(['Hindi', 'English', 'Marathi', 'Bengali', 'Telugu', 'Tamil', 'Gujarati'], int(1, 3)),
        availability: pick(['Immediate', 'Within 15 days', 'Within 30 days', 'Serving notice period']),
      };

      const approved = i < 16;
      const status = approved ? 'approved' : i < 21 ? 'new' : pick(['new', 'reviewing', 'rejected']);
      subN++;

      let contactId = null;
      if (approved) {
        conN++;
        const placed = i < 9;
        const cInfo = insContact.run({
          ref: ref('CC', conN),
          type: 'candidate',
          status: placed ? 'placed' : pick(['new', 'in_progress', 'in_progress', 'on_hold']),
          name,
          email: data.email,
          phone: data.phone,
          alt_phone: data.alt_phone,
          city,
          state,
          headline: category,
          data: JSON.stringify(data),
          tags: JSON.stringify(pickN(['verified', 'documents pending', 'immediate joiner', 'experienced', 'fresher'], int(0, 2))),
          photo_path: writeSvg('cand', avatarSvg(name), 'candidates'),
          submission_id: null,
          approved_by: managerId,
          approved_at: created,
          placed_at: placed ? daysAgo(int(1, 120)) : null,
          created_at: created,
          updated_at: created,
        });
        contactId = cInfo.lastInsertRowid;
      }

      const sInfo = insSub.run({
        ref: ref('CAN', subN),
        type: 'candidate',
        status,
        name,
        email: data.email,
        phone: data.phone,
        city,
        state,
        headline: category,
        data: JSON.stringify(data),
        photo_path: null,
        ip: `10.0.${int(0, 255)}.${int(1, 254)}`,
        review_note: status === 'rejected' ? 'Documents not submitted despite two reminders.' : null,
        reviewed_by: status === 'new' ? null : managerId,
        reviewed_at: status === 'new' ? null : created,
        contact_id: contactId,
        created_at: created,
        updated_at: created,
      });

      if (contactId) {
        db.prepare('UPDATE contacts SET submission_id = ? WHERE id = ?').run(
          sInfo.lastInsertRowid,
          contactId
        );
        if (Math.random() > 0.5) {
          insNote.run(
            contactId,
            managerId,
            'Sheetal Deshmukh',
            pick([
              'Documents verified. Aadhaar and PAN on file.',
              'Trade test cleared. Skill level confirmed as semi-skilled.',
              'Asked for a police verification copy. Pending.',
              'Deployed at the Chakan site from the 1st. Reporting to the shift supervisor.',
              'Candidate is not willing to relocate outside the district. Noted.',
              'Previous employer reference checked, conduct satisfactory.',
            ]),
            Math.random() > 0.85 ? 1 : 0,
            created
          );
        }
      }
    }

    // -- messages ----------------------------------------------------------
    const insMsg = db.prepare(
      `INSERT INTO messages (name, email, phone, subject, body, status, important, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    MESSAGES.forEach((m, i) => {
      insMsg.run(
        m[0],
        m[1],
        phone(),
        m[2],
        m[3],
        i < 3 ? 'unread' : i < 6 ? 'read' : 'archived',
        i === 6 ? 1 : 0,
        `10.0.${int(0, 255)}.${int(1, 254)}`,
        daysAgo(i * 2 + 1)
      );
    });

    // Every generated file becomes a media library row.
    const insMedia = db.prepare(
      `INSERT INTO media (filename, original_name, path, mime, size, folder, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const f of writtenFiles) {
      insMedia.run(f.filename, f.original_name, f.path, f.mime, f.size, f.folder, admin.id);
    }

    db.prepare(
      `INSERT INTO audit_log (user_id, user_name, action, entity, detail)
       VALUES (?, 'system', 'seed.run', 'system', 'Demo data loaded')`
    ).run(admin.id);

    return { adminUser, adminPass };
  });

  const { adminUser, adminPass } = seed();

  const after = countRealData();
  ok('Demo data loaded.');
  console.log(
    `      ${after.submissions} submissions, ${after.contacts} contacts, ` +
      `${after.posts} posts, ${after.messages} messages, ${after.team} team members`
  );
  console.log(`\n  ${c.bold}Admin login${c.reset}   /admin/login`);
  console.log(`      user ID  : ${adminUser}`);
  console.log(`      password : ${adminPass}`);
  console.log(`  ${c.dim}A limited demo account also exists: demo_manager / Manager@2026${c.reset}`);
  console.log(`  ${c.yellow}Change both passwords before the site goes live.${c.reset}`);

  db.close();
  process.exit(0);
}

main().catch((err) => {
  fail(err.message);
  console.error(err);
  try {
    db.close();
  } catch {}
  process.exit(1);
});
