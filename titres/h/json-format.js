const _ = require('lodash')
const chalk = require('chalk')
const slugify = require('@sindresorhus/slugify')
const spliceString = require('splice-string')
const { pointsCreate } = require('../../_utils')
const errMsg = '--------------------------------> ERROR'

const jsonFormat = geojsonFeature => {
  const domaineId = 'h'
  const t = _.capitalize(_.toLower(geojsonFeature.properties.TYPE_FR))
  const typeId = (() => {
    if (
      t === 'Demande de permis de recherches' ||
      t === 'Permis de recherches 1ere période' ||
      t === 'Permis de recherches 2e période' ||
      t === 'Permis de recherches 3e période'
    ) {
      return 'prh'
    } else if (
      t === 'Demande de concession' ||
      t === "Titre d'exploitation - concession" ||
      t === 'Concession'
    ) {
      return 'cxx'
    } else {
      return errMsg
    }
  })()

  const titreNom = _.startCase(_.toLower(geojsonFeature.properties.NOM))

  const demarcheEtapeDate =
    _.replace(geojsonFeature.properties.DATE_JO_RF, /\//g, '-') || ''

  if (demarcheEtapeDate === '') {
    console.log(chalk.red.bold(`Erreur: date manquante ${titreNom}`))
  }

  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = (() => {
    if (
      t === 'Demande de permis de recherches' ||
      t === 'Permis de recherches 1ere période' ||
      t === 'Demande de concession' ||
      t === "Titre d'exploitation - concession" ||
      t === 'Concession'
    ) {
      return 'oct'
    } else if (t === 'Permis de recherches 2e période') {
      return 'pr1'
    } else if (t === 'Permis de recherches 3e période') {
      return 'pre'
    } else {
      return errMsg
    }
  })()

  const titreDemarcheId = slugify(`${titreId}-${demarcheId}`)

  const titreEtapeId = `${titreDemarcheId}-dpu`

  const demarchePosition = (() => {
    if (
      t === 'Demande de concession' ||
      t === 'Demande de permis de recherches'
    ) {
      return 0
    } else if (
      t === 'Permis de recherches 1ere période' ||
      t === "Titre d'exploitation - concession" ||
      t === 'Concession'
    ) {
      return 1
    } else if (t === 'Permis de recherches 2e période') {
      return 2
    } else if (t === 'Permis de recherches 3e période') {
      return 3
    } else {
      return errMsg
    }
  })()

  const entreprises = ['1', '2', '3', '4', '5', '6']
    .filter(id => geojsonFeature.properties[`TIT_PET${id}`])
    .map(i => ({
      id: slugify(geojsonFeature.properties[`TIT_PET${i}`].slice(0, 32)),
      nom: _.startCase(_.toLower(geojsonFeature.properties[`TIT_PET${i}`]))
    }))

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: 'val',
      references: {
        DGEC: geojsonFeature.properties.NUMERO
      }
    },
    titresSubstances: [
      {
        titreEtapeId,
        substanceId: 'hydr'
      }
    ],
    titresDemarches: {
      id: titreDemarcheId,
      demarcheId,
      titreId,
      statuId: 'acc',
      ordre: demarchePosition
    },
    titresEtapes: {
      id: titreEtapeId,
      titreDemarcheId: titreDemarcheId,
      etapeId: 'dpu',
      statutId: 'ter',
      ordre: 1,
      date: demarcheEtapeDate,
      duree:
        (geojsonFeature.properties.DATE3
          ? Number(spliceString(geojsonFeature.properties.DATE3, 4, 6))
          : Number(spliceString(geojsonFeature.properties.DATE2, 4, 6))) -
        Number(spliceString(demarcheEtapeDate, 4, 6)),
      surface: geojsonFeature.properties.SUPERFICIE,
      points: true,
      substances: true,
      titulaires: true
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
      entrepriseId: t.id,
      titreEtapeId
    }))
  }
}

module.exports = jsonFormat
