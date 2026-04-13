const AdmZip = require('adm-zip');
const fs = require('fs');

const zip = new AdmZip();

const manifest = {
  name: "WhatsApp Forms Builder",
  module_key: "forms",
  description: "A powerful, drag-and-drop conversational form builder optimized natively for WhatsApp lead generation.",
  default_price: 0,
  is_recurring: false,
  features: ["Drag & Drop Builder", "Live iPhone Preview", "Data Export"]
};

// Add manifest as a file inside the zip
zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));

// Write the zip to the current directory
zip.writeZip("../whatsapp-forms-addon.zip");
console.log("Successfully created whatsapp-forms-addon.zip in the root directory!");
