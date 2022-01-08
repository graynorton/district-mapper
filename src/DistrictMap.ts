import { Precinct } from './Precinct.js';
import { Region } from './Region.js';
import { District } from './District.js';

export class DistrictMap {
  region: Region
  seats: number
  districts: Set<District>
  _precinctToDistrictIndex: Map<Precinct, number>
  _idToDistrictIndex: Map<number, District>
  
  get descriptor() {
    return Array.from(this.districts)
      .map(district => district.descriptor)
      .sort()
      .join('|');    
  }
  
  get precinctsWithDistrictAssignments() {
    return this.region.precincts.map(precinct => {
      const district = this._precinctToDistrictIndex.get(precinct);
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

  get districtsAreContiguous() {
    for (const district of this.districts) {
      if (!district.isContiguous) return false;
    }
    return true;
  }
      
  constructor(region: Region, seats=3, districts?: Set<District> | District[]) {
    this.region = region;
    this.seats = seats;
    this.districts = new Set(districts);
    this.rebuildIndex();
  }

  assignPrecinct(precinct: Precinct, districtID: number) {
    const district = this._idToDistrictIndex.get(districtID);
    if (district) {
      if (this.region.precincts.includes(precinct)) {
        const currentDistrictID = this._precinctToDistrictIndex.get(precinct);
        if (typeof currentDistrictID === 'number') {
          if (currentDistrictID === districtID) return;
          const currentDistrict = this._idToDistrictIndex.get(currentDistrictID);
          currentDistrict!.precincts.delete(precinct);
        }
        district.precincts.add(precinct);
        this._precinctToDistrictIndex.set(precinct, district.id!);
      }
      else throw new Error(`Precinct not in this DistrictMap's Region`);
    }
    else throw new Error(`No District with id "${districtID}" in this DistrictMap`);
  }

  clone() {
    const clonedDistricts: Set<District> = new Set();
    for (const district of this.districts) {
      clonedDistricts.add(district.clone());
    }
    return new DistrictMap(this.region, this.seats, clonedDistricts)
  }
  
  rebuildIndex() {
    this._precinctToDistrictIndex = new Map();
    this._idToDistrictIndex = new Map();
    for (const district of this.districts) {
      this._idToDistrictIndex.set(district.id!, district);
      for (const precinct of district.precincts) {
        this._precinctToDistrictIndex.set(precinct, district.id!);
      }
    }
  }
}
