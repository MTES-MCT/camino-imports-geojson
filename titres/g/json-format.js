const _ = require('lodash')
const chalk = require('chalk')
const slugify = require('@sindresorhus/slugify')
const spliceString = require('splice-string')
const { pointsCreate } = require('../../_utils')
const errMsg = '--------------------------------> ERROR'

const jsonFormat = geojsonFeature => {
  const domaineId = 'g'
  const t = _.capitalize(_.toLower(geojsonFeature.properties.TYPE_FR))
  const typeId = (() => {
    if (
      t === 'Demande de permis de recherches' ||
      t === 'Permis de recherches 1ere periode' ||
      t === 'Permis de recherches 2e periode'
    ) {
      return 'prx'
    } else if (t === "Titres d'exploitation - concession") {
      return 'cxx'
    } else {
      return errMsg
    }
  })()

  const titreNom = _.startCase(_.toLower(geojsonFeature.properties.NOM))

  let demarcheEtapeDate =
    _.replace(geojsonFeature.properties.DATE_JO_RF, /\//g, '-') || '2000-01-01'

  if (demarcheEtapeDate === '') {
    console.log(chalk.red.bold(`Erreur: date manquante ${titreNom}`))
  }
  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = (() => {
    if (
      t === 'Demande de permis de recherches' ||
      t === "Titres d'exploitation - concession"
    ) {
      return 'oct'
    } else if (t === 'Permis de recherches 1ere periode') {
      return 'pr1'
    } else if (t === 'Permis de recherches 2e periode') {
      return 'pr2'
    } else {
      return errMsg
    }
  })()

  const titreDemarcheId = slugify(`${titreId}-${demarcheId}`)

  const titreEtapeId = `${titreDemarcheId}-dpu`

  const demarcheOrdre = (() => {
    if (t === 'Demande de permis de recherches') {
      return 1
    } else if (t === 'Permis de recherches 1ere periode') {
      return 2
    } else if (t === 'Permis de recherches 2e periode') {
      return 3
    } else if (t === "Titres d'exploitation - concession") {
      return 1
    } else {
      return errMsg
    }
  })()

  const duree =
    (geojsonFeature.properties.DATE2
      ? Number(spliceString(geojsonFeature.properties.DATE2, 4, 6))
      : Number(spliceString(geojsonFeature.properties.DATE1, 4, 6))) -
    Number(spliceString(demarcheEtapeDate, 4, 6))

  const entreprises = ['1', '2', '3']
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
        substanceId: 'geoh'
      }
    ],
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
      (res, points, contourId) => [
        ...res,
        ...pointsCreate(titreEtapeId, points, contourId, 0)
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
