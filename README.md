# Halal 4 All — Digital Signage

Two TV display pages that pull prices live from a Google Sheet:

- **chicken.html** — TV 1: Regular Chicken, ABF Chicken, Marinated Chicken
- **meat.html** — TV 2: Beef, Veal, Steaks, Marinated & Deli, Goat, Baby Goat, Lamb, Baby Lamb

Prices update on screen automatically (every 20 seconds) — no refresh needed.

---

## Folder structure

```
2026-06-10-halal-signage/
├── index.html        Landing page with links to both TVs
├── chicken.html      TV 1 display
├── meat.html         TV 2 display
├── sheet-data.csv    Your full price list (242 priced items) — import this into Google Sheets
├── css/signage.css   Design (colors, fonts, layout)
└── js/
    ├── config.js     ← THE ONLY FILE YOU EDIT (sheet link, categories, refresh speed)
    └── signage.js    Engine (fetching, parsing, rendering) — don't edit
```

---

## Step 1 — Set up the Google Sheet (one time, ~5 minutes)

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet. Name it something like "Store Price List".
2. **File → Import → Upload** → select `sheet-data.csv` from this folder → Import location: **Replace current sheet**.
3. You now have all your items in 5 columns:

| Column | What it does | Example |
|---|---|---|
| **Item Name** | Name shown on the TV | Whole Chicken W / Skin |
| **Category** | Decides which TV and section it appears in | Regular Chicken |
| **Price** | Number only — no $ sign needed | 3.49 |
| **Unit** | `lb`, `ea`, or `box` | lb |
| **Active** | `TRUE` shows the item, `FALSE` hides it | TRUE |

**Rules:**
- Only rows with Active = `TRUE` (or `Yes`) are shown.
- Rows with an empty Price are hidden automatically, even if Active.
- Category must exactly match one of the names in `js/config.js` to appear on a TV. Current categories: Regular Chicken, ABF Chicken, Marinated Chicken, Beef, Veal, Steaks, Marinated Beef & Deli, Goat, Baby Goat, Lamb, Baby Lamb. (Misc rows are kept in the sheet but don't appear on either TV.)

## Step 2 — Publish the sheet as CSV

1. In Google Sheets: **File → Share → Publish to web**
2. In the dialog: first dropdown = your sheet tab (e.g. **Sheet1**, *not* "Entire Document"), second dropdown = **Comma-separated values (.csv)**.
3. Make sure **"Automatically republish when changes are made"** is checked (under Published content & settings).
4. Click **Publish**, then copy the long link it gives you (ends in `output=csv`).

> This link is read-only. Nobody can edit your sheet with it — they could only see the price list, which is already public on your TVs.

## Step 3 — Connect the link

Open `js/config.js` in any text editor and paste your link:

```js
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv";
```

Until you do this, the pages run in **DEMO MODE** (yellow banner at top) using the local `sheet-data.csv`, so you can preview the design immediately by opening `chicken.html` in a browser.

## Step 4 — Deploy to GitHub Pages (free hosting)

1. Create a free account at [github.com](https://github.com), then click **+ → New repository**. Name it e.g. `store-signage`, keep it **Public**, click **Create repository**.
2. On the repository page, click **uploading an existing file**, drag in everything from this folder (including the `css` and `js` folders), and click **Commit changes**.
3. Go to **Settings → Pages** → under "Branch" choose **main** and **/ (root)** → **Save**.
4. After 1–2 minutes your pages are live at:
   - `https://YOUR-USERNAME.github.io/store-signage/chicken.html`
   - `https://YOUR-USERNAME.github.io/store-signage/meat.html`

**No environment variables are needed** — the only configuration is the sheet URL in `js/config.js`.

(Netlify/Vercel also work: drag the folder into [app.netlify.com/drop](https://app.netlify.com/drop) and you're done.)

## Step 5 — Put it on the TVs

Open each URL full-screen (press **F11** in most browsers) on the device driving each TV — a cheap Fire TV Stick, Chromecast with Google TV, Raspberry Pi, or any old laptop with an HDMI cable works. Set the device to never sleep.

---

## Daily use

**To change a price:** edit the Price cell in Google Sheets. The TVs update within ~25 seconds. (Google's published link itself can take a couple of minutes to refresh on Google's side — that's normal.)

**To hide an item** (out of stock): set Active to `FALSE`.
**To add an item:** add a new row with all 5 columns filled in.

**Tip — readability:** the meat TV currently shows 133 items, so text auto-shrinks to fit. If you want bigger text, set Active = `FALSE` on slower items (e.g. box prices, organ meats) — the layout grows the text automatically as the list gets shorter.

---

## How the auto-update works

Each page runs a small JavaScript loop (`js/signage.js`) that re-downloads the published CSV every 20 seconds (`POLL_INTERVAL_MS` in `config.js`) with a cache-busting parameter, so it always gets fresh data. If the data changed, it re-renders the board in place — the page itself never reloads. If the internet drops, the TV keeps showing the **last known prices** with a small red status bar at the bottom, and silently recovers when the connection returns.

The layout auto-fits: after each render the script measures the board and shrinks the type scale in small steps until every item fits on one 16:9 screen.

## Troubleshooting

| Problem | Fix |
|---|---|
| Yellow "DEMO MODE" banner | Paste your sheet link in `js/config.js` (Step 3) |
| "Could not load the price list" | The link in `config.js` is wrong or the sheet isn't published (Step 2) |
| An item doesn't appear | Check: Active = TRUE? Price filled in? Category spelled exactly like in `config.js`? |
| Price changed but TV didn't update | Wait ~2 min (Google republish delay). Check "Automatically republish" is on. |
| Text too small | Deactivate items you don't need on screen (Active = FALSE) |
