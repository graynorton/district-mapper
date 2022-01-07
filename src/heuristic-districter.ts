import { Region } from './Region.js';
import { Precinct, TOTAL } from './Precinct.js';
import { District } from './District.js';
import { DistrictMap } from './DistrictMap.js';

type DistrictMagnitudeBreakdown = Map<number, number>
type DistrictMagnitudeSet = number[]
export type DistrictMagnitudeSpec = DistrictMagnitudeSet[]
    
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
  const done: Set<District> = new Set();
  while (precincts.size > 0) {
    const neediestDistrict = getNeediestDistrict(map, done);
    const neighbors = neediestDistrict.neighboringPrecincts as Set<Precinct>;
    let availableNeighbor: Precinct | null = null;
    while (neighbors.size && availableNeighbor === null) {
      const idx = Math.floor(Math.random() * neighbors.size);
      const randomNeighbor = Array.from(neighbors)[idx];
      neighbors.delete(randomNeighbor);
      if (precincts.has(randomNeighbor)) availableNeighbor = randomNeighbor;       
    }
    if (availableNeighbor) {
      neediestDistrict.precincts.add(availableNeighbor);
      precincts.delete(availableNeighbor);
    } 
    else {
      done.add(neediestDistrict);
    }
  }
  map.rebuildIndex();
  return map;
}

function getNeediestDistrict(map: DistrictMap, exclude: Set<District>=new Set()) {
  const idealPopulationPerSeat = map.region.population / map.seats;
  const sorted = Array.from(map.districts)
    .filter(district => !exclude.has(district))
    .sort((a, b) => {
      const idealPopulationA = idealPopulationPerSeat * a.seats;
      const idealPopulationB = idealPopulationPerSeat * b.seats;
      const shortfallA = idealPopulationA - a.population;
      const shortfallB = idealPopulationB - b.population;
      return shortfallA > shortfallB ? -1 : shortfallA < shortfallB ? 1 : 0;
    });
  return sorted[0];
}

