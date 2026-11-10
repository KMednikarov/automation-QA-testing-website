// Keep the readable offline guide aligned with the content displayed by Atlas.
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { course } from "../frontend/src/course.js";

const list = items => items.map(item => `- ${item}`).join("\n");
const text = `# ${course.title}\n\n${course.description}\n\nEight sessions of 90 minutes (12 hours). API only; no UI exercises. Open Atlas → Learning path for navigation, copyable examples, self-check answers, and per-account browser progress.\n\n## Preparation\n\n${list(course.preparation)}\n\n` + course.sessions.map(session => `## Session ${session.id}: ${session.title}\n\n**${session.tool} · 90 minutes**\n\n${session.outcome}\n\n### Learning objectives\n\n${list(session.objectives)}\n\n### Agenda\n\n${list(session.agenda)}\n\n### Lesson\n\n${session.theory.map(part => `#### ${part.title}\n\n${part.text}`).join("\n\n")}\n\n### Worked examples\n\n${session.examples.map(example => `#### ${example.title}\n\n\`\`\`${example.language}\n${example.code}\n\`\`\``).join("\n\n")}\n\n### Instructor demonstration\n\n${list(session.demo)}\n\n### Your API lab\n\n${list(session.tasks)}\n\n### Completion checks\n\n${list(session.checkpoints)}\n\n**Deliverable:** ${session.deliverable}\n\n### Check your understanding\n\n${session.questions.map(item => `**${item.q}**\n\n${item.a}`).join("\n\n")}\n\n${session.targets.length ? `**API challenge coverage:** ${session.targets.join(", ")}.` : ""}\n`).join("\n");
const target = fileURLToPath(new URL("../docs/training.md", import.meta.url));
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== text) throw new Error("Course guide is stale. Run node scripts/export-course.mjs");
} else writeFileSync(target, text);
