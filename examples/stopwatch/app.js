(function () {
'use strict';

//      

// Turn a single value into a pair
function dup     (a   )         {
  return pair(a, a)
}

function pair        (a   , b   )         {
  return [a, b]
}

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

var time                       =
  { step: function (value, _) { return ({ value: value, next: time }); } }

// lift :: (a -> b) -> Reactive t a b
// Lift a function into a Reactive transform
function lift        (f             )                  {
  return new Lift(f)
}

// unsplit :: (a -> b -> c) -> Reactive t [a, b] c
function unsplit           (f                   )                       {
  return lift(uncurry(f))
}

function identity     (a   )    {
  return a
}

var Lift = function Lift (f           ) {
  this.f = f
};

Lift.prototype.step = function step$1 (t    , a )                   {
  return step(this.f(a), this)
};

// id :: Reactive t a a
// Reactive transformation that yields its input at each step
// TODO: Give this its own type so it can be composed efficiently
function id     ()                  {
  return lift(identity)
}

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

var lmap = function (fab, bc) { return pipe2(lift(fab), bc); }
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

// split :: Reactive t a b -> Reactive t a c -> Reactive t [b, c]
// Duplicates input a and pass it through Reactive transformations
// ab and ac to yield [b, c]
var split = function (ab, ac) { return lmap(dup, both(ab, ac)); }

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
                             

                                             

// Non-occurrence
var NoEvent = undefined

// Turn Events of A instead Events of B
function map        (f             )                        {
  return function (a) { return a === undefined ? a : f(a); }
}

// Return the Event that occurred, preferring a1 if both occurred
function mergeE     (a1        , a2        )         {
  return a1 === undefined ? a2 : a1
}

function liftE        (ab                 )                            {
  return new LiftE(ab)
}

var LiftE = function LiftE (ab) {
  this.ab = ab
};

LiftE.prototype.step = function step (t    , a      )                             {
  if(a === undefined) {
    return { value: NoEvent, next: this }
  }
  var ref = this.ab.step(t, a);
    var value = ref.value;
    var next = ref.next;
  return { value: value, next: liftE(next) }
};

var eventTime                                 = {
  step: function step (t      , a     )                                    {
    return { value: a === undefined ? NoEvent : t, next: this }
  }
}

function mapE        (f             )                            {
  return lift(map(f))
}

// Merge events, preferring the left in the case of
// simultaneous occurrence
function merge     ()                                      {
  return unsplit(mergeE)
}

function or        (left              , right              )               {
  return liftE(pipe(both(left, right), merge()))
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

// Accumulate Event carrying update functions
function accumE     (initial   )                                      {
  return scanE(function (b, f) { return f(b); }, initial)
}

function accum     (initial   )                                 {
  return pipe(accumE(initial), hold(initial))
}

// Accumulate event values
function scanE        (f                   , initial   )                            {
  return new Accum(f, initial)
}

function scan        (f                   , initial   )                       {
  return pipe(scanE(f, initial), hold(initial))
}

var Accum = function Accum(f                 , value ) {
  this.f = f
  this.value = value
};

Accum.prototype.step = function step (t    , a )                        {
  if(a === undefined) {
    return { value: NoEvent, next: this }
  }
  var f = this.f
  var value = f(this.value, a)
  return { value: value, next: new Accum(f, value) }
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

var never             = function () { return noop; }
var noop = function () {}

function newInput     ()                       {
  var _occur
  var occur = function (x) {
    if(typeof _occur === 'function') {
      _occur(x)
    }
  }

  var input = function (f) {
    _occur = f
    return function () {
      _occur = undefined
    }
  }

  return [occur, input]
}

                                                         
                                             

function schedule        (cancel                   , schedule                     )           {
  return function (f) {
    var current
    var onNext = function (x) {
      current = schedule(onNext)
      f(x)
    }
    current = schedule(onNext)
    return function () { return cancel(current); }
  }
}

function loop           (
  r                        ,
  input          ,
  session            ,
  handleOutput                   
)               {
  var dispose = input(function (a) {
    var ref = session.step();
    var sample = ref.sample;
    var nextSession = ref.nextSession;
    session = nextSession

    var ref$1 = r.step(sample, a);
    var value = ref$1.value;
    var next = ref$1.next;
    r = next

    var nextInput = handleOutput(value)
    if(nextInput != null && nextInput !== input) {
      dispose()
      dispose = loop(next, nextInput, nextSession, handleOutput)
    }
  })
  return function () { return dispose(); }
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
                                    
var animationFrames = schedule(cancelAnimationFrame, requestAnimationFrame)

function interopDefault(ex) {
	return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var vnode = createCommonjsModule(function (module) {
module.exports = function(sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
};
});

var vnode$1 = interopDefault(vnode);


var require$$1 = Object.freeze({
  default: vnode$1
});

var is = createCommonjsModule(function (module) {
module.exports = {
  array: Array.isArray,
  primitive: function(s) { return typeof s === 'string' || typeof s === 'number'; },
};
});

var is$1 = interopDefault(is);
var array = is.array;
var primitive = is.primitive;

var require$$0 = Object.freeze({
  default: is$1,
  array: array,
  primitive: primitive
});

var htmldomapi = createCommonjsModule(function (module) {
function createElement(tagName){
  return document.createElement(tagName);
}

function createElementNS(namespaceURI, qualifiedName){
  return document.createElementNS(namespaceURI, qualifiedName);
}

function createTextNode(text){
  return document.createTextNode(text);
}


function insertBefore(parentNode, newNode, referenceNode){
  parentNode.insertBefore(newNode, referenceNode);
}


function removeChild(node, child){
  node.removeChild(child);
}

function appendChild(node, child){
  node.appendChild(child);
}

function parentNode(node){
  return node.parentElement;
}

function nextSibling(node){
  return node.nextSibling;
}

function tagName(node){
  return node.tagName;
}

function setTextContent(node, text){
  node.textContent = text;
}

module.exports = {
  createElement: createElement,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  appendChild: appendChild,
  removeChild: removeChild,
  insertBefore: insertBefore,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent
};
});

var htmldomapi$1 = interopDefault(htmldomapi);
var createElement = htmldomapi.createElement;
var createElementNS = htmldomapi.createElementNS;
var createTextNode = htmldomapi.createTextNode;
var appendChild = htmldomapi.appendChild;
var removeChild = htmldomapi.removeChild;
var insertBefore = htmldomapi.insertBefore;
var parentNode = htmldomapi.parentNode;
var nextSibling = htmldomapi.nextSibling;
var tagName = htmldomapi.tagName;
var setTextContent = htmldomapi.setTextContent;

var require$$0$1 = Object.freeze({
  default: htmldomapi$1,
  createElement: createElement,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  appendChild: appendChild,
  removeChild: removeChild,
  insertBefore: insertBefore,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent
});

var snabbdom = createCommonjsModule(function (module) {
// jshint newcap: false
/* global require, module, document, Node */
'use strict';

var VNode = interopDefault(require$$1);
var is = interopDefault(require$$0);
var domApi = interopDefault(require$$0$1);

function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }

var emptyNode = VNode('', {}, [], undefined, undefined);

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i, map = {}, key;
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

function init(modules, api) {
  var i, j, cbs = {};

  if (isUndef(api)) api = domApi;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
    }
  }

  function emptyNodeAt(elm) {
    return VNode(api.tagName(elm).toLowerCase(), {}, [], undefined, elm);
  }

  function createRmCb(childElm, listeners) {
    return function() {
      if (--listeners === 0) {
        var parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode, insertedVnodeQueue) {
    var i, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode);
        data = vnode.data;
      }
    }
    var elm, children = vnode.children, sel = vnode.sel;
    if (isDef(sel)) {
      // Parse selector
      var hashIdx = sel.indexOf('#');
      var dotIdx = sel.indexOf('.', hashIdx);
      var hash = hashIdx > 0 ? hashIdx : sel.length;
      var dot = dotIdx > 0 ? dotIdx : sel.length;
      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                                                          : api.createElement(tag);
      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
      if (dotIdx > 0) elm.className = sel.slice(dot + 1).replace(/\./g, ' ');
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          api.appendChild(elm, createElm(children[i], insertedVnodeQueue));
        }
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
      i = vnode.data.hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      elm = vnode.elm = api.createTextNode(vnode.text);
    }
    return vnode.elm;
  }

  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before);
    }
  }

  function invokeDestroyHook(vnode) {
    var i, j, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (isDef(i = vnode.children)) {
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j]);
        }
      }
    }
  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var i, listeners, rm, ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }

  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    var oldStartIdx = 0, newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, elmToMove, before;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldCh[idxInOld] = undefined;
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx+1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
    var i, hook;
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode);
    }
    var elm = vnode.elm = oldVnode.elm, oldCh = oldVnode.children, ch = vnode.children;
    if (oldVnode === vnode) return;
    if (!sameVnode(oldVnode, vnode)) {
      var parentElm = api.parentNode(oldVnode.elm);
      elm = createElm(vnode, insertedVnodeQueue);
      api.insertBefore(parentElm, elm, oldVnode.elm);
      removeVnodes(parentElm, [oldVnode], 0, 0);
      return;
    }
    if (isDef(vnode.data)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      api.setTextContent(elm, vnode.text);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }

  return function(oldVnode, vnode) {
    var i, elm, parent;
    var insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    if (isUndef(oldVnode.sel)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);

      createElm(vnode, insertedVnodeQueue);

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
}

