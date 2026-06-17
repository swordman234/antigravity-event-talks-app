# BigQuery Release Notes Tracker

A premium, responsive web application built to monitor, parse, categorize, and search Google Cloud BigQuery release notes. It features a modern dark-theme dashboard UI, live update categorization, and a built-in Twitter/X draft composer with real-time character limit validation.

---

## 🚀 Key Features

* **Real-time Atom Feed Aggregator:** Automatically fetches official updates from the Google Cloud BigQuery RSS/Atom feed.
* **Smart Update Categorization:** Groups raw updates into easily readable cards categorized by color-coded tags:
  * 🟢 **Features**
  * 🔵 **Announcements**
  * 🔴 **Issues & Fixes**
  * 🟡 **Deprecations**
  * 🟣 **General Updates**
* **Dynamic Client-side Filtering & Real-time Search:** Instantly filter releases by category or search through update content using keywords.
* **Server-side Cache:** Uses an in-memory 5-minute cache to reduce remote requests and prevent rate-limiting.
* **Twitter/X Draft Composer:** 
  * Features a modal composer to quickly craft update tweets.
  * Real-time character counter showing remaining characters out of 280.
  * Correctly calculates character count by formatting URLs as exactly 23 characters (conforming to Twitter/X standard).
  * Smooth SVG progress circle indicator showing draft length.
* **Premium Dark Theme UX:** Styled with glassmorphism, responsive cards, micro-animations, skeleton loaders, and interactive toast notifications.

---

## 🛠️ Technology Stack

* **Server/Backend:** Flask (Python 3), `BeautifulSoup` (for HTML sub-parsing & text extraction), `xml.etree.ElementTree` (for XML Parsing).
* **Client/Frontend:** Vanilla HTML5, CSS3 (using custom properties & transitions), and pure Javascript (ES6+).
* **Design & Typography:** Google Fonts (Outfit & Plus Jakarta Sans), Custom SVGs.

---

## 📂 Project Structure

```
├── app.py                # Main Flask application logic & feed parser
├── run.py                # Process launcher (auto-swaps to .venv virtual environment)
├── requirements.txt      # Python dependencies
├── static/
│   ├── css/
│   │   └── styles.css    # Premium CSS design stylesheet
│   └── js/
│       └── app.js        # DOM manipulation, state management, & composition logic
└── templates/
    └── index.html        # Main dashboard HTML template
```

---

## 🔧 Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/swordman234/antigravity-event-talks-app.git
   cd antigravity-event-talks-app
   ```

2. **Setup virtual environment & dependencies:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Run the Application:**
   Instead of running python directly, you can run the wrapper script:
   ```bash
   python run.py
   ```
   *Note: `run.py` automatically checks for a `.venv` directory and switches execution to the virtual environment if found.*

4. **Access the Dashboard:**
   Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🖥️ How It Works

1. When the client loads, Javascript makes a fetch request to the `/api/releases` endpoint.
2. The server checks the in-memory cache. If expired or empty, it pulls the raw XML feed from Google Cloud.
3. The server uses `BeautifulSoup` to split updates on header tags (e.g., `<h3>`) and extracts clean plaintext.
4. The client parses the JSON list of entries, updates the dashboard statistics counters, and displays styled cards on a responsive grid layout.
