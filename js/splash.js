import { getPhotos } from './state.js?v=20261002100805';
import { HIDDEN_BY_DEFAULT_TAG } from './filters.js?v=20261002100805';

const SLIDE_COUNT = 10;
const ROTATE_MS = 5500;

let slideEls = [];
let captionEl = null;
let containerEl = null;
let progressBarEl = null;
let prevButton = null;
let nextButton = null;

let photos = [];
let currentIndex = 0;
let frontLayer = 0;

let intervalId = null;
let active = false;

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function isLandscape(photo) {
    return !(photo.width && photo.height) || photo.width > photo.height;
}

function pickRandomPhotos() {
    const eligible = getPhotos().filter(
        photo => !photo.tags?.includes(HIDDEN_BY_DEFAULT_TAG) && isLandscape(photo)
    );

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

function playProgressBar() {
    const duration = prefersReducedMotion() ? 0 : ROTATE_MS;

    progressBarEl.style.transition = 'none';
    progressBarEl.style.width = '0%';
    void progressBarEl.offsetWidth;
    progressBarEl.style.transition = `width ${duration}ms linear`;
    progressBarEl.style.width = '100%';
}

function pauseProgressBar() {
    const computedWidth = getComputedStyle(progressBarEl).width;
    progressBarEl.style.transition = 'none';
    progressBarEl.style.width = computedWidth;
}

function showSlide(index) {
    const photo = photos[index];
    const backLayer = 1 - frontLayer;
    const img = new Image();

    img.onload = () => {
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

export function show() {
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

export function stop() {
    active = false;
    stopInterval();
}

export function init() {
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