module.exports = {init: init};
});

var snabbdom$1 = interopDefault(snabbdom);

var eventlisteners = createCommonjsModule(function (module) {
var is = interopDefault(require$$0);

function arrInvoker(arr) {
  return function() {
    if (!arr.length) return;
    // Special case when length is two, for performance
    arr.length === 2 ? arr[0](arr[1]) : arr[0].apply(undefined, arr.slice(1));
  };
}

function fnInvoker(o) {
  return function(ev) { 
    if (o.fn === null) return;
    o.fn(ev); 
  };
}

function updateEventListeners(oldVnode, vnode) {
  var name, cur, old, elm = vnode.elm,
      oldOn = oldVnode.data.on, on = vnode.data.on;

  if (!on && !oldOn) return;
  on = on || {};
  oldOn = oldOn || {};

  for (name in on) {
    cur = on[name];
    old = oldOn[name];
    if (old === undefined) {
      if (is.array(cur)) {
        elm.addEventListener(name, arrInvoker(cur));
      } else {
        cur = {fn: cur};
        on[name] = cur;
        elm.addEventListener(name, fnInvoker(cur));
      }
    } else if (is.array(old)) {
      // Deliberately modify old array since it's captured in closure created with `arrInvoker`
      old.length = cur.length;
      for (var i = 0; i < old.length; ++i) old[i] = cur[i];
      on[name]  = old;
    } else {
      old.fn = cur;
      on[name] = old;
    }
  }
  if (oldOn) {
    for (name in oldOn) {
      if (on[name] === undefined) {
        var old = oldOn[name];
        if (is.array(old)) {
          old.length = 0;
        }
        else {
          old.fn = null;
        }
      }
    }
  }
}

module.exports = {create: updateEventListeners, update: updateEventListeners};
});

