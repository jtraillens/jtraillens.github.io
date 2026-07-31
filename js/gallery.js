fetch("data/photos.json")
    .then(response => response.json())
    .then(photos => {
        const gallery = document.querySelector(".gallery");

        photos.forEach(photo => {
            gallery.innerHTML += `
                <div class="gallery-item">
                    <img src="${photo.file}" alt="${photo.caption}">
                    <div class="caption">
                        ${photo.caption}
                    </div>
                </div>
            `;
        });
    });