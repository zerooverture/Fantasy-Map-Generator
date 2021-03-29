(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.Lakes = factory());
}(this, (function () {'use strict';

const setClimateData = function(h) {
  const cells = pack.cells;
  const lakeOutCells = new Uint16Array(cells.i.length);

  pack.features.forEach(f => {
    if (f.type !== "lake") return;

    // default flux: sum of precipition around lake first cell
    f.flux = rn(d3.sum(f.shoreline.map(c => grid.cells.prec[cells.g[c]])) / 2);

    // temperature and evaporation to detect closed lakes
    f.temp = f.cells < 6 ? grid.cells.temp[cells.g[f.firstCell]] : rn(d3.mean(f.shoreline.map(c => grid.cells.temp[cells.g[c]])), 1);
    const height = (f.height - 18) ** heightExponentInput.value; // height in meters
    const evaporation = (700 * (f.temp + .006 * height) / 50 + 75) / (80 - f.temp); // based on Penman formula, [1-11]
    f.evaporation = rn(evaporation * f.cells);

    // lake outlet cell
    f.outCell = f.shoreline[d3.scan(f.shoreline, (a,b) => h[a] - h[b])];
    lakeOutCells[f.outCell] = f.i;
  });

  return lakeOutCells;
}

const cleanupLakeData = function() {
  for (const feature of pack.features) {
    if (feature.type !== "lake") continue;
    delete feature.river;
    delete feature.enteringFlux;
    delete feature.shoreline;
    delete feature.outCell;
    feature.height = rn(feature.height);

    const inlets = feature.inlets?.filter(r => pack.rivers.find(river => river.i === r));
    if (!inlets || !inlets.length) delete feature.inlets;
    else feature.inlets = inlets;

    const outlet = feature.outlet && pack.rivers.find(river => river.i === feature.outlet);
    if (!outlet) delete feature.outlet;
  }
}

const defineGroup = function() {
  for (const feature of pack.features) {
    if (feature.type !== "lake") continue;
    const lakeEl = lakes.select(`[data-f="${feature.i}"]`).node();
    if (!lakeEl) continue;

    feature.group = getGroup(feature);
    document.getElementById(feature.group).appendChild(lakeEl);
  }
}

const generateName = function() {
  Math.random = aleaPRNG(seed);
  for (const feature of pack.features) {
    if (feature.type !== "lake") continue;
    feature.name = getName(feature);
  }
}

const getName = function(feature) {
  const landCell = pack.cells.c[feature.firstCell].find(c => pack.cells.h[c] >= 20);
  const culture = pack.cells.culture[landCell];
  return Names.getCulture(culture);
}

function getGroup(feature) {
  if (feature.temp < -3) return "frozen";
  if (feature.height > 60 && feature.cells < 10 && feature.firstCell % 5 === 0) return "lava";

  if (!feature.inlets && !feature.outlet) {
    if (feature.evaporation / 2 > feature.flux) return "dry";
    if (feature.cells < 3 && feature.firstCell % 5 === 0) return "sinkhole";
  }

  if (!feature.outlet && feature.evaporation > feature.flux) return "salt";

  return "freshwater";
}

return {setClimateData, cleanupLakeData, defineGroup, generateName, getName};

})));
