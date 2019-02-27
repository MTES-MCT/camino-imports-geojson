const _ = require('lodash')
const chalk = require('chalk')
const slugify = require('@sindresorhus/slugify')
const spliceString = require('splice-string')
const { pointsCreate } = require('../../_utils')

const substances = require('../../sources/substances.json')
const errMsg = '--------------------------------> ERROR'

const jsonFormat = geojsonFeature => {
  const domaineId = 'm'
  const t = _.capitalize(_.toLower(geojsonFeature.properties.NATURE))
  const typeId = (() => {
    if (t === 'Permis exclusif de recherches') {
      return 'prx'
    } else if (t === 'Concession') {
      return 'cxx'
    } else {
      return errMsg
    }
  })()

  const titreNom = _.startCase(_.toLower(geojsonFeature.properties.NOM_TITRE))

  const demarcheEtapeDate =
    _.replace(geojsonFeature.properties.DATE_DEB, /\//g, '-')
      .split('-')
      .reverse()
      .join('-') || '2000-01-01'

  if (demarcheEtapeDate === '') {
    console.log(chalk.red.bold(`Erreur: date manquante ${titreNom}`))
  }

  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = 'oct'

  const titreDemarcheId = slugify(`${titreId}-${demarcheId}`)

  const titreEtapeId = `${titreDemarcheId}-dpu`

  const demarchePosition = (() => {
    return 1
  })()

  const entreprises = [
    {
      id: slugify(geojsonFeature.properties['TITULAIRE'].slice(0, 64)),
      nom: _.startCase(_.toLower(geojsonFeature.properties['TITULAIRE']))
    }
  ]

  const substancePrincipales = (() =>
    _.replace(geojsonFeature.properties['SUBST_PRIN'], /,/g, '')
      .split(' ')
      .reduce((res, cur, i) => {
        const sub = substances.find(
          s =>
            (s['symbole'] && s['symbole'] === cur) ||
            (s['alias'] && s['alias'].find(a => a === cur.toLowerCase()))
        )
        if (!sub) {
          console.log(chalk.red.bold(`Erreur: substance ${cur} non identifé`))
        }
        return sub
          ? [
              ...res,
              {
                titreEtapeId,
                substanceId: sub.id,
                ordre: i + 1
              }
            ]
          : res
      }, []))()

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: 'ind',
      references: geojsonFeature.properties.CODE
        ? {
            métier: geojsonFeature.properties.CODE
          }
        : null
    },
    titresSubstances: geojsonFeature.properties.SUBST_AUTR
      ? [
          ...substancePrincipales,
          {
            titreEtapeId,
            substanceId: 'oooo',
            connexe: true,
            ordre: 1
          }
        ]
      : substancePrincipales,
    titresDemarches: {
      id: titreDemarcheId,
      demarcheId,
      titreId,
      statutId: 'ind',
      ordre: demarchePosition
    },
    titresEtapes: {
      id: titreEtapeId,
      titreDemarcheId: titreDemarcheId,
      etapeId: 'dpu',
      statutId: 'acc',
      ordre: 1,
      date: demarcheEtapeDate,
      duree:
        Number(spliceString(geojsonFeature.properties.DATE_FIN, 1, 6)) -
          Number(spliceString(geojsonFeature.properties.DATE_DEB, 1, 6)) || 0,
      echeance: '',
      surface: geojsonFeature.properties.AREA,
      points: true,
      substances: true,
      titulaires: true
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
      entrepriseId: t.id,
      titreEtapeId
    }))
  }
}

module.exports = jsonFormat
