let currentIndex = 0;

const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxTitle = document.querySelector(".lightbox-title");
const lightboxMeta = document.querySelector(".lightbox-meta");
const lightboxCaption = document.querySelector('.lightbox-caption');
const lightboxTaxon = document.querySelector('.lightbox-taxon a');
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

    lightboxImage.src = photo.fileName;
    lightboxImage.alt = photo.title;

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
