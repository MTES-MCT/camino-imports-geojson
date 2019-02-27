const domaineId = 'm973-cxx'
const build = require('../build')

try {
  build(domaineId, 'csv', 'cxx')
} catch (e) {
  console.error(e);
}