var events = interopDefault(eventlisteners);

var _class = createCommonjsModule(function (module) {
function updateClass(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldClass = oldVnode.data.class,
      klass = vnode.data.class;

  if (!oldClass && !klass) return;
  oldClass = oldClass || {};
  klass = klass || {};

  for (name in oldClass) {
    if (!klass[name]) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? 'add' : 'remove'](name);
    }
  }
}

module.exports = {create: updateClass, update: updateClass};
});

var clss = interopDefault(_class);

var h = createCommonjsModule(function (module) {
var VNode = interopDefault(require$$1);
var is = interopDefault(require$$0);

function addNS(data, children, sel) {
  data.ns = 'http://www.w3.org/2000/svg';

  if (sel !== 'foreignObject' && children !== undefined) {
    for (var i = 0; i < children.length; ++i) {
      addNS(children[i].data, children[i].children, children[i].sel);
    }
  }
}

module.exports = function h(sel, b, c) {
  var data = {}, children, text, i;
  if (c !== undefined) {
    data = b;
    if (is.array(c)) { children = c; }
    else if (is.primitive(c)) { text = c; }
  } else if (b !== undefined) {
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else { data = b; }
  }
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children, sel);
  }
  return VNode(sel, data, children, text, undefined);
};
});

var h$1 = interopDefault(h);

