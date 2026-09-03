const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
const config = require(path.join(root, "src", "config.json"));
const pkg = require(path.join(root, "package.json"));
const banner = ["/**", ` * @name ${config.name}`, ` * @author ${config.author}`, ` * @description ${config.description}`, ` * @version ${pkg.version}`, " */"].join("\n");
const options = {entryPoints:[path.join(root,"src","index.js")],bundle:true,platform:"browser",format:"cjs",target:["chrome108"],banner:{js:banner},outfile:path.join(root,"dist","StatusDurations.plugin.js"),logLevel:"info"};
async function build() { fs.mkdirSync(path.dirname(options.outfile), {recursive:true}); await esbuild.build(options); }
build().catch((error) => { console.error(error); process.exitCode = 1; });
