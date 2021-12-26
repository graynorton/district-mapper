import { Region } from './Region.js';
import { Precinct, TOTAL } from './Precinct.js';
import { District } from './District.js';
import { DistrictMap } from './DistrictMap.js';

type DistrictMagnitudeBreakdown = Map<number, number>
type DistrictMagnitudeSet = number[]
type DistrictMagnitudeSpec = DistrictMagnitudeSet[]
    
export const FRAMagnitudeSpec = [[5], [5, 3], [5, 3, 4], [5, 3, 4, 2], [5, 3, 4, 2, 1]];
export const singleWinnerMagnitudeSpec = [[1]];

function generateDistrictMagnitudeBreakdowns(nSeats: number, spec: DistrictMagnitudeSpec) {
  for (const option of spec) {
    const breakdowns = _generateDistrictMagnitudeBreakdowns(nSeats, option);
    if (breakdowns.length) {
      return breakdowns;
    }
  }
  return [];
}

function _generateDistrictMagnitudeBreakdowns(nSeats: number, set: DistrictMagnitudeSet) {
  const breakdowns = [];
  const remaining = set.slice();
  const a = remaining.shift();
  if (remaining.length === 0) {
    if (nSeats % a === 0) {
      breakdowns.push(new Map([[ a, nSeats / a ]]));
    }
  }
  else {
    const maxA = Math.floor(nSeats / a);
    for (let i = maxA; i >= 0; i--) {
      const solution = { [a]: i };
      const complements = _generateDistrictMagnitudeBreakdowns(nSeats - (a * i), remaining);
      for (const complement of complements) {
        complement.set(a, i);
        breakdowns.push(complement);
      }
    }
  }
  return breakdowns;
}

export function generateRandomMap(region: Region, seats:number, magnitudeSpec: DistrictMagnitudeSpec): DistrictMap {
  let id = 0;
  const map = new DistrictMap(region, seats);
  const precincts = new Set(region.precincts);
  const possibleBreakdowns = generateDistrictMagnitudeBreakdowns(seats, magnitudeSpec);
  const breakdown = possibleBreakdowns[Math.floor(Math.random() * possibleBreakdowns.length)];
  for (const pair of breakdown.entries()) {
    const [ magnitude, n ] = pair;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * precincts.size);
      const randomPrecinct = Array.from(precincts)[idx];
      precincts.delete(randomPrecinct);
      const district = new District(region, magnitude, [randomPrecinct]);
      district.id = id++;
      map.districts.add(district);
    }
  }
  const districtsToFill = Array.from(map.districts)
    .map(district => ({
      district,
      population: district.population,
      idealPopulation: region.population / district.seats
    }));
  const done: Set<District> = new Set();
  while (precincts.size > 0) {
    districtsToFill.sort((a, b) => {
      const aNeeds = a.idealPopulation - a.district.population;
      const bNeeds = b.idealPopulation - b.district.population;
      return aNeeds > bNeeds ? -1 : aNeeds === bNeeds ? 0 : 1;
    });
    let neediest;
    for (let i = 0; i < districtsToFill.length; i++) {
      const candidate = districtsToFill[i];
      if (!done.has(candidate.district)) {
        neediest = candidate;
        break;
      }
    }
    const neighbors = neediest.district.neighboringPrecincts as Set<Precinct>;
    let availableNeighbor: Precinct;
    while (neighbors.size && !availableNeighbor) {
      const idx = Math.floor(Math.random() * neighbors.size);
      const randomNeighbor = Array.from(neighbors)[idx];
      neighbors.delete(randomNeighbor);
      availableNeighbor = precincts.has(randomNeighbor) && randomNeighbor;       
    }
    if (availableNeighbor) {
      neediest.district.precincts.add(availableNeighbor);
      neediest.population += availableNeighbor.population;
      precincts.delete(availableNeighbor);
    } 
    else {
      done.add(neediest.district);
    }
  }
  map.updateIndex();
  return map;
}

export function generateAndScoreRandomMaps(region: Region, seats:number, magnitudeSpec=singleWinnerMagnitudeSpec, numMaps=100) {
  const maps = [];
  for (let i = 0; i < numMaps; i++) {
    const map = generateRandomMap(region, seats, magnitudeSpec);
    const score = scoreMap(map);
    maps.push({ map, score });
  }
  maps.sort((a, b) => a.score.totalVariance > b.score.totalVariance ? 1 : a.score.totalVariance === b.score.totalVariance ? 0 : -1);
  console.log(maps);
  return maps;
}

