import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getFirestore, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const INVITATION_ID = "felipe-banda";
const RESPONSE_KEY = `wedding-response:${INVITATION_ID}`;

const acceptButton = document.querySelector("#accept-trigger");
const confirmButton = document.querySelector("#confirm-accept");
const dialog = document.querySelector("#confirm-dialog");
const connectionStatus = document.querySelector("#connection-status");
const toast = document.querySelector("#toast");

let auth;
let db;
let currentUser;
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
}

function setAcceptedState() {
  acceptButton.disabled = true;
  acceptButton.classList.add("is-accepted");
  acceptButton.querySelector(".accept-button__label").textContent = "Respuesta guardada";
  connectionStatus.textContent = "Gracias, Felipe. Tu respuesta quedó confirmada.";
}

function hasLocalResponse() {
  try { return window.localStorage.getItem(RESPONSE_KEY) === "accepted"; }
  catch { return false; }
}

function persistLocalResponse() {
  try { window.localStorage.setItem(RESPONSE_KEY, "accepted"); }
  catch { /* Firestore remains the source of truth. */ }
}

function setLoading(isLoading) {
  confirmButton.disabled = isLoading;
  confirmButton.classList.toggle("is-loading", isLoading);
  acceptButton.classList.toggle("is-loading", isLoading);
}

async function connect() {
  if (hasLocalResponse()) {
    setAcceptedState();
    return;
  }

  try {
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    const credential = await signInAnonymously(auth);
    currentUser = credential.user;
    acceptButton.disabled = false;
    connectionStatus.textContent = "La invitación está lista para recibir tu respuesta.";
  } catch (error) {
    console.error("No fue posible preparar Firebase:", error);
    connectionStatus.textContent = "No pudimos conectar. Revisa tu internet e inténtalo de nuevo.";
    showToast("La conexión no está disponible por el momento.");
  }
}

acceptButton.addEventListener("click", () => {
  if (!currentUser || hasLocalResponse()) return;
  dialog.showModal();
});

confirmButton.addEventListener("click", async () => {
  if (!currentUser || !db || hasLocalResponse()) return;

  setLoading(true);
  try {
    await setDoc(doc(db, "responses", INVITATION_ID), {
      accepted: true,
      createdAt: serverTimestamp(),
      inviteId: INVITATION_ID,
      recipients: ["Felipe"],
      responderUid: currentUser.uid
    });
    persistLocalResponse();
    dialog.close();
    setAcceptedState();
    showToast("¡Qué alegría! Tu respuesta quedó guardada.");
  } catch (error) {
    console.error("No fue posible guardar la respuesta:", error);
    dialog.close();
    if (error?.code === "permission-denied" || error?.code === "already-exists") {
      persistLocalResponse();
      setAcceptedState();
      showToast("Esta invitación ya tiene una respuesta registrada.");
    } else {
      showToast("No pudimos guardar tu respuesta. Inténtalo nuevamente.");
    }
  } finally {
    setLoading(false);
  }
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.16, rootMargin: "0px 0px -8%" });

document.querySelectorAll("[data-reveal], [data-note]").forEach((element) => observer.observe(element));

const hero = document.querySelector("[data-hero]");
let ticking = false;

function updateHeroProgress() {
  const rect = hero.getBoundingClientRect();
  const distance = Math.max(1, hero.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / distance));
  hero.style.setProperty("--hero-progress", progress.toFixed(3));
  ticking = false;
}

function requestHeroUpdate() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(updateHeroProgress);
}

window.addEventListener("scroll", requestHeroUpdate, { passive: true });
window.addEventListener("resize", requestHeroUpdate);
updateHeroProgress();
connect();
