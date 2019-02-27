const _ = require('lodash')
const chalk = require('chalk')
const slugify = require('@sindresorhus/slugify')
const spliceString = require('splice-string')
const { pointsCreate } = require('../../_utils')
const csv = require('csvtojson')

const errMsg = '--------------------------------> ERROR'

const domaines = {
  GM: 'w',
  CA: 'c',
  MI: 'm',
}

const types = {
  Concession: 'cxx',
  'Permis exclusif de carrières': 'pxc',
  'Permis de recherche': 'prx',
  'Permis d\'exploitation': 'pxx',
}

const affaires = {
  'Amodiation': 'amo',
  'Demande initiale': 'oct',
  'Fusion': 'fus',
  'Mutation': 'mut',
  'Prolongation': 'pro',
  'Renonciation': 'ren',
  'Retrait': 'ret',
  'Recours': null,
}

const etapes = {

}

const jsonFormat = async geojsonFeature => {
  const substances = await csv().fromFile('./sources/substances-deb.csv')
  const indexSubstances = substances.reduce((r, s) => (r[s.deb.nom_sub] = s.substance_id, r), {})

  const etapesTypes = await csv().fromFile('./sources/etapes-deb.csv')
  const indexEtapesTypes = etapesTypes.reduce((r, e) => (r[e.deb.m_r_evt.id] = e.etapes_types_id, r), {})

  const { properties: props } = geojsonFeature

  const domaineId = domaines[props.domaine_id]
  let typeId = types[props.type]

  if (typeId === 'pxx' && domaineId === 'm') {
    typeId = 'pxm'
  }

  if (!typeId) {
    console.log(props)
  }

  // console.log(props)

  const titreNom = _.startCase(_.toLower(props.nomtitre))

  const octroiDate = _.replace(
    props.date_oct,
      /\//g,
    '-'
  )

  if (props.dep !== '973') {
    // console.log(chalk.red.bold(`Erreur: date manquante ${titreNom}`), geojsonFeature)
    return {
      titres: {},
      titresSubstances: [],
      titresDemarches: [],
      titresEtapes: [],
      titresEmprises: [],
      titresPoints: [],
      entreprises: [],
      titresTitulaires: [],
    }
  }

  const dateId = octroiDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = `oct`

  const titreDemarcheId = `${titreId}-${demarcheId}01`

  const demarchePosition = (() => {
    return 1
  })()

  let titresDemarches = []
  let titresEtapes = []
  let substancePrincipales = []

  const dems = props.demarches && JSON.parse(props.demarches)
  if (dems && dems.length) {
    const affairesCount = {}

    titresDemarches = dems.sort((a, b) => {
      return new Date(a.dat_a_ouv) - new Date(b.dat_a_ouv)
    })
      .reduce((r, d, i) => {
        let demarcheId = affaires[d.type]
        if (!demarcheId) return r

        i = i + 1

        let demarcheNum = (affairesCount[demarcheId] || 0) + 1
        affairesCount[demarcheId] = demarcheNum

        if (demarcheId === 'pro' && typeId !== 'cxx') {
          demarcheId = 'pr' + demarcheNum
          demarcheNum = 1
        }

        const titreDemarcheId = `${titreId}-${demarcheId}${(demarcheNum + '').padStart(2, '0')}`

        const {
          dat_a_ouv: demarcheEtapeDate,
          dat_a_fer: demarcheEtapeDateFin
        } = d

        r.push({
          id: titreDemarcheId,
          typeId: demarcheId,
          titreId,
          statutId: 'ind',
          ordre: i,
        })

        const etas = d.etapes
        if (etas && etas.length) {
          const etapesCount = {}
          let j = 0;

          titresEtapes = titresEtapes.concat(etas.sort((a, b) => {
            return new Date(a.dat) - new Date(b.dat)
          }).reduce((r, e) => {
            let etapeId = indexEtapesTypes[e.cod_evt]
            if (!etapeId) return r

            if (etapeId === 'apd/apr') {
              etapeId = props.dep === '973' ? 'apd' : 'apr'
            }

            j = j + 1

            let etapeNum = (etapesCount[etapeId] || 0) + 1
            etapesCount[etapeId] = etapeNum

            // L'étape des AEX est DEX (décision expresse)
            // L'étape des autres types est DPU (JORF)
            // etapeId = typeId === 'axm' ? 'dex' : 'dpu'

            const titreEtapeId = `${titreDemarcheId}-${etapeId}${(etapeNum + '').padStart(2, '0')}`

            const duree =
                    Number(spliceString(demarcheEtapeDateFin, 4, 9)) -
                    Number(spliceString(demarcheEtapeDate, 4, 9)) || 0

            r.push({
              id: titreEtapeId,
              titreDemarcheId,
              typeId: etapeId,
              statutId: 'acc',
              ordre: j,
              date: e.dat,
              duree,
              dateFin: demarcheEtapeDateFin,
              surface: props.surf_off || 0
            })

            return r
          }, []))
        }

        return r
      }, [])
  }

  const titreEtapeId = 'toto'

  const titulaire = props.titulaire
  const entreprises = [
    {
      id: props.entreprise_id,
      nom: _.startCase(_.toLower(titulaire)),
      siren: props.entreprise_id.slice(3),
    }
  ]

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: 'ind',
      references: props.idtm
        ? {
            métier: props.idtm
          }
        : null
    },
    titresSubstances: [...substancePrincipales],
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
