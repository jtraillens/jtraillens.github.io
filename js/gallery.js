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

    // Quick-pick options offered in the Date Range pill's edit popover --
    // addedDays itself accepts any number (e.g. Collections > Recently
    // Added currently uses 15), these are just the in-UI shortcuts.
    const ADDED_DAYS_PRESETS = [7, 14, 30, 90];

    // Sort state, driven by #sortSelect and mirrored into the ?sort=&order=
    // hash params. Whenever a route doesn't specify sort/order explicitly,
    // defaultSort() picks one based on the rest of the filter -- e.g. an
    // addedDays view (Collections > Recently Added) defaults to newest-added
    // first rather than the gallery's normal newest-taken-first order.
    let sortField = 'random';  // 'random' | 'taken' | 'added'
    let sortOrder = 'desc';    // 'asc' | 'desc' (ignored for 'random')

    // Random order is derived from a per-photo hash of fileName + seed, so it
    // stays stable while filtering and only changes on an explicit shuffle.
    // The seed is deliberately not in the URL: every load starts fresh.
    let shuffleSeed = newShuffleSeed();

    function newShuffleSeed() {
        return Math.floor(Math.random() * 0x7fffffff);
    }

    function shuffleKey(photo) {
        // FNV-1a over the seed + fileName
        let hash = 2166136261 ^ shuffleSeed;
        const text = photo.fileName || '';
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    // A plain gallery starts shuffled so batches of similar photos don't
    // clump; a Recently Added view (addedDays) stays newest-added-first.
    function defaultSort() {
        return addedDays !== null
            ? { field: 'added', order: 'desc' }
            : { field: 'random', order: 'desc' };
    }

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
        initializeSortControl();
        initFilterPopovers();
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

        renderPhotoCount();

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

    // Shows a plain total when nothing is filtered out, or a "# / # total"
    // ratio once the filtered list is a strict subset of all photos.
    function renderPhotoCount() {
        const el = document.querySelector('#photoCount');
        const total = photos.filter(photo => !isHiddenByDefault(photo)).length;
        const shown = filteredPhotos.length;

        el.textContent = shown === total
            ? `${total} photo${total === 1 ? '' : 's'}`
            : `${shown} / ${total} photos`;
    }


    function initializeSortControl() {
        const select = document.querySelector('#sortSelect');

        select.addEventListener('change', () => {
            if (select.value === 'random') {
                sortField = 'random';
                sortOrder = 'desc';
                shuffleSeed = newShuffleSeed();
            } else {
                const [field, order] = select.value.split('-');

                sortField = field === 'added' ? 'added' : 'taken';
                sortOrder = order === 'asc' ? 'asc' : 'desc';
            }

            refilterAndRender();
        });

        document.querySelector('#shuffleBtn').addEventListener('click', () => {
            shuffleSeed = newShuffleSeed();
            refilterAndRender();
        });
    }

    // Reflects the current sortField/sortOrder in the <select> -- called
    // whenever they're (re)computed from the hash, so the control stays in
    // sync when navigating between routes (e.g. Collections links) rather
    // than only when the user changes it directly.
    function syncSortControl() {
        const select = document.querySelector('#sortSelect');
        const isRandom = sortField === 'random';

        select.value = isRandom ? 'random' : `${sortField}-${sortOrder}`;
        document.querySelector('#shuffleBtn').hidden = !isRandom;
    }

    // Generic open/close for the Tags and Date Range filter popovers -- both
    // live in a .filter-control (trigger + popover), and only one is open at
    // a time. The Date Range one is recreated on every render (it only
    // exists while a date filter is active), so this binds fresh each time
    // rather than assuming a fixed set of popovers wired up once.
    function initFilterPopovers() {
        document.addEventListener('click', event => {
            document.querySelectorAll('.filter-popover').forEach(popover => {
                if (!popover.hidden && !popover.closest('.filter-control').contains(event.target)) {
                    closePopover(popover);
                }
            });
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                document.querySelectorAll('.filter-popover').forEach(closePopover);
            }
        });
    }

    function openPopover(popover) {
        // Only one filter popover open at a time.
        document.querySelectorAll('.filter-popover').forEach(other => {
            if (other !== popover) {
                closePopover(other);
            }
        });

        popover.hidden = false;
        popover.closest('.filter-control')
            .querySelector('.filter-popover-toggle')
            ?.setAttribute('aria-expanded', 'true');
    }

    function closePopover(popover) {
        popover.hidden = true;
        popover.closest('.filter-control')
            .querySelector('.filter-popover-toggle')
            ?.setAttribute('aria-expanded', 'false');
    }

    function togglePopover(popover) {
        if (popover.hidden) {
            openPopover(popover);
        } else {
            closePopover(popover);
        }
    }

    function initializeTagFilter() {
        const input = document.querySelector('#tagInput');
        const suggestions = document.querySelector('#tagSuggestions');
        const clearBtn = document.querySelector('#clearTagsBtn');
        const toggle = document.querySelector('#tagFilterToggle');
        const popover = document.querySelector('#tagFilterPopover');

        toggle.addEventListener('click', event => {
            event.stopPropagation();
            togglePopover(popover);

            if (!popover.hidden) {
                input.focus();
            }
        });

        clearBtn.addEventListener('click', () => {
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

        // addedDays affects defaultSort(), so it must be set (just above)
        // before falling back to it here.
        const fallback = defaultSort();
        sortField = filters.sort ?? fallback.field;
        sortOrder = filters.order ?? fallback.order;

        refilterAndRender();
    }

    function refilterAndRender() {
        filteredPhotos = sortPhotos(photos.filter(matchesFilters));

        syncSortControl();
        renderTagChips();
        renderDateFilterChip();
        renderGallery();
        updateHash();
    }

    function sortPhotos(list) {
        if (sortField === 'random') {
            return list.slice().sort((a, b) => shuffleKey(a) - shuffleKey(b));
        }

        const field = sortField === 'added' ? 'dateAdded' : 'dateTaken';
        const direction = sortOrder === 'asc' ? 1 : -1;

        // .slice() first since Array.sort() mutates in place -- the caller's
        // array (here, the freshly-filtered list) shouldn't be assumed safe
        // to sort destructively.
        return list.slice().sort((a, b) => {
            const dateA = a[field] || '';
            const dateB = b[field] || '';

            if (dateA < dateB) return -1 * direction;
            if (dateA > dateB) return 1 * direction;
            return 0;
        });
    }

    // Tag hidden from every view unless it's explicitly selected in the tag
    // filter -- keeps the default gallery to the prettier photos.
    const HIDDEN_BY_DEFAULT_TAG = 'pareidolia';

    function isHiddenByDefault(photo) {
        return !selectedTags.includes(HIDDEN_BY_DEFAULT_TAG) &&
            !!photo.tags?.includes(HIDDEN_BY_DEFAULT_TAG);
    }

    function matchesFilters(photo) {
        if (isHiddenByDefault(photo)) {
            return false;
        }

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

    // Renders just the selected-tag chips into the always-visible Tags pill
    // (#tagsChipGroup) -- the label, "+" toggle and clear-all button are
    // static markup in index.html, so this only touches the chip spans in
    // between the label and the toggle, rather than rebuilding the whole
    // group.
    function renderTagChips() {
        const group = document.querySelector('#tagsChipGroup');
        const toggle = document.querySelector('#tagFilterToggle');

        document.querySelector('#clearTagsBtn').hidden = selectedTags.length === 0;

        group.querySelectorAll('.tag-chip').forEach(chip => chip.remove());

        selectedTags.forEach(tag => {
            const span = document.createElement('span');

            span.className = 'chip tag-chip';
            span.innerHTML = `${tag} <strong>×</strong>`;

            span.addEventListener('click', () => {
                selectedTags = selectedTags.filter(t => t !== tag);
                refilterAndRender();
            });

            group.insertBefore(span, toggle);
        });
    }

    // The Date Range pill only exists while a date filter is active (from a
    // Collections link like "Recently Added", or a hand-typed
    // from/to/addedDays hash) -- so a date filter that's silently ANDed with
    // the tag search is never invisible, e.g. going Recently Added -> Tag
    // Search previously just looked like "no results" with no indication
    // the date window was still applied. Unlike the Tags pill it's rebuilt
    // wholesale into its slot each render, since it appears/disappears
    // entirely rather than just changing its chip list.
    function renderDateFilterChip() {
        const slot = document.querySelector('#dateFilterSlot');

        slot.innerHTML = '';

        const dateFilterLabel = formatDateFilterLabel();

        if (!dateFilterLabel) {
            return;
        }

        const control = document.createElement('div');
        control.className = 'filter-control';

        const group = document.createElement('div');
        group.className = 'chip-group';

        const label = document.createElement('span');
        label.className = 'chip-group-label';
        label.textContent = 'Date Range:';
        group.appendChild(label);

        const chip = document.createElement('span');
        chip.className = 'chip date-filter-chip';
        chip.innerHTML = `
            <svg class="date-filter-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M2 6.5H14" stroke="currentColor" stroke-width="1.3"/>
                <path d="M5 1.5V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <path d="M11 1.5V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <span>${dateFilterLabel}</span>
        `;
        group.appendChild(chip);

        // Only the addedDays rolling-window shorthand has an in-UI way to
        // set it in the first place (Collections > Recently Added, or this
        // popover) -- an explicit from/to range only ever arrives via a
        // hand-typed hash, so there's nothing meaningful to edit in place.
        if (addedDays !== null) {
            const editToggle = document.createElement('button');
            editToggle.type = 'button';
            editToggle.className = 'chip-icon-btn filter-popover-toggle';
            editToggle.setAttribute('aria-haspopup', 'true');
            editToggle.setAttribute('aria-expanded', 'false');
            editToggle.setAttribute('aria-label', 'Change day range');
            editToggle.title = 'Change day range';
            editToggle.innerHTML = `
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                </svg>
            `;
            chip.appendChild(editToggle);
        }

        const clearBtn = document.createElement('strong');
        clearBtn.textContent = '×';
        clearBtn.title = 'Clear date filter';
        clearBtn.addEventListener('click', () => {
            dateFrom = null;
            dateTo = null;
            dateField = 'taken';
            addedDays = null;
            refilterAndRender();
        });
        chip.appendChild(clearBtn);

        control.appendChild(group);

        if (addedDays !== null) {
            const popover = document.createElement('div');
            popover.className = 'filter-popover filter-popover--days';
            popover.hidden = true;

            const presets = document.createElement('div');
            presets.className = 'preset-days';

            ADDED_DAYS_PRESETS.forEach(days => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'preset-day-btn';
                btn.classList.toggle('active', days === addedDays);
                btn.textContent = `${days} days`;

                btn.addEventListener('click', () => {
                    addedDays = days;
                    refilterAndRender();
                });

                presets.appendChild(btn);
            });

            popover.appendChild(presets);
            control.appendChild(popover);

            control.querySelector('.filter-popover-toggle').addEventListener('click', event => {
                event.stopPropagation();
                togglePopover(popover);
            });
        }

        slot.appendChild(control);
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

        // Only serialize sort/order when they differ from what this view
        // would default to -- keeps plain URLs (and the Collections nav
        // links, which match against these hashes exactly) uncluttered when
        // the user hasn't overridden the default sort.
        const fallback = defaultSort();
        if (sortField === 'random') {
            if (fallback.field !== 'random') {
                params.set('sort', 'random');
            }
        } else if (sortField !== fallback.field || sortOrder !== fallback.order) {
            params.set('sort', sortField);
            params.set('order', sortOrder);
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
        openPhotoByFilename,
        getPhotos: () => photos,
        HIDDEN_BY_DEFAULT_TAG
    }

})();