let photos = [];

async function loadGallery() {
    const response = await fetch('data/gallery.json');
    photos = await response.json();

    const gallery = document.querySelector('.gallery');
    const template = document.querySelector('#photo-template');

    photos.forEach((photo, index) => {
        const item = template.content.cloneNode(true);
        const image = item.querySelector('.photo');
        const caption = item.querySelector('.caption');
        
        image.src = photo.fileName;
        image.alt = photo.title;
        image.dataset.index = index;
        caption.textContent = photo.title;

        gallery.appendChild(item);
    });

    gallery.addEventListener('click', (event) => {
        const image = event.target.closest('img');
        if (!image) {
            return;
        }
        openLightbox(Number(image.dataset.index));
    });
}

loadGallery();