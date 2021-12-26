import { Region } from './Region.js';
import { Precinct } from './Precinct.js';
import { District } from './District.js';
import { DistrictMap } from './DistrictMap.js';

type DistrictSizeChecker = (district: District) => -1 | 1 | 0;
type VisitedIDs = Set<string>;
type Districts = Set<District>;
    
export function getAllPossibleDistricts(region: Region, checkSize: DistrictSizeChecker) {
  const visited: VisitedIDs = new Set();
  const districts: Districts = new Set();
  region.precincts.forEach(precinct => {
    const firstCandidate = new District(region, [precinct]);
    evaluatePotentialDistrict(firstCandidate, checkSize, visited, districts, region);
  });
  return districts;
}

export function basicSizeChecker(n: number) {
  return function (d: District) {
    return d.precincts.size < n
      ? -1
      : d.precincts.size > n
        ? 1
        : 0;
  };
}

function evaluatePotentialDistrict(candidate: District, checkSize: DistrictSizeChecker, visited: VisitedIDs, districts: Districts, region: Region) {
  const {descriptor} = candidate;
  if (!visited.has(descriptor)) {
    visited.add(descriptor);
    switch(checkSize(candidate)) {
      case 1:
        return;
      case 0:
        districts.add(candidate);
      default:
        candidate.neighboringPrecincts.forEach(precinct => {
          const nextCandidate = new District(region, candidate.precincts);
          nextCandidate.precincts.add(precinct);
          evaluatePotentialDistrict(nextCandidate, checkSize, visited, districts, region);
        });
    }
  }
}

///

type DistrictMaps = Set<DistrictMap>;
type MapsCache = Map<string, DistrictMaps>;

export function getAllPossibleDistrictMaps(region: Region, checkSize: DistrictSizeChecker, cache: MapsCache = new Map()) {
  const {descriptor} = region;
  if (cache.has(descriptor)) {
    return cache.get(descriptor);
  }
  const districtMaps: DistrictMaps = new Set();
  const mapsAdded: VisitedIDs = new Set();
  const candidateFirstDistricts = getAllPossibleDistricts(region, checkSize);
  //console.log(`${region.precincts.length} precincts, ${candidateFirstDistricts.size} districts`);
  for (const district of candidateFirstDistricts) {
    const districtMap = new DistrictMap(region, [district]);
    const subregion = createSubregion(region, district);
    if (subregion.precincts.length === 0) {
      const maps = new Set([districtMap]);
      cache.set(descriptor, maps);
      return maps;
    }
    else {
      const subregionDistrictMaps = getAllPossibleDistrictMaps(subregion, checkSize, cache);
      for (const map of subregionDistrictMaps) {
        map.districts.add(district);
        const mapDescriptor = map.descriptor;
        if (!mapsAdded.has(mapDescriptor)) {
          mapsAdded.add(mapDescriptor);
          districtMaps.add(map);
        }
      }
    }
  }
  //console.log(districtMaps);
  cache.set(descriptor, districtMaps);
  return districtMaps;
}

function createSubregion(region: Region, district: District) {
  const { boundingRect, precincts } = region;
  const subregionPrecincts = [];
  for (const precinct of precincts) {
    if (!district.precincts.has(precinct)) {
      subregionPrecincts.push(precinct);
    }
  }
  return new Region(subregionPrecincts);
}