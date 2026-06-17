// State Management
let state = {
    releases: [],
    filteredReleases: [],
    activeFilter: 'all',
    searchQuery: '',
    selectedRelease: null
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refreshBtn'),
    refreshSpinner: document.getElementById('refreshSpinner'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    skeletonLoader: document.getElementById('skeletonLoader'),
    emptyState: document.getElementById('emptyState'),
    errorState: document.getElementById('errorState'),
    errorMsg: document.getElementById('errorMsg'),
    retryBtn: document.getElementById('retryBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    releasesGrid: document.getElementById('releasesGrid'),
    
    // Stats
    countAll: document.getElementById('countAll'),
    countFeature: document.getElementById('countFeature'),
    countAnnouncement: document.getElementById('countAnnouncement'),
    countIssue: document.getElementById('countIssue'),
    statsPanel: document.getElementById('statsPanel'),

    // Tweet Composer Modal
    tweetModal: document.getElementById('tweetModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    tweetContent: document.getElementById('tweetContent'),
    charProgress: document.getElementById('charProgress'),
    charCount: document.getElementById('charCount'),
    tweetPreview: document.getElementById('tweetPreview'),
    copyTweetBtn: document.getElementById('copyTweetBtn'),
    shareTwitterBtn: document.getElementById('shareTwitterBtn'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
    initProgressRing();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh & Retry actions
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search input interactions
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.clearSearch.addEventListener('click', clearSearchQuery);
    elements.clearFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Filter click actions
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.activeFilter = e.target.dataset.filter;
            applyFilters();
        });
    });

    // Stat items filtering
    elements.statsPanel.querySelectorAll('.stat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const filterType = e.currentTarget.dataset.type;
            const targetBtn = Array.from(elements.filterBtns).find(btn => btn.dataset.filter === filterType);
            if (targetBtn) {
                targetBtn.click();
            }
        });
    });
    
    // Modal Close
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
    
    // Tweet Input Composer Live updates
    elements.tweetContent.addEventListener('input', handleTweetContentInput);
    
    // Modal Actions
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    elements.shareTwitterBtn.addEventListener('click', shareOnTwitter);
}

// Fetch Feed API
async function fetchReleases(forceRefresh = false) {
    showLoadingState();
    
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        state.releases = data;
        state.filteredReleases = [...data];
        
        updateStats();
        applyFilters();
        
        if (forceRefresh) {
            showToast('Release notes successfully refreshed!', 'success');
        }
    } catch (error) {
        console.error('Failed to load release notes:', error);
        showErrorState(error.message);
        showToast('Failed to fetch release notes.', 'error');
    }
}

// UI State Switchers
function showLoadingState() {
    elements.skeletonLoader.style.display = 'grid';
    elements.releasesGrid.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.refreshBtn.classList.add('loading');
    elements.refreshBtn.disabled = true;
}

function showErrorState(msg) {
    elements.skeletonLoader.style.display = 'none';
    elements.releasesGrid.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'flex';
    elements.errorMsg.textContent = msg;
    elements.refreshBtn.classList.remove('loading');
    elements.refreshBtn.disabled = false;
}

function updateStats() {
    const counts = {
        all: state.releases.length,
        feature: 0,
        announcement: 0,
        issue: 0
    };
    
    state.releases.forEach(item => {
        const cat = item.category || '';
        if (cat.includes('feature')) {
            counts.feature++;
        } else if (cat.includes('announcement')) {
            counts.announcement++;
        } else if (cat.includes('issue') || cat.includes('fix') || cat.includes('resolved')) {
            counts.issue++;
        }
    });
    
    elements.countAll.textContent = counts.all;
    elements.countFeature.textContent = counts.feature;
    elements.countAnnouncement.textContent = counts.announcement;
    elements.countIssue.textContent = counts.issue;
}

// Search and Filter Handlers
function handleSearchInput(e) {
    state.searchQuery = e.target.value.trim();
    if (state.searchQuery) {
        elements.clearSearch.style.display = 'block';
    } else {
        elements.clearSearch.style.display = 'none';
    }
    applyFilters();
}

function clearSearchQuery() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearch.style.display = 'none';
    applyFilters();
}

function resetAllFilters() {
    clearSearchQuery();
    const firstFilter = elements.filterBtns[0]; // "All"
    if (firstFilter) firstFilter.click();
}

function applyFilters() {
    let result = [...state.releases];
    
    // Apply Category Filter
    if (state.activeFilter !== 'all') {
        result = result.filter(item => {
            const cat = item.category || '';
            if (state.activeFilter === 'feature') {
                return cat.includes('feature');
            } else if (state.activeFilter === 'announcement') {
                return cat.includes('announcement');
            } else if (state.activeFilter === 'issue') {
                return cat.includes('issue') || cat.includes('fix') || cat.includes('resolved');
            } else if (state.activeFilter === 'deprecation') {
                return cat.includes('deprecat');
            } else {
                return cat === 'general' || (!cat.includes('feature') && !cat.includes('announcement') && !cat.includes('issue') && !cat.includes('fix') && !cat.includes('resolved') && !cat.includes('deprecat'));
            }
        });
    }
    
    // Apply Search Query
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        result = result.filter(item => {
            return (
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.type && item.type.toLowerCase().includes(query)) ||
                (item.date && item.date.toLowerCase().includes(query)) ||
                (item.content_text && item.content_text.toLowerCase().includes(query))
            );
        });
    }
    
    state.filteredReleases = result;
    renderReleases();
}

