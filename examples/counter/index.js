// @flow
import { or, as, lift, bothI, newInput, scan, clockSession, loop } from '../../src/index'
import { vdomUpdate } from '../../src/vdom'
import { h, init, events } from '../vdom'
const { div, p, button } = h

'use fc'

const container = document.getElementById('app')
const patch = init([events])

const [inc, incInput] = newInput()
const [dec, decInput] = newInput()

const render = value =>
  [div('#app', [
    p(value),
    button({ on: { click: dec } }, '-'),
    button({ on: { click: inc } }, '+')
  ]), bothI(incInput, decInput)]

const add = (a, b) => a + b
const counter = or(as(1), as(-1)) >> scan(add, 0)

const [vtree, inputs] = render(0)
const showCounter = vdomUpdate(patch, patch(container, vtree));
const runCounter = counter >> lift(render) >> showCounter

loop(clockSession(), inputs, runCounter)
