const Gallery = (function() {

    let photos = [];
    let filteredPhotos = [];
    let allTags = [];
    let selectedTags = [];
    let selectedSuggestionIndex = -1;

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
        const template = document.querySelector('#photo-template');

        gallery.innerHTML = '';

        filteredPhotos.forEach((photo, index) => {
            const item = template.content.cloneNode(true);
            const image = item.querySelector('.photo');
            const caption = item.querySelector('.caption');

            image.src = `thumbs/${photo.fileName}`;
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
            applyTagFilter([]);
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
        renderSelectedTags();
        applyTagFilter();
    }


    function applyTagFilter(tags) {
        if (tags !== undefined) {
            selectedTags = tags;
        }

        filteredPhotos = photos.filter(photo =>
            selectedTags.every(tag =>
                photo.tags?.includes(tag)
            )
        );

        renderSelectedTags();
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
    }

    function renderSelectedTags() {
        const container = document.querySelector('#selectedTags');

        document.querySelector('#clearTagsLink').hidden = selectedTags.length === 0;

        container.innerHTML = '';

        selectedTags.forEach(tag => {
            const span = document.createElement('span');

            span.innerHTML = `${tag} <strong>×</strong>`;

            span.addEventListener('click', () => {
                selectedTags = selectedTags.filter(t => t !== tag);
                renderSelectedTags();
                applyTagFilter();
            });

            container.appendChild(span);
        });
    }

    function updateHash() {
        if (selectedTags.length === 0) {
            history.replaceState(null, '', window.location.pathname);
        } else {
            const tagString = selectedTags.map(encodeURIComponent).join(',');
            history.replaceState(null, '', `#/subjects/${tagString}`);
        }

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
        applyTagFilter,
        openPhotoByFilename
    }

})();