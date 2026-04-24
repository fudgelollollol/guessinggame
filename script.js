const CORS_PROXY = "https://corsproxy.io/?url=";

// if my proxy is down:
// https://cors.eu.org/
// https://cors.io/?u=
// https://corsproxy.io/?url=

const POST_LIMIT = 600;
let stories = [], index = 0, lastSub = "", lastSort = "";

const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

async function getStories(sub, sort) {
  const base = `https://www.reddit.com/r/${sub}/`;
  let url = (sort === "all" || sort === "year")
    ? `${base}top.json?t=${sort}&limit=${POST_LIMIT}`
    : `${base}new.json?limit=${POST_LIMIT}`;
  const resp = await fetch(CORS_PROXY + encodeURIComponent(url));
  if (!resp.ok) throw new Error("Fetch error or CORS fail");
  const data = await resp.json();
  return data.data.children.filter(p =>
    !p.data.stickied && !p.data.over_18 &&
    p.data.selftext && p.data.selftext !== '[removed]' && p.data.selftext !== '[deleted]'
  ).map(p => ({
    title: p.data.title,
    text: p.data.selftext.trim(),
    score: p.data.score
  }));
}

function renderStory(story) {
  const censoredText = story.text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  document.getElementById("story").innerHTML =
    `<span class="first-sentence">${story.title}</span>
     <span class="censor-block" id="hiddenSentence" title="reveal">
       <mark class="censor-highlight">${censoredText}</mark>
     </span>
     <span class="upvotes">${story.score.toLocaleString()} upvotes</span>`;
  const el = document.getElementById("hiddenSentence");
  const mark = el.querySelector('.censor-highlight');
  let isRevealed = false;

  el.addEventListener('click', function () {
    if (isRevealed) {
      mark.textContent = censoredText;
      mark.style.background = '#101010';
      mark.style.color = '#101010';
      el.setAttribute("title", "reveal");
    } else {
      mark.textContent = story.text;
      mark.style.background = 'transparent';
      mark.style.color = '#181818';
      el.removeAttribute("title");
    }
    isRevealed = !isRevealed;
  });
}

async function loadStoriesAndShow(resetIdx = true) {
  const sub = document.getElementById("subreddit").value;
  const sort = document.getElementById("sort").value;
  document.getElementById("story").innerHTML = '<span class="loading">loading horror...</span>';
  try {
    // fetch if options changed or none loaded yet
    if (sub !== lastSub || sort !== lastSort || !stories.length) {
      stories = shuffle(await getStories(sub, sort));
      lastSub = sub; lastSort = sort;
      if (resetIdx) index = 0;
    }
    if (!stories.length) throw new Error("No stories found.");
    renderStory(stories[index]);
  } catch (e) {
    document.getElementById("story").innerHTML =
      `<span class="loading">failed to load: ${e.message}</span>`;
  }
}

function nextStory() {
  if (!stories.length) { loadStoriesAndShow(); return; }
  index = (index + 1) % stories.length;
  renderStory(stories[index]);
}

document.getElementById("reload").onclick = nextStory;
document.getElementById("subreddit").onchange = () => loadStoriesAndShow();
document.getElementById("sort").onchange = () => loadStoriesAndShow();

window.onload = () => loadStoriesAndShow();

// about panel functionality
const infoBtn = document.getElementById('infoBtn');
const aboutPanel = document.getElementById('aboutPanel');
const closePanel = document.getElementById('closePanel');

function togglePanel(e) {
  if (e) e.stopPropagation();
  if (aboutPanel) {
    aboutPanel.classList.toggle('closed');
  }
}

if (infoBtn) {
  infoBtn.addEventListener('click', togglePanel);
}

if (closePanel) {
  closePanel.addEventListener('click', togglePanel);
}

// close panel with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aboutPanel && !aboutPanel.classList.contains('closed')) {
    aboutPanel.classList.add('closed');
  }
});

// share button functionality
const shareBtn = document.getElementById("shareBtn");
const copyToast = document.getElementById("copyToast");
if (shareBtn && copyToast) {
  shareBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      copyToast.classList.add("show");
      setTimeout(() => {
        copyToast.classList.remove("show");
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy: ", err);
    });
  });
}

// clicking the favicon 5 times disables the background (easter egg)
let clickCount = 0;
let backgroundEnabled = false; // Disabled by default as requested

const headerFavicon = document.querySelector('.header-favicon');

if (headerFavicon) {
  headerFavicon.addEventListener('click', (e) => {
    e.preventDefault();
    clickCount++;
    console.log(`Favicon clicked! Count: ${clickCount}`);

    // toggle background on 5th click
    if (clickCount === 5) {
      backgroundEnabled = !backgroundEnabled;
      const container = document.querySelector('.game-container'); // Updated selector

      if (backgroundEnabled) {
        // Show background
        if (container) container.classList.add('has-background');
        console.log('Background enabled');
      } else {
        // Hide background
        if (container) container.classList.remove('has-background');
        console.log('Background disabled');
      }

      clickCount = 0;
    }
  });
}


// Comments overlay functionality
const showCommentsBtn = document.getElementById('showCommentsBtn');
const commentsOverlay = document.getElementById('commentsOverlay');
const commentsIframe = document.getElementById('commentsIframe');
let commentCount = 0;

async function fetchCommentCount() {
  try {
    const response = await fetch('/creation/comment_count.py?page=2sentenceexplorer');
    if (response.ok) {
      const data = await response.json();
      commentCount = data.count || 0;
      updateButtonText();
    }
  } catch (error) {
    console.error('Failed to fetch comment count:', error);
  }
}

function updateButtonText() {
  if (!showCommentsBtn) return;
  const countText = commentCount > 0 ? ` (${commentCount})` : '';
  if (commentsOverlay.classList.contains('open')) {
    showCommentsBtn.textContent = `hide comments${countText}`;
  } else {
    showCommentsBtn.textContent = `show comments${countText}`;
  }
}

if (showCommentsBtn && commentsOverlay) {
  showCommentsBtn.addEventListener('click', () => {
    commentsOverlay.classList.toggle('open');
    updateButtonText();
  });

  // Fetch count on load
  fetchCommentCount();

  // Dark scrollbar for iframe
  if (commentsIframe) {
    commentsIframe.onload = () => {
      try {
        const doc = commentsIframe.contentDocument;
        if (doc) {
          const style = doc.createElement('style');
          style.textContent = `
            body { color-scheme: dark; }
            ::-webkit-scrollbar { width: 12px; }
            ::-webkit-scrollbar-track { background: #191919; }
            ::-webkit-scrollbar-thumb { background: #444; border-radius: 6px; border: 3px solid #191919; }
            ::-webkit-scrollbar-thumb:hover { background: #555; }
            * { scrollbar-color: #444 #191919; }
          `;
          doc.head.appendChild(style);
        }
      } catch (e) {
        console.warn("Cannot style iframe scrollbar (cross-origin?)");
      }
    };
  }
}
