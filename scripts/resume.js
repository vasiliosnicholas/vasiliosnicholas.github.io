/*
 * resume.js — interactive timeline for the resume page.
 *
 * Features:
 *   - Data-driven cards loaded from ../data/resume.json
 *   - Click to expand/collapse details
 *   - Category filter buttons (work/education/research/volunteering/activities)
 *   - Hover effects (CSS-driven)
 *   - Smooth reveal as cards scroll into the horizontal viewport
 *     (IntersectionObserver scoped to the scroll container)
 *   - Drag-to-scroll + arrow buttons for keyboard/mouse users
 *
 * Note: fetch() of a local file requires the page to be served over
 * http(s). Opening resume.html directly via file:// will fail with a
 * CORS error and the timeline will display an error message.
 */

// --- DOM references ---------------------------------------------------

const track = document.querySelector("#timeline-track");
const scrollContainer = document.querySelector("#timeline-scroll");
const filterBar = document.querySelector("#filter-bar");

// --- Helpers ----------------------------------------------------------

function createCard(entry) {
  const card = document.createElement("article");
  card.className = "timeline-card";
  card.dataset.category = entry.category;
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "button");
  card.setAttribute("aria-expanded", "false");

  const detailsList =
    entry.details.length > 0
      ? `<ul>${entry.details.map((d) => `<li>${d}</li>`).join("")}</ul>`
      : `<p class="mb-0 fst-italic text-white-50">No additional details.</p>`;

  card.innerHTML = `
    <span class="card-category">${entry.category}</span>
    <p class="card-date mb-1">${entry.dateLabel}</p>
    <h3 class="card-title">${entry.title}</h3>
    <p class="card-org mb-1">${entry.org}</p>
    <p class="card-location">${entry.location}</p>
    <div class="card-details">${detailsList}</div>
    <p class="card-toggle-hint mb-0">Click for details</p>
  `;
  return card;
}

function renderError(message) {
  track.innerHTML = `
    <div class="text-white p-4" style="margin: auto;">
      <p class="mb-2 fw-bold">Could not load timeline data.</p>
      <p class="mb-0 small text-white-50">${message}</p>
    </div>
  `;
}

// --- Wiring functions (called after data renders) --------------------

function wireExpandCollapse() {
  track.addEventListener("click", (e) => {
    const card = e.target.closest(".timeline-card");
    if (!card) return;
    const expanded = card.classList.toggle("is-expanded");
    card.setAttribute("aria-expanded", String(expanded));
    card.querySelector(".card-toggle-hint").textContent = expanded
      ? "Click to collapse"
      : "Click for details";
  });

  track.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".timeline-card");
    if (!card) return;
    e.preventDefault();
    card.click();
  });
}

function wireFiltering() {
  const filterButtons = filterBar.querySelectorAll(".filter-btn");

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.dataset.filter;
    document.querySelectorAll(".timeline-card").forEach((card) => {
      const matches = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-filtered-out", !matches);
    });

    // Reset scroll to the start when filtering so the user sees results
    scrollContainer.scrollTo({ left: 0, behavior: "smooth" });
  });
}

function wireRevealObserver() {
  const revealObserver = new IntersectionObserver(
    (observed) => {
      observed.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    {
      root: scrollContainer, // observe within the horizontal scroller, not the page
      threshold: 0.25,
    }
  );

  document.querySelectorAll(".timeline-card").forEach((card) => {
    revealObserver.observe(card);
  });
}

function wireScrollControls() {
  const scrollStep = () => Math.max(scrollContainer.clientWidth * 0.7, 300);

  document.querySelector("#scroll-left").addEventListener("click", () => {
    scrollContainer.scrollBy({ left: -scrollStep(), behavior: "smooth" });
  });
  document.querySelector("#scroll-right").addEventListener("click", () => {
    scrollContainer.scrollBy({ left: scrollStep(), behavior: "smooth" });
  });
}

function wireDragScroll() {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  scrollContainer.addEventListener("mousedown", (e) => {
    // Don't hijack clicks on cards — only drag from empty track area
    if (e.target.closest(".timeline-card")) return;
    isDragging = true;
    dragStartX = e.pageX;
    dragStartScroll = scrollContainer.scrollLeft;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.pageX - dragStartX;
    scrollContainer.scrollLeft = dragStartScroll - dx;
  });
}

function scrollMax() {
  return scrollContainer.scrollWidth - scrollContainer.clientWidth;
}

function wireWheelToHorizontal() {
  scrollContainer.addEventListener("wheel", (e) => {
    // Only translate if the user is scrolling primarily vertically
    if (
      Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
      ((e.deltaY < 0 && Math.floor(scrollContainer.scrollLeft) > 0) ||
        (e.deltaY > 0 && Math.ceil(scrollContainer.scrollLeft) < scrollMax()))
    ) {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY * 50;
    }
  });
}

// --- Boot -------------------------------------------------------------

async function init() {
  let entries;
  try {
    const response = await fetch("./data/resume.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    entries = await response.json();
  } catch (err) {
    console.error("Failed to load resume data:", err);
    renderError(
      "If you're opening this file directly, try serving it via a local web server (e.g. `python -m http.server`)."
    );
    return;
  }

  // Sort by most recent then render
  const sorted = [...entries].sort(
    (a, b) => -a.sortDate.localeCompare(b.sortDate)
  );
  sorted.forEach((entry) => track.appendChild(createCard(entry)));

  wireExpandCollapse();
  wireFiltering();
  wireRevealObserver();
  wireScrollControls();
  wireDragScroll();
  wireWheelToHorizontal();
}

init();
