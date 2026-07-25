/**
 * ==========================================================================
 * ONFLEX APPLICATION UNIFIED THEME RUNTIME INTERFACE
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
    // Read theme attribute value (or default to dark mode if not explicitly mapped yet)
    const savedTheme = localStorage.getItem("onflex-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // COMPATIBLE MULTI-SELECTOR EVENT DELEGATION THEME CONTROLLER
    document.body.addEventListener("click", (e) => {
        // Broad capture handling any dashboard theme trigger element format setup
        const themeTrigger = e.target.closest("#themeToggler") ||
            e.target.closest(".theme-toggle") ||
            e.target.closest("[data-theme-toggle]") ||
            e.target.closest(".theme-btn");
        if (!themeTrigger) return;

        e.preventDefault();

        const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
        const targetTheme = currentTheme === "dark" ? "light" : "dark";

        document.documentElement.setAttribute("data-theme", targetTheme);
        localStorage.setItem("onflex-theme", targetTheme);

        // Toggle layout visibility settings for nested sun and moon icons if provided
        const sunIcons = themeTrigger.querySelectorAll(".sun-icon");
        const moonIcons = themeTrigger.querySelectorAll(".moon-icon");

        if (targetTheme === "light") {
            sunIcons.forEach(el => el.style.display = "none");
            moonIcons.forEach(el => el.style.display = "block");
        } else {
            sunIcons.forEach(el => el.style.display = "block");
            moonIcons.forEach(el => el.style.display = "none");
        }
    });
});