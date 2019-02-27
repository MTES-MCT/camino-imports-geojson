const _ = require("lodash");
const chalk = require("chalk");
const slugify = require("@sindresorhus/slugify");
const spliceString = require("splice-string");
const { pointsCreate } = require("../../_utils");

const substances = require("../../sources/substances.json");
const errMsg = "--------------------------------> ERROR";

const jsonFormat = geojsonFeature => {
  const domaineId = "m";
  const typeId = "arm";

  // console.log(geojsonFeature.properties)

  const {
    winref_onf: ref,
    commune,
    demandeur,
    nomdemande,
    date_arrivee_onf: date,
    finconvent: dateFin
  } = geojsonFeature.properties;

  const titreNom = _.startCase(_.toLower(`${demandeur || nomdemande}-${ref}`));

  const demarcheEtapeDate = _.replace(date || dateFin, /\//g, "-");

  const demarcheEtapeDateFin = _.replace(
    geojsonFeature.properties.dateperemp,
    /\//g,
    "-"
  );

  const duree =
    Number(spliceString(demarcheEtapeDateFin, 4, 9)) -
      Number(spliceString(demarcheEtapeDate, 4, 9)) || 0;

  if (demarcheEtapeDate === "") {
    console.log(
      chalk.red.bold(`Erreur: date manquante ${titreNom}`),
      geojsonFeature
    );
  }

  const dateId = demarcheEtapeDate.slice(0, 4);

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`);

  const demarcheId = `oct`;

  const titreDemarcheId = `${titreId}-${demarcheId}01`;

  const demarchePosition = (() => {
    return 1;
  })();

  const titresDemarches = [
    {
      id: titreDemarcheId,
      typeId: demarcheId,
      titreId,
      statutId: "ind",
      ordre: demarchePosition
    }
  ];

  // L'étape des AEX est DEX (décision expresse)
  // L'étape des autres types est DPU (JORF)
  const etapeId = typeId === "arm" ? "dex" : "dpu";

  const titreEtapeId = `${titreDemarcheId}-${etapeId}01`;

  const titresEtapes = [
    {
      id: titreEtapeId,
      titreDemarcheId,
      typeId: etapeId,
      statutId: "acc",
      ordre: 1,
      date: demarcheEtapeDate,
      duree,
      dateFin: demarcheEtapeDateFin,
      surface: geojsonFeature.properties.surf_off || 0
    }
  ];

  const {
    demandeur: titulaire,
    demandeur_id,
    entreprise_id
  } = geojsonFeature.properties;
  const entreprises = [
    {
      // id: geojsonFeature.properties.entreprise_id,
      id: _.startCase(_.toLower(demandeur_id || entreprise_id || titulaire)),
      nom: _.startCase(_.toLower(titulaire))
    }
  ];

  const substancesCreate = subs =>
    subs.reduce((res, cur) => {
      const sub = substances.find(
        s =>
          (s["symbole"] && s["symbole"] === cur) ||
          (cur.includes("connexes") && "oooo")
      );

      if (!sub) {
        console.log(chalk.red.bold(`Erreur: substance ${cur} non identifée`));
      }

      return cur && sub
        ? [
            ...res,
            {
              titreEtapeId,
              substanceId: sub.id
            }
          ]
        : res;
    }, []);

  const substancePrincipales = (() => {
    const substances = geojsonFeature.properties.subst_1;
    const s = substances
      ? substancesCreate(substances.replace(/, /g, ",").split(","))
      : [];
    return s;
  })();

  const substanceConnexes = (() => {
    const substances = geojsonFeature.properties.subst_2;
    return substances
      ? substancesCreate(substances.replace(/, /g, ",").split(","))
      : [];
  })();

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: "ind",
      references: ref
        ? {
            ONF: ref
          }
        : null
    },
    titresSubstances: [...substancePrincipales, ...substanceConnexes],
    titresDemarches,
    titresEtapes,
    titresEmprises: {
      titreEtapeId,
      empriseId: "ter"
    },
    titresPoints: geojsonFeature.geometry.coordinates.coordinates.reduce(
      (res, contoursOrPoints, contourIdOrGroupId) =>
        geojsonFeature.geometry.coordinates.type === "MultiPolygon"
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
      titreEtapeId,
      entrepriseId: t.id
    }))
  };
};

module.exports = jsonFormat;
