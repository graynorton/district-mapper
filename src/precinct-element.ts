import {html, css, LitElement} from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { customElement, property } from 'lit/decorators.js';
import { Precinct } from './Precinct.js';

@customElement('precinct-element')
class PrecinctElement extends LitElement {
  static styles = css`
    :host {
       --marker-size: calc(var(--precinct-size) * 2 / 3);
       --detail-size: calc(var(--marker-size) / 18);
       --border-size: calc(var(--detail-size) / 2);
       --text-size: calc(var(--marker-size) / 2);
       width: var(--precinct-size);
       height: var(--precinct-size);
       background: white;
       color: white;
       text-align: center;
       display: flex;
       align-items: center;
       justify-content: center;
       /*border: var(--border-size) solid rgba(10, 10, 10, 0.1);*/
    }
      
    div {
       height: var(--marker-size);
       width: var(--marker-size);
       background: #777;
       border-radius: 50%;
       line-height: var(--marker-size);
       /* border: var(--detail-size) solid rgba(255, 255, 255, 0.4); */
       font-family: sans-serif;
       font-size: var(--text-size);
       box-shadow: var(--detail-size) var(--detail-size) calc(var(--detail-size) * 2) 0px rgba(12, 12, 12, 0.50);
    } 
  `;
  
  @property()
  precinct: Precinct
  
  //   background: radial-gradient(white 40%, transparent 41%), conic-gradient(#FF5722 0% 35%, #FFEB3B 35% 60%, #2196F3 60% 100%);  
      
  render() {
    const maxRadius = Math.sqrt(this.precinct.region!.maxPrecinctPopulation / Math.PI);
    const thisRadius = Math.sqrt(this.precinct.population! / Math.PI);
    const sizeRatio = Math.max(thisRadius / maxRadius);
    const sizeExpression = `calc(var(--marker-size) * ${sizeRatio})`;
    const style = {
      background: `conic-gradient(${this._generatePartyPieChartGradient(this.precinct)})`,
      width: sizeExpression,
      height: sizeExpression
    };
    return html`<div style=${styleMap(style)}><!--${this.precinct.id}--></div>`;
  }
  
  _generatePartyPieChartGradient(precinct: Precinct) {
    const { partisanBreakdown } = precinct;
    const n = partisanBreakdown.length;
    let pct = 0;
    let segments = [];
    for (let i = 0; i < n; i++) {
      const party = partisanBreakdown[i];
      const color = partyColor(party[0]);
      const start = `${Math.round(pct * 100)}%`;
      pct += party[1];
      const end = i === n - 1 ? '100%' : `${Math.round(pct * 100)}%`;
      segments.push(`${color} ${start} ${end}`);
    }
    return segments.join(', ');
  }
  
  updated() {
    this.style.gridRow = `${this.precinct.y + 1}`;
    this.style.gridColumn = `${this.precinct.x + 1}`;
    if (this.precinct.district === undefined) {
      this.style.border = '1px dashed #CCC';
    }
    else {
      this.style.background = districtColors[this.precinct.district % districtColors.length];
    }
  }

  firstUpdated() {
    this.addEventListener('mouseenter', this._dispatchMouseEvent);
    this.addEventListener('mouseleave', this._dispatchMouseEvent);
  }

  _dispatchMouseEvent(nativeEvent: MouseEvent) {
    const t = nativeEvent.type === 'mouseenter' ? 'precinctenter' : 'precinctleave';
    const e = new Event(t, {composed: true});
    e.precinct = this.precinct;
    this.dispatchEvent(e);
  }
}

const districtColors =
    //["e1d0d1","c1dbe0","e7dbcf","c9e4d8","e0e6cc","ebefee","eae2d4","e8f1e6","d8d7d7","97d2e4"]
    //["e1d0d1","c1dbe0","e7dbcf","c9e1e1","e5d4cc","ebefee","eae2d4","f4f3ef","e3d0cf","b0d0da"]
    //["915c5f","396d77","a77d52","4a8989","9f694e","b5c7c1","b49864","d9d4c5","9a5c57","1f3b43"]
    ["33454c","005f73","0a9396","94d2bd","e9d8a6","ee9b00","ca6702","bb3e03","ae2012","9b2226"]
    // ["1a1a1a","292929","383838","525252","777777","9c9c9c","b9b9b9","c8c8c8","d6d6d6","ebebeb"]
    // ["1a1a1a","b9b9b9","ebebeb","9c9c9c","292929","d6d6d6","383838","c8c8c8","525252","777777"]
    // ["948e94","adb7c7","a39da2","bcc3cf","b5b1b4","c9cdd6","c2c1c2","d7d9de","f5f5f5","e3e3e3"]
    .map(h => `#${h}`)

function partyColor(party: string) {
  return party === 'D'
    ? 'blue'
    : party === 'R'
    ? 'red'
    : party === 'A'
    ? 'green'
    : party === 'B'
    ? 'orange'
    : party === 'C'
    ? 'purple'
    : '#777';
}