export function scoreMap(map: DistrictMap) {
  const [regionLevelRepresentation, districtLevelRepresentation, representationByDistrict] = scoreRepresentation(map);
  ///
  const [sizeVariance, sizeVarianceByDistrict] = scoreDistrictSize(map);
  const [compactnessVariance, compactnessVarianceByDistrict] = scoreDistrictCompactness(map);
  const totalVariance = (0.45 * sizeVariance + 0.45 * regionLevelRepresentation + 0.1 * compactnessVariance);
  //console.log('total', totalVariance);
  return {totalVariance, regionLevelRepresentation, sizeVariance, compactnessVariance, sizeVarianceByDistrict, compactnessVarianceByDistrict};
}

function scoreDistrictCompactness(map: DistrictMap): [number, number[]] {
  const variances = [];
  for (const district of map.districts) {
    let minX, maxX, minY, maxY;
    for (const precinct of district.precincts) {
      const { x, y } = precinct;
      if (minX === undefined || minX > x) {
        minX = x;
      }
      if (maxX === undefined || maxX < x) {
        maxX = x;
      }
      if (minY === undefined || minY > y) {
        minY = y;
      }
      if (maxY === undefined || maxY < y) {
        maxY = y;
      }
    }
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const idealLength = Math.sqrt(district.precincts.size);
    //const { x: mapMaxX, y: mapMaxY } = map.region.boundingRect;
    let mapMaxX = map.region.boundingRect.x + 1;
    let mapMaxY = map.region.boundingRect.y + 1;
    let idealWidth, idealHeight;
    if (idealLength > mapMaxX) {
      idealWidth = mapMaxX;
      idealHeight = district.precincts.size / idealWidth;
    }
    else if (idealLength > mapMaxY) {
      idealHeight = mapMaxY;
      idealWidth = district.precincts.size / idealHeight;
    }
    else {
      idealWidth = idealHeight = idealLength;
    }
    const maxWidth = Math.min(district.precincts.size, mapMaxX);
    const heightForMaxWidth = district.precincts.size / maxWidth;
    const varianceForMaxWidth =
        Math.abs(maxWidth - idealWidth) +
        Math.abs(heightForMaxWidth - idealHeight);
    const maxHeight = Math.min(district.precincts.size, mapMaxY);
    const widthForMaxHeight = district.precincts.size / maxHeight;
    const varianceForMaxHeight =
        Math.abs(maxHeight - idealHeight) +
        Math.abs(widthForMaxHeight - idealWidth);
    const worstPossibleVariance = Math.max(varianceForMaxWidth, varianceForMaxHeight);
    if (worstPossibleVariance === 0) {
      variances.push(0);
    }
    else {
      const actualVariance =
          Math.abs(width - idealWidth) +
          Math.abs(height - idealHeight);
      const normalizedVariance = actualVariance / worstPossibleVariance;
      variances.push(normalizedVariance);
    }
  }
  const meanVariance = variances.reduce((total, next) => total += next, 0) / map.districts.size;
  //console.log('compactness', meanVariance, variances);
  return [meanVariance, variances];
}

function scoreDistrictSize(map: DistrictMap): [number, number[]] {
  const idealPeoplePerSeat = map.region.population / map.seats;
  const variances = [];
  for (const district of map.districts) {
    // TODO: Handle case where number of seats is not predetermined (e.g., when hand-drawing)?
    const idealSize = district.seats * idealPeoplePerSeat;
    const actualSize = district.population;
    variances.push(Math.abs(actualSize - idealSize) / idealSize);
  }
  const meanVariance = variances.reduce((total, next) => total += next, 0) / map.districts.size;
  //console.log('size', meanVariance, variances);
  return [meanVariance, variances];
}

function scoreRepresentation(map: DistrictMap): [number, number, number[]]
{
  const { votes, seats, byDistrict } = map.electionResults;
  const totalVotes = votes.get(TOTAL);
  const totalSeats = seats.get(TOTAL);
  let maxAdvantageRatio = -Infinity;
  for (const party of votes.keys()) {
    if (party === TOTAL) continue;
    const pctVotes = votes.get(party) / totalVotes;
    const pctSeats = seats.get(party) / totalSeats;
    const advantageRatio = pctSeats / pctVotes;
    if (advantageRatio > maxAdvantageRatio) {
      maxAdvantageRatio = advantageRatio;
    }
  }
  const pctRepresented = 1 / maxAdvantageRatio;
  //console.log(pctRepresented);
  const variance = 1 - pctRepresented;
  //const variance = pctRepresented;
  return [variance, 0, [0]];
}