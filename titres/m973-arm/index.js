const domaineId = "m973-arm";
const build = require("../build");

try {
  build(domaineId, "csv", "arm");
} catch (e) {
  console.error(e);
}
