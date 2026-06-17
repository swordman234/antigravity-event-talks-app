import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
_cache = {
    "data": None,
    "expiry": 0
}
CACHE_DURATION = 300  # Cache for 5 minutes

def fetch_and_parse_feed():
    try:
        # Fetch the feed
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        return {"error": f"Failed to fetch feed from Google: {str(e)}"}
    
    try:
        # Parse XML
        root = ET.fromstring(response.content)
    except Exception as e:
        return {"error": f"Failed to parse XML payload: {str(e)}"}
    
    # Namespaces (Atom feeds use the http://www.w3.org/2005/Atom namespace)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_entries = []
    
    # Process each feed entry (which usually represents a single date)
    for entry in root.findall('atom:entry', ns):
        title_node = entry.find('atom:title', ns)
        updated_node = entry.find('atom:updated', ns)
        
        # Link node can have different rel attributes
        link_node = entry.find('atom:link[@rel="alternate"]', ns)
        if link_node is None:
            link_node = entry.find('atom:link', ns)
            
        content_node = entry.find('atom:content', ns)
        
        date_str = title_node.text if title_node is not None else "Unknown Date"
        updated_val = updated_node.text if updated_node is not None else ""
        base_link = link_node.attrib.get('href', '') if link_node is not None else ""
        content_html = content_node.text if content_node is not None else ""
        
        if not content_html:
            continue
            
        # Parse HTML content to split into individual release items
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # A single day's release content typically lists multiple items separated by headings (e.g. <h3>Feature</h3>)
        current_type = "General"
        current_elements = []
        item_index = 0
        
        def package_item(item_type, elements, idx):
            if not elements:
                return None
            
            # Reconstruct HTML for the item
            html_content = "".join(str(el) for el in elements).strip()
            
            # Parse text and format clean version for Twitter
            text_soup = BeautifulSoup(html_content, 'html.parser')
            text_content = text_soup.get_text().strip()
            
            # Clean up extra spacing, tabs, and duplicate newlines
            text_content = re.sub(r'[ \t]+', ' ', text_content)
            text_content = re.sub(r'\n+', '\n', text_content)
            text_content = re.sub(r' \n', '\n', text_content)
            text_content = re.sub(r'\n ', '\n', text_content)
            text_content = text_content.strip()
            
            # Unique identifier
            safe_date = re.sub(r'[^a-zA-Z0-9]', '_', date_str)
            item_id = f"{safe_date}_{idx}"
            
            return {
                "id": item_id,
                "date": date_str,
                "raw_date": updated_val,
                "link": f"{base_link}#{safe_date}" if base_link else "",
                "type": item_type.strip(),
                "category": item_type.strip().lower(),
                "content_html": html_content,
                "content_text": text_content
            }

        # Iterate over child nodes to group paragraphs/lists by heading
        for child in soup.contents:
            if child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                # Save previous group if it exists
                item = package_item(current_type, current_elements, item_index)
                if item:
                    parsed_entries.append(item)
                    item_index += 1
                current_type = child.get_text().strip()
                current_elements = []
            else:
                # Keep text nodes and tags, skip empty whitespace nodes
                if child.name or str(child).strip():
                    current_elements.append(child)
                    
        # Save last item group
        item = package_item(current_type, current_elements, item_index)
        if item:
            parsed_entries.append(item)
            
    return parsed_entries

def get_cached_releases(force_refresh=False):
    global _cache
    now = time.time()
    
    if force_refresh or _cache["data"] is None or now > _cache["expiry"]:
        data = fetch_and_parse_feed()
        
        # If successfully fetched lists, cache them
        if isinstance(data, list):
            _cache["data"] = data
            _cache["expiry"] = now + CACHE_DURATION
        else:
            # If error occurred, return existing cache if available
            if _cache["data"] is not None:
                return _cache["data"]
            return data
            
    return _cache["data"]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    releases = get_cached_releases(force_refresh=force_refresh)
    
    if isinstance(releases, dict) and "error" in releases:
        return jsonify(releases), 500
        
    return jsonify(releases)

if __name__ == '__main__':
    # Flask port 5000 or custom port
    app.run(host='0.0.0.0', port=5000, debug=True)
