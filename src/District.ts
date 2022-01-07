import { Precinct, tabulateResults, TOTAL } from './Precinct.js';
import { Region } from './Region.js';

export class District {
  // TODO: Make this required
  id?: number
  region: Region
  seats: number
  precincts: Set<Precinct>
  
  get descriptor(): string {
    return Array.from(this.precincts)
      .map(precinct => precinct.id)
      .sort()
      .join('_');  
  }
  
  get population() {
    return Array.from(this.precincts).reduce((total, next) => total += next.population, 0);
  }
  
  get peoplePerSeat() {
    return this.population / this.seats;
  }
  
  get electionResults() {
    const seats: Map<string, number> = new Map();
    seats.set(TOTAL, this.seats);
    const votes = tabulateResults(this.precincts);
    for (const entry of votes.entries()) {
      const [party] = entry;
      if (party === TOTAL) continue;
      seats.set(party, 0);
    }
    for (let r = 0; r < this.seats; r++) {
      let hiQ = 0;
      let winner;
      for (const entry of votes.entries()) {
        const [party, votes] = entry;
        if (party === TOTAL) continue;
        const seatsAlreadyWon = seats.get(party);
        const q = votes / (seatsAlreadyWon + 1);
        if (q > hiQ) {
          hiQ = q;
          winner = party;
        }
      }
      const newSeatCount = seats.get(winner) + 1;
      seats.set(winner, newSeatCount);
    }
    return { votes, seats };
  }
  
  get neighboringPrecincts(): Set<Precinct> {
    const neighbors: Set<Precinct> = new Set();
    for (const precinct of this.precincts) {
      const precinctNeighbors = this.region.precinctGraph.get(precinct) || [];
      for (const neighbor of precinctNeighbors) {
        if (!this.precincts.has(neighbor)) {
          neighbors.add(neighbor);
        }
      }
    };
    return neighbors; 
  }
      
  constructor(region: Region, seats=1, precincts?: Set<Precinct> | Precinct[]) {
    this.region = region;
    this.seats = seats;
    this.precincts = new Set(precincts);
  }

  clone() {
    const clone = new District(this.region, this.seats, new Set(this.precincts))
    clone.id = this.id;
    return clone;
  }
}