const _ = require('lodash')
const chalk = require('chalk')
const slugify = require('@sindresorhus/slugify')
const { pointsCreate } = require('../../_utils')

const errMsg = '--------------------------------> ERROR'

const jsonFormat = geojsonFeature => {
  const domaineId = 'c'
  const t = _.toLower(geojsonFeature.properties.type)
  const typeId = (() => {
    if (t === 'concession') {
      return 'cxx'
    } else if (t === 'permis exclusif de recherches') {
      return 'prx'
    } else {
      return errMsg
    }
  })()

  const titreNom = _.startCase(_.toLower(geojsonFeature.properties.nom))

  const demarcheEtapeDate = geojsonFeature.properties.date || '2000-01-01'

  if (demarcheEtapeDate === '') {
    console.log(chalk.red.bold(`Erreur: date manquante ${titreNom}`))
  }

  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = 'oct'

  const titreDemarcheId = slugify(`${titreId}-${demarcheId}`)

  const titreEtapeId = `${titreDemarcheId}-dpu`

  const demarcheOrdre = 1

  const duree =
    geojsonFeature.properties['DUREE_A,C,10'] ||
    geojsonFeature.properties['DUREE_D,C,10']

  const entreprises = geojsonFeature.properties['titulaires']
    .split(' ; ')
    .map(t => ({
      id: slugify(t.slice(0, 32)),
      nom: _.startCase(_.toLower(t))
    }))

  const substancePrincipales = (() =>
    geojsonFeature.properties.substancesPrincipales.split(' ; ').reduce(
      (res, cur) => [
        ...res,
        {
          titreEtapeId,
          substanceId: cur
        }
      ],
      []
    ))()

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: geojsonFeature.properties.statut,
      references: {
        deb: geojsonFeature.properties['references:deb'],
        ifremer: geojsonFeature.properties['references:ifremer']
      }
    },
    titresSubstances: substancePrincipales,
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
      surface: geojsonFeature.properties['SURFACE,C,15']
    },
    titresEmprises: {
      titreEtapeId,
      empriseId: 'mer'
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
    titresTitulaires: entreprises.map(t => ({ titulaireId: t.id, titreId }))
  }
}

module.exports = jsonFormat
