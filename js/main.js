const Main = (function() {

    const routes = {
        '': Gallery.loadGallery
    }

    // Parses the #/gallery?tags=a,b&from=YYYY-MM-DD&to=YYYY-MM-DD
    // &dateField=taken|added&addedDays=N hash into a filter object for
    // Gallery.applyFilter(). All params are optional.
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

        return {
            tags,
            from: params.get('from') || null,
            to: params.get('to') || null,
            dateField: params.get('dateField') === 'added' ? 'added' : 'taken',
            addedDays
        };
    }

    function router() {
        const hash = window.location.hash || '';

        if (hash === '#about' || hash === '#about/license') {
            showView('about');
            if (hash === '#about/license') {
                document.querySelector('#license')?.scrollIntoView();
            }
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
        document.querySelector('#galleryView').hidden = view !== 'gallery';
        document.querySelector('#aboutView').hidden = view !== 'about';
    }

    async function init() {
        await Gallery.loadGallery();
        window.addEventListener('hashchange', router);
        router();
    }

    return { init, showGallery: () => showView('gallery') }

})();

Main.init();