// Rendering Grid Cards
function renderReleases() {
    elements.skeletonLoader.style.display = 'none';
    elements.refreshBtn.classList.remove('loading');
    elements.refreshBtn.disabled = false;
    
    if (state.filteredReleases.length === 0) {
        elements.releasesGrid.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.releasesGrid.style.display = 'grid';
    elements.releasesGrid.innerHTML = '';
    
    state.filteredReleases.forEach(item => {
        const card = document.createElement('article');
        // Standardize class by type
        let cardClass = 'general';
        const cat = item.category || '';
        if (cat.includes('feature')) cardClass = 'feature';
        else if (cat.includes('announcement')) cardClass = 'announcement';
        else if (cat.includes('issue') || cat.includes('fix') || cat.includes('resolved')) cardClass = 'issue';
        else if (cat.includes('deprecat')) cardClass = 'deprecation';
        
        card.className = `release-card ${cardClass}`;
        card.setAttribute('id', `release-${item.id}`);
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-tag">${item.type}</span>
                <span class="card-date">${item.date}</span>
            </div>
            <div class="card-body">
                ${item.content_html}
            </div>
            <div class="card-footer">
                <button class="card-btn card-btn-copy" data-id="${item.id}" title="Copy raw update to clipboard">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                </button>
                <button class="card-btn card-btn-tweet" data-id="${item.id}" title="Compose a Tweet about this update">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Add event listeners inside the cards
        card.querySelector('.card-btn-copy').addEventListener('click', () => {
            copyCardText(item);
        });
        
        card.querySelector('.card-btn-tweet').addEventListener('click', () => {
            openTweetModal(item);
        });
        
        elements.releasesGrid.appendChild(card);
    });
}

// Copy Action for individual cards
function copyCardText(item) {
    const formattedText = `[BigQuery Release - ${item.date}] (${item.type})\n${item.content_text}\n\nRead more: ${item.link}`;
    navigator.clipboard.writeText(formattedText).then(() => {
        showToast('Release note copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy to clipboard.', 'error');
    });
}

// Tweet Composer Modal Management
let ringCircumference;

function initProgressRing() {
    const radius = elements.charProgress.r.baseVal.value;
    ringCircumference = radius * 2 * Math.PI;
    elements.charProgress.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    elements.charProgress.style.strokeDashoffset = ringCircumference;
}

function setProgress(percent) {
    const offset = ringCircumference - (percent / 100 * ringCircumference);
    elements.charProgress.style.strokeDashoffset = offset;
}

function openTweetModal(item) {
    state.selectedRelease = item;
    
    // Compose draft with smart length checks
    // Twitter handles links as exactly 23 characters.
    const urlLength = 23;
    const linkSuffix = `\n\nRead: ${item.link}`;
    const headerPrefix = `🚀 #BigQuery Update [${item.date}]:\n\n`;
    
    // Maximum space for text content inside tweet
    const maxTextSpace = 280 - headerPrefix.length - linkSuffix.length;
    
    let coreText = item.content_text;
    if (coreText.length > maxTextSpace) {
        coreText = coreText.substring(0, maxTextSpace - 3) + '...';
    }
    
    const draftText = `${headerPrefix}${coreText}${linkSuffix}`;
    elements.tweetContent.value = draftText;
    
    updateTweetComposerStats();
    elements.tweetModal.classList.add('open');
    elements.tweetContent.focus();
}

function closeTweetModal() {
    elements.tweetModal.classList.remove('open');
    state.selectedRelease = null;
}

function handleTweetContentInput() {
    updateTweetComposerStats();
}

// Custom Twitter character length calculator. Accounts for URLs being 23 characters
function calculateTwitterTextLength(text) {
    if (!text) return 0;
    
    // Regex for URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    let urlMatches = text.match(urlRegex) || [];
    
    // Replace all URLs with a 23-character dummy string
    let textWithStandardizedUrls = text.replace(urlRegex, 'x'.repeat(23));
    
    return textWithStandardizedUrls.length;
}

function updateTweetComposerStats() {
    const text = elements.tweetContent.value;
    const tweetLen = calculateTwitterTextLength(text);
    const charsRemaining = 280 - tweetLen;
    
    elements.charCount.textContent = charsRemaining;
    
    // Calculate percentage for progress ring (cap at 100%)
    const pct = Math.min((tweetLen / 280) * 100, 100);
    setProgress(pct);
    
    // Update live preview block
    elements.tweetPreview.textContent = text;
    
    // Apply theme styling to progress indicator
    if (charsRemaining < 0) {
        elements.charProgress.style.stroke = 'var(--color-issue)';
        elements.charCount.style.color = 'var(--color-issue)';
        elements.shareTwitterBtn.disabled = true;
    } else if (charsRemaining <= 20) {
        elements.charProgress.style.stroke = 'var(--color-deprecation)';
        elements.charCount.style.color = 'var(--color-deprecation)';
        elements.shareTwitterBtn.disabled = false;
    } else {
        elements.charProgress.style.stroke = 'var(--primary)';
        elements.charCount.style.color = 'var(--text-secondary)';
        elements.shareTwitterBtn.disabled = false;
    }
}

function copyTweetText() {
    const text = elements.tweetContent.value;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet draft copied to clipboard!', 'success');
    }).catch(err => {
        showToast('Failed to copy tweet text.', 'error');
    });
}

function shareOnTwitter() {
    const text = elements.tweetContent.value;
    const tweetLen = calculateTwitterTextLength(text);
    
    if (tweetLen > 280) {
        showToast('Tweet exceeds the 280 character limit!', 'error');
        return;
    }
    
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
    `;
    
    if (type === 'success') {
        icon = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    } else if (type === 'error') {
        icon = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    }
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto-destruct toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
