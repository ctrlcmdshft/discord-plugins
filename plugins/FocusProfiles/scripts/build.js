const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const config = require(path.join(root, "src", "config.json"));
const pkg = require(path.join(root, "package.json"));
const meta = ["/**", ` * @name ${config.name}`, ` * @author ${config.author}`, ` * @description ${config.description}`, ` * @version ${pkg.version}`, " */"].join("\n");
const outfile = path.join(root, "dist", "FocusProfiles.plugin.js");
const options = {entryPoints: [path.join(root, "src", "index.js")], bundle: true, platform: "browser", format: "cjs", target: ["chrome108"], banner: {js: meta}, outfile, logLevel: "info"};

async function build() {
  fs.mkdirSync(path.dirname(outfile), {recursive: true});
  if (process.argv.includes("--watch")) {
    const context = await esbuild.context(options);
    await context.watch();
    console.log(`Watching and writing ${outfile}`);
    return;
  }
  await esbuild.build(options);
}

build().catch((error) => { console.error(error); process.exitCode = 1; });
