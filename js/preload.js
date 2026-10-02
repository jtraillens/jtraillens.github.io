const Preload = (function() {

    // Loads an image off-screen so a later <img src> of the same URL comes
    // straight from the browser's cache. Resolves with the loaded Image, or
    // rejects if it fails to load (404, corrupt file, network error).
    // Used by js/slideshow.js; the lightbox's preloadNeighbors() could move
    // to this too.
    function image(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load ${src}`));
            img.src = src;
        });
    }

    return { image }

})();
