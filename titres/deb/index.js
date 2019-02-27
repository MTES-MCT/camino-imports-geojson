const domaineId = 'deb'
const build = require('../build')

try {
  build(domaineId, 'csv', 'deb')
} catch (e) {
  console.error(e);
}
