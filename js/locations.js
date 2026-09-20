const Locations = (function() {

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

        const list = document.querySelector('#locationsList');

        try {
            const response = await fetch('data/locations.json');
            renderLocations(list, await response.json());
            loaded = true;
        } catch (error) {
            list.textContent = 'Unable to load locations.';
        }
    }

    function groupByState(locations) {
        const groups = new Map();

        locations.forEach(location => {
            const state = location.state || 'Other';
            if (!groups.has(state)) groups.set(state, []);
            groups.get(state).push(location);
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
    function galleryHref(location) {
        return '#/gallery?' + new URLSearchParams({ tags: location.tag });
    }

    function renderLocations(container, locations) {
        container.replaceChildren();

        groupByState(locations).forEach(([state, items]) => {
            const section = document.createElement('section');
            section.className = 'locations-state';

            const heading = document.createElement('h2');
            heading.textContent = stateLabel(state);
            section.appendChild(heading);

            const list = document.createElement('ul');
            list.className = 'locations-list';

            items.forEach(location => list.appendChild(renderLocation(location)));

            section.appendChild(list);
            container.appendChild(section);
        });
    }

    function renderLocation(location) {
        const item = document.createElement('li');

        const link = document.createElement('a');
        link.href = galleryHref(location);
        link.className = 'location-link';
        link.textContent = location.name;
        item.appendChild(link);

        const count = document.createElement('span');
        count.className = 'location-count';
        count.textContent = location.photoCount;
        item.appendChild(count);

        if (location.mapsUrl) {
            const pin = document.createElement('a');
            pin.href = location.mapsUrl;
            pin.target = '_blank';
            pin.rel = 'noopener';
            pin.className = 'location-pin';
            pin.title = `Open ${location.name} in maps`;
            pin.setAttribute('aria-label', `Open ${location.name} in maps`);
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
