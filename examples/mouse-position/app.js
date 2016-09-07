(function () {
'use strict';

function uncurry           (f                   )                    {
  return function (ref) {
    var a = ref[0];
    var b = ref[1];

    return f(a, b);
  }
}

//      
// An Event is either a value or NoEvent, indicating that
// the Event did not occur
// type Event a = a | NoEvent

// A Reactive transformation turns as into bs, and may carry
// state or evolve over time
// type Reactive t a b = { step :: t -> a -> Step t a b }

// A Step is the result of applying a Reactive transformation
// to an a to get a b and a new Reactive transformation
// type Step t a b = { value :: b, next :: Reactive t a b }

// step :: b -> Reactive t a b -> Step t a b
// Simple helper to construct a Step
var step = function (value, next) { return ({ value: value, next: next }); }

// lift :: (a -> b) -> Reactive t a b
// Lift a function into a Reactive transform
function lift        (f             )                  {
  return new Lift(f)
}

// unsplit :: (a -> b -> c) -> Reactive t [a, b] c
function unsplit           (f                   )                       {
  return lift(uncurry(f))
}

var Lift = function Lift (f           ) {
  this.f = f
};

Lift.prototype.step = function step$1 (t    , a )                   {
  return step(this.f(a), this)
};

// pipe :: (Reactive t a b ... Reactive t y z) -> Reactive t a z
// Compose many Reactive transformations, left to right
var pipe = function (ab) {
  var rest = [], len = arguments.length - 1;
  while ( len-- > 0 ) rest[ len ] = arguments[ len + 1 ];

  return rest.reduce(pipe2, ab);
}

// pipe2 :: Reactive t a b -> Reactive t b c -> Reactive t a c
// Compose 2 Reactive transformations left to right
var pipe2 = function (ab, bc) { return new Pipe(ab, bc); }

var Pipe = function Pipe (ab, bc) {
  this.ab = ab
  this.bc = bc
};

Pipe.prototype.step = function step$4 (t, a) {
  var ref = this.ab.step(t, a);
    var b = ref.value;
    var ab = ref.next;
  var ref$1 = this.bc.step(t, b);
    var c = ref$1.value;
    var bc = ref$1.next;
  return step(c, pipe(ab, bc))
};

// both :: Reactive t a b -> Reactive t c d -> Reactive [a, b] [c, d]
// Given an [a, c] input, pass a through Reactive transformation ab and
// c through Reactive transformation cd to yield [b, d]
var both = function (ab, cd) { return new Both(ab, cd); }

var Both = function Both (ab, cd) {
  this.ab = ab
  this.cd = cd
};

Both.prototype.step = function step$5 (t, ref) {
    var a = ref[0];
    var c = ref[1];

  var ref$1 = this.ab.step(t, a);
    var b = ref$1.value;
    var anext = ref$1.next;
  var ref$2 = this.cd.step(t, c);
    var d = ref$2.value;
    var cnext = ref$2.next;
  return step([b, d], both(anext, cnext))
};

//      
                                                               
// An event, which has a value when it occurs, and
// has no value when it doesn't occur
                             

// Event non-occurrence
var NoEvent = undefined

// Turn Events of A instead Events of B
function map        (f             )                        {
  return function (a) { return a === undefined ? a : f(a); }
}

// Transform event values
function mapE        (f             )                            {
  return lift(map(f))
}

// Turn an event into a stepped continuous value
function hold     (initial   )                       {
  return new Hold(initial)
}

var Hold = function Hold (value ) {
  this.value = value
};

Hold.prototype.step = function step (t    , a )                        {
  if(a === undefined) {
    return { value: this.value, next: this }
  }
  return { value: a, next: hold(a) }
};

//      
                                  
// Dispose an Input
                                    

// Handle input events
                                          

// An Input allows events to be pushed into the system
// It's basically any unary higher order function
                                                                

                                     



// Turn a pair of inputs into an input of pairs
function both$1       (input1          , input2          )                          {
  return function (f) {
    var dispose1 = input1(function (a1) { return f([a1, NoEvent]); })
    var dispose2 = input2(function (a2) { return f([NoEvent, a2]); })
    return function () { return [dispose1(), dispose2()]; }
  }
}

//      
                                                  
                                  
                                        

                                 
                                             
 

                                     
           
                         
 

function run           (
  r                        ,
  input          ,
  session            ,
  handleOutput               
)               {
  return input(function (a) {
    var ref = session.step();
    var sample = ref.sample;
    var nextSession = ref.nextSession;
    session = nextSession

    var ref$1 = r.step(sample, a);
    var value = ref$1.value;
    var next = ref$1.next;
    r = next

    return handleOutput(value)
  })
}

//      

// A session provides a sample of state that will be fed into
// the system when events occur
                          
                            
 

                                                                   

var sessionStep = function (sample, nextSession) { return ({ sample: sample, nextSession: nextSession }); }

// Session that yields a time delta from its start time at each step
var clockSession = function ()                  { return new ClockSession(Date.now()); }

var ClockSession = function ClockSession (start      ) {
  this.start = start
  this.time = Infinity
};

ClockSession.prototype.step = function step ()                    {
  var t = Date.now()
  if (t < this.time) {
    this.time = t - this.start
  }
  return sessionStep(this.time, new ClockSession(this.start))
};

//      
                                    
/* global EventTarget, Event */

                                                                            

var domInput           = function (name) { return function (node) { return function (f) {
  node.addEventListener(name, f, false)
  return function () { return node.removeEventListener(name, f, false); }
}; }; }

var mousemove = domInput('mousemove')
var keydown = domInput('keydown')

//      
var join = function (sep) { return function (a, b) { return a + sep + b; }; }
var render = function (s) { return document.body.innerHTML = s; }

var coords = pipe(mapE(function (e) { return ((e.clientX) + "," + (e.clientY)); }), hold('-,-'))
var keyCode = pipe(mapE(function (e) { return e.keyCode; }), hold('-'))

var s = pipe(both(coords, keyCode), unsplit(join(':')))
var inputs = both$1(mousemove(document), keydown(document))

run(s, inputs, clockSession(), render)

}());