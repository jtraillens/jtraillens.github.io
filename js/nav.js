const Nav = (function() {

    // How far back "Recently Added" looks, in days. May move to 30 once
    // there's a better sense of how often batches get published.
    const RECENTLY_ADDED_WINDOW_DAYS = 15;

    const SUBJECT_TAGS = [
        { text: 'Flower Power', url: '#/gallery?tags=flower' },
        { text: 'Fungus Among Us', url: '#/gallery?tags=fungus' },
        { text: 'Seeing Double', url: '#/gallery?tags=reflection' },
        { text: 'Tendril Loving Care', url: '#/gallery?tags=tendril' },
        { text: 'Up Close and Personal', url: '#/gallery?tags=macro' },
        // Time-based rather than subject-based, so it's set apart from the
        // tag collections above with a divider rather than blending in as
        // if it were just another theme.
        { text: 'Recently Added', url: `#/gallery?addedDays=${RECENTLY_ADDED_WINDOW_DAYS}`, separator: true },
    ];

    function init() {
        const dropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
        const navToggle = document.querySelector('#navToggle');
        const navLinks = document.querySelector('#navLinks');

        function closeAllDropdowns() {
            dropdowns.forEach(dropdown => closeDropdown(
                dropdown,
                dropdown.querySelector('.nav-dropdown-trigger'),
                dropdown.querySelector('.nav-dropdown-panel')
            ));
        }

        // The hamburger menu (mobile only, see CSS) collapses the whole
        // .nav-links row -- including the Collections/Tag Search dropdowns,
        // which stack in-flow inside it there rather than floating.
        function closeMobileMenu() {
            navLinks.classList.remove('open');
            navToggle.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
            closeAllDropdowns();
        }

        navToggle.addEventListener('click', event => {
            event.stopPropagation();

            const isOpen = navLinks.classList.toggle('open');

            navToggle.classList.toggle('open', isOpen);
            navToggle.setAttribute('aria-expanded', String(isOpen));

            if (!isOpen) {
                closeAllDropdowns();
            }
        });

        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.nav-dropdown-trigger');
            const panel = dropdown.querySelector('.nav-dropdown-panel');

            trigger.addEventListener('click', event => {
                event.stopPropagation();
                toggleDropdown(dropdown, trigger, panel);
            });
        });

        renderSubjects(document.querySelector('#subjectsPanel'));
        updateActiveStyles();

        // Plain links (About/Gallery) don't go through toggleDropdown, so
        // they need their own nudge to fold the mobile menu back up.
        document.querySelector('#aboutLink').addEventListener('click', closeMobileMenu);
        document.querySelector('#galleryLink').addEventListener('click', closeMobileMenu);

        document.addEventListener('click', event => {
            dropdowns.forEach(dropdown => {
                if (!event.target.closest(`#${dropdown.id}`)) {
                    closeDropdown(
                        dropdown,
                        dropdown.querySelector('.nav-dropdown-trigger'),
                        dropdown.querySelector('.nav-dropdown-panel')
                    );
                }
            });

            if (!event.target.closest('.site-nav')) {
                closeMobileMenu();
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closeMobileMenu();
            }
        });

        window.addEventListener('hashchange', () => {
            updateActiveStyles();
            closeMobileMenu();
        });
    }

    function renderSubjects(panel) {
        panel.innerHTML = '';

        SUBJECT_TAGS.forEach(subject => {
            const link = document.createElement('a');

            link.href = subject.url;
            link.textContent = subject.text;
            link.className = subject.separator
                ? 'nav-subject-link nav-subject-link--separated'
                : 'nav-subject-link';
            link.dataset.url = subject.url;

            // Let the browser navigate the hash normally (fires 'hashchange',
            // so Main's router handles both the tag filter and the view
            // switch) — just close the dropdown afterwards.
            link.addEventListener('click', () => {
                closeDropdown(
                    document.querySelector('#subjectsDropdown'),
                    document.querySelector('#subjectsTrigger'),
                    document.querySelector('#subjectsPanel')
                );
            });

            panel.appendChild(link);
        });
    }

    function getActiveLabel() {
        const hash = window.location.hash || '';
        const subject = SUBJECT_TAGS.find(subject => subject.url === hash);
        return subject ? subject.text : null;
    }

    function updateActiveStyles() {
        const hash = window.location.hash || '';
        const isSubjectActive = SUBJECT_TAGS.some(subject => subject.url === hash);

        document.querySelectorAll('.nav-subject-link').forEach(link => {
            link.classList.toggle('active', link.dataset.url === hash);
        });

        document.querySelector('#subjectsTrigger').classList.toggle('active', isSubjectActive);

        document.querySelector('#aboutLink').classList.toggle('active', hash.startsWith('#about'));
        document.querySelector('#galleryLink').classList.toggle(
            'active',
            !hash.startsWith('#about') && !isSubjectActive
        );

        const label = getActiveLabel();
        const collectionTitle = document.querySelector('#collectionTitle');
        collectionTitle.textContent = label || '';
        collectionTitle.hidden = !label;
    }

    function toggleDropdown(dropdown, trigger, panel) {
        if (dropdown.classList.contains('open')) {
            closeDropdown(dropdown, trigger, panel);
        } else {
            openDropdown(dropdown, trigger, panel);
        }
    }

    function openDropdown(dropdown, trigger, panel) {
        // Only one dropdown open at a time, so they never overlap.
        document.querySelectorAll('.nav-dropdown.open').forEach(other => {
            if (other !== dropdown) {
                closeDropdown(
                    other,
                    other.querySelector('.nav-dropdown-trigger'),
                    other.querySelector('.nav-dropdown-panel')
                );
            }
        });

        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        panel.hidden = false;

        // Tag Search: jump straight into typing once the panel is open.
        const input = panel.querySelector('#tagInput');
        if (input) {
            input.focus();
        }
    }

    function closeDropdown(dropdown, trigger, panel) {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
    }

    return { init, updateActiveStyles, getActiveLabel };

})();

Nav.init();
