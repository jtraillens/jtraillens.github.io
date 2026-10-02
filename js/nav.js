import { NavConfig } from './nav.config.js?v=20261002130618';

export function init() {
    const navToggle = document.querySelector('#navToggle');
    const navLinks = document.querySelector('#navLinks');

    function closeAllDropdowns() {
        document.querySelectorAll('.nav-dropdown').forEach(dropdown => closeDropdown(
            dropdown,
            dropdown.querySelector('.nav-dropdown-trigger'),
            dropdown.querySelector('.nav-dropdown-panel')
        ));
    }

    function closeMobileMenu() {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        closeAllDropdowns();
    }

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

        link.addEventListener('click', () => closeDropdown(dropdown, trigger, panel));

        panel.appendChild(link);
    });

    dropdown.append(trigger, panel);
    return dropdown;
}

function findActiveDropdownChild() {
    const hash = window.location.hash || '';

    for (const item of NavConfig) {
        if (item.type !== 'dropdown') continue;

        const child = item.children.find(child => child.href === hash);
        if (child) return { item, child };
    }

    return null;
}

export function getActiveLabel() {
    const activeDropdown = findActiveDropdownChild();
    return activeDropdown ? activeDropdown.child.label : null;
}

function hashHasParam(hash, name) {
    const queryIndex = hash.indexOf('?');
    return queryIndex !== -1 &&
        new URLSearchParams(hash.slice(queryIndex + 1)).has(name);
}

export function updateActiveStyles() {
    const hash = window.location.hash || '';
    const activeDropdown = findActiveDropdownChild();
    const activeLink = NavConfig.find(item =>
        item.type === 'link' && (
            (item.activeMatch === 'prefix' && hash.startsWith(item.href)) ||
            (item.activeParam && hashHasParam(hash, item.activeParam))
        )
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
            el.classList.toggle('active', hash !== '' && !activeLink && !activeDropdown);
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
