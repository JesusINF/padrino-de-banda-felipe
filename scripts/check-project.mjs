import { readFile, stat } from "node:fs/promises";

const names = ["index.html", "styles.css", "app.js", "firebase-config.js", "firestore.rules"];
const files = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readFile(name, "utf8")])));
const hero = await stat("assets/santuario-noche.webp");
const tuba = await stat("assets/tuba.webp");

const checks = [
  [files["index.html"].includes('lang="es-MX"'), "Falta el idioma es-MX"],
  [files["index.html"].includes("Felipe") && files["index.html"].includes("Padrino de banda"), "Faltan el nombre o el rol"],
  [files["index.html"].includes("2027-01-23"), "Falta la fecha semántica"],
  [(files["index.html"].match(/id="accept-trigger"/g) ?? []).length === 1, "Debe existir una sola acción principal"],
  [files["index.html"].includes("viewport-fit=cover"), "Falta soporte para áreas seguras"],
  [files["styles.css"].includes("100dvh") && files["styles.css"].includes("overflow-x: clip"), "Faltan defensas móviles"],
  [files["styles.css"].includes("prefers-reduced-motion"), "Falta movimiento reducido"],
  [!files["styles.css"].includes("transition: all"), "No debe usarse transition: all"],
  [files["app.js"].includes('INVITATION_ID = "felipe-banda"'), "ID de invitación incorrecto"],
  [files["app.js"].includes("IntersectionObserver"), "Faltan animaciones progresivas"],
  [files["app.js"].includes("--hero-progress") && files["index.html"].includes("assets/tuba.webp"), "Falta la narrativa de scroll de la tuba"],
  [files["firestore.rules"].includes("!exists(") && files["firestore.rules"].includes("allow read, update, delete: if false"), "Reglas inseguras"],
  [files["firestore.rules"].includes("/responses/felipe-banda"), "Falta la ruta de Felipe"],
  [hero.size < 180000, "La imagen principal supera 180 KB"],
  [tuba.size < 180000, "La tuba supera 180 KB"],
  [!Object.values(files).some((value) => /private_key|client_secret|service_account/i.test(value)), "Hay una credencial privada"],
  [!Object.values(files).some((value) => value.includes("—") || value.includes("–")), "No deben existir guiones largos"]
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map((message) => `FAIL: ${message}`).join("\n"));
  process.exit(1);
}
console.log(`OK: ${checks.length} comprobaciones pasaron. HERO_BYTES=${hero.size}`);
