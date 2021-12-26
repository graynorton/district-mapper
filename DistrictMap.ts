import { Precinct } from './Precinct.js';
import { Region } from './Region.js';
import { District } from './District.js';

export class DistrictMap {
  region: Region
  seats: number
  districts: Set<District>
  _index: Map<Precinct, number>
  
  get descriptor() {
    return Array.from(this.districts)
      .map(district => district.descriptor)
      .sort()
      .join('|');    
  }
  
  get precincts() {
    return this.region.precincts.map(precinct => {
      const district = this._index.get(precinct);
      return Object.assign({}, precinct, district === undefined ? {} : { district });
    });
  }
  
  get electionResults() {
    const votes: Map<string, number> = new Map();
    const seats: Map<string, number> = new Map();
    const byDistrict: Map<number, { votes: Map<string, number>, seats: Map<string, number> }> = new Map();
    for (const district of this.districts) {
      const districtResults = district.electionResults;
      byDistrict.set(district.id, districtResults);
      const { votes: districtVotes, seats: districtSeats } = districtResults;
      for (const entry of districtVotes.entries()) {
        const [party, count] = entry;
        const prev = votes.get(party) || 0;
        votes.set(party, prev + count);
      }
      for (const entry of districtSeats.entries()) {
        const [party, count] = entry;
        const prev = seats.get(party) || 0;
        seats.set(party, prev + count);
      }
    }
    return { votes, seats, byDistrict };
  }
      
  constructor(region: Region, seats=3, districts?: Set<District> | District[]) {
    this.region = region;
    this.seats = seats;
    this.districts = new Set(districts);
    this.updateIndex();
  }
  
  updateIndex() {
    this._index = new Map();
    for (const district of this.districts) {
      for (const precinct of district.precincts) {
        this._index.set(precinct, district.id);
      }
    }
  }
}
