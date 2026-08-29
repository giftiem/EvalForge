const sidebar = document.querySelector("#sidebar");
const menuButton = document.querySelector("#menuButton");
const runModal = document.querySelector("#runModal");
const newRunButton = document.querySelector("#newRunButton");
const closeModal = document.querySelector("#closeModal");
const runForm = document.querySelector("#runForm");
const toast = document.querySelector("#toast");

menuButton.addEventListener("click", () => sidebar.classList.toggle("open"));

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((link) => link.classList.remove("active"));
    item.classList.add("active");
    sidebar.classList.remove("open");
  });
});

function setModal(open) {
  runModal.classList.toggle("open", open);
  runModal.setAttribute("aria-hidden", String(!open));
  document.body.style.overflow = open ? "hidden" : "";
}

newRunButton.addEventListener("click", () => setModal(true));
closeModal.addEventListener("click", () => setModal(false));
runModal.addEventListener("click", (event) => {
  if (event.target === runModal) setModal(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setModal(false);
});

runForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setModal(false);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
});

document.querySelector("#reviewButton").addEventListener("click", () => {
  document.querySelector("#runs").scrollIntoView({ behavior: "smooth" });
});
