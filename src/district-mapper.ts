import {html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import { DistrictMap } from './DistrictMap.js';
import { rectangularRegion, randomlySizedMixedRandD, singletonRorD } from './Region.js';
import { generateAndScoreRandomMaps, singleWinnerMagnitudeSpec, FRAMagnitudeSpec } from './heuristic-districter.js';
import './district-map.js';

@customElement('district-mapper')
export class DistrictMapperElement extends LitElement {
    @state()
    maps: ({ score: number, map: DistrictMap })[] = generateAndScoreRandomMaps(
      rectangularRegion(6, 6, singletonRorD/*randomlySizedMixedRandD*/),
      4,
      singleWinnerMagnitudeSpec,
      //FRAMagnitudeSpec,
      100
    )
    
  

    render() {
        return html`<district-map .map=${this.maps[0].map}></district-map>`;
    }
}