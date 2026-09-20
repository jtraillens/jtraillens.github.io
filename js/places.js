const Places = (function() {

    const STATE_NAMES = {
        DE: 'Delaware',
        MD: 'Maryland',
        NJ: 'New Jersey',
        NY: 'New York',
        OH: 'Ohio',
        PA: 'Pennsylvania',
        WV: 'West Virginia'
    };

    let loaded = false;

    async function load() {
        if (loaded) return;

        const list = document.querySelector('#placesList');

        try {
            const response = await fetch('data/places.json');
            renderPlaces(list, await response.json());
            loaded = true;
        } catch (error) {
            list.textContent = 'Unable to load places.';
        }
    }

    function groupByState(places) {
        const groups = new Map();

        places.forEach(place => {
            const state = place.state || 'Other';
            if (!groups.has(state)) groups.set(state, []);
            groups.get(state).push(place);
        });

        return [...groups.entries()]
            .map(([state, items]) => [
                state,
                items.sort((a, b) => a.name.localeCompare(b.name))
            ])
            .sort(([a], [b]) => stateLabel(a).localeCompare(stateLabel(b)));
    }

    function stateLabel(state) {
        return STATE_NAMES[state] || state;
    }

    // Same tag-filter hash the gallery itself writes (see Main's parser).
    function galleryHref(place) {
        return '#/gallery?' + new URLSearchParams({ tags: place.tag });
    }

    function renderPlaces(container, places) {
        container.replaceChildren();

        groupByState(places).forEach(([state, items]) => {
            const section = document.createElement('section');
            section.className = 'places-state';

            const heading = document.createElement('h2');
            heading.textContent = stateLabel(state);
            section.appendChild(heading);

            const list = document.createElement('ul');
            list.className = 'places-list';

            items.forEach(place => list.appendChild(renderPlace(place)));

            section.appendChild(list);
            container.appendChild(section);
        });
    }

    function renderPlace(place) {
        const item = document.createElement('li');

        const link = document.createElement('a');
        link.href = galleryHref(place);
        link.className = 'place-link';
        link.textContent = place.name;
        item.appendChild(link);

        const count = document.createElement('span');
        count.className = 'place-count';
        count.textContent = place.photoCount;
        item.appendChild(count);

        if (place.mapsUrl) {
            const pin = document.createElement('a');
            pin.href = place.mapsUrl;
            pin.target = '_blank';
            pin.rel = 'noopener';
            pin.className = 'place-pin';
            pin.title = `Open ${place.name} in maps`;
            pin.setAttribute('aria-label', `Open ${place.name} in maps`);
            pin.innerHTML =
                '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/>' +
                    '<circle cx="12" cy="10" r="2.5"/>' +
                '</svg>';
            item.appendChild(pin);
        }

        return item;
    }

    return { load };

})();
