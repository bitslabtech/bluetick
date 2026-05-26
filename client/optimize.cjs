const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'LandingPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace framer-motion import and use alias 'm as motion'
// This means all existing <motion.div> will be parsed as <m.div> by bundler
content = content.replace(
  /import \{ motion, AnimatePresence \} from 'framer-motion';/,
  "import { m as motion, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';"
);

// Add <LazyMotion features={domAnimation}> just before the Navbar
content = content.replace(
  /\{\/\* 1\. NAVBAR \*\/\}/,
  '<LazyMotion features={domAnimation}>\n                {/* 1. NAVBAR */}'
);

// Close LazyMotion right after Floating Chatbot
content = content.replace(
  /<FloatingChatbot config=\{config\} \/>\s*<\/div>\s*<\/div>\s*\);/g,
  `<FloatingChatbot config={config} />\n                </LazyMotion>\n            </div>\n        </div>\n    );`
);

// Add loading="lazy" to all img tags except the hero image type1/2 if possible
// Actually we can just add loading="lazy" to all img tags that don't already have it
content = content.replace(/<img (?!.*loading=)/g, '<img loading="lazy" ');

fs.writeFileSync(filePath, content);
console.log('Successfully optimized LandingPage.jsx');
