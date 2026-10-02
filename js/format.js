export function formatDateTaken(dateTaken) {
    if (!dateTaken) {
        return '';
    }

    return new Date(dateTaken).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric'
    });
}
