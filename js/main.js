import * as Lightbox from './lightbox.js?v=20261002130618';
import * as Gallery from './gallery.js?v=20261002130618';
import * as Slideshow from './slideshow.js?v=20261002130618';
import * as Splash from './splash.js?v=20261002130618';
import * as Places from './places.js?v=20261002130618';
import * as Nav from './nav.js?v=20261002130618';
import { showView } from './views.js?v=20261002130618';
import { parseGalleryHash } from './filters.js?v=20261002130618';

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

async function init() {
    Lightbox.init();
    Slideshow.init();
    Splash.init();
    Nav.init();

    await Gallery.loadGallery();
    window.addEventListener('hashchange', router);
    router();
}

init();
