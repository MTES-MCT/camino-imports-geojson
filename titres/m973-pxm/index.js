const domaineId = 'm973-pxm'
const build = require('../build')

try {
  build(domaineId, 'csv', 'pxm')
} catch (e) {
  console.error(e);
}
