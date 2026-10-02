import { getPhotos, setPhotos, getFilteredPhotos, setFilteredPhotos } from './state.js?v=20261002100805';
import {
    newShuffleSeed,
    defaultSort,
    sortPhotos,
    isHiddenByDefault,
    matchesFilters,
    buildPlaceList,
    formatDateFilterLabel,
    buildGalleryQuery
} from './filters.js?v=20261002100805';
import { initFilterPopovers, closePopover, togglePopover } from './filter-popovers.js?v=20261002100805';
import * as Lightbox from './lightbox.js?v=20261002100805';
import * as Nav from './nav.js?v=20261002100805';
import { showView } from './views.js?v=20261002100805';

let allTags = [];
let selectedTags = [];
let selectedSuggestionIndex = -1;

let selectedLocation = null;

let selectedArea = null;

let allPlaces = [];
let selectedPlaceSuggestionIndex = -1;

let dateFrom = null;
let dateTo = null;
let dateField = 'taken';
let addedDays = null;

const ADDED_DAYS_PRESETS = [7, 14, 30, 90];

let sortField = 'random';
let sortOrder = 'desc';

let shuffleSeed = newShuffleSeed();

function currentFilters() {
    return {
        tags: selectedTags,
        location: selectedLocation,
        area: selectedArea,
        from: dateFrom,
        to: dateTo,
        dateField,
        addedDays
    };
}

export async function loadGallery() {
    const [galleryResponse, tagsResponse] = await Promise.all([
        fetch('data/gallery.json'),
        fetch('data/tags.json')
    ]);

    const photos = await galleryResponse.json();
    setPhotos(photos);
    allTags = (await tagsResponse.json()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    allPlaces = buildPlaceList(photos);

    setFilteredPhotos(photos);

    initializeTagFilter();
    initializePlaceFilter();
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

        if (targetIndex < 0 || targetIndex >= getFilteredPhotos().length) {
            return;
        }

        event.preventDefault();
        gallery.querySelector(`.photo[data-index="${targetIndex}"]`)?.focus();
    });
}

function openPhotoAt(index) {
    Lightbox.open(index, getFilteredPhotos(), {
        onPhotoChange: updatePhotoHash,
        onClose: updateHash
    });
}

function getColumnCount(gallery) {
    return getComputedStyle(gallery).gridTemplateColumns.split(' ').length;
}

function renderGallery() {
    const gallery = document.querySelector('.gallery');
    const emptyState = document.querySelector('#galleryEmpty');
    const template = document.querySelector('#photo-template');
    const filteredPhotos = getFilteredPhotos();

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

        image.dataset.index = index;

        caption.textContent = photo.title;

        gallery.appendChild(item);
    });

    document.dispatchEvent(new CustomEvent('gallery:filtered', {
        detail: { count: filteredPhotos.length }
    }));
}

