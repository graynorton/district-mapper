import {html, css, LitElement, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import './precinct-element.js';
import { Precinct } from './Precinct.js';
import { DistrictMap } from './DistrictMap.js';


@customElement('district-map')
export class DistrictMapElement extends LitElement {
  static styles = css`
      :host {
       display: grid;
       margin: calc(var(--precinct-size) / 6);
      }
  `;
  
  @property()
  map?: DistrictMap

  @state()
  _hoveredPrecinct: Precinct | null = null


  render() {
    if (this._hoveredPrecinct) console.log(this._hoveredPrecinct.id);
    return this.map ? html`
        <style>
          :host {
            grid-template-rows: repeat(${this.map.region.boundingRect.y + 1}, var(--precinct-size));
            grid-template-columns: repeat(${this.map.region.boundingRect.x + 1}, var(--precinct-size));
          }
        </style>
        ${this.map.precinctsWithDistrictAssignments.map(p => html`
          <precinct-element district=${p.district} .precinct=${p}></precinct-element>
        `)}
        
    ` : nothing;
  }

  firstUpdated() {
    this.addEventListener('precinctenter', e => this._hoveredPrecinct = e.precinct);
    this.addEventListener('precinctleave', e => this._hoveredPrecinct = null);
  }
}
