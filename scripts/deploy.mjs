import { execSync, spawnSync } from "child_process";

const REMOTE = process.env.DEPLOY_REMOTE || "DjCordApp";
const BRANCH = process.env.DEPLOY_BRANCH || "main";
const SKIP_BUILD = process.env.SKIP_BUILD === "1";

const message =
  process.argv.slice(2).join(" ").trim() ||
  `Deploy ${new Date().toISOString().replace("T", " ").slice(0, 16)}`;

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", shell: true });
}

function capture(cmd) {
  return execSync(cmd, { encoding: "utf8", shell: true }).trim();
}

try {
  if (!SKIP_BUILD) {
    console.log("Step 1/3 — Build");
    run("npm run build");
  } else {
    console.log("Step 1/3 — Build skipped (SKIP_BUILD=1)");
  }

  console.log("Step 2/3 — Commit");
  const status = capture("git status --porcelain");
  if (!status) {
    console.log("No file changes to commit.");
  } else {
    run("git add -A");
    const commit = spawnSync("git", ["commit", "-m", message], { stdio: "inherit" });
    if (commit.status !== 0) {
      process.exit(commit.status ?? 1);
    }
  }

  console.log("Step 3/3 — Push");
  run(`git push -u ${REMOTE} ${BRANCH}`);

  console.log("\nDeploy triggered: Render auto-deploys from GitHub when autoDeploy is enabled.");
  console.log(`Remote: ${REMOTE}  Branch: ${BRANCH}`);
} catch (err) {
  console.error("\nDeploy failed:", err.message || err);
  process.exit(1);
}
