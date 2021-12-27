import { Precinct } from './Precinct.js';

export type PrecinctGraph = Map<Precinct, Set<Precinct>>

export class Region {
  boundingRect: { x: number, y: number }
  precincts: Precinct[] = []
  _precinctGraph: PrecinctGraph
  _descriptor: string
  _population: number
  _maxPrecinctPopulation: number
  
  get precinctGraph() {
    if (this._precinctGraph === undefined) {
      this._buildPrecinctGraph();
    }
    return this._precinctGraph;
  }
  
  get descriptor() {
    if (this._descriptor === undefined) {
      this._generateDescriptor(); 
    }
    return this._descriptor;
  }
  
  get population() {
    if (this._population === undefined) {
      this._calculatePopulation();
    }
    return this._population;
  }
      
  get maxPrecinctPopulation() {
    if (this._maxPrecinctPopulation === undefined) {
      this._calculatePopulation(); 
    }
    return this._maxPrecinctPopulation;
  }
      
  constructor(precincts: Precinct[]) {
    this.precincts = precincts;
    this._calculateBoundingRect();
    this._buildPrecinctGraph();
    this._generateDescriptor();
    this._calculatePopulation();
  }

  protected _calculateBoundingRect() {
    let [x, y] = [0, 0];
    for (const precinct of this.precincts) {
      if (precinct.x > x) {
        x = precinct.x;
      }
      if (precinct.y > y) {
        y = precinct.y;
      }
    }
    this.boundingRect = {x, y};
  }

  protected _buildPrecinctGraph() {
    const x = this.boundingRect.x + 1;
    const y = this.boundingRect.y + 1;
    // build map (2d array)
    const map = [];
    for (let i = 0; i < x; i++) {
      map.push(new Array(y));
    }
    this.precincts.forEach(p => {
      p.region = this;
      const { x:i, y:j } = p;
      if (map[i]?.[j] !== undefined) {
        throw new Error(`More than one precinct defined at coordinates (${i}, ${j})`);
      }
      map[i][j] = p;
    });
    // build graph (set of other precincts contiguous to each precinct)
    const graph = new Map();
    for (let i = 0; i < x; i++) {
      for (let j = 0; j < y; j++) {
        const precinct = map[i][j];
        if (precinct !== undefined) {
          [[i, j - 1], [i + 1, j], [i, j + 1], [i - 1, j]].forEach(([m, n]) => {
            const neighbor = map[m]?.[n];
            if (neighbor !== undefined) {
              connectPrecincts(graph, precinct, neighbor);
            }
          });
        }
      }
    }
    //console.log({map, graph});
    this._precinctGraph = graph;
  }
  
  protected _generateDescriptor() {
    this._descriptor = this.precincts
      .map(precinct => precinct.id)
      .join('_');
  }
  
  protected _calculatePopulation() {
    this._population = 0;
    this._maxPrecinctPopulation = 0;
    for (const precinct of this.precincts) {
      this._population += precinct.population;
      if (precinct.population > this._maxPrecinctPopulation) {
        this._maxPrecinctPopulation = precinct.population;
      }
    }
  }
}

function connectPrecincts(graph: PrecinctGraph, p1: Precinct, p2: Precinct) {
  const [p1Set, p2Set] = [p1, p2].map(p => {
    let set = graph.get(p);
    if (set === undefined) {
      graph.set(p, (set = new Set()));
    }
    return set;
  });
  p1Set.add(p2);
  p2Set.add(p1);
}

export const testRegion = new Region([
  new Precinct({ id: 1, x: 0, y: 0 }),
  new Precinct({ id: 2, x: 1, y: 0 }),
  new Precinct({ id: 3, x: 0, y: 1 })
]);

// export function rectangularRegion(x=3, y=3, demographicsGenerator=singletonRorD): Region {
//   const precincts = [];
  
//   for (let i = 0; i < y; i++) {
//     for (let j = 0; j < x; j++) {
//       const { population, voters } = demographicsGenerator();
//       precincts.push(new Precinct({
//         id: (i * x) + (j + 1),
//         x: j,
//         y: i,
//         population,
//         voters
//       }));
//     }
//   }
  
//   return new Region(precincts);
// }

// export function randomlySizedMixedRandD(minSize=100, maxSize=1000) {
//   const population = Math.round(minSize + (Math.random() * (maxSize - minSize)));
//   const numDs = Math.round(Math.random() * population);
//   const numRs = population - numDs;
//   return {
//     population,
//     voters: new Map([
//       ['D', numDs],
//       ['R', numRs]
//     ])
//   }
// }

// export function singletonRorD() {
//   const party = Math.random() < 0.5 ? 'D' : 'R';
//   return {
//     population: 1,
//     voters: new Map([
//       [party, 1]
//     ])
//   }
// }