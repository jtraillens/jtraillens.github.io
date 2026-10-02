import { formatDateTaken } from './format.js?v=20261002100805';

let currentIndex = 0;
let currentPhotos = [];
let onPhotoChange = null;
let onClose = null;
let loadToken = 0;
const fullImageCache = new Set();

const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxSpinner = document.querySelector('.lightbox-spinner');
const lightboxImageWrap = document.querySelector('.lightbox-image-wrap');
const lightboxTitle = document.querySelector(".lightbox-title");
const lightboxMeta = document.querySelector(".lightbox-meta");
const lightboxDescription = document.querySelector('.lightbox-description');
const lightboxDetails = document.querySelector('.lightbox-details');
const lightboxTaxon = document.querySelector('.lightbox-taxon a');
const lightboxTaxonName = document.querySelector('.lightbox-taxon-name');
const closeButton = document.querySelector('.lightbox-close');
const previousButton = document.querySelector('.lightbox-prev');
const nextButton = document.querySelector('.lightbox-next');

function applyImageBox() {
    const naturalWidth = lightboxImage.naturalWidth;
    const naturalHeight = lightboxImage.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
        return;
    }

    const isMobile = window.innerWidth <= 760;
    const maxWidth = window.innerWidth * (isMobile ? 0.98 : 0.9);
    const maxHeight = isMobile
        ? window.innerHeight * 0.7
        : Math.min(window.innerHeight * 0.75, 900);
    const ratio = naturalWidth / naturalHeight;

    let width = maxWidth;
    let height = width / ratio;

    if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
    }

    lightboxImage.style.width = `${Math.round(width)}px`;
    lightboxImage.style.height = `${Math.round(height)}px`;
}

const SWIPE_THRESHOLD = 50;
let touchStartX = null;
let touchStartY = null;

export function open(index, photosToDisplay, callbacks = {}) {
    currentPhotos = photosToDisplay;
    currentIndex = index;
    onPhotoChange = callbacks.onPhotoChange ?? null;
    onClose = callbacks.onClose ?? null;

    showPhoto(currentIndex);

    lightbox.hidden = false;
    lightbox.classList.add('fade-start');

    requestAnimationFrame(() => {
        lightbox.classList.remove('fade-start');
    });
}

export function close() {
    lightbox.classList.add('fade-start');

    setTimeout(() => {
        lightbox.hidden = true;
    }, 300);

    if (onClose) {
        onClose();
    }
}

function showPhoto(index) {
    const photo = currentPhotos[index];

    if (!photo) {
        return;
    }

    const token = ++loadToken;
    const fullSrc = `photos/${photo.fileName}`;

    lightboxImage.alt = photo.title;

    lightboxDetails.classList.add('is-hidden');

    lightboxImage.addEventListener('load', () => {
        if (token === loadToken) {
            lightboxDetails.classList.remove('is-hidden');
        }
    }, { once: true });

    if (fullImageCache.has(fullSrc)) {
        lightboxImage.src = fullSrc;
        lightboxSpinner.hidden = true;
        lightboxImageWrap.classList.remove('is-loading');
    } else {
        lightboxImage.src = `photo-thumbs/${photo.fileName}`;
        lightboxSpinner.hidden = false;
        lightboxImageWrap.classList.add('is-loading');

        const fullImage = new Image();

        fullImage.onload = () => {
            fullImageCache.add(fullSrc);

            if (token !== loadToken) {
                return;
            }

            lightboxImage.src = fullSrc;
            lightboxSpinner.hidden = true;
            lightboxImageWrap.classList.remove('is-loading');
        };

        fullImage.onerror = () => {
            if (token === loadToken) {
                lightboxSpinner.hidden = true;
                lightboxImageWrap.classList.remove('is-loading');
            }
        };

        fullImage.src = fullSrc;
    }

    preloadNeighbors(index);

    lightboxTitle.textContent = photo.title ?? "";

    const meta = [];

    const location = photo.locationLabel || photo.locationName;

    if (location) {
        meta.push(location);
    }

    const formattedDate = formatDateTaken(photo.dateTaken);

    if (formattedDate) {
        meta.push(formattedDate);
    }

    if (photo.camera) {
        meta.push(`Shot on ${photo.camera}`);
    }

    lightboxMeta.textContent = meta.join(" • ");

    lightboxDescription.textContent = photo.description ?? "";
    lightboxDescription.hidden = !photo.description;

    if (photo.taxonUrl && photo.taxonName) {
        lightboxTaxon.href = photo.taxonUrl;
        lightboxTaxonName.textContent = photo.taxonName;
        lightboxTaxon.parentElement.hidden = false;
    } else {
        lightboxTaxon.parentElement.hidden = true;
    }

    currentIndex = index;

    if (onPhotoChange) {
        onPhotoChange(photo);
    }
}

function preloadNeighbors(index) {
    [index - 1, index + 1].forEach(neighborIndex => {
        const neighbor = currentPhotos.at(neighborIndex % currentPhotos.length);

        if (!neighbor) {
            return;
        }

        const src = `photos/${neighbor.fileName}`;

        if (fullImageCache.has(src)) {
            return;
        }

        const image = new Image();
        image.onload = () => fullImageCache.add(src);
        image.src = src;
    });
}

function showPrevious() {
    let index = currentIndex - 1;

    if (index < 0) {
        index = currentPhotos.length - 1;
    }

    showPhoto(index);
}

function showNext() {
    let index = currentIndex + 1;

    if (index >= currentPhotos.length) {
        index = 0;
    }

    showPhoto(index);
}

export function init() {
    lightboxImage.addEventListener('load', applyImageBox);

    window.addEventListener('resize', () => {
        if (!lightbox.hidden) {
            applyImageBox();
        }
    });

    closeButton.addEventListener('click', close);

    lightbox.addEventListener('click', event => {
        if (event.target === lightbox) {
            close();
        }
    });

    previousButton.addEventListener('click', event => {
        event.stopPropagation();
        showPrevious();
    });

    nextButton.addEventListener('click', event => {
        event.stopPropagation();
        showNext();
    });

    document.addEventListener('keydown', event => {
        if (lightbox.hidden) {
            return;
        }

        if (event.key === 'ArrowLeft') {
            showPrevious();
        } else if (event.key === 'ArrowRight') {
            showNext();
        } else if (event.key === 'Escape') {
            close();
        }
    });

    lightboxImageWrap.addEventListener('touchstart', event => {
        const touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });

    lightboxImageWrap.addEventListener('touchend', event => {
        if (touchStartX === null) {
            return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        touchStartX = null;
        touchStartY = null;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
                return;
            }

            if (deltaX > 0) {
                showPrevious();
            } else {
                showNext();
            }
        } else if (deltaY > SWIPE_THRESHOLD) {
            close();
        }
    }, { passive: true });
}
