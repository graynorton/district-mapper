import { Region } from './Region.js';

type PrecinctInterface = {
  id: number,
  x: number,
  y: number,
  population?: number,
  voters?: Map<string, number>,
  district?: number
}

export class Precinct implements PrecinctInterface {
  id: number
  x: number
  y: number
  population: number
  voters: Map<string, number>
  partisanBreakdown: [string, number][]
  district?: number
  region?: Region
  constructor(config: PrecinctInterface) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.population = config.population === undefined ? 1 : config.population;
    this.voters = config.voters === undefined ? new Map() : config.voters;
    
    this.partisanBreakdown = this._calculatePartisanBreakdown();
  }
  
  _calculatePartisanBreakdown(): [string, number][] {
    const arr = Array.from(this.voters.entries());
    arr.sort((a, b) => a[0] > b[0] ? 1 : -1);
    const totalVoters = arr.reduce((total, current) => total = total + current[1], 0);
    return arr.map(p => [p[0], p[1] / totalVoters]);
  }
}

export const TOTAL = 'TOTAL';

export function tabulateResults(precincts: Set<Precinct>) {
  const votes: Map<string, number> = new Map();
  let totalVotes = 0;
  for (const precinct of precincts) {
    for (const entry of precinct.voters.entries()) {
      const [party, voters] = entry;
      totalVotes += voters;
      const currentTotal = votes.get(party);
      votes.set(party, (currentTotal || 0) + voters);
    }
  }
  votes.set(TOTAL, totalVotes);
  return votes;
}