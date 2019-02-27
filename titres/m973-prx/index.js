const domaineId = 'm973-prx'
const build = require('../build')

try {
  build(domaineId, 'csv', 'prx')
} catch (e) {
  console.error(e);
}
