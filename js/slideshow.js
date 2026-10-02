import { getFilteredPhotos } from './state.js?v=20261002100805';
import * as Preload from './preload.js?v=20261002100805';
import { formatDateTaken } from './format.js?v=20261002100805';

const SLIDE_INTERVAL_MS = 10000;

const IDLE_MS = 2000;

const CAPTION_FADE_MS = 800;

const MIN_PHOTOS = 2;

const button = document.querySelector('#slideshowBtn');
const countEl = document.querySelector('#slideshowCount');
const overlay = document.querySelector('#slideshow');
const layers = Array.from(overlay.querySelectorAll('.slideshow-layer'));
const closeButton = document.querySelector('#slideshowClose');
const caption = document.querySelector('#slideshowCaption');
const captionTitle = caption.querySelector('.slideshow-caption-title');
const captionMeta = caption.querySelector('.slideshow-caption-meta');

let queue = [];
let queueIndex = 0;
let active = false;

let frontLayer = 0;

let pending = null;
let timerId = null;

let failures = 0;

let runId = 0;

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

function crossfadeTo(photo) {
    const backLayer = 1 - frontLayer;

    layers[backLayer].src = photoSrc(photo);
    layers[backLayer].alt = photo.title || '';
    layers[backLayer].classList.add('slideshow-layer--visible');
    layers[frontLayer].classList.remove('slideshow-layer--visible');
    frontLayer = backLayer;

    const run = runId;
    const layer = layers[backLayer];

    layer.addEventListener('transitionend', function onFadedIn(event) {
        if (event.target !== layer || event.propertyName !== 'opacity') {
            return;
        }

        layer.removeEventListener('transitionend', onFadedIn);

        if (run !== runId || layers[frontLayer] !== layer) {
            return;
        }

        renderCaption(photo);
        overlay.classList.add('slideshow--caption-shown');
    });
}

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

function enterFullscreen() {
    if (!overlay.requestFullscreen) {
        return;
    }

    overlay.requestFullscreen().catch(error => {
        console.warn('Slideshow: fullscreen unavailable', error);
    });
}

function exitFullscreen() {
    if (document.fullscreenElement !== overlay) {
        return Promise.resolve();
    }

    return document.exitFullscreen().catch(() => {});
}

function onFullscreenChange() {
    if (active && document.fullscreenElement !== overlay) {
        stop();
    }
}

async function requestWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) {
        return;
    }

    const run = runId;

    try {
        const lock = await navigator.wakeLock.request('screen');

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

function wakeControls() {
    overlay.classList.remove('slideshow--idle');

    clearTimeout(idleTimerId);
    idleTimerId = setTimeout(() => {
        overlay.classList.add('slideshow--idle');
    }, IDLE_MS);
}

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

export function start() {
    const photos = getFilteredPhotos();

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

    overlay.focus();

    enterFullscreen();
    requestWakeLock();
    wakeControls();

    preloadNext();
    advance();
}

export function stop() {
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

export function init() {
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
}
