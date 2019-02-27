const _ = require('lodash')
const chalk = require('chalk')
const slugify = require('@sindresorhus/slugify')
const spliceString = require('splice-string')
const { pointsCreate } = require('../../_utils')

const substances = require('../../sources/substances.json')
const errMsg = '--------------------------------> ERROR'

const jsonFormat = geojsonFeature => {
  const domaineId = 'm'
  const typeId = 'cxx'

  // console.log(geojsonFeature.properties)

  const titreNom = _.startCase(_.toLower(geojsonFeature.properties.Nom))

  const demarcheEtapeDate = _.replace(
    geojsonFeature.properties.date_oct,
    /\//g,
    '-'
  )

  const demarcheEtapeDateFin = _.replace(
    geojsonFeature.properties.dateperemp,
    /\//g,
    '-'
  )

  const duree =
    Number(spliceString(demarcheEtapeDateFin, 4, 9)) -
      Number(spliceString(demarcheEtapeDate, 4, 9)) || 0

  if (demarcheEtapeDate === '') {
    console.log(chalk.red.bold(`Erreur: date manquante ${titreNom}`), geojsonFeature)
  }

  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = `oct`

  const titreDemarcheId = `${titreId}-${demarcheId}01`

  const demarchePosition = (() => {
    return 1
  })()

  const titresDemarches = [{
    id: titreDemarcheId,
    typeId: demarcheId,
    titreId,
    statutId: 'ind',
    ordre: demarchePosition
  }]

  // L'étape des AEX est DEX (décision expresse)
  // L'étape des autres types est DPU (JORF)
  const etapeId = typeId === 'axm' ? 'dex' : 'dpu'

  const titreEtapeId = `${titreDemarcheId}-${etapeId}01`

  const titresEtapes = [{
    id: titreEtapeId,
    titreDemarcheId,
    typeId: etapeId,
    statutId: 'acc',
    ordre: 1,
    date: demarcheEtapeDate,
    duree,
    dateFin: demarcheEtapeDateFin,
    surface: geojsonFeature.properties.surf_off || 0
  }]

  const titulaire = geojsonFeature.properties.titulaire
  const entreprises = [
    {
      id: geojsonFeature.properties.entreprise_id,
      nom: _.startCase(_.toLower(titulaire)),
    }
  ]

  const substancesCreate = subs =>
    subs.reduce((res, cur) => {
      const sub = substances.find(
        s =>
          (s['symbole'] && s['symbole'] === cur) ||
          (cur.includes('connexes') && 'oooo')
      )

      if (!sub) {
        console.log(chalk.red.bold(`Erreur: substance ${cur} non identifée`))
      }

      return cur && sub
        ? [
            ...res,
            {
              titreEtapeId,
              substanceId: sub.id
            }
          ]
        : res
    }, [])

  const substancePrincipales = (() => {
    const substances = geojsonFeature.properties.subst_1
    const s = substances ? substancesCreate(substances.replace(/, /g, ',').split(',')) : []
    return s
  })()

  const substanceConnexes = (() => {
    const substances = geojsonFeature.properties.subst_2
    return substances ? substancesCreate(substances.replace(/, /g, ',').split(',')) : []
  })()

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: 'ind',
      references: geojsonFeature.properties.idtm
        ? {
            métier: geojsonFeature.properties.idtm
          }
        : null
    },
    titresSubstances: [...substancePrincipales, ...substanceConnexes],
    titresDemarches,
    titresEtapes,
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
      entrepriseId: t.id,
      titreEtapeId
    }))
  }
}

module.exports = jsonFormat
