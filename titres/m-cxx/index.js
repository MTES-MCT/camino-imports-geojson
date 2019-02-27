const domaineId = 'm-cxx'
const build = require('../build')

try {
  build(domaineId, 'csv', 'cxx')
} catch (e) {
  console.error(e);
}
