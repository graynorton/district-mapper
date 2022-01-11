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

  get electionResultsNew() {
    const seats: string[][] = [];
    const seatsWon: Map<string, number> = new Map();
    const votes = tabulateResults(this.precincts);
    const THRESHOLD = 0.02;
    const threshold = THRESHOLD * votes.get(TOTAL)!;
    for (let s = this.seats; s > 0; s--) {
      const qq = Array.from(votes.entries())
        .filter(e => e[0] !== TOTAL)
        .map(([party, votesForParty]) => {
          const alreadyWon = seatsWon.get(party) || 0;
          return [party, (votesForParty / (alreadyWon + 1)), alreadyWon] as [string, number, number]
        })
        .sort((a, b) => a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0);
      if (s === 1) {
        const winners: [string, number][] = [];
        let qualifyingQ = qq[0][1];
        for (const [party, q, alreadyWon] of qq) {
          if (qualifyingQ - q < threshold) {
            winners.push([party, alreadyWon]);
            qualifyingQ = q;
          }
          else break;
        }
        seats.push(winners.map(w => w[0]));
        const fractionalSeats = 1 / winners.length;
        for (const [party, alreadyWon] of winners) {
          seatsWon.set(party, alreadyWon + fractionalSeats);
        }
      }
      else {
        const [winningParty, q, alreadyWon] = qq[0];
        seats.push([winningParty]);
        seatsWon.set(winningParty, alreadyWon + 1);
      }
    }
    return { votes, seats, seatsWon, threshold };
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

  get isContiguous(): boolean {
    const tester = new District(this.region);
    tester.precincts.add(Array.from(this.precincts).shift()!);
    let contiguous = true;
    while(contiguous && tester.precincts.size < this.precincts.size) {
      contiguous = false;
      const neighbors = tester.neighboringPrecincts;
      for (const neighbor of neighbors) {
        if (this.precincts.has(neighbor)) {
          tester.precincts.add(neighbor);
          contiguous = true;
        }
      }
    }
    return contiguous;
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