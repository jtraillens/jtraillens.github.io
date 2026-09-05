const Gallery = (function() {

    let photos = [];
    let filteredPhotos = [];
    let allTags = [];
    let selectedTags = [];
    let selectedSuggestionIndex = -1;

    // Date-range filter state, driven by the #/gallery?... hash (see
    // Main's router and updateHash() below) -- there's no in-page UI for
    // these yet, they're only set/read via the URL.
    let dateFrom = null;       // 'YYYY-MM-DD' or null
    let dateTo = null;         // 'YYYY-MM-DD' or null
    let dateField = 'taken';   // 'taken' | 'added'
    let addedDays = null;      // rolling-window shorthand, or null

    async function loadGallery() {
        const [galleryResponse, tagsResponse] = await Promise.all([
            fetch('data/gallery.json'),
            fetch('data/tags.json')
        ]);

        photos = await galleryResponse.json();
        allTags = (await tagsResponse.json()).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        filteredPhotos = photos;

        initializeTagFilter();
        renderGallery();

        const gallery = document.querySelector('.gallery');

        gallery.addEventListener('click', (event) => {
            const image = event.target.closest('.photo');
            if (!image) {
                return;
            }

            openPhotoAt(Number(image.dataset.index));
        });

        gallery.addEventListener('keydown', (event) => {
            const image = event.target.closest('.photo');
            if (!image) {
                return;
            }

            const index = Number(image.dataset.index);

            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openPhotoAt(index);
                return;
            }

            const columns = getColumnCount(gallery);
            let targetIndex;

            switch (event.key) {
                case 'ArrowRight':
                    targetIndex = index + 1;
                    break;
                case 'ArrowLeft':
                    targetIndex = index - 1;
                    break;
                case 'ArrowDown':
                    targetIndex = index + columns;
                    break;
                case 'ArrowUp':
                    targetIndex = index - columns;
                    break;
                default:
                    return;
            }

            if (targetIndex < 0 || targetIndex >= filteredPhotos.length) {
                return;
            }

            event.preventDefault();
            gallery.querySelector(`.photo[data-index="${targetIndex}"]`)?.focus();
        });
    }

    function openPhotoAt(index) {
        Lightbox.open(index, filteredPhotos, {
            onPhotoChange: updatePhotoHash,
            onClose: updateHash
        });
    }

    // The grid uses auto-fill columns, so the actual column count depends on
    // viewport width rather than being fixed - reading it back from the
    // resolved computed style is the simplest way to keep Up/Down arrow
    // navigation in sync with however many columns are currently rendered.
    function getColumnCount(gallery) {
        return getComputedStyle(gallery).gridTemplateColumns.split(' ').length;
    }


    function renderGallery() {
        const gallery = document.querySelector('.gallery');
        const emptyState = document.querySelector('#galleryEmpty');
        const template = document.querySelector('#photo-template');

        gallery.innerHTML = '';

        emptyState.hidden = filteredPhotos.length > 0;

        filteredPhotos.forEach((photo, index) => {
            const item = template.content.cloneNode(true);
            const image = item.querySelector('.photo');
            const caption = item.querySelector('.caption');

            image.src = `photo-thumbs/${photo.fileName}`;
            image.alt = photo.title;
            image.tabIndex = 0;
            image.setAttribute('role', 'button');

            // Index within the currently filtered results
            image.dataset.index = index;

            caption.textContent = photo.title;

            gallery.appendChild(item);
        });
    }


    function initializeTagFilter() {
        const input = document.querySelector('#tagInput');
        const suggestions = document.querySelector('#tagSuggestions');
        const clearLink = document.querySelector('#clearTagsLink');

        clearLink.addEventListener('click', () => {
            input.value = '';
            suggestions.innerHTML = '';
            selectedSuggestionIndex = -1;
            selectedTags = [];
            refilterAndRender();
        });

        input.addEventListener('input', () => {
            selectedSuggestionIndex = -1;
            renderTagSuggestions(input.value);
        });

        input.addEventListener('keydown', event => {
            const items = suggestions.querySelectorAll('div');

            if (event.key === 'ArrowDown') {
                event.preventDefault();

                if (items.length === 0) {
                    return;
                }

                selectedSuggestionIndex =
                    Math.min(selectedSuggestionIndex + 1, items.length - 1);

                updateSuggestionHighlight(items);
            }

            else if (event.key === 'ArrowUp') {
                event.preventDefault();

                if (items.length === 0) {
                    return;
                }

                selectedSuggestionIndex =
                    Math.max(selectedSuggestionIndex - 1, 0);

                updateSuggestionHighlight(items);
            }

            else if (event.key === 'Enter') {
                event.preventDefault();

                if (selectedSuggestionIndex >= 0 &&
                    items[selectedSuggestionIndex]) {

                    addTag(items[selectedSuggestionIndex].textContent);
                }
                else {
                    addTag(input.value.trim());
                }

                input.value = '';
                suggestions.innerHTML = '';
                selectedSuggestionIndex = -1;
            }
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('#tagSearch')) {
                suggestions.innerHTML = '';
                selectedSuggestionIndex = -1;
            }
        });
    }

    function addTag(tag) {
        if (!allTags.includes(tag) || selectedTags.includes(tag)) {
            return;
        }

        selectedTags.push(tag);
        refilterAndRender();
    }

    // Full filter state, as parsed from the #/gallery?... hash by Main's
    // router. Anything omitted resets to its neutral default -- switching
    // routes (e.g. a Collections link) replaces the filter wholesale rather
    // than merging into whatever was previously selected.
    function applyFilter(filters = {}) {
        selectedTags = filters.tags ?? [];
        dateFrom = filters.from ?? null;
        dateTo = filters.to ?? null;
        dateField = filters.dateField === 'added' ? 'added' : 'taken';
        addedDays = filters.addedDays ?? null;

        refilterAndRender();
    }

    function refilterAndRender() {
        filteredPhotos = photos.filter(matchesFilters);

        renderSelectedTags();
        renderGallery();
        updateHash();
    }

    function matchesFilters(photo) {
        if (!selectedTags.every(tag => photo.tags?.includes(tag))) {
            return false;
        }

        if (addedDays !== null && !isWithinAddedDays(photo, addedDays)) {
            return false;
        }

        if (dateFrom || dateTo) {
            const rawDate = dateField === 'added' ? photo.dateAdded : photo.dateTaken;
            if (!rawDate) {
                return false;
            }

            // Compare on the ISO date prefix (YYYY-MM-DD) -- lexical order
            // matches chronological order for this format, and it sidesteps
            // timezone parsing entirely.
            const date = rawDate.slice(0, 10);
            if (dateFrom && date < dateFrom) return false;
            if (dateTo && date > dateTo) return false;
        }

        return true;
    }

    function isWithinAddedDays(photo, days) {
        if (!photo.dateAdded) {
            return false;
        }

        const addedTime = new Date(photo.dateAdded).getTime();
        if (Number.isNaN(addedTime)) {
            return false;
        }

        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return addedTime >= cutoff;
    }

    function renderTagSuggestions(value) {
        const suggestions = document.querySelector('#tagSuggestions');

        suggestions.innerHTML = '';
        selectedSuggestionIndex = -1;

        const search = value.toLowerCase();

        if (!search) {
            return;
        }

        allTags
            .filter(tag =>
                tag.toLowerCase().includes(search) &&
                !selectedTags.includes(tag)
            )
            .slice(0, 10)
            .forEach(tag => {
                const item = document.createElement('div');

                item.textContent = tag;

                item.addEventListener('click', () => {
                    addTag(tag);
                    document.querySelector('#tagInput').value = '';
                    suggestions.innerHTML = '';
                });

                suggestions.appendChild(item);
            });
    }

    function updateSuggestionHighlight(items) {
        items.forEach((item, index) => {
            item.classList.toggle(
                'selected',
                index === selectedSuggestionIndex
            );
        });
    }

    // Renders both the selected-tag chips and, when a date filter is active
    // (from a Collections link like "Recently Added", or a hand-typed
    // from/to/addedDays hash), a chip describing it -- so a date filter
    // that's silently ANDed with the tag search is never invisible, e.g.
    // going Recently Added -> Tag Search previously just looked like "no
    // results" with no indication the date window was still applied.
    function renderSelectedTags() {
        const container = document.querySelector('#selectedTags');

        document.querySelector('#clearTagsLink').hidden = selectedTags.length === 0;

        container.innerHTML = '';

        if (selectedTags.length > 0) {
            const group = document.createElement('div');

            group.className = 'chip-group';

            const label = document.createElement('span');

            label.className = 'chip-group-label';
            label.textContent = 'Tags:';
            group.appendChild(label);

            selectedTags.forEach(tag => {
                const span = document.createElement('span');

                span.innerHTML = `${tag} <strong>×</strong>`;

                span.addEventListener('click', () => {
                    selectedTags = selectedTags.filter(t => t !== tag);
                    refilterAndRender();
                });

                group.appendChild(span);
            });

            container.appendChild(group);
        }

        const dateFilterLabel = formatDateFilterLabel();

        if (dateFilterLabel) {
            const group = document.createElement('div');

            group.className = 'chip-group';

            const label = document.createElement('span');

            label.className = 'chip-group-label';
            label.textContent = 'Date Range:';
            group.appendChild(label);

            const span = document.createElement('span');

            span.className = 'date-filter-chip';
            span.title = 'Clear date filter';
            span.innerHTML = `
                <svg class="date-filter-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M2 6.5H14" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M5 1.5V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    <path d="M11 1.5V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
                ${dateFilterLabel} <strong>×</strong>
            `;

            span.addEventListener('click', () => {
                dateFrom = null;
                dateTo = null;
                dateField = 'taken';
                addedDays = null;
                refilterAndRender();
            });

            group.appendChild(span);
            container.appendChild(group);
        }
    }

    function formatDateFilterLabel() {
        if (addedDays !== null) {
            return `Added in last ${addedDays} day${addedDays === 1 ? '' : 's'}`;
        }

        if (dateFrom || dateTo) {
            const prefix = dateField === 'added' ? 'Added' : 'Taken';

            if (dateFrom && dateTo) {
                return `${prefix}: ${dateFrom} – ${dateTo}`;
            }
            if (dateFrom) {
                return `${prefix}: from ${dateFrom}`;
            }
            return `${prefix}: until ${dateTo}`;
        }

        return null;
    }

    function updateHash() {
        const params = new URLSearchParams();

        if (selectedTags.length > 0) {
            // Individual tags aren't pre-encoded -- URLSearchParams encodes
            // the whole joined value on serialization, and decodes it whole
            // again via .get() on the way back in (see Main's router).
            params.set('tags', selectedTags.join(','));
        }
        if (dateFrom) {
            params.set('from', dateFrom);
        }
        if (dateTo) {
            params.set('to', dateTo);
        }
        if (dateField === 'added' && (dateFrom || dateTo)) {
            params.set('dateField', 'added');
        }
        if (addedDays !== null) {
            params.set('addedDays', String(addedDays));
        }

        const query = params.toString();
        history.replaceState(null, '', query ? `#/gallery?${query}` : '#/gallery');

        // replaceState doesn't fire 'hashchange', so nav highlighting
        // (Collections/Gallery) and the view itself (e.g. searching tags
        // while on the About screen) need an explicit nudge to stay in sync.
        Nav.updateActiveStyles();
        Main.showGallery();
    }

    function openPhotoByFilename(name) {
        const fileName = `${name}.webp`;
        const index = photos.findIndex(photo => photo.fileName === fileName);

        if (index === -1) {
            console.warn(`Photo not found: ${fileName}`);
            return;
        }

        Lightbox.open(index, photos, {
            onPhotoChange: updatePhotoHash,
            onClose: updateHash
        });
    }

    function updatePhotoHash(photo) {
        const name = photo.fileName.replace(/\.[^.]+$/, '');
        history.replaceState(null, '', `#/photo/${encodeURIComponent(name)}`);
    }


    return {
        loadGallery,
        applyFilter,
        openPhotoByFilename
    }

})();