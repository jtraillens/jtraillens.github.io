const Main = (function() {

    // Parses the #/gallery?tags=a,b&place=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
    // &dateField=taken|added&addedDays=N&sort=taken|added|random&order=asc|desc
    // hash into a filter object for Gallery.applyFilter(). place is a
    // locations.json id (e.g. pa-hickory-run-state-park) -- "place" in the
    // URL to match the Places page, "location" in the data and code behind
    // it. All params are
    // optional -- sort/order come back null when absent so Gallery can pick
    // its own default (e.g. newest-added-first for a Recently Added view)
    // rather than always falling back to one fixed default.
    function parseGalleryHash(hash) {
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
            from: params.get('from') || null,
            to: params.get('to') || null,
            dateField: params.get('dateField') === 'added' ? 'added' : 'taken',
            addedDays,
            sort: sortParam === 'added' || sortParam === 'taken' || sortParam === 'random' ? sortParam : null,
            order: orderParam === 'asc' || orderParam === 'desc' ? orderParam : null
        };
    }

    function router() {
        const hash = window.location.hash || '';

        if (hash === '') {
            showView('splash');
            Splash.show();
            return;
        }

        if (hash === '#about' || hash === '#about/license') {
            showView('about');
            if (hash === '#about/license') {
                document.querySelector('#license')?.scrollIntoView();
            }
            return;
        }

        if (hash === '#places') {
            showView('places');
            Places.load();
            return;
        }

        showView('gallery');

        if (hash.startsWith('#/photo/')) {
            const fileName = decodeURIComponent(hash.slice('#/photo/'.length));
            Gallery.openPhotoByFilename(fileName);
        } else {
            Gallery.applyFilter(parseGalleryHash(hash));
        }

    }

    function showView(view) {
        document.querySelector('#splashView').hidden = view !== 'splash';
        document.querySelector('#galleryView').hidden = view !== 'gallery';
        document.querySelector('#aboutView').hidden = view !== 'about';
        document.querySelector('#placesView').hidden = view !== 'places';

        if (view !== 'splash') {
            Splash.stop();
        }
    }

    async function init() {
        await Gallery.loadGallery();
        window.addEventListener('hashchange', router);
        router();
    }

    return { init, showGallery: () => showView('gallery') }

})();

Main.init();