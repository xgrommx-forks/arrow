// @flow
import type { SignalFunc } from './signal'
import type { Input } from './input'
import { first } from './signal'
import { scan } from './event'

export { default as events } from 'snabbdom/modules/eventlisteners'
export { default as attrs } from 'snabbdom/modules/attributes'
export { default as clss } from 'snabbdom/modules/class'

import sh from 'snabbdom/h'
import hh from 'hyperscript-helpers'

export { init } from 'snabbdom'

export const html = hh(sh)

export type PatchVTree<VTree> = (orig: VTree, updated: VTree) => VTree

export function vdomPatch <T, A, VTree> (patch: PatchVTree<VTree>, init: VTree): SignalFunc<T, [VTree, Input<A>], [VTree, Input<A>]> {
  return first(scan(patch, init))
}
