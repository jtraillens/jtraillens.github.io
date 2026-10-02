export const HIDDEN_BY_DEFAULT_TAG = 'pareidolia';

export function newShuffleSeed() {
    return Math.floor(Math.random() * 0x7fffffff);
}

export function shuffleKey(photo, seed) {
    let hash = 2166136261 ^ seed;
    const text = photo.fileName || '';
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function defaultSort(addedDays) {
    return addedDays !== null
        ? { field: 'added', order: 'desc' }
        : { field: 'random', order: 'desc' };
}

export function sortPhotos(list, sortField, sortOrder, shuffleSeed) {
    if (sortField === 'random') {
        return list.slice().sort((a, b) => shuffleKey(a, shuffleSeed) - shuffleKey(b, shuffleSeed));
    }

    const field = sortField === 'added' ? 'dateAdded' : 'dateTaken';
    const direction = sortOrder === 'asc' ? 1 : -1;

    return list.slice().sort((a, b) => {
        const dateA = a[field] || '';
        const dateB = b[field] || '';

        if (dateA < dateB) return -1 * direction;
        if (dateA > dateB) return 1 * direction;
        return 0;
    });
}

export function isHiddenByDefault(photo, selectedTags) {
    return !selectedTags.includes(HIDDEN_BY_DEFAULT_TAG) &&
        !!photo.tags?.includes(HIDDEN_BY_DEFAULT_TAG);
}

export function matchesFilters(photo, filters) {
    const { tags, location, area, from, to, dateField, addedDays } = filters;

    if (isHiddenByDefault(photo, tags)) {
        return false;
    }

    if (!tags.every(tag => photo.tags?.includes(tag))) {
        return false;
    }

    if (location && photo.locationId !== location) {
        return false;
    }

    if (area && photo.area !== area) {
        return false;
    }

    if (addedDays !== null && !isWithinAddedDays(photo, addedDays)) {
        return false;
    }

    if (from || to) {
        const rawDate = dateField === 'added' ? photo.dateAdded : photo.dateTaken;
        if (!rawDate) {
            return false;
        }

        const date = rawDate.slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
    }

    return true;
}

export function isWithinAddedDays(photo, days) {
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

export function buildPlaceList(list) {
    const byId = new Map();

    list.forEach(photo => {
        if (photo.locationId && !photo.tags?.includes(HIDDEN_BY_DEFAULT_TAG)) {
            byId.set(photo.locationId, photo.locationLabel);
        }
    });

    return [...byId]
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function formatDateFilterLabel(filters) {
    const { from, to, dateField, addedDays } = filters;

    if (addedDays !== null) {
        return `Added in last ${addedDays} day${addedDays === 1 ? '' : 's'}`;
    }

    if (from || to) {
        const prefix = dateField === 'added' ? 'Added' : 'Taken';

        if (from && to) {
            return `${prefix}: ${from} – ${to}`;
        }
        if (from) {
            return `${prefix}: from ${from}`;
        }
        return `${prefix}: until ${to}`;
    }

    return null;
}

export function parseGalleryHash(hash) {
    const queryIndex = hash.indexOf('?');
    const query = queryIndex === -1 ? '' : hash.slice(queryIndex + 1);
    const params = new URLSearchParams(query);

    const tagsParam = params.get('tags');
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

    const addedDaysParam = params.get('addedDays');
    const addedDays = addedDaysParam !== null && addedDaysParam !== '' &&
        !Number.isNaN(Number(addedDaysParam))
        ? Number(addedDaysParam)
        : null;

    const sortParam = params.get('sort');
    const orderParam = params.get('order');

    return {
        tags,
        location: params.get('place') || null,
        area: params.get('place') ? params.get('area') || null : null,
        from: params.get('from') || null,
        to: params.get('to') || null,
        dateField: params.get('dateField') === 'added' ? 'added' : 'taken',
        addedDays,
        sort: sortParam === 'added' || sortParam === 'taken' || sortParam === 'random' ? sortParam : null,
        order: orderParam === 'asc' || orderParam === 'desc' ? orderParam : null
    };
}

export function buildGalleryQuery(filters, sortField, sortOrder) {
    const { tags, location, area, from, to, dateField, addedDays } = filters;
    const params = new URLSearchParams();

    if (tags.length > 0) {
        params.set('tags', tags.join(','));
    }
    if (location) {
        params.set('place', location);
    }
    if (location && area) {
        params.set('area', area);
    }
    if (from) {
        params.set('from', from);
    }
    if (to) {
        params.set('to', to);
    }
    if (dateField === 'added' && (from || to)) {
        params.set('dateField', 'added');
    }
    if (addedDays !== null) {
        params.set('addedDays', String(addedDays));
    }

    const fallback = defaultSort(addedDays);
    if (sortField === 'random') {
        if (fallback.field !== 'random') {
            params.set('sort', 'random');
        }
    } else if (sortField !== fallback.field || sortOrder !== fallback.order) {
        params.set('sort', sortField);
        params.set('order', sortOrder);
    }

    return params.toString();
}
