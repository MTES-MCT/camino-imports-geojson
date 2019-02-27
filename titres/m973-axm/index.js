const domaineId = 'm973-axm'
const build = require('../build')

try {
  build(domaineId, 'csv', 'axm')
} catch (e) {
  console.error(e);
}
