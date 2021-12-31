import {html, css, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import { TOTAL } from './Precinct.js';
import { DistrictMapper } from './DistrictMapper.js';
import './district-map.js';

@customElement('district-mapper')
export class DistrictMapperElement extends LitElement {
    _mapper: DistrictMapper

    static styles = css`
        :host {
            display: flex;
            flex-direction: row;
            font-family: sans-serif;
        }
        :host > * {
            padding: 1rem;
        }
        #map {
            display: flex;
            justify-content: center;
            align-items: center;
            background: #EEE;
            flex-grow: 1;
        }
        district-map {
            /* TODO: properly scope variables */
            --detail-size: 0.25rem;
            box-shadow: var(--detail-size) var(--detail-size) calc(var(--detail-size) * 2) 0px rgba(12, 12, 12, 0.5);
        }
        #controls {
            width: 20rem;
            flex-shrink: 0;
        }
        input[type=range] {
            display: block;
            width: 100%;
        }
    `

    render() {
        const { x, y, minPrecinctPopulation, maxPrecinctPopulation, seats, allocation, allocationOptions, favoredParty } = this._mapper;
        const partyVoteShares = this._mapper.getVoteShares();
        const partiesWithVotes = Array.from(this._mapper.map!.electionResults.votes.entries())
            .map(entry => entry[0])
            .filter(party => party !== TOTAL)
            .sort()
            .reverse();
        console.log('whee', this._mapper.map?.electionResults);
        return html`
            <section id="map">
                <district-map .map=${this._mapper.map}></district-map>
            </section>
            <section id="controls" @input=${this._updateUI} @change=${this._updateMapper}>
                <details>
                    <summary>Region</summary>
                    <fieldset>
                        <legend>Size</legend>
                        <input id="x" type="range" min="1" max="20" .value=${x} />
                        <label for="x">X</label>
                        <input id="y" type="range" min="1" max="20" .value=${y} />
                        <label for="y">Y</label>
                    </fieldset>
                    <fieldset>
                        <legend>Precinct Population</legend>
                        <input id="minPrecinctPopulation" type="range" min="1" max="1000" .value=${minPrecinctPopulation} />
                        <label for="minPrecinctPopulation">Min</label>
                        <input id="maxPrecinctPopulation" type="range" min="1" max="1000" .value=${maxPrecinctPopulation} />
                        <label for="maxPrecinctPopulation">Max</label>
                    </fieldset>
                    <fieldset @change=${this._updateMapperVoteShare}>
                        <legend>Partisanship</legend>
                        ${
                            partyVoteShares.map(([party, share]) => html`
                                <input id=${party} type="range" min="0" max="1" step="0.01" .value=${share} />
                                <label for=${party}>${party}</label>
                            `)
                        }

                    </fieldset>
                </details>
                
                <details>
                    <summary>District Map</summary>
                    <fieldset>
                        <legend>Seats</legend>
                        <input id="seats" type="range" min="1" max="100" .value="${seats}" />
                    </fieldset>
                    <fieldset>
                        <legend>Allocation</legend>
                        ${
                            allocationOptions.map(option => html`
                                <input id=${option} name="allocation" type="radio" value=${option} .checked=${option === allocation} />
                                <label for=${option}>${option}</label>
                                <br/>
                            `)
                        }
                    </fieldset>
                    <fieldset>
                        <legend>Objective</legend>
                        <input id="null" name="favoredParty" type="radio" value="null" .checked=${null === favoredParty} />
                        <label for="null">Fair Representation</label>
                        <br/>
                        ${
                            partiesWithVotes.map(party => html`
                                <input id=${party} name="favoredParty" type="radio" value=${party} .checked=${party === favoredParty} />
                                <label for=${party}>${party} Gerrymander</label>
                                <br/>
                            `)
                        }
                    </fieldset>
                </details>
            </section>
        `;
    }

    _updateMapper(e: Event) {
        console.log('update Mapper', e.target.value);
        const field = e.target.name || e.target.id;
        const value = e.target.value === 'null' ? null : e.target.value;
        this._mapper[field] = value;
    }

    _updateMapperVoteShare(e: Event) {
        this._mapper.setVoteShare(e.target.id, e.target.value);
    }

    _updateUI(e: Event) {
        console.log('update UI', e);
    }

    constructor() {
        super();
        this._mapper = new DistrictMapper(this);
    }
}