export function generateAndScoreRandomMaps(region: Region, seats:number, magnitudeSpec=singleWinnerMagnitudeSpec, numMaps=100, scoreMap=scoreMap_Fair) {
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

export function generateBestMap(region: Region, seats: number, magnitudeSpec=singleWinnerMagnitudeSpec, numCandidates=100) {
  const bestRandomMap = generateAndScoreRandomMaps(region, seats, magnitudeSpec, numCandidates, scoreMap_Fair)[0].map;
  const improvements = tryRandomMutations(bestRandomMap, scoreMap_Fair);
  console.log('original', scoreMap_Fair(bestRandomMap).totalVariance);
  console.log('improvements', Array.from(improvements).map(improvement => scoreMap_Fair(improvement).totalVariance));
  return bestRandomMap;
}

export function generatePartisanMap(party: string, region: Region, seats: number, magnitudeSpec=singleWinnerMagnitudeSpec, numCandidates=100) {
  return generateAndScoreRandomMaps(region, seats, magnitudeSpec, numCandidates, scoreMap_Partisan(party))[0].map;
}

export function generateBestMapWithMutations(region: Region, seats: number, magnitudeSpec=singleWinnerMagnitudeSpec, numCandidates=100) {
  const bestRandomMap = generateAndScoreRandomMaps(region, seats, magnitudeSpec, numCandidates, scoreMap_Fair)[0].map;
  const mutatedMap = repeatedlyMutateMap(bestRandomMap, scoreMap_Fair);
  console.log(scoreMap_Fair(bestRandomMap).totalVariance, scoreMap_Fair(mutatedMap).totalVariance);
  return mutatedMap;
}

function randomArrayMember<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function tryRandomMutations(map: DistrictMap, score=scoreMap_Fair, maxMutations=100) {
  let improvements: Set<DistrictMap> = new Set();
  for (let i = 0; i < maxMutations; i++) {
    const improvedMap = randomlyMutateAndRebalanceMap(map, score);
    if (improvedMap) {
      improvements.add(improvedMap);
    }
  }
  return improvements;
}

function randomlyMutateAndRebalanceMap(map: DistrictMap, score=scoreMap_Fair, maxRebalancingSteps=10) {
  const blockList: Set<Precinct> = new Set();
  const originalScore = score(map);
  const mutant = map.clone();
  const randomDistrict = randomArrayMember(Array.from(map.districts));
  const randomNeighbor = randomArrayMember(Array.from(randomDistrict.neighboringPrecincts));
  mutant.assignPrecinct(randomNeighbor, randomDistrict.id!);
  blockList.add(randomNeighbor);
  let mutantScore = score(mutant);
  let rebalancingSteps = 0;
  while (
    rebalancingSteps < maxRebalancingSteps
    && mutantScore.sizeVariance > originalScore.sizeVariance
    && mutantScore.totalVariance > originalScore.totalVariance
  ) {
    const neediestDistrict = getNeediestDistrict(mutant);
    const neighbors = Array.from(neediestDistrict.neighboringPrecincts);
    let precintToAnnex: Precinct | null = null;
    while (!precintToAnnex) {
      const candidate = neighbors.splice(Math.floor(Math.random() * neighbors.length), 1)[0];
      if (!blockList.has(candidate)) {
        precintToAnnex = candidate;
        blockList.add(precintToAnnex);
      }
    }
    mutant.assignPrecinct(precintToAnnex, neediestDistrict.id!);
    mutantScore = score(mutant);
    rebalancingSteps++;
  }
  // console.log(mutantScore.totalVariance, originalScore.totalVariance);
  return mutantScore.totalVariance < originalScore.totalVariance ? mutant : null;
}

export function repeatedlyMutateMap(map: DistrictMap, scoringFunction=scoreMap_Fair, maxMutations=100) {
  let bestMap = map;
  for (let i = 0; i < maxMutations; i++) {
    const improvedMap = mutateMap(bestMap, scoringFunction);
    if (improvedMap) {
      bestMap = improvedMap;
    }
    else {
      break;
    }
  }
  return bestMap;
}

function mutateMap(map: DistrictMap, scoringFunction=scoreMap_Fair) {
  let score = scoringFunction(map).totalVariance;
  let bestMap = map;
  let bestScore = score;
  for (const district of map.districts) {
    for (const neighbor of district.neighboringPrecincts) {
      const mutant = map.clone();
      mutant.assignPrecinct(neighbor, district.id!);
      const mutantScore = scoringFunction(mutant).totalVariance;
      console.log(mutantScore, bestScore);
      if (mutantScore < bestScore) {
        bestScore = mutantScore;
        bestMap = mutant;
      }
    }
  }
  return bestMap === map ? null : bestMap;
}

function scoreMap_Fair(map: DistrictMap) {
  const [regionLevelRepresentation, districtLevelRepresentation, representationByDistrict] = scoreRepresentation(map);
  ///
  const [sizeVariance, sizeVarianceByDistrict] = scoreDistrictSize(map);
  const [compactnessVariance, compactnessVarianceByDistrict] = scoreDistrictCompactness(map);
  const totalVariance = (0.8 * sizeVariance + 0.2 * regionLevelRepresentation + 0.0 * compactnessVariance);
  //console.log('total', totalVariance);
  return {totalVariance, regionLevelRepresentation, sizeVariance, compactnessVariance, sizeVarianceByDistrict, compactnessVarianceByDistrict};
}

function scoreMap_Partisan(party: string) {
  return function _scoreMap_Partisan(map: DistrictMap) {
    const [partisanshipVariance] = scorePartisanship(map, party);
    ///
    const [sizeVariance, sizeVarianceByDistrict] = scoreDistrictSize(map);
    const [compactnessVariance, compactnessVarianceByDistrict] = scoreDistrictCompactness(map);
    const totalVariance = (0.8 * sizeVariance + 0.2 * partisanshipVariance);
    //console.log('total', totalVariance);
    return {totalVariance, partisanshipVariance, sizeVariance, compactnessVariance, sizeVarianceByDistrict, compactnessVarianceByDistrict};
  }
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
  const { votes, seats } = map.electionResults;
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

function scorePartisanship(map: DistrictMap, party: string): [number] {
  const { votes, seats } = map.electionResults;
  const partyVotes = votes.get(party) || 0;
  const partySeats = seats.get(party) || 0;
  let variance;
  if (partyVotes === 0) {
    variance = 0;
  }
  else {
    const totalVotes = votes.get(TOTAL)!;
    const totalSeats = seats.get(TOTAL)!;
    const pctVotes = partyVotes / totalVotes;
    const pctSeats = partySeats / totalSeats;
    const maxAdvantageRatio = 1 / pctVotes;
    const actualAdvantageRatio = pctSeats / pctVotes;
    variance = 1 - (actualAdvantageRatio / maxAdvantageRatio);
  }
  return [variance];
}