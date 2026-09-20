// Content for the site nav -- the actual menu items (labels, links,
// dropdown children). nav.js reads this generically; it doesn't know any
// of these labels, tags, or hrefs itself. Add/remove/reorder items here.

// How far back "Recently Added" looks, in days. May move to 30 once
// there's a better sense of how often batches get published.
const RECENTLY_ADDED_WINDOW_DAYS = 14;

const NavConfig = [
    // activeMatch: 'prefix' highlights the link for any hash starting with
    // its href (e.g. a future '#about/whatever'). 'default' highlights the
    // link when nothing else -- no prefix match, no dropdown child -- is
    // active, i.e. it's the fallback/home item.
    { type: 'link', id: 'aboutLink', label: 'About', href: '#about', activeMatch: 'prefix' },
    { type: 'link', id: 'galleryLink', label: 'Gallery', href: '#', activeMatch: 'default' },
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
            // Time-based rather than subject-based, so it's set apart from the
            // tag collections above with a divider rather than blending in as
            // if it were just another theme.
            { label: 'Recently Added', href: `#/gallery?addedDays=${RECENTLY_ADDED_WINDOW_DAYS}`, separator: true },
        ],
    },
    { type: 'link', id: 'locationsLink', label: 'Locations', href: '#locations', activeMatch: 'prefix' },
];
