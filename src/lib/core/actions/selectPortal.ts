import type {Attachment} from 'svelte/attachments';

export function selectPortal(triggerEl: HTMLElement & {__selectMenuEl?: HTMLElement | null;}): Attachment<Element> {
    return (menuEl: Element) => {
        const menu = menuEl as HTMLElement;

        function position() {
            const zoom = parseFloat(document.documentElement.style.zoom) / 100 || 1;
            const rect = triggerEl.getBoundingClientRect();

            const top = rect.bottom / zoom + 4;
            const right = rect.right / zoom;
            const width = menu.offsetWidth;
            const left = Math.max(8, right - width);

            menu.style.position = 'fixed';
            menu.style.top = `${top}px`;
            menu.style.left = `${left}px`;
        }

        menu.style.visibility = 'hidden';
        document.body.appendChild(menu);
        triggerEl.__selectMenuEl = menu;

        requestAnimationFrame(() => {
            position();
            menu.style.visibility = '';
        });

        window.addEventListener('scroll', position, true);
        window.addEventListener('resize', position);

        return () => {
            window.removeEventListener('scroll', position, true);
            window.removeEventListener('resize', position);
            triggerEl.__selectMenuEl = null;
            menu.remove();
        };
    };
}
