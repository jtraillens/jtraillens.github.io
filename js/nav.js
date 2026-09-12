const Nav = (function() {

    function init() {
        const navToggle = document.querySelector('#navToggle');
        const navLinks = document.querySelector('#navLinks');

        function closeAllDropdowns() {
            document.querySelectorAll('.nav-dropdown').forEach(dropdown => closeDropdown(
                dropdown,
                dropdown.querySelector('.nav-dropdown-trigger'),
                dropdown.querySelector('.nav-dropdown-panel')
            ));
        }

        // The hamburger menu (mobile only, see CSS) collapses the whole
        // .nav-links row -- including any dropdowns, which stack in-flow
        // inside it there rather than floating.
        function closeMobileMenu() {
            navLinks.classList.remove('open');
            navToggle.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
            closeAllDropdowns();
        }

        // Builds the nav's DOM from NavConfig into #navLinks.
        renderNav(navLinks, closeMobileMenu);

        navToggle.addEventListener('click', event => {
            event.stopPropagation();

            const isOpen = navLinks.classList.toggle('open');

            navToggle.classList.toggle('open', isOpen);
            navToggle.setAttribute('aria-expanded', String(isOpen));

            if (!isOpen) {
                closeAllDropdowns();
            }
        });

        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            const trigger = dropdown.querySelector('.nav-dropdown-trigger');
            const panel = dropdown.querySelector('.nav-dropdown-panel');

            trigger.addEventListener('click', event => {
                event.stopPropagation();
                toggleDropdown(dropdown, trigger, panel);
            });
        });

        updateActiveStyles();

        document.addEventListener('click', event => {
            document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
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

    // Renders NavConfig into `container`: plain links and dropdown triggers
    // with their child links, in config order. `onLinkActivate` fires on a
    // plain link's click -- dropdown children only need to close their own
    // dropdown (see renderDropdown), since navigating away re-closes the
    // mobile menu via the hashchange listener; plain links need the direct
    // nudge for the case where the hash doesn't actually change (e.g.
    // clicking "Gallery" while already there), which fires no hashchange.
    function renderNav(container, onLinkActivate) {
        const fragment = document.createDocumentFragment();

        NavConfig.forEach(item => {
            fragment.appendChild(item.type === 'dropdown' ? renderDropdown(item) : renderLink(item, onLinkActivate));
        });

        container.prepend(fragment);
    }

    function renderLink(item, onActivate) {
        const link = document.createElement('a');

        link.href = item.href;
        link.textContent = item.label;
        link.className = 'nav-link';
        link.id = item.id;
        link.addEventListener('click', onActivate);

        return link;
    }

    function renderDropdown(item) {
        const dropdown = document.createElement('div');
        dropdown.className = 'nav-dropdown';
        dropdown.id = item.id;

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'nav-link nav-dropdown-trigger';
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.append(document.createTextNode(item.label + ' '));
        trigger.insertAdjacentHTML('beforeend',
            '<svg class="nav-caret" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
                '<path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>'
        );

        const panel = document.createElement('div');
        panel.className = 'nav-dropdown-panel';
        panel.hidden = true;

        item.children.forEach(child => {
            const link = document.createElement('a');

            link.href = child.href;
            link.textContent = child.label;
            link.className = child.separator
                ? 'nav-subject-link nav-subject-link--separated'
                : 'nav-subject-link';
            link.dataset.url = child.href;

            // Let the browser navigate the hash normally (fires 'hashchange',
            // so Main's router handles both the tag filter and the view
            // switch) — just close the dropdown afterwards.
            link.addEventListener('click', () => closeDropdown(dropdown, trigger, panel));

            panel.appendChild(link);
        });

        dropdown.append(trigger, panel);
        return dropdown;
    }

    // Finds the dropdown item (if any) whose child href matches the current
    // hash, e.g. { item: <Collections config>, child: <Recently Added config> }.
    function findActiveDropdownChild() {
        const hash = window.location.hash || '';

        for (const item of NavConfig) {
            if (item.type !== 'dropdown') continue;

            const child = item.children.find(child => child.href === hash);
            if (child) return { item, child };
        }

        return null;
    }

    function getActiveLabel() {
        const activeDropdown = findActiveDropdownChild();
        return activeDropdown ? activeDropdown.child.label : null;
    }

    function updateActiveStyles() {
        const hash = window.location.hash || '';
        const activeDropdown = findActiveDropdownChild();
        const activeLink = NavConfig.find(item =>
            item.type === 'link' && item.activeMatch === 'prefix' && hash.startsWith(item.href)
        );

        document.querySelectorAll('.nav-subject-link').forEach(link => {
            link.classList.toggle('active', link.dataset.url === hash);
        });

        NavConfig.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) return;

            if (item.type === 'dropdown') {
                el.querySelector('.nav-dropdown-trigger').classList.toggle(
                    'active',
                    activeDropdown !== null && activeDropdown.item === item
                );
            } else if (item.activeMatch === 'default') {
                el.classList.toggle('active', !activeLink && !activeDropdown);
            } else {
                el.classList.toggle('active', item === activeLink);
            }
        });

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
    }

    function closeDropdown(dropdown, trigger, panel) {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
    }

    return { init, updateActiveStyles, getActiveLabel };

})();

Nav.init();
