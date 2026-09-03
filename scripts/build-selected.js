const fs = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const root = path.resolve(__dirname, "..");
const plugins = {
  StatusTimer: {
    dir: path.join(root, "plugins", "StatusTimer"),
    artifact: "StatusTimer.plugin.js"
  },
  CommandCenter: {
    dir: path.join(root, "plugins", "CommandCenter"),
    artifact: "CommandCenter.plugin.js"
  },
  FocusProfiles: {
    dir: path.join(root, "plugins", "FocusProfiles"),
    artifact: "FocusProfiles.plugin.js"
  },
  StatusDurations: {
    dir: path.join(root, "plugins", "StatusDurations"),
    artifact: "StatusDurations.plugin.js"
  }
};

const selected = process.argv[2] || "all";
const names = selected === "all" ? Object.keys(plugins) : [selected];

for (const name of names) {
  if (!plugins[name]) {
    console.error(`Unknown plugin: ${name}`);
    console.error(`Valid choices: all, ${Object.keys(plugins).join(", ")}`);
    process.exit(1);
  }
}

fs.mkdirSync(path.join(root, "releases"), {recursive: true});

for (const name of names) {
  const plugin = plugins[name];
  run("npm", ["install", "--ignore-scripts"], plugin.dir);
  run("npm", ["test"], plugin.dir);
  run("npm", ["run", "build"], plugin.dir);

  const source = path.join(plugin.dir, "dist", plugin.artifact);
  const destination = path.join(root, "releases", plugin.artifact);
  fs.copyFileSync(source, destination);
  console.log(`Wrote ${path.relative(root, destination)}`);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      npm_config_allow_scripts: ""
    },
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
