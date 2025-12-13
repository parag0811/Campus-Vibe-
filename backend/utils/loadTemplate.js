const fs = require("fs");
const path = require("path");

module.exports = function loadTemplate(fileName, replacements = {}) {
  let html = fs.readFileSync(
    path.join(__dirname, "emailTemplates", fileName),
    "utf-8"
  );

  for (const key in replacements) {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), replacements[key]);
  }

  return html;
};
