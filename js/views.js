import * as Splash from './splash.js?v=20261002100805';

export function showView(view) {
    document.querySelector('#splashView').hidden = view !== 'splash';
    document.querySelector('#galleryView').hidden = view !== 'gallery';
    document.querySelector('#aboutView').hidden = view !== 'about';
    document.querySelector('#placesView').hidden = view !== 'places';

    if (view !== 'splash') {
        Splash.stop();
    }
}
