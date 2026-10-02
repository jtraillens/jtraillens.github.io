const Slideshow = (function() {

    // Time from one photo starting to fade in to the next one starting to
    // fade in. The crossfade itself is the .slideshow-layer transition in
    // css/style.css -- keep it, plus CAPTION_FADE_MS, well under this.
    const SLIDE_INTERVAL_MS = 10000;

    // How long the mouse has to sit still before the cursor and close button
    // are hidden.
    const IDLE_MS = 2000;

    // How long the caption takes to fade in or out. Each change of photo
    // waits for the caption to fade out first, so this is the source of
    // truth for the timing -- it's applied to the caption's CSS transition
    // via --slideshow-caption-fade rather than hardcoded there too.
    const CAPTION_FADE_MS = 800;

    // Fewer than this and there's nothing to rotate through -- the button
    // stays visible (so the controls row doesn't jump around as filters
    // change) but disabled.
    const MIN_PHOTOS = 2;

    const button = document.querySelector('#slideshowBtn');
    const countEl = document.querySelector('#slideshowCount');
    const overlay = document.querySelector('#slideshow');
    const layers = Array.from(overlay.querySelectorAll('.slideshow-layer'));
    const closeButton = document.querySelector('#slideshowClose');
    const caption = document.querySelector('#slideshowCaption');
    const captionTitle = caption.querySelector('.slideshow-caption-title');
    const captionMeta = caption.querySelector('.slideshow-caption-meta');

    // A copy of the filtered list, in the gallery's current sort order, taken
    // when the slideshow starts -- a copy so a filter change behind the
    // overlay (e.g. Back) can't reorder or shrink it mid-show. Walked in
    // order, wrapping back to the start. There's no separate shuffle: the
    // gallery's own Random sort (and its shuffle button) covers that.
    let queue = [];
    let queueIndex = 0;
    let active = false;

    // Which of layers[0]/[1] is currently showing; the other one is where
    // the next photo goes before it's faded in over the top.
    let frontLayer = 0;

    // The next photo and its in-flight preload, started as soon as the
    // current one is up so it's usually ready well before the timer fires.
    let pending = null;
    let timerId = null;

    // Consecutive load failures -- once every photo in the queue has failed
    // in a row there's nothing left to skip to, so the show stops rather
    // than spinning through the queue forever.
    let failures = 0;

    // Bumped on every start/stop. Preload promises (and the wake lock
    // request) can resolve after the slideshow has closed, or been closed
    // and reopened, so each callback checks it's still from the current run
    // before touching anything.
    let runId = 0;

    // The screen wake lock while the slideshow is running, or null. The
    // browser releases it by itself whenever the tab is hidden, so it's
    // re-requested when the tab becomes visible again.
    let wakeLock = null;

    let idleTimerId = null;
    let lastPointer = null;

    function nextPhoto() {
        const photo = queue[queueIndex];
        queueIndex = (queueIndex + 1) % queue.length;
        return photo;
    }

    function photoSrc(photo) {
        return `photos/${photo.fileName}`;
    }

    function preloadNext() {
        const photo = nextPhoto();
        pending = { photo, ready: Preload.image(photoSrc(photo)) };
    }

    // Puts the photo on the back layer and swaps which layer is visible --
    // the CSS opacity transition on both does the actual crossfade. The
    // photo is already in the browser's cache from preloadNext(), so it's
    // ready to paint by the time the fade starts.
    function crossfadeTo(photo) {
        const backLayer = 1 - frontLayer;

        layers[backLayer].src = photoSrc(photo);
        layers[backLayer].alt = photo.title || '';
        layers[backLayer].classList.add('slideshow-layer--visible');
        layers[frontLayer].classList.remove('slideshow-layer--visible');
        frontLayer = backLayer;

        // The caption follows once the photo is fully in -- waiting on the
        // layer's own transitionend rather than a fixed delay keeps the two
        // in step if the crossfade duration in css/style.css is retuned.
        const run = runId;
        const layer = layers[backLayer];

        layer.addEventListener('transitionend', function onFadedIn(event) {
            if (event.target !== layer || event.propertyName !== 'opacity') {
                return;
            }

            layer.removeEventListener('transitionend', onFadedIn);

            // Closed, or already moved on to another photo, mid-fade.
            if (run !== runId || layers[frontLayer] !== layer) {
                return;
            }

            renderCaption(photo);
            overlay.classList.add('slideshow--caption-shown');
        });
    }

    // Fades the caption out, then calls next() once it's gone, so the
    // caption is never seen over the wrong photo mid-crossfade. Goes
    // straight on if there's no caption up (the first photo, or one that
    // failed and was skipped). Uses timerId, so stop() cancels it too.
    function hideCaptionThen(next) {
        if (!overlay.classList.contains('slideshow--caption-shown')) {
            next();
            return;
        }

        const run = runId;

        overlay.classList.remove('slideshow--caption-shown');
        timerId = setTimeout(() => {
            if (run === runId) {
                next();
            }
        }, CAPTION_FADE_MS);
    }

    // Same content as the lightbox's title + meta line. The area is shown
    // after the place the same way the gallery's place filter chip does.
    function renderCaption(photo) {
        const location = photo.locationLabel || photo.locationName;
        const place = location && photo.areaLabel
            ? `${location} · ${photo.areaLabel}`
            : location;

        captionTitle.textContent = photo.title || '';
        captionMeta.textContent = [place, formatDateTaken(photo.dateTaken)]
            .filter(Boolean)
            .join(' • ');
    }

    function formatDateTaken(dateTaken) {
        if (!dateTaken) {
            return '';
        }

        return new Date(dateTaken).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric'
        });
    }

    // Waits for the pending photo, fades the current caption out, crossfades
    // the photo in, starts preloading the one after it, and schedules the
    // next advance. The caption fade-out is taken out of the wait so photos
    // still change every SLIDE_INTERVAL_MS. A photo that fails to load is
    // skipped straight away rather than leaving a gap -- and the current
    // photo and its caption stay up until a loadable one is ready.
    function advance() {
        const run = runId;
        const { photo, ready } = pending;

        ready.then(
            () => {
                if (run !== runId) {
                    return;
                }

                failures = 0;
                hideCaptionThen(() => {
                    crossfadeTo(photo);
                    preloadNext();
                    timerId = setTimeout(advance, SLIDE_INTERVAL_MS - CAPTION_FADE_MS);
                });
            },
            error => {
                if (run !== runId) {
                    return;
                }

                console.warn(`Slideshow: skipping ${photo.fileName}`, error);

                if (++failures >= queue.length) {
                    stop();
                    return;
                }

                preloadNext();
                advance();
            }
        );
    }

    // Fullscreen is an enhancement on top of the overlay, which already
    // covers the viewport on its own -- iPhone Safari has no element
    // fullscreen at all, and the request can also be refused (e.g. by an
    // iframe's permissions), so a failure here is ignored.
    function enterFullscreen() {
        if (!overlay.requestFullscreen) {
            return;
        }

        overlay.requestFullscreen().catch(error => {
            console.warn('Slideshow: fullscreen unavailable', error);
        });
    }

    // Resolves once fullscreen has actually ended (or straight away if it
    // was never on), so the caller can wait for the browser's own exit
    // animation to finish before changing what's on screen.
    function exitFullscreen() {
        if (document.fullscreenElement !== overlay) {
            return Promise.resolve();
        }

        return document.exitFullscreen().catch(() => {});
    }

    // Fires on entering fullscreen too, so only an exit (the overlay no
    // longer being the fullscreen element) closes the slideshow -- that's
    // how Esc arrives while in fullscreen, since the browser keeps that key
    // for itself. stop() exiting fullscreen also lands here, but by then
    // `active` is already false.
    function onFullscreenChange() {
        if (active && document.fullscreenElement !== overlay) {
            stop();
        }
    }

    // Only available on secure origins (https, or localhost) -- elsewhere
    // navigator.wakeLock is simply missing, and the screen may sleep as
    // usual. Can also be refused, e.g. in battery saver mode.
    async function requestWakeLock() {
        if (!('wakeLock' in navigator) || wakeLock) {
            return;
        }

        const run = runId;

        try {
            const lock = await navigator.wakeLock.request('screen');

            // Closed (or closed and reopened) while the request was pending.
            if (run !== runId) {
                lock.release().catch(() => {});
                return;
            }

            wakeLock = lock;
            lock.addEventListener('release', () => {
                if (wakeLock === lock) {
                    wakeLock = null;
                }
            });
        } catch (error) {
            console.warn('Slideshow: wake lock unavailable', error);
        }
    }

    function releaseWakeLock() {
        wakeLock?.release().catch(() => {});
        wakeLock = null;
    }

    function onVisibilityChange() {
        if (active && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    }

    // Shows the cursor and close button, and hides them again once the
    // pointer has been still for IDLE_MS. Touch has no hover, so a tap
    // (pointerdown) brings them back too.
    function wakeControls() {
        overlay.classList.remove('slideshow--idle');

        clearTimeout(idleTimerId);
        idleTimerId = setTimeout(() => {
            overlay.classList.add('slideshow--idle');
        }, IDLE_MS);
    }

    // Some browsers send a mousemove without any actual movement (e.g. when
    // what's under a still cursor changes), which would keep bringing the
    // controls back on every crossfade -- so only a real position change
    // counts.
    function onPointerMove(event) {
        if (lastPointer &&
            lastPointer.x === event.screenX &&
            lastPointer.y === event.screenY) {
            return;
        }

        lastPointer = { x: event.screenX, y: event.screenY };
        wakeControls();
    }

    function updateButton(count) {
        countEl.textContent = count;
        button.setAttribute('aria-label', `Play slideshow (${count} photo${count === 1 ? '' : 's'})`);
        button.disabled = count < MIN_PHOTOS;
    }

    function start() {
        const photos = Gallery.getFilteredPhotos();

        if (active || photos.length < MIN_PHOTOS) {
            return;
        }

        active = true;
        runId++;
        queue = photos.slice();
        queueIndex = 0;
        frontLayer = 0;
        failures = 0;
        lastPointer = null;

        overlay.hidden = false;
        document.body.classList.add('slideshow-open');

        // Focus the overlay itself rather than the close button, so the
        // button doesn't stay pinned visible via :focus-visible for
        // keyboard users -- Tab still reaches it.
        overlay.focus();

        // Must be called right here in the click handler: browsers only
        // allow fullscreen in direct response to a user gesture.
        enterFullscreen();
        requestWakeLock();
        wakeControls();

        // The first photo fades in from the black background the same way
        // every later one fades in over its predecessor.
        preloadNext();
        advance();
    }

    // The one teardown every exit path (Esc, close button, leaving
    // fullscreen, or running out of loadable photos) goes through. The
    // `active` guard makes it safe to call more than once -- exiting
    // fullscreen below fires fullscreenchange, which calls it again.
    //
    // Everything that stops the show happens right away, but the overlay
    // is left exactly as it is until fullscreen has ended: hiding it (or
    // fading the photo out) while still fullscreen makes the browser's own
    // exit animation start from a jump to black. With Esc the browser has
    // already left fullscreen by the time this runs, so it's the same
    // either way.
    function stop() {
        if (!active) {
            return;
        }

        active = false;
        runId++;

        clearTimeout(timerId);
        timerId = null;
        pending = null;

        clearTimeout(idleTimerId);
        idleTimerId = null;

        releaseWakeLock();
        exitFullscreen().then(hideOverlay);
    }

    function hideOverlay() {
        // Reopened while fullscreen was still exiting -- leave it be.
        if (active) {
            return;
        }

        overlay.classList.remove('slideshow--idle');

        overlay.classList.remove('slideshow--caption-shown');
        captionTitle.textContent = '';
        captionMeta.textContent = '';

        overlay.hidden = true;
        document.body.classList.remove('slideshow-open');

        layers.forEach(layer => {
            layer.classList.remove('slideshow-layer--visible');
            layer.removeAttribute('src');
        });

        button.focus();
    }

    caption.style.setProperty('--slideshow-caption-fade', `${CAPTION_FADE_MS}ms`);

    button.addEventListener('click', start);
    closeButton.addEventListener('click', stop);

    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerdown', wakeControls);

    document.addEventListener('keydown', event => {
        if (active && event.key === 'Escape') {
            stop();
        }
    });

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    document.addEventListener('gallery:filtered', event => {
        updateButton(event.detail.count);
    });

    return { start, stop }

})();
