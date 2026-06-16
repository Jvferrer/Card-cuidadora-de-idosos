import "../style.css";

import { contactConfig } from "./config";
import { initUi } from "./ui";

document.addEventListener("DOMContentLoaded", () => {
  initUi(document, contactConfig);
});
