/**
 * Paybuntu Theme Handler
 * Manages light/dark mode toggling and persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Load saved theme or default to system preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
    } else if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Toggle logic
    const handleToggle = () => {
        let theme = 'light';
        if (document.documentElement.getAttribute('data-theme') !== 'dark') {
            theme = 'dark';
        }
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', handleToggle);
    
    // Mobile toggle support
    const mobileToggleBtn = document.getElementById('theme-toggle-mobile');
    if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', handleToggle);
});