var log = lift(function (x) { return (console.log(x), x); })
var anyInput = function () {
  var inputs = [], len = arguments.length;
  while ( len-- ) inputs[ len ] = arguments[ len ];

  return inputs.reduce(both$1);
}
var anySignal = function () {
  var signals = [], len = arguments.length;
  while ( len-- ) signals[ len ] = arguments[ len ];

  return signals.reduce(or);
}

var container = document.getElementById('app')
var patch = snabbdom$1.init([events, clss])

var ref = newInput();
var start = ref[0];
var startInput = ref[1];
var ref$1 = newInput();
var stop = ref$1[0];
var stopInput = ref$1[1];
var ref$2 = newInput();
var reset = ref$2[0];
var resetInput = ref$2[1];

var render = function (timer, time) { return h$1('div.timer', { class: { running: timer.running } }, [
    h$1('span', ("" + (formatElapsed(timerElapsed(time, timer))))),
    h$1('button.start', { on: { click: start } }, 'Start'),
    h$1('button.stop', { on: { click: stop } }, 'Stop'),
    h$1('button.reset', { on: { click: reset } }, 'Reset')
  ]); }

var formatElapsed = function (ms) { return ((mins(ms)) + ":" + (secs(ms)) + ":" + (hundredths(ms))); }

var mins = function (ms) { return pad((ms / (1000 * 60)) % 60); }
var secs = function (ms) { return pad((ms / 1000) % 60); }
var hundredths = function (ms) { return pad((ms / 10) % 100); }
var pad = function (n) { return n < 10 ? ("0" + (Math.floor(n))) : ("" + (Math.floor(n))); }

var timerElapsed = function (time, ref) {
  var running = ref.running;
  var origin = ref.origin;
  var total = ref.total;

  return running ? (total + time - origin) : total;
}
var timerStart = function (time) { return function (ref) {
  var total = ref.total;

  return ({ running: true, origin: time, total: total });
; }  }
var timerStop = function (time) { return function (ref) {
  var origin = ref.origin;
  var total = ref.total;

  return ({ running: false, origin: origin, total: total + (time - origin) });
; }  }
var timerReset = function (time) { return function (ref) {
  var running = ref.running;

  return ({ running: running, origin: time, total: 0 });
; }  }
var timerZero = function () { return ({ running: false, origin: 0, total: 0 }); }

var doStart = pipe(eventTime, mapE(timerStart))
var doStop = pipe(eventTime, mapE(timerStop))
var doReset = pipe(eventTime, mapE(timerReset))

var timer = pipe(anySignal(doStart, doStop, doReset), accum(timerZero()))

var runTimer = both(timer, time)
var tap = function (ab) { return pipe(split(id(), ab), merge()); }
var displayTimer = tap(pipe(unsplit(render), scan(patch, patch(container, render(timerZero(), 0)))));

var update = pipe(runTimer, displayTimer)

loop(update, anyInput(startInput, stopInput, resetInput, never), clockSession(), function (ref) {
  var running = ref[0].running;

  return anyInput(startInput, stopInput, resetInput, running ? animationFrames : never)
})

}());