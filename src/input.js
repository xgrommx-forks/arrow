// @flow

// An event, which has a value when it occurs, and
// has no value when it doesn't occur
export type Evt<A> = ?A

// Non-occurrence
export const NoEvent = undefined

// Dispose an Input
export type DisposeInput = () => any

// Handle input events
export type HandleInput<A> = (a: Evt<A>) => any

// An Input allows events to be pushed into the system
// It's basically any unary higher order function
export type Input<A> = (handler: HandleInput<A>) => DisposeInput

// Turn a pair of inputs into an input of pairs
export function both<A, B> (input1: Input<A>, input2: Input<B>): Input<[Evt<A>, Evt<B>]> {
  return (f) => {
    const dispose1 = input1(a1 => f([a1, NoEvent]))
    const dispose2 = input2(a2 => f([NoEvent, a2]))
    return () => [dispose1(), dispose2()]
  }
}
