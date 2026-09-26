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

    // Same place-filter hash the gallery itself writes (see Main's parser).
    // An area is only meaningful alongside its place, so it rides with it.
    function galleryHref(place, area) {
        const params = { place: place.id };
        if (area) params.area = area.id;
        return '#/gallery?' + new URLSearchParams(params);
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

    // A place with areas gets an expander after its row; the areas list
    // underneath starts collapsed. The place's own count is the total for
    // the whole location, so it's already the sum of the areas (plus any
    // photos with no area).
    function renderPlace(place) {
        const item = document.createElement('li');

        const row = renderRow(place.name, galleryHref(place), place.photoCount, place.mapsUrl);
        item.appendChild(row);

        const areas = place.areas || [];
        if (areas.length > 0) {
            const areaList = document.createElement('ul');
            areaList.className = 'place-areas';
            areaList.id = `place-areas-${place.id}`;
            areaList.hidden = true;

            areas.forEach(area => {
                const areaItem = document.createElement('li');
                areaItem.appendChild(
                    renderRow(area.name, galleryHref(place, area), area.photoCount, area.mapsUrl));
                areaList.appendChild(areaItem);
            });

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'place-expander';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-controls', areaList.id);
            toggle.title = `Show areas of ${place.name}`;
            toggle.setAttribute('aria-label', `Show areas of ${place.name}`);
            toggle.innerHTML =
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<path d="M9 6l6 6-6 6"/>' +
                '</svg>';
            toggle.addEventListener('click', () => {
                const expanded = areaList.hidden;
                areaList.hidden = !expanded;
                toggle.setAttribute('aria-expanded', String(expanded));
                const label = `${expanded ? 'Hide' : 'Show'} areas of ${place.name}`;
                toggle.title = label;
                toggle.setAttribute('aria-label', label);
            });
            row.appendChild(toggle);

            item.appendChild(areaList);
        }

        return item;
    }

    // Name, photo count (linking to the filtered gallery), and (if there's a
    // mapsUrl) map pin -- shared by places and their areas. The name is plain
    // text for now; it's reserved for linking to a place/area page later.
    function renderRow(name, href, photoCount, mapsUrl) {
        const row = document.createElement('div');
        row.className = 'place-row';

        const label = document.createElement('span');
        label.className = 'place-name';
        label.textContent = name;
        row.appendChild(label);

        const count = document.createElement('a');
        count.href = href;
        count.className = 'place-count';
        count.textContent = photoCount;
        const countLabel = `View ${photoCount} photo${photoCount === 1 ? '' : 's'} of ${name}`;
        count.title = countLabel;
        count.setAttribute('aria-label', countLabel);
        row.appendChild(count);

        if (mapsUrl) {
            const pin = document.createElement('a');
            pin.href = mapsUrl;
            pin.target = '_blank';
            pin.rel = 'noopener';
            pin.className = 'place-pin';
            pin.title = `Open ${name} in maps`;
            pin.setAttribute('aria-label', `Open ${name} in maps`);
            pin.innerHTML =
                '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/>' +
                    '<circle cx="12" cy="10" r="2.5"/>' +
                '</svg>';
            row.appendChild(pin);
        }

        return row;
    }

    return { load };

})();
