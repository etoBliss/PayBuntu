// Show main content after splash delay
window.addEventListener("load", () => {
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    const main = document.getElementById("main-content");

    if (splash && main) {
      splash.classList.add("hide");
      main.classList.add("show");
    }
  }, 2000); // 2 second delay
});
