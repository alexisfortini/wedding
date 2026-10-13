export function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const headerHeight = document.querySelector("nav")?.getBoundingClientRect().height ?? 0;
  window.scrollTo({
    top: section.getBoundingClientRect().top + window.scrollY - headerHeight,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}
