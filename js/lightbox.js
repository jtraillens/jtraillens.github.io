const Lightbox = (function() {

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
    const lightboxCaption = document.querySelector('.lightbox-caption');
    const lightboxDetails = document.querySelector('.lightbox-details');
    const lightboxTaxon = document.querySelector('.lightbox-taxon a');
    const closeButton = document.querySelector('.lightbox-close');
    const previousButton = document.querySelector('.lightbox-prev');
    const nextButton = document.querySelector('.lightbox-next');

    // The thumbnail and full-res image share the same aspect ratio (the
    // thumbnail is generated from the full image with Pillow's
    // aspect-preserving .thumbnail()), so as soon as whichever one is
    // currently loaded reports its natural size, lock the <img> to the box
    // the full-res version will occupy. That way swapping the thumbnail out
    // for the full-res image never changes the displayed size - only the
    // sharpness - instead of popping from thumbnail-size to full-size.
    function applyImageBox() {
        const naturalWidth = lightboxImage.naturalWidth;
        const naturalHeight = lightboxImage.naturalHeight;

        if (!naturalWidth || !naturalHeight) {
            return;
        }

        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = Math.min(window.innerHeight * 0.75, 900);
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

    lightboxImage.addEventListener('load', applyImageBox);

    window.addEventListener('resize', () => {
        if (!lightbox.hidden) {
            applyImageBox();
        }
    });

    function open(index, photosToDisplay, callbacks = {}) {
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

    function close() {
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

        // Caption/title text is ready instantly, but the full-res image is a
        // fresh network fetch. Show the (tiny, likely already-cached) grid
        // thumbnail right away - stretched to the full display size, so it
        // reads as soft/low-quality on its own, no artificial blur needed -
        // so the caption never outpaces the image, then swap in the full-res
        // version once it's loaded.
        lightboxImage.alt = photo.title;

        // Hide the title/meta/caption block until whichever image actually
        // paints first (the thumbnail, or the cached full-res image) - keeps
        // the caption from appearing a beat ahead of any visible image.
        // {once: true} means this only fires for that first paint, not for
        // the later thumbnail -> full-res swap.
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

        if (photo.locationName) {
            meta.push(photo.locationName);
        }

        const formattedDate = formatDateTaken(photo.dateTaken);

        if (formattedDate) {
            meta.push(formattedDate);
        }

        lightboxMeta.textContent = meta.join(" • ");

        lightboxCaption.textContent = photo.caption ?? "";

        if (photo.taxonUrl) {
            lightboxTaxon.href = photo.taxonUrl;
            lightboxTaxon.parentElement.hidden = false;
        }

        lightboxTaxon.parentElement.hidden = !photo.taxonUrl;

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

    function formatDateTaken(dateTaken) {
        if (!dateTaken) {
            return "";
        }

        return new Date(dateTaken).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
        });
    }

    closeButton.addEventListener('click', close);

    lightbox.addEventListener('click', event => {
        if (event.target === lightbox) {
            close();
        }
    });

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

    return {
        open,
        close
    };

})();