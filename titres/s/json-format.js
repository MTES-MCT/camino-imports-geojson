const _ = require('lodash')
const chalk = require('chalk')
const slugify = require('@sindresorhus/slugify')
const spliceString = require('splice-string')
const substances = require('../../sources/substances.json')
const { pointsCreate } = require('../../_utils')
const errMsg = '--------------------------------> ERROR'

const jsonFormat = geojsonFeature => {
  const domaineId = 's'
  const t = _.toLower(geojsonFeature.properties.LEGENDE)
  const typeId = (() => {
    if (t === 'concession') {
      return 'cxx'
    } else {
      return errMsg
    }
  })()

  const titreNom = _.startCase(_.toLower(geojsonFeature.properties.NOM))

  const demarcheEtapeDate =
    _.replace(geojsonFeature.properties.DATE_DECRE, /\//g, '-') || '2000-01-01'

  if (demarcheEtapeDate === '') {
    console.log(chalk.red.bold(`Erreur: date manquante ${titreNom}`))
  }

  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = 'oct'

  const titreDemarcheId = slugify(`${titreId}-${demarcheId}`)

  const titreEtapeId = `${titreDemarcheId}-dpu`

  const demarcheOrdre = (() => {
    if (t === 'concession') {
      return 1
    } else {
      return errMsg
    }
  })()

  const duree =
    Number(spliceString(geojsonFeature.properties.VALIDITE, 4, 6)) -
    Number(spliceString(geojsonFeature.properties.DECRET_JO, 4, 6))

  const entreprises = [
    {
      id: slugify(geojsonFeature.properties['EXPLOITANT'].slice(0, 32)),
      nom: _.startCase(_.toLower(geojsonFeature.properties['EXPLOITANT']))
    }
  ]

  const titresSubstances = (() =>
    geojsonFeature.properties['CONTENU']
      ? geojsonFeature.properties['CONTENU'].split('/').reduce((res, cur) => {
          const sub = substances.find(s => s['nom'] === cur)
          if (!sub) {
            console.log(chalk.red.bold(`Erreur: substance ${cur} non identifé`))
          }
          return sub
            ? [
                ...res,
                {
                  titreEtapeId,
                  substanceId: sub.id
                }
              ]
            : res
        }, [])
      : [])()

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: 'ind',
      references: {
        DGEC: geojsonFeature.properties.NUMERO
      }
    },
    titresSubstances,
    titresDemarches: {
      id: titreDemarcheId,
      demarcheId,
      titreId,
      statutId: 'ind',
      ordre: demarcheOrdre
    },
    titresEtapes: {
      id: titreEtapeId,
      titreDemarcheId,
      etapeId: 'dpu',
      statutId: 'acc',
      ordre: 1,
      date: demarcheEtapeDate,
      duree,
      echeance: '',
      surface: geojsonFeature.properties.SUPERFICIE
    },
    titresEmprises: {
      titreEtapeId,
      empriseId: 'ter'
    },
    titresPoints: geojsonFeature.geometry.coordinates.reduce(
      (res, contoursOrPoints, contourIdOrGroupId) =>
        geojsonFeature.geometry.type === 'MultiPolygon'
          ? [
              ...res,
              ...contoursOrPoints.reduce(
                (ps, points, contourId) => [
                  ...ps,
                  ...pointsCreate(
                    titreEtapeId,
                    points,
                    contourId,
                    // groupId
                    contourIdOrGroupId
                  )
                ],
                []
              )
            ]
          : [
              ...res,
              ...pointsCreate(
                titreEtapeId,
                contoursOrPoints,
                contourIdOrGroupId,
                0
              )
            ],
      []
    ),
    entreprises,
    titresTitulaires: entreprises.map(t => ({
      titulaireId: t.id,
      titreEtapeId
    }))
  }
}

module.exports = jsonFormat
