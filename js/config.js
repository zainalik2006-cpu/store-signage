/* ============================================================
   CONFIGURATION — this is the ONLY file you need to edit.
   ============================================================ */

/* 1. PASTE YOUR GOOGLE SHEET CSV LINK BELOW.

   How to get it (see README.md for pictures/steps):
   - In Google Sheets: File → Share → Publish to web
   - Choose your price sheet tab, choose "Comma-separated values (.csv)"
   - Click Publish, copy the link, and paste it between the quotes below.

   While this still says "PASTE_YOUR_GOOGLE_SHEET_CSV_URL_HERE",
   the pages run in DEMO MODE using the local sheet-data.csv file,
   so you can preview the design before connecting the sheet.       */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTxidFn5xUeXl32LO9uJznRtIWNx0BFEDAuzZ05jQEnD5uU8-gc2OsikS8XvPwE4_3sHhv2VAO2cV5j/pub?gid=1956136998&single=true&output=csv";

/* 2. How often to check the sheet for new prices (milliseconds).
   20000 = every 20 seconds. Don't go below 10000.                  */
const POLL_INTERVAL_MS = 20000;

/* 2b. PROMO SLIDES — optional rotation between prices and promos.
   Setup:
   a) Add a second tab to your spreadsheet named "Slides" with these
      columns in row 1:  Title | Text | Image Link | Seconds | Screens | Active
      - Title:      big gold headline  (e.g. Fresh Goat Special)
      - Text:       smaller line       (e.g. $8.99/lb this week only)
      - Image Link: OPTIONAL photo — paste a Google Drive share link
                    (set the file to "Anyone with the link") or any image URL.
                    Leave empty for a text-only slide.
      - Seconds:    how long the slide shows (e.g. 10)
      - Screens:    chicken, meat, or both
      - Active:     TRUE to show, FALSE to hide
   b) File → Share → Publish to web → pick the "Slides" tab → CSV →
      Publish, and paste that link below.
   Leave the placeholder as-is and the TVs just show prices, no rotation. */
const SLIDES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTxidFn5xUeXl32LO9uJznRtIWNx0BFEDAuzZ05jQEnD5uU8-gc2OsikS8XvPwE4_3sHhv2VAO2cV5j/pub?gid=1309001655&single=true&output=csv";

/* How long the price board stays on screen between promo slides (seconds). */
const PRICES_SECONDS = 45;

/* 3. Which categories appear on which TV, and in which column.
   Each inner [list] is ONE column on screen, left → right.
   Categories in the same [list] stack under each other.
   Names must EXACTLY match the "Category" column in your sheet.    */
const PAGES = {
  chicken: {
    heading: "Fresh Halal Chicken & Marinated Items",
    columns: [
      ["Regular Chicken"],
      ["ABF Chicken"],
      ["Marinated Chicken"],
    ],
  },
  meat: {
    heading: "Fresh Halal Beef, Goat, Lamb & Steaks",
    columns: [
      ["Beef", "Veal"],
      ["Goat", "Baby Goat"],
      ["Lamb", "Baby Lamb"],
      ["Steaks", "Marinated Beef & Deli"],
    ],
  },
};

/* 4. Pretty display names for categories (optional). */
const CATEGORY_LABELS = {
  "Regular Chicken": "Regular Chicken — Hand Cut",
  "ABF Chicken": "ABF Chicken — Hand Cut",
  "Marinated Chicken": "Marinated Chicken",
  "Marinated Beef & Deli": "Marinated & Deli",
};