function renderPhotoCount() {
    const el = document.querySelector('#photoCount');
    const total = getPhotos().filter(photo => !isHiddenByDefault(photo, selectedTags)).length;
    const shown = getFilteredPhotos().length;

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

function syncSortControl() {
    const select = document.querySelector('#sortSelect');
    const isRandom = sortField === 'random';

    select.value = isRandom ? 'random' : `${sortField}-${sortOrder}`;
    document.querySelector('#shuffleBtn').hidden = !isRandom;
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

export function applyFilter(filters = {}) {
    selectedTags = filters.tags ?? [];
    selectedLocation = filters.location ?? null;
    selectedArea = selectedLocation ? filters.area ?? null : null;
    dateFrom = filters.from ?? null;
    dateTo = filters.to ?? null;
    dateField = filters.dateField === 'added' ? 'added' : 'taken';
    addedDays = filters.addedDays ?? null;

    const fallback = defaultSort(addedDays);
    sortField = filters.sort ?? fallback.field;
    sortOrder = filters.order ?? fallback.order;

    refilterAndRender();
}

function refilterAndRender() {
    const filters = currentFilters();

    setFilteredPhotos(sortPhotos(
        getPhotos().filter(photo => matchesFilters(photo, filters)),
        sortField,
        sortOrder,
        shuffleSeed
    ));

    syncSortControl();
    renderTagChips();
    renderPlaceChip();
    renderDateFilterChip();
    renderGallery();
    updateHash();
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

    items[selectedSuggestionIndex]?.scrollIntoView({ block: 'nearest' });
}

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

function placeLabel(id) {
    return allPlaces.find(place => place.id === id)?.label ?? id;
}

function areaLabel(locationId, area) {
    return getPhotos().find(photo => photo.locationId === locationId && photo.area === area)?.areaLabel ?? area;
}

function initializePlaceFilter() {
    const input = document.querySelector('#placeInput');
    const suggestions = document.querySelector('#placeSuggestions');
    const toggle = document.querySelector('#placeFilterToggle');
    const popover = document.querySelector('#placeFilterPopover');

    toggle.addEventListener('click', event => {
        event.stopPropagation();
        togglePopover(popover);

        if (!popover.hidden) {
            input.focus();
        }
    });

    input.addEventListener('input', () => {
        renderPlaceSuggestions(input.value);
    });

    input.addEventListener('keydown', event => {
        const items = suggestions.querySelectorAll('div');

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (items.length === 0) {
                return;
            }

            selectedPlaceSuggestionIndex = event.key === 'ArrowDown'
                ? Math.min(selectedPlaceSuggestionIndex + 1, items.length - 1)
                : Math.max(selectedPlaceSuggestionIndex - 1, 0);

            items.forEach((item, index) => {
                item.classList.toggle('selected', index === selectedPlaceSuggestionIndex);
            });

            items[selectedPlaceSuggestionIndex].scrollIntoView({ block: 'nearest' });
        }

        else if (event.key === 'Enter') {
            event.preventDefault();

            const typed = input.value.trim().toLowerCase();
            const place = selectedPlaceSuggestionIndex >= 0 && items[selectedPlaceSuggestionIndex]
                ? allPlaces.find(p => p.id === items[selectedPlaceSuggestionIndex].dataset.id)
                : allPlaces.find(p => p.label.toLowerCase() === typed);

            if (place) {
                selectPlace(place.id);
            }
        }
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('#placeSearch')) {
            suggestions.innerHTML = '';
            selectedPlaceSuggestionIndex = -1;
        }
    });
}

function selectPlace(id) {
    const input = document.querySelector('#placeInput');

    input.value = '';
    document.querySelector('#placeSuggestions').innerHTML = '';
    selectedPlaceSuggestionIndex = -1;
    closePopover(document.querySelector('#placeFilterPopover'));

    selectedLocation = id;
    selectedArea = null;
    refilterAndRender();
}

function renderPlaceSuggestions(value) {
    const suggestions = document.querySelector('#placeSuggestions');

    suggestions.innerHTML = '';
    selectedPlaceSuggestionIndex = -1;

    const search = value.trim().toLowerCase();

    if (!search) {
        return;
    }

    allPlaces
        .filter(place =>
            place.label.toLowerCase().includes(search) &&
            place.id !== selectedLocation
        )
        .slice(0, 10)
        .forEach(place => {
            const item = document.createElement('div');

            item.textContent = place.label;
            item.dataset.id = place.id;
            item.addEventListener('click', () => selectPlace(place.id));

            suggestions.appendChild(item);
        });
}

function renderPlaceChip() {
    const group = document.querySelector('#placeChipGroup');
    const toggle = document.querySelector('#placeFilterToggle');

    group.querySelectorAll('.place-filter-chip').forEach(chip => chip.remove());

    if (!selectedLocation) {
        return;
    }

    const chip = document.createElement('span');
    chip.className = 'chip place-filter-chip';
    chip.innerHTML = `
        <svg class="place-filter-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/>
            <circle cx="12" cy="10" r="2.5"/>
        </svg>
    `;

    const text = document.createElement('span');
    text.textContent = selectedArea
        ? `${placeLabel(selectedLocation)} · ${areaLabel(selectedLocation, selectedArea)}`
        : placeLabel(selectedLocation);
    chip.appendChild(text);

    const clearBtn = document.createElement('strong');
    clearBtn.textContent = '×';
    clearBtn.title = 'Clear place filter';
    clearBtn.addEventListener('click', () => {
        selectedLocation = null;
        selectedArea = null;
        refilterAndRender();
    });
    chip.appendChild(clearBtn);

    group.insertBefore(chip, toggle);
}

function renderDateFilterChip() {
    const slot = document.querySelector('#dateFilterSlot');

    slot.innerHTML = '';

    const dateFilterLabel = formatDateFilterLabel(currentFilters());

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

function updateHash() {
    const query = buildGalleryQuery(currentFilters(), sortField, sortOrder);
    history.replaceState(null, '', query ? `#/gallery?${query}` : '#/gallery');

    Nav.updateActiveStyles();
    showView('gallery');
}

export function openPhotoByFilename(name) {
    const photos = getPhotos();
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
