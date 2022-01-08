import {html, css, LitElement, nothing, ReactiveController, ReactiveControllerHost} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { TOTAL } from './Precinct.js';
import { DistrictMapper } from './DistrictMapper.js';
import './district-map.js';
import { generateProportionalSharesGradient } from './ui-utils.js';

type TooltipperConfig = {
    delay: number,
    gap: number,
    tooltipClass: string
}

const TooltipperDefaults: TooltipperConfig = {
    delay: 2000,
    gap: 4,
    tooltipClass: 'tooltip'
}

class Tooltipper implements ReactiveController {
    tooltip?: HTMLElement
    _tooltip: HTMLElement
    _host: ReactiveControllerHost
    _delay: number
    _gap: number
    _activeRangeInput?: HTMLInputElement
    _timer?: NodeJS.Timeout

    constructor(host: ReactiveControllerHost & HTMLElement, { delay, gap, tooltipClass }=TooltipperDefaults) {
        this._host = host;
        host.addController(this);
        this._delay = delay;
        this._gap = gap;
        this._tooltip = document.createElement('div');
        this._tooltip.style.position = 'fixed';
        this._tooltip.classList.add(tooltipClass);
        this._handleEvent = this._handleEvent.bind(this);
        this._handleTimeout = this._handleTimeout.bind(this);
        host.addEventListener('mousedown', this._handleEvent);
        host.addEventListener('input', this._handleEvent);
    }

    _handleEvent(evt: Event) {
        const target = evt.composedPath()[0] as HTMLInputElement;
        if (target.localName === 'input' && target.type === 'range') {
            this._activeRangeInput = target;
            this._tooltip.textContent = target.value;
            this.tooltip = this._tooltip;
            this._host.requestUpdate();
            clearTimeout(this._timer!);
            this._timer = setTimeout(this._handleTimeout, this._delay);
        }
    }

    _handleTimeout() {
        this._activeRangeInput = undefined;
        this.tooltip = undefined;
        this._host.requestUpdate();
    }

    hostUpdated() {
        const { tooltip } = this;
        if (tooltip) {
            const input = this._activeRangeInput!;
            const { min, max, value } = input;
            const ratio = (Number(value) - Number(min)) / (Number(max) - Number(min));
            const { top, left, width, height: thumbSize } = input.getBoundingClientRect();
            const { width: tooltipWidth, height: tooltipHeight } = tooltip.getBoundingClientRect();
            tooltip.style.top = `${top - this._gap - tooltipHeight}px`;
            const thumbAdjustmentFactor = 0.5 - ratio;
            const hOffset = (0.5 * tooltipWidth) - (thumbAdjustmentFactor * thumbSize);
            tooltip.style.left = `${left + (ratio * width) - hOffset}px`;
        }
    }

}

@customElement('district-mapper')
export class DistrictMapperElement extends LitElement {
    _mapper: DistrictMapper
    _tooltipper: Tooltipper

