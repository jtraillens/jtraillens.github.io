const Nav = (function() {

    const SUBJECT_TAGS = [
        { text: 'You Light up my Ice', url: '#/subjects/ice,night' },
        { text: 'Flower Power', url: '#/subjects/flower' },
        { text: 'Fungus Among Us', url: '#/subjects/fungus' },
        { text: 'Up Close and Personal', url: '#/subjects/macro' },
        { text: 'Seeing Double', url: '#/subjects/reflection' },
    ];

    function init() {
        const dropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));

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
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                dropdowns.forEach(dropdown => closeDropdown(
                    dropdown,
                    dropdown.querySelector('.nav-dropdown-trigger'),
                    dropdown.querySelector('.nav-dropdown-panel')
                ));
            }
        });

        window.addEventListener('hashchange', updateActiveStyles);
    }

    function renderSubjects(panel) {
        panel.innerHTML = '';

        SUBJECT_TAGS.forEach(subject => {
            const link = document.createElement('a');

            link.href = subject.url;
            link.textContent = subject.text;
            link.className = 'nav-subject-link';
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

    function updateActiveStyles() {
        const hash = window.location.hash || '';
        const isSubjectActive = SUBJECT_TAGS.some(subject => subject.url === hash);

        document.querySelectorAll('.nav-subject-link').forEach(link => {
            link.classList.toggle('active', link.dataset.url === hash);
        });

        document.querySelector('#subjectsTrigger').classList.toggle('active', isSubjectActive);

        document.querySelector('#aboutLink').classList.toggle('active', hash === '#about');
        document.querySelector('#galleryLink').classList.toggle(
            'active',
            hash !== '#about' && !hash.startsWith('#/subjects')
        );
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

    return { init, updateActiveStyles };

})();

Nav.init();
