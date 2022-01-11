import { ReactiveController, ReactiveElement } from "lit";

import { Precinct } from './Precinct.js';
import { Region } from './Region.js';
import { DistrictMap } from './DistrictMap.js';
import { singleWinnerMagnitudeSpec, FRAMagnitudeSpec, generateFairMap, generatePartisanMap, DistrictMagnitudeSpec } from './heuristic-districter.js';


type Partisanship = Map<string, number>;
const evenDRSplit = (): Partisanship => new Map([['D', 5], ['R', 5], ['A', 0], ['B', 0], ['C', 0]]);
// const DandRPlusTwo = (): Partisanship => new Map([['D', 9], ['R', 4], ['X', 0], ['Y', 0]]);

type Allocation = 'Single-Winner' | 'Multi-Winner Proportional';

export class DistrictMapper implements ReactiveController {
    map?: DistrictMap

    _host: ReactiveElement
    _x: number = 7
    _y: number = 5
    _seats: number = 7
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

    get x() {
        return this._x;
    }

    set y(y: number) {
        this._y = y;
        this._generateRegion();
    }

    get y() {
        return this._y;
    }

    set minPrecinctPopulation(min: number) {
        min = Number(min);
        this._minPrecinctPopulation = min;
        if (min > this._maxPrecinctPopulation) {
            this._maxPrecinctPopulation = min;
        }
        this._generateRegion();
    }

    get minPrecinctPopulation() {
        return this._minPrecinctPopulation;
    }

    set maxPrecinctPopulation(max: number) {
        max = Number(max);
        this._maxPrecinctPopulation = max;
        if (max < this._minPrecinctPopulation) {
            this._minPrecinctPopulation = max;
        }
        this._generateRegion();
    }

    get maxPrecinctPopulation() {
        return this._maxPrecinctPopulation;
    }

    setVoteShare(party: string, share: number) {
        this._partisanship.set(party, Number(share));
        this._generateRegion();
    }

    getVoteShares() {
        return Array.from(this._partisanship.entries());
    }

    set seats(seats: number) {
        this._seats = seats;
        this._autoRedistrict();
    }

    get seats() {
        return this._seats;
    }

    set allocation(option: Allocation) {
        this._magnitudeSpec = option === 'Single-Winner'
            ? singleWinnerMagnitudeSpec
            : FRAMagnitudeSpec;
        this._autoRedistrict();
    }

    get allocation(): Allocation {
        return this._magnitudeSpec === singleWinnerMagnitudeSpec
            ? 'Single-Winner'
            : 'Multi-Winner Proportional';
    }

    get allocationOptions(): Allocation[] {
        return [
            'Single-Winner',
            'Multi-Winner Proportional'
        ]
    }

    set favoredParty(party: string | null) {
        this._favoredParty = party;
        this._autoRedistrict();
    }

    get favoredParty() {
        return this._favoredParty;
    }

    _validateFavoredParty() {
        if (typeof this._favoredParty === 'string' && !this.map!.electionResults.votes.get(this._favoredParty)) {
            this._favoredParty = null;
        }
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
        this._validateFavoredParty();
        this._autoRedistrict();
        // this._host.requestUpdate();
    }

    _autoRedistrict() {
        this.map = this._favoredParty
            ? generatePartisanMap(this._favoredParty, this._region!, this._seats, this._magnitudeSpec)
            : generateFairMap(this._region!, this._seats, this._magnitudeSpec);
        
        this._host.requestUpdate();
        // console.log(this.map!.electionResults);
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