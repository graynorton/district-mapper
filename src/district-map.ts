import {html, css, LitElement, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import './precinct-element.js';
import { DistrictMap } from './DistrictMap.js';


@customElement('district-map')
export class DistrictMapElement extends LitElement {
  static styles = css`
      :host {
       display: grid;
       margin: calc(var(--precinct-size) / 6);
       --precinct-size: 2.5rem;
      }
  `;
  
  @property()
  map?: DistrictMap


  render() {
    return this.map ? html`
        <style>
          :host {
            grid-template-rows: repeat(${this.map.region.boundingRect.y + 1}, var(--precinct-size));
            grid-template-columns: repeat(${this.map.region.boundingRect.x + 1}, var(--precinct-size));
          }
        </style>
        ${this.map.precincts.map(p => html`
          <precinct-element district=${p.district} .precinct=${p}></precinct-element>
        `)}
        
    ` : nothing;
  }
}
