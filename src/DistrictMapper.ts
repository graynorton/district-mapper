import { ReactiveController, ReactiveElement } from "lit";

import { Precinct } from './Precinct.js';
import { Region } from './Region.js';
import { DistrictMap } from './DistrictMap.js';
import { singleWinnerMagnitudeSpec, FRAMagnitudeSpec, generateBestMap, DistrictMagnitudeSpec } from './heuristic-districter.js';


type Partisanship = Map<string, number>;
const evenDRSplit = (): Partisanship => new Map([['D', 0.5], ['R', 0.5]]);
const DandRPlusTwo = (): Partisanship => new Map([['D', 0.45], ['R', 0.45], ['X', 0.05], ['Y', 0.05]]);

export class DistrictMapper implements ReactiveController {
    map?: DistrictMap

    _host: ReactiveElement
    _x: number = 10
    _y: number = 10
    _seats: number = 4
    _minPrecinctPopulation: number = 1
    _maxPrecinctPopulation: number = 1
    _partisanship: Partisanship = evenDRSplit()
    _magnitudeSpec: DistrictMagnitudeSpec = singleWinnerMagnitudeSpec
    _region?: Region

    _generateRegion() {
        this._region = rectangularRegion({
            x: this._x,
            y: this._y,
            minPrecinctPopulation: this._minPrecinctPopulation,
            maxPrecinctPopulation: this._maxPrecinctPopulation,
            partisanship: this._partisanship
        });
        this.map = new DistrictMap(this._region, this._seats);
        this._host.requestUpdate();
    }

    _autoRedistrict() {
        this.map = generateBestMap(this._region!, this._seats, this._magnitudeSpec);
    }

    constructor(host: ReactiveElement) {
        this._host = host;
        host.addController(this);
    }

    hostConnected() {
        this._generateRegion();
        this._autoRedistrict();
    }

}

type PrecinctSpec = {
    minPrecinctPopulation: number,
    maxPrecinctPopulation: number,
    partisanship: Partisanship
}

type RegionSpec = PrecinctSpec & {
    x: number,
    y: number
}

const defaultPrecinctSpec: PrecinctSpec = {
    minPrecinctPopulation: 1,
    maxPrecinctPopulation: 1,
    partisanship: evenDRSplit()
}

const defaultRegionSpec: RegionSpec = Object.assign({}, defaultPrecinctSpec, {
    x: 3,
    y: 3
})

export function rectangularRegion(regionSpec: RegionSpec=defaultRegionSpec): Region {
    const { x, y, partisanship, minPrecinctPopulation, maxPrecinctPopulation } = regionSpec;
    const precincts = [];
    
    for (let i = 0; i < y; i++) {
      for (let j = 0; j < x; j++) {
        const { population, voters } = randomPrecinct({ minPrecinctPopulation, maxPrecinctPopulation, partisanship });
        precincts.push(new Precinct({
          id: (i * x) + (j + 1),
          x: j,
          y: i,
          population,
          voters
        }));
      }
    }
    
    return new Region(precincts);
  }
  
  export function randomPrecinct(precinctSpec: PrecinctSpec=defaultPrecinctSpec) {
    const { minPrecinctPopulation, maxPrecinctPopulation, partisanship } = precinctSpec;
    const randomizedPartisanship = randomizePartisanship(partisanship);
    const targetPopulation = minPrecinctPopulation + (Math.random() * (maxPrecinctPopulation - minPrecinctPopulation));
    const voters: Partisanship = new Map();
    let population = 0;
    let scrappers = [];
    for (const [ party, prevalence ] of randomizedPartisanship.entries()) {
        let n = targetPopulation * prevalence;
        if (n < 1) {
            scrappers.push({party, n});
        }
        else {
            n = Math.round(n);
            population += n;
            voters.set(party, n);
        }
    }
    if (population < targetPopulation) {
        const totalScraps = scrappers.reduce((prev, {n}) => prev + n, 0);
        const scaleFactor = 1 / totalScraps;
        let proportion = 0;
        scrappers = scrappers.map(({ party, n }) => ({ party, n: (proportion += n / scaleFactor) }));
        const r = Math.random();
        for (let i = 0; i < scrappers.length; i++) {
            const { party, n } = scrappers[i];
            if (r < n) {
                population += 1;
                voters.set(party, 1);
                break;
            }
        }
    }
    return { population, voters };
  }

  function randomizePartisanship(original: Partisanship): Partisanship {
      const minFactor = 0;
      const maxFactor = 2;
      let runningTotal = 0;
      let adjustedPartisanship: [string, number][] = [];
      for (const [ party, prevalence ] of original.entries()) {
        const factor = minFactor + (Math.random() * maxFactor - minFactor);
        const randomized = factor * prevalence;
        runningTotal += randomized;
        adjustedPartisanship.push([ party, randomized ]);
      }
      const scaleFactor = 1 / runningTotal;
      adjustedPartisanship = adjustedPartisanship.map(([ party, prevalence ]) => [ party, prevalence * scaleFactor ]);
      return new Map(adjustedPartisanship);
  }