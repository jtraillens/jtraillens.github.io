let currentIndex = 0;

const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxCaption = document.querySelector('.lightbox-caption');
const closeButton = document.querySelector('.lightbox-close');
const previousButton = document.querySelector('.lightbox-prev');
const nextButton = document.querySelector('.lightbox-next');

function openLightbox(index) {
    showPhoto(index);

    lightbox.hidden = false;
    lightbox.classList.add('fade-start');
    requestAnimationFrame(() => {
        lightbox.classList.remove('fade-start');
    });
}

function closeLightbox() {
    lightbox.classList.add('fade-start');
    setTimeout(() => {
        lightbox.hidden = true;
    }, 300);
}

function showPhoto(index) {
    const photo = photos[index];
    lightboxImage.src = photo.file;
    lightboxImage.alt = photo.caption;
    lightboxCaption.textContent = photo.caption;

    currentIndex = index;
}


closeButton.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
        closeLightbox();
    }
});

previousButton.addEventListener('click', event => {
    event.stopPropagation();
    let index = currentIndex - 1;
    if (index < 0) {
        index = photos.length - 1;
    }
    showPhoto(index);
});

nextButton.addEventListener('click', event => {
    event.stopPropagation();
    let index = currentIndex + 1;
    if (index >= photos.length) {
        index = 0;
    }
    showPhoto(index);
});
