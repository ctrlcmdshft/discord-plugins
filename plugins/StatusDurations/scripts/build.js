const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
const config = require(path.join(root, "src", "config.json"));
const pkg = require(path.join(root, "package.json"));
const metadata = {
  name: config.name,
  author: config.author,
  version: pkg.version,
  description: config.description,
  website: config.website,
  source: config.source,
  updateUrl: config.updateUrl
};
const banner = ["/**", ...Object.entries(metadata).filter(([, value]) => value).map(([key, value]) => ` * @${key} ${value}`), " */"].join("\n");
const options = {entryPoints:[path.join(root,"src","index.js")],bundle:true,platform:"browser",format:"cjs",target:["chrome108"],banner:{js:banner},outfile:path.join(root,"dist","StatusDurations.plugin.js"),logLevel:"info"};
async function build() { fs.mkdirSync(path.dirname(options.outfile), {recursive:true}); await esbuild.build(options); }
build().catch((error) => { console.error(error); process.exitCode = 1; });
