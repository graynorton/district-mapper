import {html, css, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import './precinct-element.js';
import { rectangularRegion, Region, randomlySizedMixedRandD, singletonRorD } from './Region.js';
import { DistrictMap } from './DistrictMap.js';
import { getAllPossibleDistricts, basicSizeChecker, getAllPossibleDistrictMaps } from './districter.js';
import { generateRandomMap, generateAndScoreRandomMaps, singleWinnerMagnitudeSpec, FRAMagnitudeSpec } from './heuristic-districter.js';

@customElement('region-element')
export class RegionElement extends LitElement {
  static styles = css`
      :host {
       display: grid;
       margin: calc(var(--precinct-size) / 6);
       --precinct-size: 2.5rem;
      }
  `;
  
  @state()
  maps: ({ score: number, map: DistrictMap })[] = generateAndScoreRandomMaps(
    rectangularRegion(4, 3, singletonRorD/*randomlySizedMixedRandD*/),
    4,
    singleWinnerMagnitudeSpec,
    //FRAMagnitudeSpec,
    100
  )
  
  @property()
  map: DistrictMap = this.maps[0].map
  //map: DistrictMap = new DistrictMap(rectangularRegion(10, 10, randomlySizedMixedRandD))


  render() {
    return html`
        <style>
          :host {
            grid-template-rows: repeat(${this.map.region.boundingRect.y + 1}, var(--precinct-size));
            grid-template-columns: repeat(${this.map.region.boundingRect.x + 1}, var(--precinct-size));
          }
        </style>
        ${this.map.precincts.map(p => html`
          <precinct-element district=${p.district} .precinct=${p}></precinct-element>
        `)}
        
    `;
  }
  
  firstUpdated() {
    //this.maps = generateAndScoreRandomMaps(rectangularRegion(20, 20))
  }
}
