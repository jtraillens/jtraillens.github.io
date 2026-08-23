const Main = (function() {

    const routes = {
        '': Gallery.loadGallery
    }

    function router() {
        const hash = window.location.hash || '';
        
        if (hash.startsWith('#/subjects')) {
            const tags = decodeURIComponent(hash.slice('#/subjects/'.length)).split(',');
            Gallery.applyTagFilter(tags);
        }
        else if (hash.startsWith('#/photo/')) {
            const fileName = decodeURIComponent(hash.slice('#/photo/'.length));
            Gallery.openPhotoByFilename(fileName);
        } else {
            Gallery.applyTagFilter([]);
        }
        
    }

    async function init() {
        await Gallery.loadGallery();
        window.addEventListener('hashchange', router);
        router();
    }

    return { init }

})();

Main.init();