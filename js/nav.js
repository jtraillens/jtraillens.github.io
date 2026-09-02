const Nav = (function() {

    const SUBJECT_TAGS = [
        { text: 'You Light up my Ice', url: '#/subjects/ice,night' },
        { text: 'Flower Power', url: '#/subjects/flower' },        
        { text: 'Fungus Among Us', url: '#/subjects/fungus' },        
        { text: 'Up Close and Personal', url: '#/subjects/macro' },
        { text: 'Seeing Double', url: '#/subjects/reflection' },
    ];

    const SUBJECTS_PREFIX = '#/subjects/';

    function init() {
        const dropdown = document.querySelector('#subjectsDropdown');
        const trigger = document.querySelector('#subjectsTrigger');
        const panel = document.querySelector('#subjectsPanel');

        renderSubjects(panel);
        updateActiveStyles();

        trigger.addEventListener('click', event => {
            event.stopPropagation();
            toggleDropdown(dropdown, trigger, panel);
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('#subjectsDropdown')) {
                closeDropdown(dropdown, trigger, panel);
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closeDropdown(dropdown, trigger, panel);
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

            link.addEventListener('click', event => {
                event.preventDefault();
                selectSubject(subject);
            });

            panel.appendChild(link);
        });
    }

    function selectSubject(subject) {
        const dropdown = document.querySelector('#subjectsDropdown');
        const trigger = document.querySelector('#subjectsTrigger');
        const panel = document.querySelector('#subjectsPanel');

        Gallery.applyTagFilter(parseTagsFromUrl(subject.url));
        updateActiveStyles();

        closeDropdown(dropdown, trigger, panel);
    }

    function parseTagsFromUrl(url) {
        if (!url.startsWith(SUBJECTS_PREFIX)) {
            return [];
        }

        return decodeURIComponent(url.slice(SUBJECTS_PREFIX.length)).split(',');
    }

    function updateActiveStyles() {
        const hash = window.location.hash || '';

        document.querySelectorAll('.nav-subject-link').forEach(link => {
            link.classList.toggle('active', link.dataset.url === hash);
        });
    }

    function toggleDropdown(dropdown, trigger, panel) {
        if (dropdown.classList.contains('open')) {
            closeDropdown(dropdown, trigger, panel);
        } else {
            openDropdown(dropdown, trigger, panel);
        }
    }

    function openDropdown(dropdown, trigger, panel) {
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
    }

    function closeDropdown(dropdown, trigger, panel) {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
    }

    return { init };

})();

Nav.init();
