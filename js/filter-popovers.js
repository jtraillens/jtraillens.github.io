export function initFilterPopovers() {
    document.addEventListener('click', event => {
        document.querySelectorAll('.filter-popover').forEach(popover => {
            if (!popover.hidden && !popover.closest('.filter-control').contains(event.target)) {
                closePopover(popover);
            }
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.filter-popover').forEach(closePopover);
        }
    });
}

export function openPopover(popover) {
    document.querySelectorAll('.filter-popover').forEach(other => {
        if (other !== popover) {
            closePopover(other);
        }
    });

    popover.hidden = false;
    popover.closest('.filter-control')
        .querySelector('.filter-popover-toggle')
        ?.setAttribute('aria-expanded', 'true');
}

export function closePopover(popover) {
    popover.hidden = true;
    popover.closest('.filter-control')
        .querySelector('.filter-popover-toggle')
        ?.setAttribute('aria-expanded', 'false');
}

export function togglePopover(popover) {
    if (popover.hidden) {
        openPopover(popover);
    } else {
        closePopover(popover);
    }
}