    static styles = css`
        :host {
            --precinct-size: 4rem;
            --party-color-r: red;
            --party-color-d: blue;
            --party-color-a: green;
            --party-color-b: purple;
            --party-color-c: yellow;

            display: flex;
            flex-direction: row;
            font-family: sans-serif;

            /* TODO: properly scope variables */
            --detail-size: 0.25rem;
            --default-shadow: var(--detail-size) var(--detail-size) calc(var(--detail-size) * 2) 0px rgba(12, 12, 12, 0.5);
        }
        #map, #results, #controls {
            padding: 1rem;
        }
        #main {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            background: #EEE;
        }
        #map {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-grow: 1;
        }
        #results {
            color: #888;
            flex-shrink: 0;
        }
        #results-display {
            max-width: calc(100vw - 30rem);
            flex-grow: 1;
            margin: 0 auto;
        }
        #seats {
            display: flex;
            justify-content: space-between;
        }
        #seats > *:first-child {
            margin-left: 0;
        }
        #seats > *:last-child {
            margin-right: 0;
        }
        #seats > * {
            width: 2em;
            height: 1em;
            flex-grow: 1;
            flex-shrink: 1;
            margin: 1em 0.2em;
            box-shadow: var(--default-shadow);
            /* border: var(--detail-size) solid #666; */
            border-radius: 1em;
        }
        #vote-shares {
            box-shadow: var(--default-shadow);
        }
        #vote-share-labels {
            margin: 0.5em;
            position: relative;
            display: flex;
            white-space: nowrap;
        }
        #vote-share-labels > * {
            margin: 0 0.25em;
            flex-grow: 1;
            font-size: 0.9em;
        }
        #results summary {
            margin-bottom: 0.5em;
        }
        district-map {
            box-shadow: var(--default-shadow);
        }
        #controls {
            width: 20rem;
            flex-shrink: 0;
        }
        details, fieldset {
            margin: 0 0.25em 1em 0.25em;
        }
        fieldset {
            margin-top: 1em;
            text-align: left;
            padding: 0 0.75em 1em 0.75em;
            color: #777;
            font-size: 0.8em;
            border: 1px solid #AAA;
        }
        legend {
            text-align: right;
            font-weight: bold;
            padding: 0 0.5em;
            text-transform: uppercase;
        }
        label {
            margin-left: 0.4em;
        }
        input[type=range] {
            display: block;
            width: 100%;
            margin-top: 1em;
            margin-bottom: 0.5em;
        }
        .tooltip {
            padding: 0.5em;
            background: #555;
            border-radius: 0.25em;
            color: white;
            box-shadow: var(--detail-size) var(--detail-size) calc(var(--detail-size) * 2) 0px rgba(12, 12, 12, 0.5);
        }
    `

    render() {
        const { x, y, minPrecinctPopulation, maxPrecinctPopulation, seats, allocation, allocationOptions, favoredParty } = this._mapper;
        const partyVoteShares = this._mapper.getVoteShares();
        const results = this._mapper.map!.electionResults;
        const totalVotes = results.votes.get(TOTAL);
        const totalSeats = results.seats.get(TOTAL);
        const votes = Array.from(results.votes.entries())
            .filter(entry => entry[0] !== TOTAL);
        // console.log('votes', JSON.stringify(votes));
        const voteShares: [string, number][] = votes
            .slice()
            .sort((a, b) => a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0)
            .map(entry => [entry[0], entry[1] / totalVotes!]);
        // console.log('shares', JSON.stringify(generateProportionalSharesGradient(voteShares)));
        const seatsAwarded = voteShares
            .map(entry => [entry[0], results.seats.get(entry[0])])
            .flatMap(entry => new Array(entry[1]).fill(entry[0]));
        // console.log('seats', JSON.stringify(seatsAwarded));
        const partiesWithVotes = votes
            .slice()
            .sort((a, b) => a[0] > b[0] ? -1 : a[0] < b[0] ? 1 : 0)
            .map(entry => entry[0]);
        return html`
            <section id="main">
                <div id="results">
                    <details>
                        <summary>Results</summary>
                        <div id="results-display">
                            <div id="seats">
                                ${seatsAwarded.map(s => html`
                                    <div style=${styleMap({
                                        background: `var(--party-color-${(s as string).toLowerCase()})`
                                    })}></div>
                                `)}
                            </div>
                            <div id="vote-shares" style=${styleMap({
                                height: '1em',
                                background: `linear-gradient(90deg, ${generateProportionalSharesGradient(voteShares, 'party-color')})`
                            })}></div>
                            <div id="vote-share-labels">
                                ${voteShares.map(p => {
                                    const pct = `${Math.round(p[1] * 1000) / 10}%`;
                                    return html`
                                    <span style=${styleMap({
                                        flexBasis: pct
                                    })}>${p[0]}: ${pct}</span>
                                `})}
                            </div>
                        </div>
                    </details>
                </div>
                <section id="map">
                    <district-map .map=${this._mapper.map}></district-map>
                </section>
            </section>
            <section id="controls" @change=${this._updateMapper}>
                ${this._tooltipper.tooltip}
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
                                <input id=${party} type="range" min="0" max="10" step="0.1" .value=${share} />
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
        const field = e.target.name || e.target.id;
        const value = e.target.value === 'null' ? null : e.target.value;
        this._mapper[field] = value;
    }

    _updateMapperVoteShare(e: Event) {
        this._mapper.setVoteShare(e.target.id, e.target.value);
    }

    constructor() {
        super();
        this._mapper = new DistrictMapper(this);
        this._tooltipper = new Tooltipper(this);
    }
}