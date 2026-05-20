const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");

if (menuBtn && navMenu) {
  menuBtn.addEventListener("click", () => {
    navMenu.classList.toggle("show");
  });

  document.querySelectorAll("#navMenu a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("show");
    });
  });
}

const root = document.documentElement;
const storageKey = "preferred-theme";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateThemeUI(theme) {
  if (!themeIcon || !themeText) return;

  if (theme === "dark") {
    themeIcon.textContent = "🌙";
    themeText.textContent = "Dark";
  } else {
    themeIcon.textContent = "☀️";
    themeText.textContent = "Light";
  }
}

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  updateThemeUI(theme);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(storageKey);
  const initialTheme = savedTheme || getSystemTheme();
  applyTheme(initialTheme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = root.getAttribute("data-theme") || getSystemTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  });
}

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function handleSystemThemeChange(event) {
  const savedTheme = localStorage.getItem(storageKey);
  if (!savedTheme) {
    applyTheme(event.matches ? "dark" : "light");
  }
}

if (typeof mediaQuery.addEventListener === "function") {
  mediaQuery.addEventListener("change", handleSystemThemeChange);
} else if (typeof mediaQuery.addListener === "function") {
  mediaQuery.addListener(handleSystemThemeChange);
}

initializeTheme();
