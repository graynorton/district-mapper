import { ReactiveController, ReactiveElement } from "lit";

import { Precinct } from './Precinct.js';
import { Region } from './Region.js';
import { DistrictMap } from './DistrictMap.js';
import { singleWinnerMagnitudeSpec, FRAMagnitudeSpec, generateBestMap, generatePartisanMap, DistrictMagnitudeSpec } from './heuristic-districter.js';


type Partisanship = Map<string, number>;
const evenDRSplit = (): Partisanship => new Map([['D', 0.5], ['R', 0.5]]);
// const DandRPlusTwo = (): Partisanship => new Map([['D', 9], ['R', 4], ['X', 0], ['Y', 0]]);

export class DistrictMapper implements ReactiveController {
    map?: DistrictMap

    _host: ReactiveElement
    _x: number = 10
    _y: number = 10
    _seats: number = 8
    _minPrecinctPopulation: number = 1
    _maxPrecinctPopulation: number = 1
    _partisanship: Partisanship = evenDRSplit()
    _magnitudeSpec: DistrictMagnitudeSpec = singleWinnerMagnitudeSpec
    _favoredParty: string | null = null
    _region?: Region

    set x(x: number) {
        this._x = x;
        this._generateRegion();
    }

    set y(y: number) {
        this._y = y;
        this._generateRegion();
    }

    set minPrecinctPopulation(min: number) {
        this._minPrecinctPopulation = min;
        this._generateRegion();
    }

    set maxPrecinctPopulation(max: number) {
        this._maxPrecinctPopulation = max;
        this._generateRegion();
    }

    setVoteShare(party: string, share: number) {
        this._partisanship.set(party, share);
        this._generateRegion();
    }

    set seats(seats: number) {
        this._seats = seats;
        this._autoRedistrict();
    }

    set magnitude(option: 'single' | 'multi') {
        this._magnitudeSpec = option === 'single'
            ? singleWinnerMagnitudeSpec
            : FRAMagnitudeSpec;
        this._autoRedistrict();
    }

    set favoredParty(party: string | null) {
        this._favoredParty = party;
        this._autoRedistrict();
    }

    _generateRegion() {
        this._region = rectangularRegion({
            x: this._x,
            y: this._y,
            minPrecinctPopulation: this._minPrecinctPopulation,
            maxPrecinctPopulation: this._maxPrecinctPopulation,
            partisanship: this._partisanship
        });
        this.map = new DistrictMap(this._region, this._seats);
        this._autoRedistrict();
        // this._host.requestUpdate();
    }

    _autoRedistrict() {
        this.map = this._favoredParty
            ? generatePartisanMap(this._favoredParty, this._region!, this._seats, this._magnitudeSpec)
            : generateBestMap(this._region!, this._seats, this._magnitudeSpec);
        
        this._host.requestUpdate();
        console.log(this.map!.electionResults);
    }

    constructor(host: ReactiveElement) {
        this._host = host;
        host.addController(this);
    }

    hostConnected() {
        this._generateRegion();
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