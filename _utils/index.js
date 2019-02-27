const leftPad = require('left-pad')
const slugify = require('@sindresorhus/slugify')

const pointsCreate = (titreEtapeId, contour, contourId, groupeId) =>
  contour.reduce(
    (r, set, pointId) =>
      pointId === contour.length - 1
        ? r
        : [
            ...r,
            {
              id: slugify(
                `${titreEtapeId}-g${leftPad(groupeId + 1, 2, 0)}-c${leftPad(
                  contourId + 1,
                  2,
                  0
                )}-p${leftPad(pointId + 1, 3, 0)}`
              ),
              coordonnees: set.join(),
              groupe: groupeId + 1,
              contour: contourId + 1,
              point: pointId + 1,
              titreEtapeId,
              nom: String(pointId + 1)
            }
          ],
    []
  )

module.exports = { pointsCreate }
