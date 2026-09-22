const Splash = (function() {

    const SLIDE_COUNT = 10;
    const ROTATE_MS = 5500;

    // Two stacked <img> layers, crossfaded via the .splash-slide--visible
    // class (see css/style.css) -- mirrors the hidden/fade-start toggle
    // pattern Lightbox already uses for its own opacity transition.
    let slideEls = [];
    let captionEl = null;
    let containerEl = null;
    let progressBarEl = null;
    let prevButton = null;
    let nextButton = null;

    let photos = [];       // the 10 (or fewer) photos picked for this visit
    let currentIndex = 0;  // index into `photos` currently shown
    let frontLayer = 0;    // which of slideEls[0]/[1] is the visible layer

    let intervalId = null;
    let active = false;    // true while the Splash view is the current view

    const prefersReducedMotion = () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Landscape only -- the hero box is a wide crop, so portrait photos
    // get cropped down to a sliver of themselves under object-fit: cover.
    // Width/height are only present on photos published since that field
    // was added to the pipeline (see tools/models/photo_metadata.py) --
    // treat a photo missing either as eligible rather than excluding it,
    // so older/un-backfilled entries don't just vanish from the rotation.
    function isLandscape(photo) {
        return !(photo.width && photo.height) || photo.width > photo.height;
    }

    function pickRandomPhotos() {
        const eligible = Gallery.getPhotos().filter(
            photo => !photo.tags?.includes(Gallery.HIDDEN_BY_DEFAULT_TAG) && isLandscape(photo)
        );

        // Fisher-Yates -- a fresh shuffle on every visit is the point here,
        // unlike the gallery grid's seeded shuffle which stays stable while
        // filtering (see gallery.js's shuffleKey()).
        const shuffled = eligible.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled.slice(0, SLIDE_COUNT);
    }

    function renderCaption(photo) {
        const parts = [photo.title, photo.locationLabel].filter(Boolean);
        captionEl.textContent = parts.join(' — ');
    }

    // Restarts the countdown-bar fill from empty. Reusing one inline
    // transition (rather than a fixed CSS animation) lets the duration
    // follow ROTATE_MS and collapse to 0 under prefers-reduced-motion,
    // while still landing on a plain width change pauseProgressBar() can
    // freeze at any point.
    function playProgressBar() {
        const duration = prefersReducedMotion() ? 0 : ROTATE_MS;

        progressBarEl.style.transition = 'none';
        progressBarEl.style.width = '0%';
        void progressBarEl.offsetWidth; // force reflow so the reset above actually applies before re-enabling the transition
        progressBarEl.style.transition = `width ${duration}ms linear`;
        progressBarEl.style.width = '100%';
    }

    // Freezes the bar wherever it currently is (rather than resetting it) --
    // e.g. while the pointer's hovering and a caption's being read, so
    // there's no visible jump when the hover ends and playProgressBar()
    // restarts it.
    function pauseProgressBar() {
        const computedWidth = getComputedStyle(progressBarEl).width;
        progressBarEl.style.transition = 'none';
        progressBarEl.style.width = computedWidth;
    }

    // Preloads the photo into the back (currently hidden) layer, then
    // crossfades it in once it's actually decoded -- avoids fading in a
    // half-loaded or blank image.
    function showSlide(index) {
        const photo = photos[index];
        const backLayer = 1 - frontLayer;
        const img = new Image();

        img.onload = () => {
            // A slower crossfade may still be mid-flight (or the user may
            // have moved on) by the time this fires -- bail if we're no
            // longer showing this index.
            if (index !== currentIndex) {
                return;
            }

            slideEls[backLayer].src = `photos/${photo.fileName}`;
            slideEls[backLayer].alt = photo.title || '';
            slideEls[backLayer].classList.add('splash-slide--visible');
            slideEls[frontLayer].classList.remove('splash-slide--visible');
            frontLayer = backLayer;

            renderCaption(photo);
        };

        img.src = `photos/${photo.fileName}`;
    }

    function advance() {
        currentIndex = (currentIndex + 1) % photos.length;
        showSlide(currentIndex);
        playProgressBar();
    }

    // Manual prev/next (buttons or arrow keys) jumps straight to a slide
    // and gives the auto-rotate timer a fresh full interval to run before
    // moving on again, the same way the hover-pause below leaves a full
    // interval once the pointer leaves.
    function goToRelative(delta) {
        if (photos.length === 0) {
            return;
        }

        stopInterval();
        currentIndex = (currentIndex + delta + photos.length) % photos.length;
        showSlide(currentIndex);

        if (active) {
            startInterval();
        }
    }

    function startInterval() {
        playProgressBar();

        if (intervalId !== null || photos.length <= 1) {
            return;
        }
        intervalId = setInterval(advance, ROTATE_MS);
    }

    function stopInterval() {
        clearInterval(intervalId);
        intervalId = null;
        pauseProgressBar();
    }

    function show() {
        active = true;
        photos = pickRandomPhotos();
        currentIndex = 0;
        frontLayer = 0;

        slideEls.forEach(el => {
            el.classList.remove('splash-slide--visible');
            el.removeAttribute('src');
        });
        captionEl.textContent = '';

        const hasMultiple = photos.length > 1;
        prevButton.hidden = !hasMultiple;
        nextButton.hidden = !hasMultiple;
        progressBarEl.parentElement.hidden = !hasMultiple;

        if (photos.length === 0) {
            return;
        }

        // First slide appears immediately rather than crossfading in from
        // nothing.
        const first = new Image();
        first.onload = () => {
            if (photos.length === 0 || currentIndex !== 0) {
                return;
            }
            slideEls[frontLayer].src = `photos/${photos[0].fileName}`;
            slideEls[frontLayer].alt = photos[0].title || '';
            slideEls[frontLayer].classList.add('splash-slide--visible');
            renderCaption(photos[0]);
        };
        first.src = `photos/${photos[0].fileName}`;

        startInterval();
    }

    function stop() {
        active = false;
        stopInterval();
    }

    function init() {
        containerEl = document.querySelector('#splashSlideshow');
        slideEls = Array.from(document.querySelectorAll('.splash-slide'));
        captionEl = document.querySelector('#splashCaption');
        progressBarEl = document.querySelector('#splashProgressBar');
        prevButton = document.querySelector('#splashPrev');
        nextButton = document.querySelector('#splashNext');

        containerEl.classList.toggle('splash-slideshow--reduced-motion', prefersReducedMotion());

        containerEl.addEventListener('keydown', event => {
            if (photos.length === 0) {
                return;
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToRelative(-1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToRelative(1);
            }
        });

        // stopPropagation isn't needed for opening a lightbox any more
        // (there's nothing left to open on the container), but is kept so
        // a nav-button click doesn't also bubble up and, say, trigger a
        // future container-level handler.
        prevButton.addEventListener('click', event => {
            event.stopPropagation();
            goToRelative(-1);
        });

        nextButton.addEventListener('click', event => {
            event.stopPropagation();
            goToRelative(1);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopInterval();
            } else if (active) {
                startInterval();
            }
        });
    }

    init();

    return { show, stop }

})();
