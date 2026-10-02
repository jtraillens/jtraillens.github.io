const RECENTLY_ADDED_WINDOW_DAYS = 14;

export const NavConfig = [
    { type: 'link', id: 'aboutLink', label: 'About', href: '#about', activeMatch: 'prefix' },
    { type: 'link', id: 'galleryLink', label: 'Gallery', href: '#/gallery', activeMatch: 'default' },
    {
        type: 'dropdown',
        id: 'subjectsDropdown',
        label: 'Collections',
        children: [
            { label: 'Flower Power', href: '#/gallery?tags=flower' },
            { label: 'Fungus Among Us', href: '#/gallery?tags=fungus' },
            { label: 'Pareidolia', href: '#/gallery?tags=pareidolia' },
            { label: 'Tendril Loving Care', href: '#/gallery?tags=tendril' },
            { label: 'Up Close and Personal', href: '#/gallery?tags=macro' },
            { label: 'Recently Added', href: `#/gallery?addedDays=${RECENTLY_ADDED_WINDOW_DAYS}`, separator: true },
        ],
    },
    { type: 'link', id: 'placesLink', label: 'Places', href: '#places', activeMatch: 'prefix', activeParam: 'place' },
];
