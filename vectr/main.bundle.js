(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
    components: require('famous-components'),
    core: require('famous-core'),
    engine: require('famous-engine'),
    domRenderables: require('famous-dom-renderables'),
    math: require('famous-math'),
    physics: require('famous-physics'),
    renderers: require('famous-renderers'),
    stylesheets: require('famous-stylesheets'),
    router: require('famous-router'),
    transitions: require('famous-transitions'),
    utilities: require('famous-utilities'),
    webglRenderables: require('famous-webgl-renderables'),
    webglGeometries: require('famous-webgl-geometries'),
    webglMaterials: require('famous-webgl-materials'),
    webglShaders: require('famous-webgl-shaders'),
    polyfills: require('famous-polyfills')
};

},{"famous-components":49,"famous-core":58,"famous-dom-renderables":77,"famous-engine":80,"famous-math":85,"famous-physics":134,"famous-polyfills":136,"famous-renderers":287,"famous-router":290,"famous-stylesheets":293,"famous-transitions":296,"famous-utilities":307,"famous-webgl-geometries":336,"famous-webgl-materials":350,"famous-webgl-renderables":389,"famous-webgl-shaders":395}],2:[function(require,module,exports){
'use strict';

/**
 * Equivalent of an Engine in the Worker Thread. Used to synchronize and manage
 * time across different Threads.
 *
 * @class  Clock
 * @constructor
 * @private
 */
function Clock () {
    this._time = 0;
    this._frame = 0;
    this._timerQueue = [];
    this._updatingIndex = 0;
}

/**
 * Updates the internal clock time.
 *
 * @method  step
 * @chainable
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 * @return {Clock}       this
 */
Clock.prototype.step = function step (time) {
    this._frame++;
    this._time = time;
    for (var i = 0; i < this._timerQueue.length; i++) {
        if (this._timerQueue[i](this._time)) {
            this._timerQueue.splice(i, 1);
        }
    }
    return this;
};

/**
 * Returns the internal clock time.
 *
 * @method  getTime
 * @deprecated Use #now instead
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 */
Clock.prototype.getTime = function getTime() {
    return this._time;
};

/**
 * Returns the internal clock time.
 *
 * @method  now
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 */
Clock.prototype.now = function now () {
    return this._time;
};

/**
 * Returns the number of frames elapsed so far.
 *
 * @method getFrame
 * 
 * @return {Number} frames
 */
Clock.prototype.getFrame = function getFrame () {
    return this._frame;
};

/**
 * Wraps a function to be invoked after a certain amount of time.
 * After a set duration has passed, it executes the function and
 * removes it as a listener to 'prerender'.
 *
 * @method setTimeout
 *
 * @param {Function} callback function to be run after a specified duration
 * @param {Number} delay milliseconds from now to execute the function
 *
 * @return {Function} timer function used for Clock#clearTimer
 */
Clock.prototype.setTimeout = function (callback, delay) {
    var params = Array.prototype.slice.call(arguments, 2);
    var startedAt = this._time;
    var timer = function(time) {
        if (time - startedAt >= delay) {
            callback.apply(null, params);
            return true;
        }
        return false;
    };
    this._timerQueue.push(timer);
    return timer;
};


/**
 * Wraps a function to be invoked after a certain amount of time.
 *  After a set duration has passed, it executes the function and
 *  resets the execution time.
 *
 * @method setInterval
 *
 * @param {Function} callback function to be run after a specified duration
 * @param {Number} duration interval to execute function in milliseconds
 *
 * @return {Function} timer function used for Clock#clearTimer
 */
Clock.prototype.setInterval = function setInterval(callback, delay) {
    var params = Array.prototype.slice.call(arguments, 2);
    var startedAt = this._time;
    var timer = function(time) {
        if (time - startedAt >= delay) {
            callback.apply(null, params);
            startedAt = time;
        }
        return false;
    };
    this._timerQueue.push(timer);
    return timer;
};

/**
 * Removes previously via `Clock#setTimeout` or `Clock#setInterval`
 * registered callback function
 *
 * @method clearTimer
 * @chainable
 * 
 * @param  {Function} callback  previously by `Clock#setTimeout` or
 *                              `Clock#setInterval` returned callback function
 * @return {Clock}              this
 */
Clock.prototype.clearTimer = function (timer) {
    var index = this._timerQueue.indexOf(timer);
    if (index !== -1) {
        this._timerQueue.splice(index, 1);
    }
    return this;
};

module.exports = Clock;


},{}],3:[function(require,module,exports){
'use strict';

var Dispatch = require('./Dispatch');
var Node = require('./Node');
var Size = require('./Size');

/**
 * Context is the bottom of the scene graph. It is it's own
 * parent and provides the global updater to the scene graph.
 *
 * @class Context
 * @constructor
 *
 * @param {String} selector a string which is a dom selector
 *                 signifying which dom element the context
 *                 should be set upon
 * @param {Famous} a class which conforms to Famous' interface
 *                 it needs to be able to send methods to
 *                 the renderers and update nodes in the scene graph
 */
function Context (selector, updater) {
    if (!selector) throw new Error('Context needs to be created with a DOM selector');
    if (!updater) throw new Error('Context needs to be created with a class like Famous');

    Node.call(this);         // Context inherits from node

    this._updater = updater; // The updater that will both
                             // send messages to the renderers
                             // and update dirty nodes 

    this._dispatch = new Dispatch(this); // instantiates a dispatcher
                                         // to send events to the scene
                                         // graph below this context
    
    this._selector = selector; // reference to the DOM selector
                               // that represents the elemnent
                               // in the dom that this context
                               // inhabits

    this.onMount(this, selector); // Mount the context to itself
                                  // (it is its own parent)
    
    this._updater                  // message a request for the dom
        .message('NEED_SIZE_FOR')  // size of the context so that
        .message(selector);        // the scene graph has a total size

    this.show(); // the context begins shown (it's already present in the dom)

}

// Context inherits from node
Context.prototype = Object.create(Node.prototype);
Context.prototype.constructor = Context;

/**
 * Context getUpdater function returns the passed in updater
 *
 * @return {Famous} the updater for this Context
 */
Context.prototype.getUpdater = function getUpdater () {
    return this._updater;
};

/**
 * Returns the selector that the context was instantiated with
 *
 * @return {String} dom selector
 */
Context.prototype.getSelector = function getSelector () {
    return this._selector;
};

/**
 * Returns the dispatcher of the context. Used to send events
 * to the nodes in the scene graph.
 *
 * @return {Dispatch} the Context's Dispatch
 */
Context.prototype.getDispatch = function getDispatch () {
    return this._dispatch;
};

/**
 * Receives an event. If the event is 'CONTEXT_RESIZE' it sets the size of the scene
 * graph to the payload, which must be an array of numbers of at least
 * length three representing the pixel size in 3 dimensions.
 *
 * @param {String} event
 * @param {*} payload
 */
Context.prototype.onReceive = function onReceive (event, payload) {
    // TODO: In the future the dom element that the context is attached to
    // should have a representation as a component. It would be render sized
    // and the context would receive its size the same way that any render size
    // component receives its size.
    if (event === 'CONTEXT_RESIZE') {
        
        if (payload.length < 2) 
            throw new Error(
                    'CONTEXT_RESIZE\'s payload needs to be at least a pair' +
                    ' of pixel sizes'
            );

        this.setSizeMode(Size.ABSOLUTE, Size.ABSOLUTE, Size.ABSOLUTE);
        this.setAbsoluteSize(payload[0],
                             payload[1],
                             payload[2] ? payload[2] : 0);

    }
};

module.exports = Context;


},{"./Dispatch":4,"./Node":7,"./Size":8}],4:[function(require,module,exports){
'use strict';

// TODO: Dispatch should be generalized so that it can work on any Node
// not just Contexts.


/**
 * The Dispatch class is used to propogate events down the
 * scene graph.
 *
 * @param {Context} Context on which it operates
 */
function Dispatch (context) {

    if (!context) throw new Error('Dispatch needs to be instantiated on a node');
    
    this._context = context; // A reference to the context
                             // on which the dispatcher
                             // operates

    this._queue = []; // The queue is used for two purposes
                      // 1. It is used to list indicies in the
                      //    Nodes path which are then used to lookup
                      //    a node in the scene graph.
                      // 2. It is used to assist dispatching
                      //    such that it is possible to do a breadth first
                      //    traversal of the scene graph.
}

/**
 * lookupNode takes a path and returns the node at the location specified
 * by the path, if one exists. If not, it returns undefined.
 *
 * @param {String} The location of the node specified by its path
 * 
 * @return {Node | undefined} The node at the requested path
 */
Dispatch.prototype.lookupNode = function lookupNode (location) {
    if (!location) throw new Error('lookupNode must be called with a path');

    var path = this._queue;

    _splitTo(location, path);
    
    if (path[0] !== this._context.getSelector()) return void 0;

    var children = this._context.getChildren();
    var child;
    var i = 1;
    path[0] = this._context;

    while (i < path.length) {
        child = children[path[i]];
        path[i] = child;
        if (child) children = child.getChildren();
        else return void 0;
        i++;
    }

    return child;
};

/**
 * dispatch takes an event name and a payload and dispatches it to the
 * entire scene graph below the node that the dispatcher is on. The nodes
 * receive the events in a breadth first traversal, meaning that parents
 * have the opportunity to react to the event before children.
 *
 * @param {String} event name
 * @param {Any} payload
 */
Dispatch.prototype.dispatch = function dispatch (event, payload) {
    if (!event) throw new Error('dispatch requires an event name as it\'s first argument');

    var queue = this._queue;
    var item;
    var i;
    var len;
    var children;

    queue.length = 0;
    queue.push(this._context);

    while (queue.length) {
        item = queue.shift();
        if (item.onReceive) item.onReceive(event, payload);
        children = item.getChildren();
        for (i = 0, len = children.length ; i < len ; i++) queue.push(children[i]);
    }
};

/**
 * dispatchUIevent takes a path, an event name, and a payload and dispatches them in
 * a manner anologous to DOM bubbling. It first traverses down to the node specified at
 * the path. That node receives the event first, and then every ancestor receives the event
 * until the context.
 *
 * @param {String} the path of the node
 * @param {String} the event name
 * @param {Any} the payload
 */
Dispatch.prototype.dispatchUIEvent = function dispatchUIEvent (path, event, payload) {
    if (!path) throw new Error('dispatchUIEvent needs a valid path to dispatch to');
    if (!event) throw new Error('dispatchUIEvent needs an event name as its second argument');

    var queue = this._queue;
    var node;

    payload.node = this.lookupNode(path); // After this call, the path is loaded into the queue
                                          // (lookUp node doesn't clear the queue after the lookup)

    while (queue.length) {
        node = queue.pop(); // pop nodes off of the queue to move up the ancestor chain.
        if (node.onReceive) node.onReceive(event, payload);
    }
};

/**
 * _splitTo is a private method which takes a path and splits it at every '/'
 * pushing the result into the supplied array. This is a destructive change.
 *
 * @private
 * @param {String} the specified path
 * @param {Array} the array to which the result should be written
 */
function _splitTo (string, target) {
    target.length = 0; // clears the array first.
    var last = 0;

    for (var i = 0, len = string.length ; i < len ; i++) {
        if (string[i] === '/') {
            target.push(string.substring(last, i));
            last = i + 1;
        }
    }

    if (i - last > 0) target.push(string.substring(last, i));

    return target;
}

module.exports = Dispatch;


},{}],5:[function(require,module,exports){
// TODO: This will wrap UI events as the bubble in the scene graph to allow .stopPropogation() to be called

},{}],6:[function(require,module,exports){
'use strict';

// Check to see if we're in a worker
var isWorker = typeof self !== 'undefined' && self.window !== self;

var Clock = require('./Clock');
var Context = require('./Context');

/**
 * Famous has two responsibilities, one to act as the highest level
 * updater and another to send messages over to the renderers. It is
 * a singleton.
 */
function Famous () {
    this._updateQueue = []; // The updateQueue is a place where nodes
                            // can place themselves in order to be
                            // updated on the frame.
    
    this._nextUpdateQueue = []; // the nextUpdateQueue is used to queue
                                // updates for the next tick.
                                // this prevents infinite loops where during
                                // an update a node continuously puts itself
                                // back in the update queue.

    this._contexts = {}; // a hash of all of the context's that this famous
                         // is responsible for.

    this._messages = []; // a queue of all of the draw commands to send to the
                         // the renderers this frame.

    this._inUpdate = false; // when the famous is updating this is true.
                            // all requests for updates will get put in the
                            // nextUpdateQueue

    this._clock = new Clock(); // a clock to keep track of time for the scene
                               // graph.

    // if famous is in a worker we wire the event listener here.
    // otherwise the thread manager will postMessage directly to
    // famous
    var _this = this;
    if (isWorker)
        self.addEventListener('message', function (ev) {
            _this.postMessage(ev.data);
        });
}

/**
 * _update is the body of the update loop. The frame consists of
 * pulling in appending the nextUpdateQueue to the currentUpdate queue
 * then moving through the updateQueue and calling onUpdate with the current
 * time on all nodes. While _update is called _inUpdate is set to true and 
 * all requests to be placed in the update queue will be forwarded to the 
 * nextUpdateQueue.
 *
 * @param {Number} The current time
 */
Famous.prototype._update = function _update (time) {
    this._inUpdate = true;
    var nextQueue = this._nextUpdateQueue;
    var queue = this._updateQueue;
    var item;

    while (nextQueue.length) queue.unshift(nextQueue.pop());

    while (queue.length) {
        item = queue.shift();
        if (item && item.onUpdate) item.onUpdate(time);
    }

    this._inUpdate = false;
};

/**
 * requestUpdates takes a class that has an onUpdate method and puts it
 * into the updateQueue to be updated at the next frame.
 * If Famous is currently in an update, requestUpdate
 * passes its argument to requestUpdateOnNextTick.
 *
 * @param {Object} an object with an onUpdate method
 */
Famous.prototype.requestUpdate = function requestUpdate (requester) {
    if (!requester)
        throw new Error(
            'requestUpdate must be called with a class to be updated'
        );

    if (this._inUpdate) this.requestUpdateOnNextTick(requester);
    else this._updateQueue.push(requester);
};

/**
 * requestUpdateOnNextTick is requests an update on the next frame.
 * If Famous is not currently in an update than it is functionally equivalent
 * to requestUpdate. This method should be used to prevent infinite loops where
 * a class is updated on the frame but needs to be updated again next frame.
 *
 * @param {Object} an object with an onUpdate method
 */
Famous.prototype.requestUpdateOnNextTick = function requestUpdateOnNextTick (requester) {
    this._nextUpdateQueue.push(requester);
};

/**
 * postMessage sends a message queue into Famous to be processed.
 * These messages will be interpreted and sent into the scene graph
 * as events if necessary.
 *
 * @param {Array} an array of commands.
 * @chainable
 * 
 * @return {Famous} this
 */
Famous.prototype.postMessage = function postMessage (messages) {
    if (!messages)
        throw new Error(
            'postMessage must be called with an array of messages'
        );

    var command;

    while (messages.length > 0) {
        command = messages.shift();
        switch (command) {
            case 'WITH':
                this.handleWith(messages);
                break;
            case 'FRAME':
                this.handleFrame(messages);
                break;
            case 'INVOKE':
                this.handleInvoke(message);
                break;
            default:
                throw new Error('received unknown command: ' + command);
                break;
        }
    }
    return this;
};

/**
 * handleWith is a method that takes an array of messages following the
 * WITH command. It'll then issue the next commands to the path specified
 * by the WITH command.
 *
 * @param {Array} array of messages.
 * @chainable
 *
 * @return {Famous} this
 */
Famous.prototype.handleWith = function handleWith (messages) {
    var path = messages.shift();
    var command = messages.shift();
    var i;
    var len;

    switch (command) {
        case 'TRIGGER': // the TRIGGER command sends a UIEvent to the specified path
            var type = messages.shift();
            var ev = messages.shift();
            
            this.getContext(path).getDispatch().dispatchUIEvent(path, type, ev);
            break;
        default:
            throw new Error('received unknown command: ' + command);
            break;
    }
    return this;
};

/**
 * handleFrame is called when the renderers issue a FRAME command to 
 * Famous. Famous will then step updating the scene graph to the current time.
 *
 * @param {Array} array of messages.
 * @chainable
 *
 * @return {Famous} this
 */
Famous.prototype.handleFrame = function handleFrame (messages) {
    if (!messages) throw new Error('handleFrame must be called with an array of messages');
    if (!messages.length) throw new Error('FRAME must be sent with a time');

    this.step(messages.shift());
    return this;
};

/**
 * step updates the clock and the scene graph and then sends the draw commands
 * that accumulated in the update to the renderers.
 *
 * @param {Number} current engine time
 * @chainable
 *
 * @return {Famous} this
 */
Famous.prototype.step = function step (time) {
    if (time == null) throw new Error('step must be called with a time');

    this._clock.step(time);

    this._update(time);

    if (this._messages.length) {
        if (isWorker) self.postMessage(this._messages);
        else this.onmessage(this._messages);
    }
    
    this._messages.length = 0;

    return this;
};

/**
 * returns the context of a particular path. The context is looked up by the selector
 * portion of the path and is listed from the start of the string to the first
 * '/'.
 *
 * @param {String} the path to look up the context for.
 *
 * @return {Context | Undefined} the context if found, else undefined.
 */
Famous.prototype.getContext = function getContext (selector) {
    if (!selector) throw new Error('getContext must be called with a selector');
    
    var index = selector.indexOf('/');
    selector = index === -1 ? selector : selector.substring(0, index);

    return this._contexts[selector];
};

/**
 * returns the instance of clock within famous.
 *
 * @return {Clock} Famous's clock
 */
Famous.prototype.getClock = function getClock () {
    return this._clock;
};

/**
 * queues a message to be transfered to the renderers.
 *
 * @param {Any} Draw Command
 * @chainable
 *
 * @return {Famous} this
 */
Famous.prototype.message = function message (command) {
    this._messages.push(command);
    return this;
};

/**
 * Creates a context under which a scene graph could be built.
 *
 * @param {String} a dom selector for where the context should be placed
 *
 * @return {Context} a new instance of Context.
 */
Famous.prototype.createContext = function createContext (selector) {
    selector = selector || 'body';

    if (this._contexts[selector]) this._contexts[selector].dismount();
    this._contexts[selector] = new Context(selector, this);
    return this._contexts[selector];
};

module.exports = new Famous();


},{"./Clock":2,"./Context":3}],7:[function(require,module,exports){
'use strict';

var Transform = require('./Transform');
var Size = require('./Size');

var TRANSFORM_PROCESSOR = new Transform();
var SIZE_PROCESSOR = new Size();

var IDENT = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var ONES = [1, 1, 1];
var QUAT = [0, 0, 0, 1];

/**
 * Nodes define hierarchy and geometrical transformations. They can be moved
 * (translated), scaled and rotated.
 * 
 * A Node is either mounted or unmounted. Unmounted nodes are detached from the
 * scene graph. Unmounted nodes have no parent node, while each mounted node has
 * exactly one parent. Nodes have an arbitary number of children, which can be
 * dynamically added using @{@link addChild}.
 *
 * Each Nodes have an arbitrary number of `components`. Those components can
 * send `draw` commands to the renderer or mutate the node itself, in which case
 * they define behavior in the most explicit way. Components that send `draw`
 * commands aare considered `renderables`. From the node's perspective, there is
 * no distinction between nodes that send draw commands and nodes that define
 * behavior.
 *
 * Because of the fact that Nodes themself are very unopinioted (they don't
 * "render" to anything), they are often being subclassed in order to add e.g.
 * components at initialization to them. Because of this flexibility, they might
 * as well have been called `Entities`.
 *
 * @example
 * // create three detached (unmounted) nodes
 * var parent = new Node();
 * var child1 = new Node();
 * var child2 = new Node();
 *
 * // build an unmounted subtree (parent is still detached)
 * parent.addChild(child1);
 * parent.addChild(child2);
 *
 * // mount parent by adding it to the context
 * var context = Famous.createContext("body");
 * context.addChild(parent);
 *
 * @class Node
 * @constructor
 */
function Node () {
    this._calculatedValues = {
        transform: new Float32Array(IDENT),
        size: new Float32Array(3)
    };

    this._requestingUpdate = false;
    this._inUpdate = false;

    this._updateQueue = [];
    this._nextUpdateQueue = [];

    this._freedComponentIndicies = [];
    this._components = [];

    this._freedChildIndicies = [];
    this._children = [];

    this._parent = null;
    this._globalUpdater = null;

    this.value = new Node.Spec();
}

Node.RELATIVE_SIZE = Size.RELATIVE;
Node.ABSOLUTE_SIZE = Size.ABSOLUTE;
Node.RENDER_SIZE = Size.RENDER;
Node.DEFAULT_SIZE = Size.DEFAULT;

/**
 * A Node spec holds the "data" associated with a Node.
 *
 * @property {String} location path to the node (e.g. "body/0/1")
 * @property {Object} showState
 * @property {Boolean} showState.mounted
 * @property {Boolean} showState.shown
 * @property {Number} showState.opacity
 * @property {Object} offsets
 * @property {Float32Array.<Number>} offsets.mountPoint
 * @property {Float32Array.<Number>} offsets.align
 * @property {Float32Array.<Number>} offsets.origin
 * @property {Object} vectors
 * @property {Float32Array.<Number>} vectors.position
 * @property {Float32Array.<Number>} vectors.rotation
 * @property {Float32Array.<Number>} vectors.scale
 * @property {Object} size
 * @property {Float32Array.<Number>} size.sizeMode
 * @property {Float32Array.<Number>} size.proportional
 * @property {Float32Array.<Number>} size.differential
 * @property {Float32Array.<Number>} size.absolute
 * @property {Float32Array.<Number>} size.render
 */
Node.Spec = function Spec () {
    this.location = null;
    this.showState = {
        mounted: false,
        shown: false,
        opacity: 1
    };
    this.offsets = {
        mountPoint: new Float32Array(3),
        align: new Float32Array(3),
        origin: new Float32Array(3)
    };
    this.vectors = {
        position: new Float32Array(3),
        rotation: new Float32Array(QUAT),
        scale: new Float32Array(ONES)
    };
    this.size = {
        sizeMode: new Float32Array([Size.RELATIVE, Size.RELATIVE, Size.RELATIVE]),
        proportional: new Float32Array(ONES),
        differential: new Float32Array(3),
        absolute: new Float32Array(3),
        render: new Float32Array(3)
    };
    this.UIEvents = [];
};

/**
 * @method getContext
 * @chainable
 *
 * @deprecated Node can be used directly instead!
 * @return {Node} this
 */
Node.prototype.getContext = function getContext () {
    console.warn(
        'Node#getContext is deprecated!\n' +
        'Nodes can be used directly!'
    );
    return this;
};

/**
 * @method getDispatch
 * @chainable
 *
 * @deprecated Node can be used directly instead!
 * @return {Node} this
 */
Node.prototype.getDispatch = function getDispatch () {
    console.warn(
        'Node#getDispatch is deprecated!\n' +
        'Component constructors accept a Node instead!' +
        'Use new Component(node) instead of new Component(node.getDispatch())!'
    );
    return this;
};

/**
 * @method getRenderProxy
 * @chainable
 *
 * @deprecated Node can be used directly instead!
 * @return {Node} this
 */
Node.prototype.getRenderProxy = function getRenderProxy () {
    console.warn(
        'Node#getRenderProxy is deprecated!\n' +
        'RenderProxy functionality has been merged into Node!'
    );
    return this;
};

/**
 * @method getRenderPath
 * @chainable
 *
 * @deprecated Use #getLocation()
 * @return {string} render path
 */
Node.prototype.getRenderPath = function getRenderPath () {
    console.warn(
        'Node#getRenderPath is deprecated!\n' +
        'Use Node#getLocation instead!'
    );
    return this.getLocation();
};

/**
 * @method addRenderable
 * @chainable
 *
 * @deprecated Use addComponent
 * @param {*} component component to be added
 * @return this
 */
Node.prototype.addRenderable = function addRenderable (component) {
    console.warn(
        'Node#addRenderable is deprecated!\n' +
        'use node.addComponent instead'
    );
    this.addComponent(component);
    return this;
};

/**
 * Determine the node's location in the scene graph hierarchy.
 * A location of `body/0/1` can be interpreted as the following scene graph
 * hierarchy (ignoring siblings of ancestors and additional child nodes):
 *
 * `Context:body` -> `Node:0` -> `Node:1`, where `Node:1` is the node the
 * `getLocation` method has been invoked on.
 *
 * @method getLocation
 * 
 * @return {String} location (path), e.g. `body/0/1`
 */
Node.prototype.getLocation = function getLocation () {
    return this.value.location;
};

/**
 * @alias getId
 */
Node.prototype.getId = Node.prototype.getLocation;

/**
 * Dispatches the event on the node by recursively traversing the scene graph
 * upwards.
 *
 * @method emit
 * 
 * @param  {String} event   Event type.
 * @param  {Object} payload Event object to be dispatched.
 */
Node.prototype.emit = function emit (event, payload) {
    var p = this.getParent();
    // the context is its own ancestor
    while (p !== (p = p.getParent()));
    p.getDispatch().dispatch(event, payload);
    return this;
};

// THIS WILL BE DEPRICATED
Node.prototype.sendDrawCommand = function sendDrawCommand (message) {
    this._globalUpdater.message(message);
    return this;
};

/**
 * Recursively serializes the Node, including all previously added components.
 *
 * @method getValue
 * 
 * @return {Object}     Serialized representation of the node, including
 *                      components.
 */
Node.prototype.getValue = function getValue () {
    var numberOfChildren = this._children.length;
    var numberOfComponents = this._components.length;
    var i = 0;

    var value = {
        location: this.value.location,
        spec: this.value,
        components: new Array(numberOfComponents),
        children: new Array(numberOfChildren)
    };

    for (; i < numberOfChildren ; i++)
        value.children[i] = this._children[i].getValue();

    for (i = 0 ; i < numberOfComponents ; i++)
        if (this._components[i].getValue)
            value.components[i] = this._components[i].getValue();

    return value;
};

/**
 * Similar to @{@link getValue}, but returns the actual "computed" value. E.g.
 * a proportional size of 0.5 might resolve into a "computed" size of 200px
 * (assuming the parent has a width of 400px).
 *
 * @method getComputedValue
 * 
 * @return {Object}     Serialized representation of the node, including
 *                      children, excluding components.
 */
Node.prototype.getComputedValue = function getComputedValue () {
    var numberOfChildren = this._children.length;

    var value = {
        location: this.value.location,
        computedValues: this._calculatedValues,
        children: new Array(numberOfChildren)
    };

    for (var i = 0 ; i < numberOfChildren ; i++)
        value.children[i] = this._children[i].getComputedValue();

    return value;
};

/**
 * Retrieves all children of the current node.
 *
 * @method getChildren
 * 
 * @return {Array.<Node>}   An array of children.
 */
Node.prototype.getChildren = function getChildren () {
    return this._children;
};

/**
 * Retrieves the parent of the current node. Unmounted nodes do not have a
 * parent node.
 *
 * @method getParent
 * 
 * @return {Node}       Parent node.
 */
Node.prototype.getParent = function getParent () {
    return this._parent;
};

/**
 * Schedules the @{@link update} function of the node to be invoked on the next
 * frame (if no update during this frame has been scheduled already).
 * If the node is currently being updated (which means one of the requesters
 * invoked requestsUpdate while being updated itself), an update will be
 * scheduled on the next frame.
 *
 * @method requestUpdate
 * 
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 */
Node.prototype.requestUpdate = function requestUpdate (requester) {
    if (this._inUpdate) return this.requestUpdateOnNextTick(requester);
    this._updateQueue.push(requester);
    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Schedules an update on the next tick. Similarily to @{@link requestUpdate},
 * `requestUpdateOnNextTick` schedules the node's `onUpdate` function to be
 * invoked on the frame after the next invocation on the node's onUpdate function.
 *
 * @method requestUpdateOnNextTick
 * 
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 */
Node.prototype.requestUpdateOnNextTick = function requestUpdateOnNextTick (requester) {
    this._nextUpdateQueue.push(requester);
    return this;
};

/**
 * If the context has been created using @{@link Famous.createContext}, the
 * @{@link Famous} singleton will be the global updater.
 *
 * @method getUpdater
 * 
 * @return {Object} The global updater.
 */
Node.prototype.getUpdater = function getUpdater () {
    return this._globalUpdater;
};

/**
 * Checks if the node is mounted. Unmounted nodes are detached from the scene
 * graph.
 *
 * @method isMounted
 * 
 * @return {Boolean}    Boolean indicating weather the node is mounted or not.
 */
Node.prototype.isMounted = function isMounted () {
    return this.value.showState.mounted;
};

/**
 * Checks if the node is visible ("shown").
 *
 * @method isShown
 * 
 * @return {Boolean}    Boolean indicating weather the node is visible
 *                      ("shown") or not.
 */
Node.prototype.isShown = function isShown () {
    return this.value.showState.shown;
};

/**
 * Determines the node's relative opacity.
 * The opacity needs to be within [0, 1], where 0 indicates a completely
 * transparent, therefore invisible node, whereas an opacity of 1 means the
 * node is completely solid.
 *
 * @method getOpacity
 * 
 * @return {Number}         Relative opacity of the node.
 */
Node.prototype.getOpacity = function getOpacity () {
    return this.value.showState.opacity;
};

/**
 * Determines the node's previously set mount point.
 * 
 * @method getMountPoint
 * 
 * @return {Float32Array}   An array representing the mount point.
 */
Node.prototype.getMountPoint = function getMountPoint () {
    return this.value.offsets.mountPoint;
};

/**
 * Determines the node's previously set align.
 * 
 * @method getAlign
 * 
 * @return {Float32Array}   An array representing the align.
 */
Node.prototype.getAlign = function getAlign () {
    return this.value.offsets.align;
};

/**
 * Determines the node's previously set origin.
 * 
 * @method getOrigin
 * 
 * @return {Float32Array}   An array representing the origin.
 */
Node.prototype.getOrigin = function getOrigin () {
    return this.value.offsets.origin;
};

/**
 * Determines the node's previously set position.
 *
 * @method getPosition
 * 
 * @return {Float32Array}   An array representing the position.
 */
Node.prototype.getPosition = function getPosition () {
    return this.value.vectors.position;
};

Node.prototype.getRotation = function getRotation () {
    return this.value.vectors.rotation;
};

Node.prototype.getScale = function getScale () {
    return this.value.vectors.scale;
};

Node.prototype.getSizeMode = function getSizeMode () {
    return this.value.size.sizeMode;
};

Node.prototype.getProportionalSize = function getProportionalSize () {
    return this.value.size.proportional;
};

Node.prototype.getDifferentialSize = function getDifferentialSize () {
    return this.value.size.differential;
};

Node.prototype.getAbsoluteSize = function getAbsoluteSize () {
    return this.value.size.absolute;
};

Node.prototype.getRenderSize = function getRenderSize () {
    return this.value.size.render;
};

Node.prototype.getSize = function getSize () {
    return this._calculatedValues.size;
};

Node.prototype.getTransform = function getTransform () {
    return this._calculatedValues.transform;
};

Node.prototype.getUIEvents = function getUIEvents () {
    return this.value.UIEvents;
};

Node.prototype.addChild = function addChild (child) {
    var index = child ? this._children.indexOf(child) : -1;
    child = child ? child : new Node();

    if (index === -1) {
        index = this._freedChildIndicies.length ? this._freedChildIndicies.pop() : this._children.length;
        this._children[index] = child;

        if (this.isMounted() && child.onMount) {
            var myId = this.getId();
            var childId = myId + '/' + index;
            child.onMount(this, childId);
        }

    }

    return child;
};

Node.prototype.removeChild = function removeChild (child) {
    var index = this._children.indexOf(child);
    var added = index !== -1;
    if (added) {
        this._freedChildIndicies.push(index);

        if (this.isMounted() && child.onDismount)
            child.onDismount();

        this._children[index] = null;
    }
    return added;
};

/**
 * Each component can only be added once per node.
 *
 * @method addComponent
 * 
 * @param {Object} component    An component to be added.
 */
Node.prototype.addComponent = function addComponent (component) {
    var index = this._components.indexOf(component);
    if (index === -1) {
        index = this._freedComponentIndicies.length ? this._freedComponentIndicies.pop() : this._components.length;
        this._components[index] = component;

        if (this.isMounted() && component.onMount)
            component.onMount(this, index);

        if (this.isShown() && component.onShow)
            component.onShow();
    }

    return index;
};

/**
 * Removes a previously via @{@link addComponent} added component.
 *
 * @method removeComponent
 * 
 * @param  {Object} component   An component that has previously been added
 *                              using @{@link addComponent}.
 */
Node.prototype.removeComponent = function removeComponent (component) {
    var index = this._components.indexOf(component);
    if (index !== -1) {
        this._freedComponentIndicies.push(index);
        if (this.isShown() && component.onHide)
            component.onHide();

        if (this.isMounted() && component.onDismount)
            component.onDismount();

        this._components[index] = null;
    }
    return component;
};

Node.prototype.addUIEvent = function addUIEvent (eventName) {
    var UIEvents = this.getUIEvents();
    var components = this._components;
    var component;

    var added = UIEvents.indexOf(eventName) !== -1;
    if (!added) {
        UIEvents.push(eventName);
        for (var i = 0, len = components.length ; i < len ; i++) {
            component = components[i];
            if (component.onAddUIEvent) component.onAddUIEvent(eventName);
        }
    }
    return added;
};

Node.prototype._requestUpdate = function _requestUpdate (force) {
    if (force || (!this._requestingUpdate && this._globalUpdater)) {
        this._globalUpdater.requestUpdate(this);
        this._requestingUpdate = true;
    }
};

Node.prototype._vecOptionalSet = function _vecOptionalSet (vec, index, val) {
    if (val != null && vec[index] !== val) {
        vec[index] = val;
        if (!this._requestingUpdate) this._requestUpdate();
        return true;
    }
    return false;
};

Node.prototype.show = function show () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = true;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onShow) item.onShow();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentShow) item.onParentShow();
    }
    return this;
};

Node.prototype.hide = function hide () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = false;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onHide) item.onHide();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentHide) item.onParentHide();
    }
    return this;
};

Node.prototype.setAlign = function setAlign (x, y, z) {
    var vec3 = this.value.offsets.align;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAlignChange) item.onAlignChange(x, y, z);
        }
    }
    return this;
};

Node.prototype.setMountPoint = function setMountPoint (x, y, z) {
    var vec3 = this.value.offsets.mountPoint;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onMountPointChange) item.onMountPointChange(x, y, z);
        }
    }
    return this;
};

Node.prototype.setOrigin = function setOrigin (x, y, z) {
    var vec3 = this.value.offsets.origin;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOriginChange) item.onOriginChange(x, y, z);
        }
    }
    return this;
};


Node.prototype.setPosition = function setPosition (x, y, z) {
    var vec3 = this.value.vectors.position;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onPositionChange) item.onPositionChange(x, y, z);
        }
    }

    return this;
};

Node.prototype.setRotation = function setRotation (x, y, z, w) {
    var quat = this.value.vectors.rotation;
    var propogate = false;
    var qx, qy, qz, qw;

    if (w != null) {
        qx = x;
        qy = y;
        qz = z;
        qw = w;
    }
    else {
        var hx = x * 0.5;
        var hy = y * 0.5;
        var hz = z * 0.5;

        var sx = Math.sin(hx);
        var sy = Math.sin(hy);
        var sz = Math.sin(hz);
        var cx = Math.cos(hx);
        var cy = Math.cos(hy);
        var cz = Math.cos(hz);

        var sysz = sy * sz;
        var cysz = cy * sz;
        var sycz = sy * cz;
        var cycz = cy * cz;

        qx = sx * cycz + cx * sysz;
        qy = cx * sycz - sx * cysz;
        qz = cx * cysz + sx * sycz;
        qw = cx * cycz - sx * sysz;
    }

    propogate = this._vecOptionalSet(quat, 0, qx) || propogate;
    propogate = this._vecOptionalSet(quat, 1, qy) || propogate;
    propogate = this._vecOptionalSet(quat, 2, qz) || propogate;
    propogate = this._vecOptionalSet(quat, 3, qw) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = quat[0];
        y = quat[1];
        z = quat[2];
        w = quat[3];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onRotationChange) item.onRotationChange(x, y, z, w);
        }
    }
    return this;
};

Node.prototype.setScale = function setScale (x, y, z) {
    var vec3 = this.value.vectors.scale;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onScaleChange) item.onScaleChange(x, y, z);
        }
    }
    return this;
};

Node.prototype.setOpacity = function setOpacity (val) {
    if (val != this.value.showState.opacity) {
        this.value.showState.opacity = val;
        if (!this._requestingUpdate) this._requestUpdate();

        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOpacityChange) item.onOpacityChange(val);
        }
    }
    return this;
};

/**
 * Sets the size mode being used for determining the nodes final width, height
 * and depth.
 * Size modes are a way to define the way the node's size is being calculated.
 * Size modes are enums set on the @{@link Size} constructor (and aliased on
 * the Node).
 *
 * @example
 * node.setSizeMode(Node.RELATIVE_SIZE, Node.ABSOLUTE_SIZE, Node.ABSOLUTE_SIZE);
 * // Instead of null, any proporional height or depth can be passed in, since
 * // it would be ignored in any case.
 * node.setProportionalSize(0.5, null, null);
 * node.setAbsoluteSize(null, 100, 200);
 *
 * @method setSizeMode
 * 
 * @param {SizeMode} x    The size mode being used for determining the size in
 *                        x direction ("width").
 * @param {SizeMode} y    The size mode being used for determining the size in
 *                        y direction ("height").
 * @param {SizeMode} z    The size mode being used for determining the size in
 *                        z direction ("depth").
 */
Node.prototype.setSizeMode = function setSizeMode (x, y, z) {
    var vec3 = this.value.size.sizeMode;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onSizeModeChange) item.onSizeModeChange(x, y, z);
        }
    }
    return this;
};

/**
 * A proportional size defines the node's dimensions relative to its parents
 * final size.
 * Proportional sizes need to be within the range of [0, 1].
 *
 * @method setProportionalSize
 * 
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 */
Node.prototype.setProportionalSize = function setProportionalSize (x, y, z) {
    var vec3 = this.value.size.proportional;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onProportionalSizeChange) item.onProportionalSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Differential sizing can be used to add or subtract an absolute size from a
 * otherwise proportionally sized node.
 * E.g. a differential width of `-10` and a proportional width of `0.5` is
 * being interpreted as setting the node's size to 50% of its parent's width
 * *minus* 10 pixels.
 *
 * @method setDifferentialSize
 * 
 * @param {Number} x    x-Size to be added to the relatively sized node in
 *                      pixels ("width").
 * @param {Number} y    y-Size to be added to the relatively sized node in
 *                      pixels ("height").
 * @param {Number} z    z-Size to be added to the relatively sized node in
 *                      pixels ("depth").
 */
Node.prototype.setDifferentialSize = function setDifferentialSize (x, y, z) {
    var vec3 = this.value.size.differential;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onDifferentialSizeChange) item.onDifferentialSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the nodes size in pixels, independent of its parent.
 *
 * @method setAbsoluteSize
 * 
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 */
Node.prototype.setAbsoluteSize = function setAbsoluteSize (x, y, z) {
    var vec3 = this.value.size.absolute;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAbsoluteSizeChange) item.onAbsoluteSizeChange(x, y, z);
        }
    }
    return this;
};

Node.prototype._transformChanged = function _transformChanged (transform) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onTransformChange) item.onTransformChange(transform);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentTransformChange) item.onParentTransformChange(transform);
    }
};

Node.prototype._sizeChanged = function _sizeChanged (size) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onSizeChange) item.onSizeChange(size);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentSizeChange) item.onParentSizeChange(size);
    }
};

// DEPRICATE
Node.prototype.getFrame = function getFrame () {
    return this._globalUpdater.getFrame();
};

/**
 * Enters the node's update phase while updating its own spec and updating its components.
 *
 * @method update
 * 
 * @param  {Number} time    high-resolution timstamp, usually retrieved using
 *                          requestAnimationFrame
 */
Node.prototype.update = function update (time){
    this._inUpdate = true;
    var nextQueue = this._nextUpdateQueue;
    var queue = this._updateQueue;
    var item;

    while (nextQueue.length) queue.unshift(nextQueue.pop());

    while (queue.length) {
        item = this._components[queue.shift()];
        if (item && item.onUpdate) item.onUpdate(time);
    }

    var mySize = this.getSize();
    var myTransform = this.getTransform();
    var parent = this.getParent();
    var parentSize = parent.getSize();
    var parentTransform = parent.getTransform();
    var sizeChanged = SIZE_PROCESSOR.fromSpecWithParent(parentSize, this.value, mySize);

    var transformChanged = TRANSFORM_PROCESSOR.fromSpecWithParent(parentTransform, this.value, mySize, parentSize, myTransform);
    if (transformChanged) this._transformChanged(myTransform);
    if (sizeChanged) this._sizeChanged(mySize);

    this._inUpdate = false;
    this._requestingUpdate = false;

    if (this._nextUpdateQueue.length) {
        this._globalUpdater.requestUpdateOnNextTick(this);
        this._requestingUpdate = true;
    }
    if (!this.isMounted()) {
        // last update
        this._parent = null;
        this.value.location = null;
        this._globalUpdater = null;
    }
    return this;
};

/**
 * Mounts the node and therefore its subtree by setting it as a child of the
 * passed in parent.
 *
 * @method mount
 * 
 * @param  {Node} parent    parent node
 * @param  {String} myId    path to node (e.g. `body/0/1`)
 */
Node.prototype.mount = function mount (parent, myId) {
    if (this.isMounted()) return;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this._parent = parent;
    this._globalUpdater = parent.getUpdater();
    this.value.location = myId;
    this.value.showState.mounted = true;

    for (; i < len ; i++) {
        item = list[i];
        if (item.onMount) item.onMount(this, i);
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item.onParentMount) item.onParentMount(this, myId, i);
    }

    if (this._requestingUpdate) this._requestUpdate(true);
    return this;
};

/**
 * Dismounts (detaches) the node from the scene graph by removing it as a
 * child of its parent.
 *
 * @method dismount
 */
Node.prototype.dismount = function dismount () {
    if (!this.isMounted()) return;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this.value.showState.mounted = false;

    this._parent.removeChild(this);

    for (; i < len ; i++) {
        item = list[i];
        if (item.onDismount) item.onDismount();
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item.onParentDismount) item.onParentDismount();
    }

    if (!this._requestingUpdate) this._requestUpdate();
    this._globalUpdater = null;
    return this;
};

/**
 * Function to be invoked by the parent as soon as the parent is
 * being mounted.
 *
 * @method onParentMount
 * 
 * @param  {Node} parent        The parent node.
 * @param  {String} parentId    The parent id (path to parent).
 * @param  {Number} index       Id the node should be mounted to.
 */
Node.prototype.onParentMount = function onParentMount (parent, parentId, index) {
    return this.mount(parent, parentId + '/' + index);
};

/**
 * Function to be invoked by the parent as soon as the parent is being
 * unmounted.
 *
 * @method onParentDismount
 */
Node.prototype.onParentDismount = function onParentDismount () {
    return this.dismount();
};

/**
 * Method to be called in order to dispatch an event to the node and all its
 * components. Note that this doesn't recurse the subtree.
 *
 * @method receive
 * 
 * @param  {String} type   The event type (e.g. "click").
 * @param  {Object} ev     The event payload object to be dispatched.
 */
Node.prototype.receive = function receive (type, ev) {
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onReceive) item.onReceive(type, ev);
    }
    return this;
};


Node.prototype._requestUpdateWithoutArgs = function _requestUpdateWithoutArgs () {
    if (!this._requestingUpdate) this._requestUpdate();
};

Node.prototype.onUpdate = Node.prototype.update;

Node.prototype.onParentShow = Node.prototype.show;

Node.prototype.onParentHide = Node.prototype.hide;

Node.prototype.onParentTransformChange = Node.prototype._requestUpdateWithoutArgs;

Node.prototype.onParentSizeChange = Node.prototype._requestUpdateWithoutArgs;

Node.prototype.onShow = Node.prototype.show;

Node.prototype.onHide = Node.prototype.hide;

Node.prototype.onMount = Node.prototype.mount;

Node.prototype.onDismount = Node.prototype.dismount;

Node.prototype.onReceive = Node.prototype.receive;

module.exports = Node;

},{"./Size":8,"./Transform":9}],8:[function(require,module,exports){
'use strict';

/**
 * The Size class is responsible for processing Size from a node
 * @constructor {Size}
 */
function Size () {
    this._size = new Float32Array(3);
}

// an enumeration of the different types of size modes
Size.RELATIVE = 0;
Size.ABSOLUTE = 1;
Size.RENDER = 2;
Size.DEFAULT = Size.RELATIVE;

/**
 * fromSpecWithParent takes the parent node's size, the target nodes spec,
 * and a target array to write to. Using the node's size mode it calculates 
 * a final size for the node from the node's spec. Returns whether or not
 * the final size has changed from its last value.
 *
 * @param {Array} parent node's calculated size
 * @param {Node.Spec} the target node's spec
 * @param {Array} an array to write the result to
 *
 * @return {Boolean} true if the size of the node has changed.
 */
Size.prototype.fromSpecWithParent = function fromSpecWithParent (parentSize, spec, target) {
    var mode = spec.size.sizeMode;
    var prev;
    var changed = false;
    for (var i = 0 ; i < 3 ; i++) {
        switch (mode[i]) {
            case Size.RELATIVE:
                prev = target[i];
                target[i] = parentSize[i] * spec.size.proportional[i] + spec.size.differential[i];
                changed = changed || prev !== target[i];
                break;
            case Size.ABSOLUTE:
                prev = target[i];
                target[i] = spec.size.absolute[i];
                changed = changed || prev !== target[i];
                break;
            case Size.RENDER:
                break;
        }
    }
    return changed;
};

module.exports = Size;

},{}],9:[function(require,module,exports){
'use strict';

/**
 * The transform class is responsible for calculating the transform of a particular
 * node from the data on the node and its parent
 *
 * @constructor {Transform}
 */
function Transform () {
    this._matrix = new Float32Array(16);
}

/**
 * Returns the last calculated transform
 *
 * @return {Array} a transform
 */
Transform.prototype.get = function get () {
    return this._matrix;
};

/**
 * Uses the parent transform, the node's spec, the node's size, and the parent's size
 * to calculate a final transform for the node. Returns true if the transform has changed.
 *
 * @param {Array} the parent matrix
 * @param {Node.Spec} the target node's spec
 * @param {Array} the size of the node
 * @param {Array} the size of the parent
 * @param {Array} the target array to write the resulting transform to
 *
 * @return {Boolean} whether or not the transform changed
 */
Transform.prototype.fromSpecWithParent = function fromSpecWithParent (parentMatrix, spec, mySize, parentSize, target) {
    target = target ? target : this._matrix;

    // local cache of everything
    var t00         = target[0];
    var t01         = target[1];
    var t02         = target[2];
    var t10         = target[4];
    var t11         = target[5];
    var t12         = target[6];
    var t20         = target[8];
    var t21         = target[9];
    var t22         = target[10];
    var t30         = target[12];
    var t31         = target[13];
    var t32         = target[14];
    var p00         = parentMatrix[0];
    var p01         = parentMatrix[1];
    var p02         = parentMatrix[2];
    var p10         = parentMatrix[4];
    var p11         = parentMatrix[5];
    var p12         = parentMatrix[6];
    var p20         = parentMatrix[8];
    var p21         = parentMatrix[9];
    var p22         = parentMatrix[10];
    var p30         = parentMatrix[12];
    var p31         = parentMatrix[13];
    var p32         = parentMatrix[14];
    var posX        = spec.vectors.position[0];
    var posY        = spec.vectors.position[1];
    var posZ        = spec.vectors.position[2];
    var rotX        = spec.vectors.rotation[0];
    var rotY        = spec.vectors.rotation[1];
    var rotZ        = spec.vectors.rotation[2];
    var rotW        = spec.vectors.rotation[3];
    var scaleX      = spec.vectors.scale[0];
    var scaleY      = spec.vectors.scale[1];
    var scaleZ      = spec.vectors.scale[2];
    var alignX      = spec.offsets.align[0] * parentSize[0];
    var alignY      = spec.offsets.align[1] * parentSize[1];
    var alignZ      = spec.offsets.align[2] * parentSize[2];
    var mountPointX = spec.offsets.mountPoint[0] * mySize[0];
    var mountPointY = spec.offsets.mountPoint[1] * mySize[1];
    var mountPointZ = spec.offsets.mountPoint[2] * mySize[2];
    var originX     = spec.offsets.origin[0] * mySize[0];
    var originY     = spec.offsets.origin[1] * mySize[1];
    var originZ     = spec.offsets.origin[2] * mySize[2];

    var wx = rotW * rotX;
    var wy = rotW * rotY;
    var wz = rotW * rotZ;
    var xx = rotX * rotX;
    var yy = rotY * rotY;
    var zz = rotZ * rotZ;
    var xy = rotX * rotY;
    var xz = rotX * rotZ;
    var yz = rotY * rotZ;

    var rs0 = (1 - 2 * (yy + zz)) * scaleX;
    var rs1 = (2 * (xy + wz)) * scaleX;
    var rs2 = (2 * (xz - wy)) * scaleX;
    var rs3 = (2 * (xy - wz)) * scaleY;
    var rs4 = (1 - 2 * (xx + zz)) * scaleY;
    var rs5 = (2 * (yz + wx)) * scaleY;
    var rs6 = (2 * (xz + wy)) * scaleZ;
    var rs7 = (2 * (yz - wx)) * scaleZ;
    var rs8 = (1 - 2 * (xx + yy)) * scaleZ;

    var tx = alignX + posX - mountPointX + originX - (rs0 * originX + rs3 * originY + rs6 * originZ);
    var ty = alignY + posY - mountPointY + originY - (rs1 * originX + rs4 * originY + rs7 * originZ);
    var tz = alignZ + posZ - mountPointZ + originZ - (rs2 * originX + rs5 * originY + rs8 * originZ);

    target[0] = p00 * rs0 + p10 * rs1 + p20 * rs2;
    target[1] = p01 * rs0 + p11 * rs1 + p21 * rs2;
    target[2] = p02 * rs0 + p12 * rs1 + p22 * rs2;
    target[3] = 0;
    target[4] = p00 * rs3 + p10 * rs4 + p20 * rs5;
    target[5] = p01 * rs3 + p11 * rs4 + p21 * rs5;
    target[6] = p02 * rs3 + p12 * rs4 + p22 * rs5;
    target[7] = 0;
    target[8] = p00 * rs6 + p10 * rs7 + p20 * rs8;
    target[9] = p01 * rs6 + p11 * rs7 + p21 * rs8;
    target[10] = p02 * rs6 + p12 * rs7 + p22 * rs8;
    target[11] = 0;
    target[12] = p00 * tx + p10 * ty + p20 * tz + p30;
    target[13] = p01 * tx + p11 * ty + p21 * tz + p31;
    target[14] = p02 * tx + p12 * ty + p22 * tz + p32;
    target[15] = 1;

    return t00 !== target[0] ||
        t01 !== target[1] ||
        t02 !== target[2] ||
        t10 !== target[4] ||
        t11 !== target[5] ||
        t12 !== target[6] ||
        t20 !== target[8] ||
        t21 !== target[9] ||
        t22 !== target[10] ||
        t30 !== target[12] ||
        t31 !== target[13] ||
        t32 !== target[14];

};

module.exports = Transform;

},{}],10:[function(require,module,exports){
'use strict';

module.exports = {
    Clock: require('./Clock'),
    Event: require('./Event'),
    Context: require('./Context'),
    Famous: require('./Famous'),
    Dispatch: require('./Dispatch'),
    Dispatcher: require('./Dispatch'),
    Node: require('./Node'),
    Size: require('./Size'),
    Transform: require('./Transform')
};

},{"./Clock":2,"./Context":3,"./Dispatch":4,"./Event":5,"./Famous":6,"./Node":7,"./Size":8,"./Transform":9}],11:[function(require,module,exports){
'use strict';

/**
 * A 3x3 numerical matrix, represented as an array.
 *
 * @class Mat33
 * @constructor
 *
 * @param {Number[]} values
 */
function Mat33(values) {
    this.values = values || [1,0,0,0,1,0,0,0,1];

    return this;
}

/**
 * Return the values in the Mat33 as an array.
 *
 * @method get
 * @return {Number[]} matrix values as array of rows.
 */
Mat33.prototype.get = function get() {
    return this.values;
};

/**
 * Set the values of the current Mat33.
 *
 * @method set
 * @param {Number[]} values Array of nine numbers to set in the Mat33.
 * @chainable
 */
Mat33.prototype.set = function set(values) {
    this.values = values;
    return this;
};

/**
 * Copy the values of the input Mat33.
 *
 * @method copy
 * @param {Mat33} matrix The Mat33 to copy.
 * @chainable
 */
Mat33.prototype.copy = function copy(matrix) {
    var A = this.values;
    var B = matrix.values;

    A[0] = B[0];
    A[1] = B[1];
    A[2] = B[2];
    A[3] = B[3];
    A[4] = B[4];
    A[5] = B[5];
    A[6] = B[6];
    A[7] = B[7];
    A[8] = B[8];

    return this;
};

/**
 * Take this Mat33 as A, input vector V as a column vector, and return Mat33 product (A)(V).
 *
 * @method vectorMultiply
 * @param {Vec3} v Vector to rotate.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3} The input vector after multiplication.
 */
Mat33.prototype.vectorMultiply = function vectorMultiply(v, output) {
    var M = this.values;
    var v0 = v.x;
    var v1 = v.y;
    var v2 = v.z;

    output.x = M[0]*v0 + M[1]*v1 + M[2]*v2;
    output.y = M[3]*v0 + M[4]*v1 + M[5]*v2;
    output.z = M[6]*v0 + M[7]*v1 + M[8]*v2;

    return output;
};

/**
 * Multiply the provided Mat33 with the current Mat33.  Result is (this) * (matrix).
 *
 * @method multiply
 * @param {Mat33} matrix Input Mat33 to multiply on the right.
 * @chainable
 */
Mat33.prototype.multiply = function multiply(matrix) {
    var A = this.values;
    var B = matrix.values;

    var A0 = A[0];
    var A1 = A[1];
    var A2 = A[2];
    var A3 = A[3];
    var A4 = A[4];
    var A5 = A[5];
    var A6 = A[6];
    var A7 = A[7];
    var A8 = A[8];

    var B0 = B[0];
    var B1 = B[1];
    var B2 = B[2];
    var B3 = B[3];
    var B4 = B[4];
    var B5 = B[5];
    var B6 = B[6];
    var B7 = B[7];
    var B8 = B[8];

    A[0] = A0*B0 + A1*B3 + A2*B6;
    A[1] = A0*B1 + A1*B4 + A2*B7;
    A[2] = A0*B2 + A1*B5 + A2*B8;
    A[3] = A3*B0 + A4*B3 + A5*B6;
    A[4] = A3*B1 + A4*B4 + A5*B7;
    A[5] = A3*B2 + A4*B5 + A5*B8;
    A[6] = A6*B0 + A7*B3 + A8*B6;
    A[7] = A6*B1 + A7*B4 + A8*B7;
    A[8] = A6*B2 + A7*B5 + A8*B8;

    return this;
};

/**
 * Transposes the Mat33.
 *
 * @method transpose
 * @chainable
 */
Mat33.prototype.transpose = function transpose() {
    var M = this.values;

    var M1 = M[1];
    var M2 = M[2];
    var M3 = M[3];
    var M5 = M[5];
    var M6 = M[6];
    var M7 = M[7];

    M[1] = M3;
    M[2] = M6;
    M[3] = M1;
    M[5] = M7;
    M[6] = M2;
    M[7] = M5;

    return this;
};

/**
 * The determinant of the Mat33.
 *
 * @method getDeterminant
 * @return {Number} The determinant.
 */
Mat33.prototype.getDeterminant = function getDeterminant() {
    var M = this.values;

    var M3 = M[3];
    var M4 = M[4];
    var M5 = M[5];
    var M6 = M[6];
    var M7 = M[7];
    var M8 = M[8];

    var det = M[0]*(M4*M8 - M5*M7)
            - M[1]*(M3*M8 - M5*M6)
            + M[2]*(M3*M7 - M4*M6);

    return det;
};

/**
 * The inverse of the Mat33.
 *
 * @method inverse
 * @chainable
 */
Mat33.prototype.inverse = function inverse() {
    var M = this.values;

    var M0 = M[0];
    var M1 = M[1];
    var M2 = M[2];
    var M3 = M[3];
    var M4 = M[4];
    var M5 = M[5];
    var M6 = M[6];
    var M7 = M[7];
    var M8 = M[8];

    var det = M0*(M4*M8 - M5*M7)
            - M1*(M3*M8 - M5*M6)
            + M2*(M3*M7 - M4*M6);

    if (Math.abs(det) < 1e-40) return null;

    det = 1 / det;

    M[0] = (M4*M8 - M5*M7) * det;
    M[3] = (-M3*M8 + M5*M6) * det;
    M[6] = (M3*M7 - M4*M6) * det;
    M[1] = (-M1*M8 + M2*M7) * det;
    M[4] = (M0*M8 - M2*M6) * det;
    M[7] = (-M0*M7 + M1*M6) * det;
    M[2] = (M1*M5 - M2*M4) * det;
    M[5] = (-M0*M5 + M2*M3) * det;
    M[8] = (M0*M4 - M1*M3) * det;

    return this;
};

/**
 * Clones the input Mat33.
 *
 * @method clone
 * @param {Mat33} m Mat33 to clone.
 * @return {Mat33} New copy of the original Mat33.
 */
Mat33.clone = function clone(m) {
    return new Mat33(m.values.slice());
};

/**
 * The inverse of the Mat33.
 *
 * @method inverse
 * @param {Mat33} matrix Mat33 to invert.
 * @param {Mat33} output Mat33 in which to place the result.
 * @return {Mat33} The Mat33 after the invert.
 */
Mat33.inverse = function inverse(matrix, output) {
    var M = matrix.values;
    var result = output.values;

    var M0 = M[0];
    var M1 = M[1];
    var M2 = M[2];
    var M3 = M[3];
    var M4 = M[4];
    var M5 = M[5];
    var M6 = M[6];
    var M7 = M[7];
    var M8 = M[8];

    var det = M0*(M4*M8 - M5*M7)
            - M1*(M3*M8 - M5*M6)
            + M2*(M3*M7 - M4*M6);

    if (Math.abs(det) < 1e-40) return null;

    det = 1 / det;

    result[0] = (M4*M8 - M5*M7) * det;
    result[3] = (-M3*M8 + M5*M6) * det;
    result[6] = (M3*M7 - M4*M6) * det;
    result[1] = (-M1*M8 + M2*M7) * det;
    result[4] = (M0*M8 - M2*M6) * det;
    result[7] = (-M0*M7 + M1*M6) * det;
    result[2] = (M1*M5 - M2*M4) * det;
    result[5] = (-M0*M5 + M2*M3) * det;
    result[8] = (M0*M4 - M1*M3) * det;

    return output;
};

/**
 * Transposes the Mat33.
 *
 * @method transpose
 * @param {Mat33} matrix Mat33 to transpose.
 * @param {Mat33} output Mat33 in which to place the result.
 * @return {Mat33} The Mat33 after the transpose.
 */
Mat33.transpose = function transpose(matrix, output) {
    var M = matrix.values;
    var result = output.values;

    var M0 = M[0];
    var M1 = M[1];
    var M2 = M[2];
    var M3 = M[3];
    var M4 = M[4];
    var M5 = M[5];
    var M6 = M[6];
    var M7 = M[7];
    var M8 = M[8];

    result[0] = M0;
    result[1] = M3;
    result[2] = M6;
    result[3] = M1;
    result[4] = M4;
    result[5] = M7;
    result[6] = M2;
    result[7] = M5;
    result[8] = M8;

    return output;
};

/**
 * Add the provided Mat33's.
 *
 * @method add
 * @param {Mat33} matrix1 The left Mat33.
 * @param {Mat33} matrix2 The right Mat33.
 * @param {Mat33} output Mat33 in which to place the result.
 * @return {Mat33} The result of the addition.
 */
Mat33.add = function add(matrix1, matrix2, output) {
    var A = matrix1.values;
    var B = matrix2.values;
    var result = output.values;

    var A0 = A[0];
    var A1 = A[1];
    var A2 = A[2];
    var A3 = A[3];
    var A4 = A[4];
    var A5 = A[5];
    var A6 = A[6];
    var A7 = A[7];
    var A8 = A[8];

    var B0 = B[0];
    var B1 = B[1];
    var B2 = B[2];
    var B3 = B[3];
    var B4 = B[4];
    var B5 = B[5];
    var B6 = B[6];
    var B7 = B[7];
    var B8 = B[8];

    result[0] = A0 + B0;
    result[1] = A1 + B1;
    result[2] = A2 + B2;
    result[3] = A3 + B3;
    result[4] = A4 + B4;
    result[5] = A5 + B5;
    result[6] = A6 + B6;
    result[7] = A7 + B7;
    result[8] = A8 + B8;

    return output;
};

/**
 * Subtract the provided Mat33's.
 *
 * @method subtract
 * @param {Mat33} matrix1 The left Mat33.
 * @param {Mat33} matrix2 The right Mat33.
 * @param {Mat33} output Mat33 in which to place the result.
 * @return {Mat33} The result of the subtraction.
 */
Mat33.subtract = function subtract(matrix1, matrix2, output) {
    var A = matrix1.values;
    var B = matrix2.values;
    var result = output.values;

    var A0 = A[0];
    var A1 = A[1];
    var A2 = A[2];
    var A3 = A[3];
    var A4 = A[4];
    var A5 = A[5];
    var A6 = A[6];
    var A7 = A[7];
    var A8 = A[8];

    var B0 = B[0];
    var B1 = B[1];
    var B2 = B[2];
    var B3 = B[3];
    var B4 = B[4];
    var B5 = B[5];
    var B6 = B[6];
    var B7 = B[7];
    var B8 = B[8];

    result[0] = A0 - B0;
    result[1] = A1 - B1;
    result[2] = A2 - B2;
    result[3] = A3 - B3;
    result[4] = A4 - B4;
    result[5] = A5 - B5;
    result[6] = A6 - B6;
    result[7] = A7 - B7;
    result[8] = A8 - B8;

    return output;
};
/**
 * Multiply the provided Mat33 M2 with this Mat33.  Result is (this) * (M2).
 *
 * @method multiply
 * @param {Mat33} matrix1 The left Mat33.
 * @param {Mat33} matrix2 The right Mat33.
 * @param {Mat33} output Mat33 in which to place the result.
 * @return {Mat33} the result of the multiplication.
 */
Mat33.multiply = function multiply(matrix1, matrix2, output) {
    var A = matrix1.values;
    var B = matrix2.values;
    var result = output.values;

    var A0 = A[0];
    var A1 = A[1];
    var A2 = A[2];
    var A3 = A[3];
    var A4 = A[4];
    var A5 = A[5];
    var A6 = A[6];
    var A7 = A[7];
    var A8 = A[8];

    var B0 = B[0];
    var B1 = B[1];
    var B2 = B[2];
    var B3 = B[3];
    var B4 = B[4];
    var B5 = B[5];
    var B6 = B[6];
    var B7 = B[7];
    var B8 = B[8];

    result[0] = A0*B0 + A1*B3 + A2*B6;
    result[1] = A0*B1 + A1*B4 + A2*B7;
    result[2] = A0*B2 + A1*B5 + A2*B8;
    result[3] = A3*B0 + A4*B3 + A5*B6;
    result[4] = A3*B1 + A4*B4 + A5*B7;
    result[5] = A3*B2 + A4*B5 + A5*B8;
    result[6] = A6*B0 + A7*B3 + A8*B6;
    result[7] = A6*B1 + A7*B4 + A8*B7;
    result[8] = A6*B2 + A7*B5 + A8*B8;

    return output;
};

module.exports = Mat33;

},{}],12:[function(require,module,exports){
'use strict';

var Matrix = require('./Mat33');

var sin = Math.sin;
var cos = Math.cos;
var asin = Math.asin;
var acos = Math.acos;
var atan2 = Math.atan2;
var sqrt = Math.sqrt;

/**
 * A vector-like object used to represent rotations. If theta is the angle of
 * rotation, and (x', y', z') is a normalized vector representing the axis of
 * rotation, then w = cos(theta/2), x = sin(theta/2)*x', y = sin(theta/2)*y',
 * and z = sin(theta/2)*z'.
 *
 * @class Quaternion
 * @param {Number} w The w component.
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 */
function Quaternion(w, x, y, z) {
    this.w = w || 1;
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
}

/**
 * Multiply the current Quaternion by input Quaternion q.
 * Left-handed multiplication.
 *
 * @method multiply
 * @param {Quaternion} q The Quaternion to multiply by on the right.
 */
Quaternion.prototype.multiply = function multiply(q) {
    var x1 = this.x;
    var y1 = this.y;
    var z1 = this.z;
    var w1 = this.w;
    var x2 = q.x;
    var y2 = q.y;
    var z2 = q.z;
    var w2 = q.w || 0;

    this.w = w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2;
    this.x = x1 * w2 + x2 * w1 + y2 * z1 - y1 * z2;
    this.y = y1 * w2 + y2 * w1 + x1 * z2 - x2 * z1;
    this.z = z1 * w2 + z2 * w1 + x2 * y1 - x1 * y2;
    return this;
};

/**
 * Multiply the current Quaternion by input Quaternion q on the left, i.e. q * this.
 * Left-handed multiplication.
 *
 * @method leftMultiply
 * @param {Quaternion} q The Quaternion to multiply by on the left.
 */
Quaternion.prototype.leftMultiply = function leftMultiply(q) {
    var x1 = q.x;
    var y1 = q.y;
    var z1 = q.z;
    var w1 = q.w || 0;
    var x2 = this.x;
    var y2 = this.y;
    var z2 = this.z;
    var w2 = this.w;

    this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
    this.x = x1*w2 + x2*w1 + y2*z1 - y1*z2;
    this.y = y1*w2 + y2*w1 + x1*z2 - x2*z1;
    this.z = z1*w2 + z2*w1 + x2*y1 - x1*y2;
    return this;
};

/**
 * Apply the current Quaternion to input Vec3 v, according to
 * v' = ~q * v * q.
 *
 * @method rotateVector
 * @param {Vec3} v The reference Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3} The rotated version of the Vec3.
 */
Quaternion.prototype.rotateVector = function rotateVector(v, output) {
    var cw = this.w;
    var cx = -this.x;
    var cy = -this.y;
    var cz = -this.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    output.x = tx * w + x * tw + y * tz - ty * z;
    output.y = ty * w + y * tw + tx * z - x * tz;
    output.z = tz * w + z * tw + x * ty - tx * y;
    return output;
};

/**
 * Invert the current Quaternion.
 *
 * @method invert
 * @chainable
 */
Quaternion.prototype.invert = function invert() {
    this.w = -this.w;
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
};

/**
 * Conjugate the current Quaternion.
 *
 * @method conjugate
 * @chainable
 */
Quaternion.prototype.conjugate = function conjugate() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
};

/**
 * Compute the length (norm) of the current Quaternion.
 *
 * @method length
 * @return {Number}
 */
Quaternion.prototype.length = function length() {
    var w = this.w;
    var x = this.x;
    var y = this.y;
    var z = this.z;
    return sqrt(w * w + x * x + y * y + z * z);
};

/**
 * Alter the current Quaternion to be of unit length;
 *
 * @method normalize
 * @chainable
 */
Quaternion.prototype.normalize = function normalize() {
    var w = this.w;
    var x = this.x;
    var y = this.y;
    var z = this.z;
    var length = sqrt(w * w + x * x + y * y + z * z);
    if (length === 0) return;
    length = 1 / length;
    this.w *= length;
    this.x *= length;
    this.y *= length;
    this.z *= length;
    return this;
};

/**
 * Set the w, x, y, z components of the current Quaternion.
 *
 * @method set
 * @param {Number} w The w component.
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 * @chainable
 */
Quaternion.prototype.set = function set(w, x ,y, z) {
    if (w != null) this.w = w;
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    if (z != null) this.z = z;
    return this;
};

/**
 * Copy input Quaternion q onto the current Quaternion.
 *
 * @method copy
 * @param {Quaternion} q The reference Quaternion.
 * @chainable
 */
Quaternion.prototype.copy = function copy(q) {
    this.w = q.w;
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    return this;
};

/**
 * Reset the current Quaternion.
 *
 * @method clear
 * @chainable
 */
Quaternion.prototype.clear = function clear() {
    this.w = 1;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * The dot product. Can be used to determine the cosine of the angle between
 * the two rotations, assuming both Quaternions are of unit length.
 *
 * @method dot
 * @param {Quaternion} q The other Quaternion.
 * @return {Number}
 */
Quaternion.prototype.dot = function dot(q) {
    return this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z;
};

/**
 * Spherical linear interpolation.
 *
 * @method slerp
 * @param {Quaternion} q The final orientation.
 * @param {Number} t The tween parameter.
 * @param {Vec3} output Vec3 in which to put the result.
 * @return {Quaternion}
 */
Quaternion.prototype.slerp = function slerp(q, t, output) {
    var w = this.w;
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var qw = q.w;
    var qx = q.x;
    var qy = q.y;
    var qz = q.z;

    var omega;
    var cosomega;
    var sinomega;
    var scaleFrom;
    var scaleTo;

    cosomega = w * qw + x * qx + y * qy + z * qz;
    if ((1.0 - cosomega) > 1e-5) {
        omega = acos(cosomega);
        sinomega = sin(omega);
        scaleFrom = sin((1.0 - t) * omega) / sinomega;
        scaleTo = sin(t * omega) / sinomega;
    }
    else {
        scaleFrom = 1.0 - t;
        scaleTo = t;
    }

    output.w = w * scaleFrom + qw * scaleTo;
    output.x = x * scaleFrom + qx * scaleTo;
    output.y = y * scaleFrom + qy * scaleTo;
    output.z = z * scaleFrom + qz * scaleTo;

    return output;
};

/**
 * Get the Mat33 matrix corresponding to the current Quaternion.
 *
 * @method toMatrix
 * @return {Transform}
 */
Quaternion.prototype.toMatrix = function toMatrix(output) {
    var w = this.w;
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var xx = x*x;
    var yy = y*y;
    var zz = z*z;
    var xy = x*y;
    var xz = x*z;
    var yz = y*z;

    return output.set([
        1 - 2 * (yy + zz), 2 * (xy - w*z), 2 * (xz + w*y),
        2 * (xy + w*z), 1 - 2 * (xx + zz), 2 * (yz - w*x),
        2 * (xz - w*y), 2 * (yz + w*x), 1 - 2 * (xx + yy)
    ]);
};

/**
 * The rotation angles about the x, y, and z axes corresponding to the
 * current Quaternion, when applied in the ZYX order.
 *
 * @method toEuler
 * @param {Vec3} output Vec3 in which to put the result.
 * @return {Vec3}
 */

Quaternion.prototype.toEuler = function toEuler(output) {
    var w = this.w;
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var xx = x * x;
    var yy = y * y;
    var zz = z * z;
    var ww = w * w;

    var ty = 2 * (x * z + y * w);
    ty = ty < -1 ? -1 : ty > 1 ? 1 : ty;

    output.x = atan2(2 * (x * w - y * z), 1 - 2 * (xx + yy));
    output.y = asin(ty);
    output.z = atan2(2 * (z * w - x * y), 1 - 2 * (yy + zz));

    return output;
};

/**
 * The Quaternion corresponding to the Euler angles x, y, and z,
 * applied in the ZYX order.
 *
 * @method fromEuler
 * @param {Number} x The angle of rotation about the x axis.
 * @param {Number} y The angle of rotation about the y axis.
 * @param {Number} z The angle of rotation about the z axis.
 * @param {Quaternion} output Quaternion in which to put the result.
 * @return {Quaternion} The equivalent Quaternion.
 */
Quaternion.prototype.fromEuler = function fromEuler(x, y, z) {
    var hx = x * 0.5;
    var hy = y * 0.5;
    var hz = z * 0.5;

    var sx = sin(hx);
    var sy = sin(hy);
    var sz = sin(hz);
    var cx = cos(hx);
    var cy = cos(hy);
    var cz = cos(hz);

    this.w = cx * cy * cz - sx * sy * sz;
    this.x = sx * cy * cz + cx * sy * sz;
    this.y = cx * sy * cz - sx * cy * sz;
    this.z = cx * cy * sz + sx * sy * cz;

    return this;
};

/**
 * Alter the current Quaternion to reflect a rotation of input angle about
 * input axis v.
 *
 * @method makeFromAngleAndAxis
 * @param {Number} angle The angle of rotation.
 * @param {Vec3} v The axis of rotation.
 * @chainable
 */
Quaternion.prototype.fromAngleAxis = function fromAngleAxis(angle, x, y, z) {
    var len = sqrt(x * x + y * y + z * z);
    if (len === 0) {
        this.w = 1;
        this.x = this.y = this.z = 0;
    }
    else {
        len = 1 / len;
        var halfTheta = angle * 0.5;
        var s = sin(halfTheta);
        this.w = cos(halfTheta);
        this.x = s * x * len;
        this.y = s * y * len;
        this.z = s * z * len;
    }
    return this;
};

/**
 * Multiply the input Quaternions.
 * Left-handed coordinate system multiplication.
 *
 * @method multiply
 * @param {Quaternion} q1 The left Quaternion.
 * @param {Quaternion} q2 The right Quaternion.
 * @param {Quaternion} output Quaternion in which to place the result.
 * @return {Quaternion} The product of multiplication.
 */
Quaternion.multiply = function multiply(q1, q2, output) {
    var w1 = q1.w || 0;
    var x1 = q1.x;
    var y1 = q1.y;
    var z1 = q1.z;

    var w2 = q2.w || 0;
    var x2 = q2.x;
    var y2 = q2.y;
    var z2 = q2.z;

    output.w = w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2;
    output.x = x1 * w2 + x2 * w1 + y2 * z1 - y1 * z2;
    output.y = y1 * w2 + y2 * w1 + x1 * z2 - x2 * z1;
    output.z = z1 * w2 + z2 * w1 + x2 * y1 - x1 * y2;
    return output;
};

/**
 * Normalize the input quaternion.
 *
 * @method normalize
 * @return {Quaternion} The normalized quaternion.
 */
Quaternion.normalize = function normalize(q, output) {
    var w = q.w;
    var x = q.x;
    var y = q.y;
    var z = q.z;
    var length = sqrt(w * w + x * x + y * y + z * z);
    if (length === 0) return;
    length = 1 / length;
    output.w *= length;
    output.x *= length;
    output.y *= length;
    output.z *= length;
    return output;
};

/**
 * The conjugate of the input Quaternion.
 *
 * @method conjugate
 * @param {Quaternion} q The reference Quaternion.
 * @param {Quaternion} output Quaternion in which to place the result.
 * @return {Quaternion} The conjugate Quaternion.
 */
Quaternion.conjugate = function conjugate(q, output) {
    output.w = q.w;
    output.x = -q.x;
    output.y = -q.y;
    output.z = -q.z;
    return output;
};

/**
 * Clone the input Quaternion.
 *
 * @method clone
 * @param {Quaternion} q the reference Quaternion.
 * @return {Quaternion} The cloned Quaternion.
 */
Quaternion.clone = function clone(q) {
    return new Quaternion(q.w, q.x, q.y, q.z);
};

/**
 * The dot product of the two input Quaternions.
 *
 * @method dotProduct
 * @param {Quaternion} q1 The left Quaternion.
 * @param {Quaternion} q2 The right Quaternion.
 * @return {Number} The dot product of the two Quaternions.
 */
Quaternion.dot = function dot(q1, q2) {
    return q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
};

module.exports = Quaternion;

},{"./Mat33":11}],13:[function(require,module,exports){
'use strict';

var sin = Math.sin;
var cos = Math.cos;
var sqrt = Math.sqrt;

/**
 * A two-dimensional vector.
 *
 * @class Vec2
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 */
var Vec2 = function(x, y){
    if (x instanceof Array || x instanceof Float32Array) {
        this.x = x[0] || 0;
        this.y = x[1] || 0;
    }
    else {
        this.x = x || 0;
        this.y = y || 0;
    }
};

/**
 * Set the components of the current Vec2.
 *
 * @method set
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @chainable
 */
Vec2.prototype.set = function set(x, y) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    return this;
};

/**
 * Add the input v to the current Vec2.
 *
 * @method add
 * @param {Vec2} v The Vec2 to add.
 * @chainable
 */
Vec2.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

/**
 * Subtract the input v from the current Vec2.
 *
 * @method subtract
 * @param {Vec2} v The Vec2 to subtract.
 * @chainable
 */
Vec2.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

/**
 * Scale the current Vec2 by a scalar or Vec2.
 *
 * @method scale
 * @param {Number|Vec2} s The Number or vec2 by which to scale.
 * @chainable
 */
Vec2.prototype.scale = function scale(s) {
    if (s instanceof Vec2) {
        this.x *= s.x;
        this.y *= s.y;
    } else {
        this.x *= s;
        this.y *= s;
    }
    return this;
};

/**
 * Rotate the Vec2 counter-clockwise by theta about the z-axis.
 *
 * @method rotate
 * @param {Number} theta Angle by which to rotate.
 * @chainable
 */
Vec2.prototype.rotate = function(theta) {
    var x = this.x;
    var y = this.y;

    var cosTheta = cos(theta);
    var sinTheta = sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of of the current Vec2 with the input Vec2.
 *
 * @method dot
 * @param {Number} v The other Vec2.
 * @chainable
 */
Vec2.prototype.dot = function(v) {
    return this.x * v.x + this.y * v.y;
};

/**
 * The cross product of of the current Vec2 with the input Vec2.
 *
 * @method cross
 * @param {Number} v The other Vec2.
 * @chainable
 */
Vec2.prototype.cross = function(v) {
    return this.x * v.y - this.y * v.x;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec2.
 *
 * @method invert
 * @chainable
 */
Vec2.prototype.invert = function invert() {
    this.x *= -1;
    this.y *= -1;
    return this;
};

/**
 * Apply a function component-wise to the current Vec2.
 *
 * @method map
 * @param {Function} fn Function to apply.
 * @chainable
 */
Vec2.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    return this;
};

/**
 * The magnitude of the current Vec2.
 *
 * @method length
 * @return {Number}
 */
Vec2.prototype.length = function length() {
    var x = this.x;
    var y = this.y;

    return sqrt(x * x + y * y);
};

/**
 * Copy the input onto the current Vec2.
 *
 * @method copy
 * @param {Vec2} v Vec2 to copy.
 * @chainable
 */
Vec2.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
};

/**
 * Reset the current Vec2.
 *
 * @method clear
 * @chainable
 */
Vec2.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec2 is exactly 0.
 *
 * @method isZero
 * @return {Boolean}
 */
Vec2.prototype.isZero = function isZero() {
    if (this.x !== 0 || this.y !== 0) return false;
    else return true;
};

/**
 * The array form of the current Vec2.
 *
 * @method toArray
 * @return {Number[]}
 */
Vec2.prototype.toArray = function toArray() {
    return [this.x, this.y];
};

/**
 * Normalize the input Vec2.
 *
 * @method normalize
 * @param {Vec2} v The reference Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 * @return {Vec2} The normalize Vec2.
 */
Vec2.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;

    var length = sqrt(x * x + y * y) || 1;
    length = 1 / length;
    output.x = v.x * length;
    output.y = v.y * length;

    return output;
};

/**
 * Clone the input Vec2.
 *
 * @method clone
 * @param {Vec2} v The Vec2 to clone.
 * @return {Vec2} The cloned Vec2.
 */
Vec2.clone = function clone(v) {
    return new Vec2(v.x, v.y);
};

/**
 * Add the input Vec2's.
 *
 * @method add
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 * @return {Vec2} The result of the addition.
 */
Vec2.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;

    return output;
};

/**
 * Subtract the second Vec2 from the first.
 *
 * @method subtract
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 * @return {Vec2} The result of the subtraction.
 */
Vec2.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    return output;
};

/**
 * Scale the input Vec2.
 *
 * @method scale
 * @param {Vec2} v The reference Vec2.
 * @param {Number} s Number to scale by.
 * @param {Vec2} output Vec2 in which to place the result.
 * @return {Vec2} The result of the scaling.
 */
Vec2.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    return output;
};

/**
 * The dot product of the input Vec2's.
 *
 * @method dot
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @return {Number} The dot product.
 */
Vec2.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
};

/**
 * The cross product of the input Vec2's.
 *
 * @method cross
 * @param {Number} v The left Vec2.
 * @param {Number} v The right Vec2.
 * @return {Number} The z-component of the cross product.
 */
Vec2.cross = function(v1,v2) {
    return v1.x * v2.y - v1.y * v2.x;
};

module.exports = Vec2;

},{}],14:[function(require,module,exports){
'use strict';

var sin = Math.sin;
var cos = Math.cos;
var sqrt = Math.sqrt;

/**
 * A three-dimensional vector.
 *
 * @class Vec3
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 */
var Vec3 = function(x ,y, z){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

/**
 * Set the components of the current Vec3.
 *
 * @method set
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 * @chainable
 */
Vec3.prototype.set = function set(x, y, z) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    if (z != null) this.z = z;

    return this;
};

/**
 * Add the input v to the current Vec3.
 *
 * @method add
 * @param {Vec3} v The Vec3 to add.
 * @chainable
 */
Vec3.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;

    return this;
};

/**
 * Subtract the input v from the current Vec3.
 *
 * @method subtract
 * @param {Vec3} v The Vec3 to subtract.
 * @chainable
 */
Vec3.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the x axis.
 *
 * @method rotateX
 * @param {Number} theta Angle by which to rotate.
 * @chainable
 */
Vec3.prototype.rotateX = function rotateX(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = cos(theta);
    var sinTheta = sin(theta);

    this.y = y * cosTheta - z * sinTheta;
    this.z = y * sinTheta + z * cosTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the y axis.
 *
 * @method rotateY
 * @param {Number} theta Angle by which to rotate.
 * @chainable
 */
Vec3.prototype.rotateY = function rotateY(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = cos(theta);
    var sinTheta = sin(theta);

    this.x = z * sinTheta + x * cosTheta;
    this.z = z * cosTheta - x * sinTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the z axis.
 *
 * @method rotateZ
 * @param {Number} theta Angle by which to rotate.
 * @chainable
 */
Vec3.prototype.rotateZ = function rotateZ(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = cos(theta);
    var sinTheta = sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 *
 * @method dot
 * @param {Vec3} v The other Vec3.
 * @return {Number}
 */
Vec3.prototype.dot = function dot(v) {
    return this.x*v.x + this.y*v.y + this.z*v.z;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 * Stores the result in the current Vec3.
 *
 * @method cross
 * @param {Vec3} v The other Vec3.
 * @chainable
 */
Vec3.prototype.cross = function cross(v) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    this.x = y * vz - z * vy;
    this.y = z * vx - x * vz;
    this.z = x * vy - y * vx;
    return this;
};

/**
 * Scale the current Vec3 by a scalar.
 *
 * @method scale
 * @param {Number} s The Number by which to scale.
 * @chainable
 */
Vec3.prototype.scale = function scale(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;

    return this;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec3.
 *
 * @method invert
 * @chainable
 */
Vec3.prototype.invert = function invert() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;

    return this;
};

/**
 * Apply a function component-wise to the current Vec3.
 *
 * @method map
 * @param {Function} fn Function to apply.
 * @chainable
 */
Vec3.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    this.z = fn(this.z);

    return this;
};

/**
 * The magnitude of the current Vec3.
 *
 * @method length
 * @return {Number}
 */
Vec3.prototype.length = function length() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return sqrt(x * x + y * y + z * z);
};

/**
 * The magnitude squared of the current Vec3.
 *
 * @method length
 * @return {Number}
 */
Vec3.prototype.lengthSq = function lengthSq() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return x * x + y * y + z * z;
};

/**
 * Copy the input onto the current Vec3.
 *
 * @method copy
 * @param {Vec3} v Vec3 to copy.
 * @chainable
 */
Vec3.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
};

/**
 * Reset the current Vec3.
 *
 * @method clear
 * @chainable
 */
Vec3.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec3 is exactly 0.
 *
 * @method isZero
 * @return {Boolean}
 */
Vec3.prototype.isZero = function isZero() {
    return this.x === 0 && this.y === 0 && this.z === 0;
};

/**
 * The array form of the current Vec3.
 *
 * @method toArray
 * @return {Number[]}
 */
Vec3.prototype.toArray = function toArray() {
    return [this.x, this.y, this.z];
};

/**
 * Preserve the orientation but change the length of the current Vec3 to 1.
 *
 * @method normalize
 * @chainable
 */
Vec3.prototype.normalize = function normalize() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var len = sqrt(x * x + y * y + z * z) || 1;
    len = 1 / len;

    this.x *= len;
    this.y *= len;
    this.z *= len;
    return this;
};

/**
 * Apply the rotation corresponding to the input (unit) Quaternion
 * to the current Vec3.
 *
 * @method applyRotation
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply.
 * @chainable
 */
Vec3.prototype.applyRotation = function applyRotation(q) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = this.x;
    var vy = this.y;
    var vz = this.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    this.x = tx * w + x * tw + y * tz - ty * z;
    this.y = ty * w + y * tw + tx * z - x * tz;
    this.z = tz * w + z * tw + x * ty - tx * y;
    return this;
};

/**
 * Apply the input Mat33 the the current Vec3.
 *
 * @method applyMatrix
 * @param {Mat33} matrix Mat33 to apply.
 * @chainable
 */
Vec3.prototype.applyMatrix = function applyMatrix(matrix) {
    var M = matrix.get();

    var x = this.x;
    var y = this.y;
    var z = this.z;

    this.x = M[0]*x + M[1]*y + M[2]*z;
    this.y = M[3]*x + M[4]*y + M[5]*z;
    this.z = M[6]*x + M[7]*y + M[8]*z;
    return this;
};

/**
 * Normalize the input Vec3.
 *
 * @method normalize
 * @param {Vec3} v The reference Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3} The normalize Vec3.
 */
Vec3.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;
    var z = v.z;

    var length = sqrt(x * x + y * y + z * z) || 1;
    length = 1 / length;

    output.x = x * length;
    output.y = y * length;
    output.z = z * length;
    return output;
};

/**
 * Apply a rotation to the input Vec3.
 *
 * @method applyRotation
 * @param {Vec3} v The reference Vec3.
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3} The rotated version of the input Vec3.
 */
Vec3.applyRotation = function applyRotation(v, q, output) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    output.x = tx * w + x * tw + y * tz - ty * z;
    output.y = ty * w + y * tw + tx * z - x * tz;
    output.z = tz * w + z * tw + x * ty - tx * y;
    return output;
};

/**
 * Clone the input Vec3.
 *
 * @method clone
 * @param {Vec3} v The Vec3 to clone.
 * @return {Vec3} The cloned Vec3.
 */
Vec3.clone = function clone(v) {
    return new Vec3(v.x, v.y, v.z);
};

/**
 * Add the input Vec3's.
 *
 * @method add
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3} The result of the addition.
 */
Vec3.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;
    output.z = v1.z + v2.z;
    return output;
};

/**
 * Subtract the second Vec3 from the first.
 *
 * @method subtract
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3} The result of the subtraction.
 */
Vec3.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    output.z = v1.z - v2.z;
    return output;
};

/**
 * Scale the input Vec3.
 *
 * @method scale
 * @param {Vec3} v The reference Vec3.
 * @param {Number} s Number to scale by.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3} The result of the scaling.
 */
Vec3.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    output.z = v.z * s;
    return output;
};

/**
 * The dot product of the input Vec3's.
 *
 * @method dotProduct
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @return {Number} The dot product.
 */
Vec3.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

/**
 * The (right-handed) cross product of the input Vec3's.
 * v1 x v2.
 *
 * @method crossProduct
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3}
 */
Vec3.cross = function cross(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    output.x = y1 * z2 - z1 * y2;
    output.y = z1 * x2 - x1 * z2;
    output.z = x1 * y2 - y1 * x2;
    return output;
};

/**
 * The projection of v1 onto v2.
 *
 * @method project
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 * @return {Vec3}
 */
Vec3.project = function project(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    var scale = x1 * x2 + y1 * y2 + z1 * z2;
    scale /= x2 * x2 + y2 * y2 + z2 * z2;

    output.x = x2 * scale;
    output.y = y2 * scale;
    output.z = z2 * scale;

    return output;
};

module.exports = Vec3;

},{}],15:[function(require,module,exports){
module.exports = {
    Mat33: require('./Mat33'),
    Quaternion: require('./Quaternion'),
    Vec2: require('./Vec2'),
    Vec3: require('./Vec3')
};


},{"./Mat33":11,"./Quaternion":12,"./Vec2":13,"./Vec3":14}],16:[function(require,module,exports){
/*jshint -W008 */

'use strict';

var Curves = {
    /**
     * @property linear
     * @static
     * @type {Function}
     */
    linear: function(t) {
        return t;
    },

    /**
     * @property easeIn
     * @static
     * @type {Function}
     */
    easeIn: function(t) {
        return t*t;
    },

    /**
     * @property easeOut
     * @static
     * @type {Function}
     */
    easeOut: function(t) {
        return t*(2-t);
    },

    /**
     * @property easeInOut
     * @static
     * @type {Function}
     */
    easeInOut: function(t) {
        if (t <= 0.5) return 2*t*t;
        else return -2*t*t + 4*t - 1;
    },

    /**
     * @property easeOutBounce
     * @static
     * @type {Function}
     */
    easeOutBounce: function(t) {
        return t*(3 - 2*t);
    },

    /**
     * @property spring
     * @static
     * @type {Function}
     */
    spring: function(t) {
        return (1 - t) * Math.sin(6 * Math.PI * t) + t;
    },

    /**
     * @property inQuad
     * @static
     * @type {Function}
     */
    inQuad: function(t) {
        return t*t;
    },

    /**
     * @property outQuad
     * @static
     * @type {Function}
     */
    outQuad: function(t) {
        return -(t-=1)*t+1;
    },

    /**
     * @property inOutQuad
     * @static
     * @type {Function}
     */
    inOutQuad: function(t) {
        if ((t/=.5) < 1) return .5*t*t;
        return -.5*((--t)*(t-2) - 1);
    },

    /**
     * @property inCubic
     * @static
     * @type {Function}
     */
    inCubic: function(t) {
        return t*t*t;
    },

    /**
     * @property outCubic
     * @static
     * @type {Function}
     */
    outCubic: function(t) {
        return ((--t)*t*t + 1);
    },

    /**
     * @property inOutCubic
     * @static
     * @type {Function}
     */
    inOutCubic: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t;
        return .5*((t-=2)*t*t + 2);
    },

    /**
     * @property inQuart
     * @static
     * @type {Function}
     */
    inQuart: function(t) {
        return t*t*t*t;
    },

    /**
     * @property outQuart
     * @static
     * @type {Function}
     */
    outQuart: function(t) {
        return -((--t)*t*t*t - 1);
    },

    /**
     * @property inOutQuart
     * @static
     * @type {Function}
     */
    inOutQuart: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t*t;
        return -.5 * ((t-=2)*t*t*t - 2);
    },

    /**
     * @property inQuint
     * @static
     * @type {Function}
     */
    inQuint: function(t) {
        return t*t*t*t*t;
    },

    /**
     * @property outQuint
     * @static
     * @type {Function}
     */
    outQuint: function(t) {
        return ((--t)*t*t*t*t + 1);
    },

    /**
     * @property inOutQuint
     * @static
     * @type {Function}
     */
    inOutQuint: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t*t*t;
        return .5*((t-=2)*t*t*t*t + 2);
    },

    /**
     * @property inSine
     * @static
     * @type {Function}
     */
    inSine: function(t) {
        return -1.0*Math.cos(t * (Math.PI/2)) + 1.0;
    },

    /**
     * @property outSine
     * @static
     * @type {Function}
     */
    outSine: function(t) {
        return Math.sin(t * (Math.PI/2));
    },

    /**
     * @property inOutSine
     * @static
     * @type {Function}
     */
    inOutSine: function(t) {
        return -.5*(Math.cos(Math.PI*t) - 1);
    },

    /**
     * @property inExpo
     * @static
     * @type {Function}
     */
    inExpo: function(t) {
        return (t===0) ? 0.0 : Math.pow(2, 10 * (t - 1));
    },

    /**
     * @property outExpo
     * @static
     * @type {Function}
     */
    outExpo: function(t) {
        return (t===1.0) ? 1.0 : (-Math.pow(2, -10 * t) + 1);
    },

    /**
     * @property inOutExpo
     * @static
     * @type {Function}
     */
    inOutExpo: function(t) {
        if (t===0) return 0.0;
        if (t===1.0) return 1.0;
        if ((t/=.5) < 1) return .5 * Math.pow(2, 10 * (t - 1));
        return .5 * (-Math.pow(2, -10 * --t) + 2);
    },

    /**
     * @property inCirc
     * @static
     * @type {Function}
     */
    inCirc: function(t) {
        return -(Math.sqrt(1 - t*t) - 1);
    },

    /**
     * @property outCirc
     * @static
     * @type {Function}
     */
    outCirc: function(t) {
        return Math.sqrt(1 - (--t)*t);
    },

    /**
     * @property inOutCirc
     * @static
     * @type {Function}
     */
    inOutCirc: function(t) {
        if ((t/=.5) < 1) return -.5 * (Math.sqrt(1 - t*t) - 1);
        return .5 * (Math.sqrt(1 - (t-=2)*t) + 1);
    },

    /**
     * @property inElastic
     * @static
     * @type {Function}
     */
    inElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/ p));
    },

    /**
     * @property outElastic
     * @static
     * @type {Function}
     */
    outElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        return a*Math.pow(2,-10*t) * Math.sin((t-s)*(2*Math.PI)/p) + 1.0;
    },

    /**
     * @property inOutElastic
     * @static
     * @type {Function}
     */
    inOutElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if ((t/=.5)===2) return 1.0;  if (!p) p=(.3*1.5);
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p));
        return a*Math.pow(2,-10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p)*.5 + 1.0;
    },

    /**
     * @property inBack
     * @static
     * @type {Function}
     */
    inBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        return t*t*((s+1)*t - s);
    },

    /**
     * @property outBack
     * @static
     * @type {Function}
     */
    outBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        return ((--t)*t*((s+1)*t + s) + 1);
    },

    /**
     * @property inOutBack
     * @static
     * @type {Function}
     */
    inOutBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        if ((t/=.5) < 1) return .5*(t*t*(((s*=(1.525))+1)*t - s));
        return .5*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
    },

    /**
     * @property inBounce
     * @static
     * @type {Function}
     */
    inBounce: function(t) {
        return 1.0 - Curves.outBounce(1.0-t);
    },

    /**
     * @property outBounce
     * @static
     * @type {Function}
     */
    outBounce: function(t) {
        if (t < (1/2.75)) {
            return (7.5625*t*t);
        } else if (t < (2/2.75)) {
            return (7.5625*(t-=(1.5/2.75))*t + .75);
        } else if (t < (2.5/2.75)) {
            return (7.5625*(t-=(2.25/2.75))*t + .9375);
        } else {
            return (7.5625*(t-=(2.625/2.75))*t + .984375);
        }
    },

    /**
     * @property inOutBounce
     * @static
     * @type {Function}
     */
    inOutBounce: function(t) {
        if (t < .5) return Curves.inBounce(t*2) * .5;
        return Curves.outBounce(t*2-1.0) * .5 + .5;
    },

    /**
     * @property flat
     *
     * Useful for delaying the execution of a subsequent transition.
     * 
     * @static
     * @type {Function}
     */
    flat: function() {
        return 0;
    }
};

module.exports = Curves;

},{}],17:[function(require,module,exports){
'use strict';

var Curves = require('./Curves');

/**
 * A state maintainer for a smooth transition between
 *    numerically-specified states. Example numeric states include floats and
 *    arrays of floats objects.
 *
 * An initial state is set with the constructor or using
 *     {@link Transitionable#from}. Subsequent transitions consist of an
 *     intermediate state, easing curve, duration and callback. The final state
 *     of each transition is the initial state of the subsequent one. Calls to
 *     {@link Transitionable#get} provide the interpolated state along the way.
 *
 * Note that there is no event loop here - calls to {@link Transitionable#get}
 *    are the only way to find state projected to the current (or provided)
 *    time and are the only way to trigger callbacks and mutate the internal
 *    transition queue.
 *
 * @example
 * var t = new Transitionable([0, 0]);
 * t
 *     .to([100, 0], 'linear', 1000)
 *     .delay(1000)
 *     .to([200, 0], 'outBounce', 1000);
 *
 * var div = document.createElement('div');
 * div.style.background = 'blue';
 * div.style.width = '100px';
 * div.style.height = '100px';
 * document.body.appendChild(div);
 *
 * div.addEventListener('click', function() {
 *     t.isPaused() ? t.resume() : t.pause();
 * });
 *
 * requestAnimationFrame(function loop() {
 *     div.style.transform = 'translateX(' + t.get()[0] + 'px)' + ' translateY(' + t.get()[1] + 'px)';
 *     requestAnimationFrame(loop);
 * });
 *
 * @class Transitionable
 * @constructor
 * @param {Number|Array.Number} initialState    initial state to transition
 *                                              from - equivalent to a pursuant
 *                                              invocation of
 *                                              {@link Transitionable#from}
 */
function Transitionable(initialState) {
    this._queue = [];
    this._multi = null;
    this._method = null;
    this._end = null;
    this._startedAt = null;
    this._pausedAt = null;
    if (initialState != null) this.from(initialState);
}

/**
 * Internal Clock used for determining the current time for the ongoing
 * transitions.
 *
 * @type {Performance|Date|Object}
 */
Transitionable.Clock = typeof performance !== 'undefined' ? performance : Date;

/**
 * Registers a transition to be pushed onto the internal queue.
 *
 * @method to
 * @chainable
 *
 * @param  {Number|Array.Number}    finalState              final state to
 *                                                          transiton to
 * @param  {String|Function}        [curve=Curves.linear]   easing function
 *                                                          used for
 *                                                          interpolating
 *                                                          [0, 1]
 * @param  {Number}                 [duration=100]          duration of
 *                                                          transition
 * @param  {Function}               [callback]              callback function
 *                                                          to be called after
 *                                                          the transition is
 *                                                          complete
 * @return {Transitionable}         this
 */
Transitionable.prototype.to = function to(finalState, curve, duration, callback, method) {
    curve = curve != null && curve.constructor === String ? Curves[curve] : curve;
    this._method = method;
    if (this._queue.length === 0) {
        this._startedAt = this.constructor.Clock.now();
        this._pausedAt = null;
    }
    this._queue.push(
        finalState,
        curve != null ? curve : Curves.linear,
        duration != null ? duration : 100,
        callback
    );
    return this;
};

/**
 * Resets the transition queue to a stable initial state.
 *
 * @method from
 * @chainable
 *
 * @param  {Number|Array.Number}    initialState    initial state to
 *                                                  transition from
 * @return {Transitionable}         this
 */
Transitionable.prototype.from = function from(initialState) {
    this._end = initialState;
    if (initialState.constructor === Array && this._multi != null && this._multi.constructor === Array) {
        this._multi.length = initialState.length;
    } else {
        this._multi = initialState.constructor === Array ? [] : false;
    }
    this._queue.length = 0;
    this._startedAt = this.constructor.Clock.now();
    this._pausedAt = null;
    return this;
};

/**
 * Delays the execution of the subsequent transition for a certain period of
 * time.
 *
 * @method delay
 * @chainable
 *
 * @param {Number}      duration    delay time in ms
 * @param {Function}    [callback]  Zero-argument function to call on observed
 *                                  completion (t=1)
 * @return {Transitionable}         this
 */
Transitionable.prototype.delay = function delay(duration, callback) {
    var endState = this._queue.length > 0 ? this._queue[this._queue.length - 4] : this._end;
    return this.to(endState, Curves.flat, duration, callback);
};

/**
 * Overrides current transition.
 *
 * @method override
 * @chainable
 *
 * @param  {Number|Array.Number}    [finalState]    final state to transiton to
 * @param  {String|Function}        [curve]         easing function used for
 *                                                  interpolating [0, 1]
 * @param  {Number}                 [duration]      duration of transition
 * @param  {Function}               [callback]      callback function to be
 *                                                  called after the transition
 *                                                  is complete
 * @return {Transitionable}         this
 */
Transitionable.prototype.override = function override(finalState, curve, duration, callback) {
    if (this._queue.length > 0) {
        if (finalState != null) this._queue[0] = finalState;
        if (curve != null)      this._queue[1] = curve.constructor === String ? Curves[curve] : curve;
        if (duration != null)   this._queue[2] = duration;
        if (callback != null)   this._queue[3] = callback;
    }
    return this;
};

Transitionable.prototype._interpolate = function _interpolate(from, to, progress) {
    if (this._multi) {
        if (this._method === 'slerp') {
            var x, y, z, w;
            var qx, qy, qz, qw;
            var omega, cosomega, sinomega, scaleFrom, scaleTo;
            var resx, resy, resz, resw;

            x = from[0];
            y = from[1];
            z = from[2];
            w = from[3];

            qx = to[0];
            qy = to[1];
            qz = to[2];
            qw = to[3];

            cosomega = w * qw + x * qx + y * qy + z * qz;
            if ((1.0 - cosomega) > 1e-5) {
                omega = Math.acos(cosomega);
                sinomega = Math.sin(omega);
                scaleFrom = Math.sin((1.0 - progress) * omega) / sinomega;
                scaleTo = Math.sin(progress * omega) / sinomega;
            }
            else {
                scaleFrom = 1.0 - progress;
                scaleTo = progress;
            }

            this._multi[0] = x * scaleFrom + qx * scaleTo;
            this._multi[1] = y * scaleFrom + qy * scaleTo;
            this._multi[2] = z * scaleFrom + qz * scaleTo;
            this._multi[3] = w * scaleFrom + qw * scaleTo;
        }
        else {
            for (var i = 0; i < to.length; i++) {
                this._multi[i] = from[i] + progress * (to[i] - from[i]);
            }
        }
        return this._multi;
    } else {
        return from + progress * (to - from);
    }
};

/**
 * Get interpolated state of current action at provided time. If the last
 *    action has completed, invoke its callback.
 *
 * @method get
 *
 * @param {Number=} timestamp Evaluate the curve at a normalized version of this
 *    time. If omitted, use current time. (Unix epoch time)
 * @return {Number|Array.Number} beginning state
 *    interpolated to this point in time.
 */
Transitionable.prototype.get = function get(t) {
    t = this._pausedAt ? this._pausedAt : t;
    t = t ? t : this.constructor.Clock.now();
    if (this._queue.length === 0) return this._end;

    var progress = (t - this._startedAt) / this._queue[2];
    var state = this._interpolate(this._end, this._queue[0], this._queue[1](progress > 1 ? 1 : progress), this._method);
    if (progress >= 1) {
        this._startedAt = this._startedAt + this._queue[2];
        this._end = this._queue.shift();
        this._queue.shift();
        this._queue.shift();
        var callback = this._queue.shift();
        if (callback) callback();
    }
    return progress > 1 ? this.get() : state;
};

/**
 * Is there at least one transition pending completion?
 *
 * @method isActive
 *
 * @return {boolean}
 */
Transitionable.prototype.isActive = function isActive() {
    return this._queue.length > 0;
};

/**
 * Halt transition at current state and erase all pending actions.
 *
 * @method halt
 * @chainable
 *
 * @return {Transitionable} this
 */
Transitionable.prototype.halt = function halt() {
    return this.from(this.get());
};

/**
 * Pause transition. This will not erase any actions.
 *
 * @method pause
 * @chainable
 *
 * @return {Transitionable} this
 */
Transitionable.prototype.pause = function pause() {
    this._pausedAt = this.constructor.Clock.now();
    return this;
};

/**
 * Has the current action been paused?
 *
 * @method isPaused
 * @chainable
 *
 * @return {Boolean} if the current action has been paused
 */
Transitionable.prototype.isPaused = function isPaused() {
    return !!this._pausedAt;
};

/**
 * Resume transition.
 *
 * @method resume
 * @chainable
 *
 * @return {Transitionable} this
 */
Transitionable.prototype.resume = function resume() {
    var diff = this._pausedAt - this._startedAt;
    this._startedAt = this.constructor.Clock.now() - diff;
    this._pausedAt = null;
    return this;
};

/**
 * Cancel all transitions and reset to a stable state
 *
 * @method reset
 * @chainable
 * @deprecated Use `.from` instead!
 *
 * @param {Number|Array.Number|Object.<number, number>} startState
 *    stable state to set to
 */
Transitionable.prototype.reset = function(start) {
    return this.from(start);
};

/**
 * Add transition to end state to the queue of pending transitions. Special
 *    Use: calling without a transition resets the object to that state with
 *    no pending actions
 *
 * @method set
 * @chainable
 * @deprecated Use `.to` instead!
 *
 * @param {Number|FamousMatrix|Array.Number|Object.<number, number>} endState
 *    end state to which we interpolate
 * @param {transition=} transition object of type {duration: number, curve:
 *    f[0,1] -> [0,1] or name}. If transition is omitted, change will be
 *    instantaneous.
 * @param {function()=} callback Zero-argument function to call on observed
 *    completion (t=1)
 */
Transitionable.prototype.set = function(state, transition, callback) {
    if (transition == null) {
        this.from(state);
        if (callback) callback();
    } else {
        this.to(state, transition.curve, transition.duration, callback, transition.method);
    }
    return this;
};

module.exports = Transitionable;

},{"./Curves":16}],18:[function(require,module,exports){
'use strict';

module.exports = {
    Curves: require('./Curves'),
    Transitionable: require('./Transitionable')
};

},{"./Curves":16,"./Transitionable":17}],19:[function(require,module,exports){
/*jshint -W008 */

'use strict';

var Curves = {
    /**
     * @property linear
     * @static
     * @type {Function}
     */
    linear: function(t) {
        return t;
    },

    /**
     * @property easeIn
     * @static
     * @type {Function}
     */
    easeIn: function(t) {
        return t*t;
    },

    /**
     * @property easeOut
     * @static
     * @type {Function}
     */
    easeOut: function(t) {
        return t*(2-t);
    },

    /**
     * @property easeInOut
     * @static
     * @type {Function}
     */
    easeInOut: function(t) {
        if (t <= 0.5) return 2*t*t;
        else return -2*t*t + 4*t - 1;
    },

    /**
     * @property easeOutBounce
     * @static
     * @type {Function}
     */
    easeOutBounce: function(t) {
        return t*(3 - 2*t);
    },

    /**
     * @property spring
     * @static
     * @type {Function}
     */
    spring: function(t) {
        return (1 - t) * Math.sin(6 * Math.PI * t) + t;
    },

    /**
     * @property inQuad
     * @static
     * @type {Function}
     */
    inQuad: function(t) {
        return t*t;
    },

    /**
     * @property outQuad
     * @static
     * @type {Function}
     */
    outQuad: function(t) {
        return -(t-=1)*t+1;
    },

    /**
     * @property inOutQuad
     * @static
     * @type {Function}
     */
    inOutQuad: function(t) {
        if ((t/=.5) < 1) return .5*t*t;
        return -.5*((--t)*(t-2) - 1);
    },

    /**
     * @property inCubic
     * @static
     * @type {Function}
     */
    inCubic: function(t) {
        return t*t*t;
    },

    /**
     * @property outCubic
     * @static
     * @type {Function}
     */
    outCubic: function(t) {
        return ((--t)*t*t + 1);
    },

    /**
     * @property inOutCubic
     * @static
     * @type {Function}
     */
    inOutCubic: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t;
        return .5*((t-=2)*t*t + 2);
    },

    /**
     * @property inQuart
     * @static
     * @type {Function}
     */
    inQuart: function(t) {
        return t*t*t*t;
    },

    /**
     * @property outQuart
     * @static
     * @type {Function}
     */
    outQuart: function(t) {
        return -((--t)*t*t*t - 1);
    },

    /**
     * @property inOutQuart
     * @static
     * @type {Function}
     */
    inOutQuart: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t*t;
        return -.5 * ((t-=2)*t*t*t - 2);
    },

    /**
     * @property inQuint
     * @static
     * @type {Function}
     */
    inQuint: function(t) {
        return t*t*t*t*t;
    },

    /**
     * @property outQuint
     * @static
     * @type {Function}
     */
    outQuint: function(t) {
        return ((--t)*t*t*t*t + 1);
    },

    /**
     * @property inOutQuint
     * @static
     * @type {Function}
     */
    inOutQuint: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t*t*t;
        return .5*((t-=2)*t*t*t*t + 2);
    },

    /**
     * @property inSine
     * @static
     * @type {Function}
     */
    inSine: function(t) {
        return -1.0*Math.cos(t * (Math.PI/2)) + 1.0;
    },

    /**
     * @property outSine
     * @static
     * @type {Function}
     */
    outSine: function(t) {
        return Math.sin(t * (Math.PI/2));
    },

    /**
     * @property inOutSine
     * @static
     * @type {Function}
     */
    inOutSine: function(t) {
        return -.5*(Math.cos(Math.PI*t) - 1);
    },

    /**
     * @property inExpo
     * @static
     * @type {Function}
     */
    inExpo: function(t) {
        return (t===0) ? 0.0 : Math.pow(2, 10 * (t - 1));
    },

    /**
     * @property outExpo
     * @static
     * @type {Function}
     */
    outExpo: function(t) {
        return (t===1.0) ? 1.0 : (-Math.pow(2, -10 * t) + 1);
    },

    /**
     * @property inOutExpo
     * @static
     * @type {Function}
     */
    inOutExpo: function(t) {
        if (t===0) return 0.0;
        if (t===1.0) return 1.0;
        if ((t/=.5) < 1) return .5 * Math.pow(2, 10 * (t - 1));
        return .5 * (-Math.pow(2, -10 * --t) + 2);
    },

    /**
     * @property inCirc
     * @static
     * @type {Function}
     */
    inCirc: function(t) {
        return -(Math.sqrt(1 - t*t) - 1);
    },

    /**
     * @property outCirc
     * @static
     * @type {Function}
     */
    outCirc: function(t) {
        return Math.sqrt(1 - (--t)*t);
    },

    /**
     * @property inOutCirc
     * @static
     * @type {Function}
     */
    inOutCirc: function(t) {
        if ((t/=.5) < 1) return -.5 * (Math.sqrt(1 - t*t) - 1);
        return .5 * (Math.sqrt(1 - (t-=2)*t) + 1);
    },

    /**
     * @property inElastic
     * @static
     * @type {Function}
     */
    inElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/ p));
    },

    /**
     * @property outElastic
     * @static
     * @type {Function}
     */
    outElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        return a*Math.pow(2,-10*t) * Math.sin((t-s)*(2*Math.PI)/p) + 1.0;
    },

    /**
     * @property inOutElastic
     * @static
     * @type {Function}
     */
    inOutElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if ((t/=.5)===2) return 1.0;  if (!p) p=(.3*1.5);
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p));
        return a*Math.pow(2,-10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p)*.5 + 1.0;
    },

    /**
     * @property inBack
     * @static
     * @type {Function}
     */
    inBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        return t*t*((s+1)*t - s);
    },

    /**
     * @property outBack
     * @static
     * @type {Function}
     */
    outBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        return ((--t)*t*((s+1)*t + s) + 1);
    },

    /**
     * @property inOutBack
     * @static
     * @type {Function}
     */
    inOutBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        if ((t/=.5) < 1) return .5*(t*t*(((s*=(1.525))+1)*t - s));
        return .5*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
    },

    /**
     * @property inBounce
     * @static
     * @type {Function}
     */
    inBounce: function(t) {
        return 1.0 - Curves.outBounce(1.0-t);
    },

    /**
     * @property outBounce
     * @static
     * @type {Function}
     */
    outBounce: function(t) {
        if (t < (1/2.75)) {
            return (7.5625*t*t);
        } else if (t < (2/2.75)) {
            return (7.5625*(t-=(1.5/2.75))*t + .75);
        } else if (t < (2.5/2.75)) {
            return (7.5625*(t-=(2.25/2.75))*t + .9375);
        } else {
            return (7.5625*(t-=(2.625/2.75))*t + .984375);
        }
    },

    /**
     * @property inOutBounce
     * @static
     * @type {Function}
     */
    inOutBounce: function(t) {
        if (t < .5) return Curves.inBounce(t*2) * .5;
        return Curves.outBounce(t*2-1.0) * .5 + .5;
    },

    flat: function() {
        return 0;
    }
};

module.exports = Curves;

},{}],20:[function(require,module,exports){
/*jshint -W008 */

'use strict';

var _defaultCurves = {
    /**
     * @property linear
     * @static
     * @type {Function}
     */
    linear: function(t) {
        return t;
    },

    /**
     * @property easeIn
     * @static
     * @type {Function}
     */
    easeIn: function(t) {
        return t*t;
    },

    /**
     * @property easeOut
     * @static
     * @type {Function}
     */
    easeOut: function(t) {
        return t*(2-t);
    },

    /**
     * @property easeInOut
     * @static
     * @type {Function}
     */
    easeInOut: function(t) {
        if (t <= 0.5) return 2*t*t;
        else return -2*t*t + 4*t - 1;
    },

    /**
     * @property easeOutBounce
     * @static
     * @type {Function}
     */
    easeOutBounce: function(t) {
        return t*(3 - 2*t);
    },

    /**
     * @property spring
     * @static
     * @type {Function}
     */
    spring: function(t) {
        return (1 - t) * Math.sin(6 * Math.PI * t) + t;
    },

    /**
     * @property inQuad
     * @static
     * @type {Function}
     */
    inQuad: function(t) {
        return t*t;
    },

    /**
     * @property outQuad
     * @static
     * @type {Function}
     */
    outQuad: function(t) {
        return -(t-=1)*t+1;
    },

    /**
     * @property inOutQuad
     * @static
     * @type {Function}
     */
    inOutQuad: function(t) {
        if ((t/=.5) < 1) return .5*t*t;
        return -.5*((--t)*(t-2) - 1);
    },

    /**
     * @property inCubic
     * @static
     * @type {Function}
     */
    inCubic: function(t) {
        return t*t*t;
    },

    /**
     * @property outCubic
     * @static
     * @type {Function}
     */
    outCubic: function(t) {
        return ((--t)*t*t + 1);
    },

    /**
     * @property inOutCubic
     * @static
     * @type {Function}
     */
    inOutCubic: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t;
        return .5*((t-=2)*t*t + 2);
    },

    /**
     * @property inQuart
     * @static
     * @type {Function}
     */
    inQuart: function(t) {
        return t*t*t*t;
    },

    /**
     * @property outQuart
     * @static
     * @type {Function}
     */
    outQuart: function(t) {
        return -((--t)*t*t*t - 1);
    },

    /**
     * @property inOutQuart
     * @static
     * @type {Function}
     */
    inOutQuart: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t*t;
        return -.5 * ((t-=2)*t*t*t - 2);
    },

    /**
     * @property inQuint
     * @static
     * @type {Function}
     */
    inQuint: function(t) {
        return t*t*t*t*t;
    },

    /**
     * @property outQuint
     * @static
     * @type {Function}
     */
    outQuint: function(t) {
        return ((--t)*t*t*t*t + 1);
    },

    /**
     * @property inOutQuint
     * @static
     * @type {Function}
     */
    inOutQuint: function(t) {
        if ((t/=.5) < 1) return .5*t*t*t*t*t;
        return .5*((t-=2)*t*t*t*t + 2);
    },

    /**
     * @property inSine
     * @static
     * @type {Function}
     */
    inSine: function(t) {
        return -1.0*Math.cos(t * (Math.PI/2)) + 1.0;
    },

    /**
     * @property outSine
     * @static
     * @type {Function}
     */
    outSine: function(t) {
        return Math.sin(t * (Math.PI/2));
    },

    /**
     * @property inOutSine
     * @static
     * @type {Function}
     */
    inOutSine: function(t) {
        return -.5*(Math.cos(Math.PI*t) - 1);
    },

    /**
     * @property inExpo
     * @static
     * @type {Function}
     */
    inExpo: function(t) {
        return (t===0) ? 0.0 : Math.pow(2, 10 * (t - 1));
    },

    /**
     * @property outExpo
     * @static
     * @type {Function}
     */
    outExpo: function(t) {
        return (t===1.0) ? 1.0 : (-Math.pow(2, -10 * t) + 1);
    },

    /**
     * @property inOutExpo
     * @static
     * @type {Function}
     */
    inOutExpo: function(t) {
        if (t===0) return 0.0;
        if (t===1.0) return 1.0;
        if ((t/=.5) < 1) return .5 * Math.pow(2, 10 * (t - 1));
        return .5 * (-Math.pow(2, -10 * --t) + 2);
    },

    /**
     * @property inCirc
     * @static
     * @type {Function}
     */
    inCirc: function(t) {
        return -(Math.sqrt(1 - t*t) - 1);
    },

    /**
     * @property outCirc
     * @static
     * @type {Function}
     */
    outCirc: function(t) {
        return Math.sqrt(1 - (--t)*t);
    },

    /**
     * @property inOutCirc
     * @static
     * @type {Function}
     */
    inOutCirc: function(t) {
        if ((t/=.5) < 1) return -.5 * (Math.sqrt(1 - t*t) - 1);
        return .5 * (Math.sqrt(1 - (t-=2)*t) + 1);
    },

    /**
     * @property inElastic
     * @static
     * @type {Function}
     */
    inElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/ p));
    },

    /**
     * @property outElastic
     * @static
     * @type {Function}
     */
    outElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        return a*Math.pow(2,-10*t) * Math.sin((t-s)*(2*Math.PI)/p) + 1.0;
    },

    /**
     * @property inOutElastic
     * @static
     * @type {Function}
     */
    inOutElastic: function(t) {
        var s=1.70158;var p=0;var a=1.0;
        if (t===0) return 0.0;  if ((t/=.5)===2) return 1.0;  if (!p) p=(.3*1.5);
        s = p/(2*Math.PI) * Math.asin(1.0/a);
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p));
        return a*Math.pow(2,-10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p)*.5 + 1.0;
    },

    /**
     * @property inBack
     * @static
     * @type {Function}
     */
    inBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        return t*t*((s+1)*t - s);
    },

    /**
     * @property outBack
     * @static
     * @type {Function}
     */
    outBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        return ((--t)*t*((s+1)*t + s) + 1);
    },

    /**
     * @property inOutBack
     * @static
     * @type {Function}
     */
    inOutBack: function(t, s) {
        if (s === undefined) s = 1.70158;
        if ((t/=.5) < 1) return .5*(t*t*(((s*=(1.525))+1)*t - s));
        return .5*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
    },

    /**
     * @property inBounce
     * @static
     * @type {Function}
     */
    inBounce: function(t) {
        return 1.0 - _defaultCurves.outBounce(1.0-t);
    },

    /**
     * @property outBounce
     * @static
     * @type {Function}
     */
    outBounce: function(t) {
        if (t < (1/2.75)) {
            return (7.5625*t*t);
        } else if (t < (2/2.75)) {
            return (7.5625*(t-=(1.5/2.75))*t + .75);
        } else if (t < (2.5/2.75)) {
            return (7.5625*(t-=(2.25/2.75))*t + .9375);
        } else {
            return (7.5625*(t-=(2.625/2.75))*t + .984375);
        }
    },

    /**
     * @property inOutBounce
     * @static
     * @type {Function}
     */
    inOutBounce: function(t) {
        if (t < .5) return _defaultCurves.inBounce(t*2) * .5;
        return _defaultCurves.outBounce(t*2-1.0) * .5 + .5;
    }
};

var _curves = Object.create(_defaultCurves);

/*
 * A library of curves which map an animation explicitly as a function of time.
 *    The following easing curves are available by default and can not be
 *    unregistered or overwritten:
 *
 *    linear,
 *    easeIn, easeOut, easeInOut,
 *    easeOutBounce,
 *    spring,
 *    inQuad, outQuad, inOutQuad,
 *    inCubic, outCubic, inOutCubic,
 *    inQuart, outQuart, inOutQuart,
 *    inQuint, outQuint, inOutQuint,
 *    inSine, outSine, inOutSine,
 *    inExpo, outExpo, inOutExpo,
 *    inCirc, outCirc, inOutCirc,
 *    inElastic, outElastic, inOutElastic,
 *    inBack, outBack, inOutBack,
 *    inBounce, outBounce, inOutBounce
 *
 * @class Easing
 * @deprecated Use curves instead
 */
var Easing = {
    /**
     * Registers a given curve to be available in subsequent transitions by
     *    adding it to the interal dictionary of registered curves.
     *
     * @method registerCurve
     * @chainable
     * @static
     *
     * @throws {Error} Will throw an error when attempting to overwrite default
     *    curve.
     * @throws {Error} Will throw an error if curve has already been registered.
     *
     * @param {String} name unique name for later access
     * @param {Function} curve function of one numeric variable mapping [0,1]
     *    to range inside [0,1]
     * @return {Easing} this
     */
    registerCurve: function(name, curve) {
        console.warn('Easing is deprecated! Use transitions.Curves instead!');
        if (_defaultCurves[name]) throw new Error('Default curves can not be overwritten');
        if (_curves[name]) throw new Error('Curve has already been registered');
        _curves[name] = curve;
        return this;
    },

    /**
     * Unregisters the curve registered under the given name by removing it from
     *    the internal dictionary of registered curves. This won't effect
     *    currently active transitions.
     *
     * @method unregisterCurve
     * @chainable
     * @static
     *
     * @throws {Error} Will throw an error if curve does not exist.
     * @param {String} name name of curve
     * @return {Easing} this
     */
    unregisterCurve: function(name) {
        console.warn('Easing is deprecated! Use transitions.Curves instead!');
        if (_defaultCurves[name]) throw new Error('Default curves can not be unregistered');
        if (!_curves[name]) throw new Error('Curve has not been registered');
        delete _curves[name];
        return this;
    },

    /**
     * Returns the easing curve with the given name.
     *
     * @method getCurve
     * @static
     *
     * @param {String} name name of curve
     * @return {Function} curve function of one numeric variable mapping [0,1]
     *    to range inside [0,1]
     */
    getCurve: function(name) {
        console.warn('Easing is deprecated! Use transitions.Curves instead!');
        return _curves[name];
    },

    /**
     * Retrieves the names of all previously registered easing curves.
     *
     * @method getCurves
     * @static
     *
     * @return {String[]} array of registered easing curves
     */
    getCurves: function() {
        console.warn('Easing is deprecated! Use transitions.Curves instead!');
        return Object.keys(_defaultCurves).concat(Object.keys(_curves));
    },

    createBezierCurve: function(v1, v2) {
        console.warn('Easing is deprecated! Use transitions.Curves instead!');
        v1 = v1 || 0; v2 = v2 || 0;
        return function(t) {
            return v1*t + (-2*v1 - v2 + 3)*t*t + (v1 + v2 - 2)*t*t*t;
        };
    }
};

module.exports = Easing;

},{}],21:[function(require,module,exports){
'use strict';

var Curves = require('./Curves');

/**
 * A state maintainer for a smooth transition between
 *    numerically-specified states. Example numeric states include floats and
 *    arrays of floats objects.
 *
 * An initial state is set with the constructor or using
 *     {@link Transitionable#from}. Subsequent transitions consist of an
 *     intermediate state, easing curve, duration and callback. The final state
 *     of each transition is the initial state of the subsequent one. Calls to
 *     {@link Transitionable#get} provide the interpolated state along the way.
 *
 * Note that there is no event loop here - calls to {@link Transitionable#get}
 *    are the only way to find state projected to the current (or provided)
 *    time and are the only way to trigger callbacks and mutate the internal
 *    transition queue.
 *
 * @example
 * var t = new Transitionable([0, 0]);
 * t
 *     .to([100, 0], 'linear', 1000)
 *     .delay(1000)
 *     .to([200, 0], 'outBounce', 1000);
 *
 * var div = document.createElement('div');
 * div.style.background = 'blue';
 * div.style.width = '100px';
 * div.style.height = '100px';
 * document.body.appendChild(div);
 *
 * div.addEventListener('click', function() {
 *     t.isPaused() ? t.resume() : t.pause();
 * });
 *
 * requestAnimationFrame(function loop() {
 *     div.style.transform = 'translateX(' + t.get()[0] + 'px)' + ' translateY(' + t.get()[1] + 'px)';
 *     requestAnimationFrame(loop);
 * });
 *
 * @class Transitionable
 * @constructor
 * @param {Number|Array.Number} initialState    initial state to transition
 *                                              from - equivalent to a pursuant
 *                                              invocation of
 *                                              {@link Transitionable#from}
 */
function Transitionable(initialState) {
    this._queue = [];
    this._multi = null;
    this._end = null;
    this._startedAt = null;
    this._pausedAt = null;
    if (initialState != null) this.from(initialState);
}

/**
 * Internal Clock used for determining the current time for the ongoing
 * transitions.
 *
 * @type {Performance|Date|Object}
 */
Transitionable.Clock = typeof performance !== 'undefined' ? performance : Date;

/**
 * Registers a transition to be pushed onto the internal queue.
 *
 * @method to
 * @chainable
 *
 * @param  {Number|Array.Number}    finalState              final state to
 *                                                          transiton to
 * @param  {String|Function}        [curve=Curves.linear]   easing function
 *                                                          used for
 *                                                          interpolating
 *                                                          [0, 1]
 * @param  {Number}                 [duration=100]          duration of
 *                                                          transition
 * @param  {Function}               [callback]              callback function
 *                                                          to be called after
 *                                                          the transition is
 *                                                          complete
 * @return {Transitionable}         this
 */
Transitionable.prototype.to = function to(finalState, curve, duration, callback) {
    curve = curve != null && curve.constructor === String ? Curves[curve] : curve;
    if (this._queue.length === 0) {
        this._startedAt = this.constructor.Clock.now();
        this._pausedAt = null;
    }
    this._queue.push(
        finalState,
        curve != null ? curve : Curves.linear,
        duration != null ? duration : 100,
        callback
    );
    return this;
};

/**
 * Resets the transition queue to a stable initial state.
 *
 * @method from
 * @chainable
 *
 * @param  {Number|Array.Number}    initialState    initial state to
 *                                                  transition from
 * @return {Transitionable}         this
 */
Transitionable.prototype.from = function from(initialState) {
    this._end = initialState;
    if (initialState.constructor === Array && this._multi != null && this._multi.constructor === Array) {
        this._multi.length = initialState.length;
    } else {
        this._multi = initialState.constructor === Array ? [] : false;
    }
    this._queue.length = 0;
    this._startedAt = this.constructor.Clock.now();
    this._pausedAt = null;
    return this;
};

/**
 * Delays the execution of the subsequent transition for a certain period of
 * time.
 *
 * @method delay
 * @chainable
 *
 * @param {Number}      duration    delay time in ms
 * @param {Function}    [callback]  Zero-argument function to call on observed
 *                                  completion (t=1)
 * @return {Transitionable}         this
 */
Transitionable.prototype.delay = function delay(duration, callback) {
    var endState = this._queue.length > 0 ? this._queue[this._queue.length - 4] : this._end;
    return this.to(endState, Curves.flat, duration, callback);
};

/**
 * Overrides current transition.
 *
 * @method override
 * @chainable
 *
 * @param  {Number|Array.Number}    [finalState]    final state to transiton to
 * @param  {String|Function}        [curve]         easing function used for
 *                                                  interpolating [0, 1]
 * @param  {Number}                 [duration]      duration of transition
 * @param  {Function}               [callback]      callback function to be
 *                                                  called after the transition
 *                                                  is complete
 * @return {Transitionable}         this
 */
Transitionable.prototype.override = function override(finalState, curve, duration, callback) {
    if (this._queue.length > 0) {
        if (finalState != null) this._queue[0] = finalState;
        if (curve != null)      this._queue[1] = curve.constructor === String ? Curves[curve] : curve;
        if (duration != null)   this._queue[2] = duration;
        if (callback != null)   this._queue[3] = callback;
    }
    return this;
};

Transitionable.prototype._interpolate = function _interpolate(from, to, progress) {
    if (this._multi) {
        for (var i = 0; i < to.length; i++) {
            this._multi[i] = from[i] + progress * (to[i] - from[i]);
        }
        return this._multi;
    } else {
        return from + progress * (to - from);
    }
};

/**
 * Get interpolated state of current action at provided time. If the last
 *    action has completed, invoke its callback.
 *
 * @method get
 *
 * @param {Number=} timestamp Evaluate the curve at a normalized version of this
 *    time. If omitted, use current time. (Unix epoch time)
 * @return {Number|Array.Number} beginning state
 *    interpolated to this point in time.
 */
Transitionable.prototype.get = function get(t) {
    t = this._pausedAt ? this._pausedAt : t;
    t = t ? t : this.constructor.Clock.now();
    if (this._queue.length === 0) return this._end;

    var progress = (t - this._startedAt) / this._queue[2];
    var state = this._interpolate(this._end, this._queue[0], this._queue[1](progress > 1 ? 1 : progress));
    if (progress >= 1) {
        this._startedAt = this._startedAt + this._queue[2];
        this._end = this._queue.shift();
        this._queue.shift();
        this._queue.shift();
        var callback = this._queue.shift();
        if (callback) callback();
    }
    return progress > 1 ? this.get() : state;
};

/**
 * Is there at least one transition pending completion?
 *
 * @method isActive
 *
 * @return {boolean}
 */
Transitionable.prototype.isActive = function isActive() {
    return this._queue.length > 0;
};

/**
 * Halt transition at current state and erase all pending actions.
 *
 * @method halt
 * @chainable
 *
 * @return {Transitionable} this
 */
Transitionable.prototype.halt = function halt() {
    return this.from(this.get());
};

/**
 * Pause transition. This will not erase any actions.
 *
 * @method pause
 * @chainable
 *
 * @return {Transitionable} this
 */
Transitionable.prototype.pause = function pause() {
    this._pausedAt = this.constructor.Clock.now();
    return this;
};

/**
 * Has the current action been paused?
 *
 * @method isPaused
 * @chainable
 *
 * @return {Boolean} if the current action has been paused
 */
Transitionable.prototype.isPaused = function isPaused() {
    return !!this._pausedAt;
};

/**
 * Resume transition.
 *
 * @method resume
 * @chainable
 *
 * @return {Transitionable} this
 */
Transitionable.prototype.resume = function resume() {
    var diff = this._pausedAt - this._startedAt;
    this._startedAt = this.constructor.Clock.now() - diff;
    this._pausedAt = null;
    return this;
};

/**
 * Cancel all transitions and reset to a stable state
 *
 * @method reset
 * @chainable
 * @deprecated Use `.from` instead!
 *
 * @param {Number|Array.Number|Object.<number, number>} startState
 *    stable state to set to
 */
Transitionable.prototype.reset = function(start) {
    return this.from(start);
};

/**
 * Add transition to end state to the queue of pending transitions. Special
 *    Use: calling without a transition resets the object to that state with
 *    no pending actions
 *
 * @method set
 * @chainable
 * @deprecated Use `.to` instead!
 *
 * @param {Number|FamousMatrix|Array.Number|Object.<number, number>} endState
 *    end state to which we interpolate
 * @param {transition=} transition object of type {duration: number, curve:
 *    f[0,1] -> [0,1] or name}. If transition is omitted, change will be
 *    instantaneous.
 * @param {function()=} callback Zero-argument function to call on observed
 *    completion (t=1)
 */
Transitionable.prototype.set = function(state, transition, callback) {
    if (transition == null) {
        this.from(state);
        if (callback) callback();
    } else {
        this.to(state, transition.curve, transition.duration, callback);
    }
    return this;
};

module.exports = Transitionable;

},{"./Curves":19}],22:[function(require,module,exports){
'use strict';

/**
 * Return wrapper around callback function. Once the wrapper is called N
 *   times, invoke the callback function. Arguments and scope preserved.
 *
 * @method after
 * @deprecated
 *
 * @param {number} count number of calls before callback function invoked
 * @param {Function} callback wrapped callback function
 *
 * @return {function} wrapped callback with coundown feature
 */
var after = function after(count, callback) {
    console.warn('transitions.after is deprecated!');
    var counter = count;
    return function() {
        counter--;
        if (counter === 0) callback.apply(this, arguments);
    };
};

module.exports = after;

},{}],23:[function(require,module,exports){
'use strict';

module.exports = {
    after: require('./after'),
    Easing: require('./Easing'),
    Curves: require('./Curves'),
    Transitionable: require('./Transitionable')
};

},{"./Curves":19,"./Easing":20,"./Transitionable":21,"./after":22}],24:[function(require,module,exports){
'use strict';

/**
 * A lightweight, featureless EventEmitter.
 * 
 * @class CallbackStore
 * @constructor
 */
function CallbackStore () {
    this._events = {};
}

/**
 * Adds a listener for the specified event (= key).
 *
 * @method on
 * @chainable
 * 
 * @param  {String}   key
 * @param  {Function} callback
 * @return {Function} A function to call if you want to remove the callback
 */
CallbackStore.prototype.on = function on (key, callback) {
    if (!this._events[key]) this._events[key] = [];
    var callbackList = this._events[key];
    callbackList.push(callback);
    return function () {
        callbackList.splice(callbackList.indexOf(callback), 1);
    }
};

/**
 * Removes a previously added event listener.
 *
 * @method off
 * @chainable
 * 
 * @param  {String}          key
 * @param  {Function}        callback
 * @return {CallbackStore}   this
 */
CallbackStore.prototype.off = function off (key, callback) {
    var events = this._events[key];
    if (events) events.splice(events.indexOf(callback), 1);
    return this;
};

/**
 * Invokes all the previously for this key registered callbacks.
 *
 * @method trigger
 * @chainable
 * 
 * @param  {String}        key
 * @param  {Object}        payload
 * @return {CallbackStore} this
 */
CallbackStore.prototype.trigger = function trigger (key, payload) {
    var events = this._events[key];
    if (events) {
        var i = 0;
        var len = events.length;
        for (; i < len ; i++) events[i](payload);
    }
    return this;
};

module.exports = CallbackStore;

},{}],25:[function(require,module,exports){
'use strict';

var Transitionable = require('famous-transitions').Transitionable;

/**
 * @class Color
 * @constructor
 * @component
 * @param {Color|String|Array} Optional argument for setting color using
 * Hex, a Color instance, color name or RGB
 * @param {Object} Optional transition
 * @param {Function} Callback
 */
function Color(color, transition, cb) {
    this._r = new Transitionable(0);
    this._g = new Transitionable(0);
    this._b = new Transitionable(0);
    if (color) this.set(color, transition, cb);
};

/**
* Returns the definition of the Class: 'Color'
* @method toString
* @return {String} definition
*/
Color.toString = function toString() {
    return 'Color';
};

/**
* Sets the color. It accepts an optional transition parameter and callback.
* set(Color, transition, callback)
* set('#000000', transition, callback)
* set('black', transition, callback)
* set([r, g, b], transition, callback)
* @method set
 * @param {Color|String|Array} Optional argument for setting color using
 * Hex, a Color instance, color name or RGB
 * @param {Object} Optional transition
 * @param {Function} Callback
* @chainable
*/
Color.prototype.set = function set(color, transition, cb) {
    switch (Color.determineType(color)) {
        case 'hex': return this.setHex(color, transition, cb);
        case 'colorName': return this.setColor(color, transition, cb);
        case 'instance': return this.changeTo(color, transition, cb);
        case 'rgb': return this.setRGB(color[0], color[1], color[2], transition, cb);
    }
};

/**
 * Returns whether Color is still in an animating (transitioning) state.
 *
 * @method isActive
 * @returns {Boolean} boolean
 */
Color.prototype.isActive = function isActive() {
    return this._r.isActive() || this._g.isActive() || this._b.isActive();
};

/**
 * Halt transition at current state and erase all pending actions.
 *
 * @method halt
 * @chainable
 *
 * @return {Color} this
 */
Color.prototype.halt = function halt() {
    this._r.halt();
    this._g.halt();
    this._b.halt();
    return this;
};

/**
 * Sets the color values from another Color instance.
 *
 * @method changeTo
 * @param {Color} Color instance
 * @param {Object} transition Optional transition
 * @param {Function} callback Optional
 * @chainable
 */
Color.prototype.changeTo = function changeTo(color, transition, cb) {
    if (Color.isColorInstance(color)) {
        var rgb = color.getRGB();
        this.setRGB(rgb[0], rgb[1], rgb[2], transition, cb);
    }
    return this;
};

/**
 * Sets the color based on static color names.
 *
 * @method setColor
 * @param {String} Color name
 * @param {Object} transition Optional transition parameters
 * @param {Function} callback Optional
 * @chainable
 */
Color.prototype.setColor = function setColor(name, transition, cb) {
    if (colorNames[name]) {
        this.setHex(colorNames[name], transition, cb);
    }
    return this;
};

/**
 * Returns the color in either RGB or with the requested format.
 *
 * @method getColor
 * @param {String} Optional argument for determining which type of color to get (default is RGB)
 * @returns Color in either RGB or specific option value
 */
Color.prototype.getColor = function getColor(option) {
    if (Color.isString(option)) option = option.toLowerCase();
    return (option === 'hex') ? this.getHex() : this.getRGB();
};

/**
 * Sets the R of the Color's RGB
 *
 * @method setR
 * @param {Integer} R channel of color
 * @param {Object} transition Optional transition parameters
 * @param {Function} callback Optional
 * @chainable
 */
Color.prototype.setR = function setR(r, transition, cb) {
    this._r.set(r, transition, cb);
    return this;
};

/**
 * Sets the G of the Color's RGB
 *
 * @method setG
 * @param {Integer} G channel of color
 * @param {Object} transition Optional transition parameters
 * @param {Function} callback Optional
 * @chainable
 */
Color.prototype.setG = function setG(g, transition, cb) {
    this._g.set(g, transition, cb);
    return this;
};

/**
 * Sets the B of the Color's RGB
 *
 * @method setB
 * @param {Integer} B channel of color
 * @param {Object} transition Optional transition parameters
 * @param {Function} callback Optional
 * @chainable
 */
Color.prototype.setB = function setB(b, transition, cb) {
    this._b.set(b, transition, cb);
    return this;
};

/**
 * Sets RGB
 *
 * @method setRGB
 * @param {Integer} R channel of color
 * @param {Integer} G channel of color
 * @param {Integer} B channel of color
 * @param {Object} transition Optional transition parameters
 * @param {Function} callback Optional
 * @chainable
 */
Color.prototype.setRGB = function setRGB(r, g, b, transition, cb) {
    this.setR(r, transition);
    this.setG(g, transition);
    this.setB(b, transition, cb);
    return this;
};

/**
 * Returns R of RGB
 *
 * @method getR
 * @returns R of Color
 */
Color.prototype.getR = function getR() {
    return this._r.get();
};

/**
 * Returns G of RGB
 *
 * @method getG
 * @returns G of Color
 */
Color.prototype.getG = function getG() {
    return this._g.get();
};

/**
 * Returns B of RGB
 *
 * @method getB
 * @returns B of Color
 */
Color.prototype.getB = function getB() {
    return this._b.get();
};

/**
 * Returns RGB
 *
 * @method getRGB
 * @returns RGB
 */
Color.prototype.getRGB = function getRGB() {
    return [this.getR(), this.getG(), this.getB()];
};

/**
 * Returns Normalized RGB
 *
 * @method getNormalizedRGB
 * @returns Normalized RGB
 */
Color.prototype.getNormalizedRGB = function getNormalizedRGB() {
    var r = this.getR() / 255.0;
    var g = this.getG() / 255.0;
    var b = this.getB() / 255.0;
    return [r, g, b];
};

/**
 * Returns the current color in Hex
 *
 * @method getHex
 * @returns Hex value
 */
Color.prototype.getHex = function getHex() {
    var r = Color.toHex(this.getR());
    var g = Color.toHex(this.getG());
    var b = Color.toHex(this.getB());
    return '#' + r + g + b;
};

/**
 * Sets color using Hex
 *
 * @method setHex
 * @param {String} Hex value
 * @param {Object} transition Optional transition parameters
 * @param {Function} callback Optional
 * @chainable
 */
Color.prototype.setHex = function setHex(hex, transition, cb) {
    hex = (hex.charAt(0) === '#') ? hex.substring(1, hex.length) : hex;

    if (hex.length === 3) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
    }

    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    this.setRGB(r, g, b, transition, cb);
    return this;
};

/**
 * Converts a number to a hex value
 *
 * @method toHex
 * @param {Integer} Number
 * @returns Hex value
 */
Color.toHex = function toHex(num) {
    var hex = num.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
};

/**
 * Determines the given input with the appropriate configuration
 *
 * @method determineType
 * @param {Color|String|Array} Color type
 * @returns {String} Appropriate color type
 */
Color.determineType = function determineType(type) {
    if (Color.isColorInstance(type)) return 'instance';
    if (colorNames[type]) return 'colorName';
    if (Color.isHex(type)) return 'hex';
    if (Array.isArray(type)) return 'rgb';
};

/**
 * Returns a boolean checking whether input is a 'String'
 *
 * @method isString
 * @param Primitive
 * @returns {Boolean} Boolean
 */
Color.isString = function isString(val) {
    return (typeof val === 'string');
};

/**
 * Returns a boolean checking whether string input has a hash (#) symbol
 *
 * @method isHex
 * @param String
 * @returns {Boolean} Boolean
 */
Color.isHex = function isHex(val) {
    if (!Color.isString(val)) return false;
    return val[0] === '#';
};

/**
 * Returns boolean whether the input is a Color instance
 *
 * @method isColorInstance
 * @param Color instance
 * @returns {Boolean} Boolean
 */
Color.isColorInstance = function isColorInstance(val) {
    return !!val.getColor;
};

/**
 * Common color names with their associated Hex values
 */
var colorNames = { aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff', aquamarine: '#7fffd4', azure: '#f0ffff', beige: '#f5f5dc', bisque: '#ffe4c4', black: '#000000', blanchedalmond: '#ffebcd', blue: '#0000ff', blueviolet: '#8a2be2', brown: '#a52a2a', burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00', chocolate: '#d2691e', coral: '#ff7f50', cornflowerblue: '#6495ed', cornsilk: '#fff8dc', crimson: '#dc143c', cyan: '#00ffff', darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b', darkgray: '#a9a9a9', darkgreen: '#006400', darkgrey: '#a9a9a9', darkkhaki: '#bdb76b', darkmagenta: '#8b008b', darkolivegreen: '#556b2f', darkorange: '#ff8c00', darkorchid: '#9932cc', darkred: '#8b0000', darksalmon: '#e9967a', darkseagreen: '#8fbc8f', darkslateblue: '#483d8b', darkslategray: '#2f4f4f', darkslategrey: '#2f4f4f', darkturquoise: '#00ced1', darkviolet: '#9400d3', deeppink: '#ff1493', deepskyblue: '#00bfff', dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1e90ff', firebrick: '#b22222', floralwhite: '#fffaf0', forestgreen: '#228b22', fuchsia: '#ff00ff', gainsboro: '#dcdcdc', ghostwhite: '#f8f8ff', gold: '#ffd700', goldenrod: '#daa520', gray: '#808080', green: '#008000', greenyellow: '#adff2f', grey: '#808080', honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c', indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa', lavenderblush: '#fff0f5', lawngreen: '#7cfc00', lemonchiffon: '#fffacd', lightblue: '#add8e6', lightcoral: '#f08080', lightcyan: '#e0ffff', lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3', lightgreen: '#90ee90', lightgrey: '#d3d3d3', lightpink: '#ffb6c1', lightsalmon: '#ffa07a', lightseagreen: '#20b2aa', lightskyblue: '#87cefa', lightslategray: '#778899', lightslategrey: '#778899', lightsteelblue: '#b0c4de', lightyellow: '#ffffe0', lime: '#00ff00', limegreen: '#32cd32', linen: '#faf0e6', magenta: '#ff00ff', maroon: '#800000', mediumaquamarine: '#66cdaa', mediumblue: '#0000cd', mediumorchid: '#ba55d3', mediumpurple: '#9370db', mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee', mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc', mediumvioletred: '#c71585', midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1', moccasin: '#ffe4b5', navajowhite: '#ffdead', navy: '#000080', oldlace: '#fdf5e6', olive: '#808000', olivedrab: '#6b8e23', orange: '#ffa500', orangered: '#ff4500', orchid: '#da70d6', palegoldenrod: '#eee8aa', palegreen: '#98fb98', paleturquoise: '#afeeee', palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9', peru: '#cd853f', pink: '#ffc0cb', plum: '#dda0dd', powderblue: '#b0e0e6', purple: '#800080', rebeccapurple: '#663399', red: '#ff0000', rosybrown: '#bc8f8f', royalblue: '#4169e1', saddlebrown: '#8b4513', salmon: '#fa8072', sandybrown: '#f4a460', seagreen: '#2e8b57', seashell: '#fff5ee', sienna: '#a0522d', silver: '#c0c0c0', skyblue: '#87ceeb', slateblue: '#6a5acd', slategray: '#708090', slategrey: '#708090', snow: '#fffafa', springgreen: '#00ff7f', steelblue: '#4682b4', tan: '#d2b48c', teal: '#008080', thistle: '#d8bfd8', tomato: '#ff6347', turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3', white: '#ffffff', whitesmoke: '#f5f5f5', yellow: '#ffff00', yellowgreen: '#9acd32' };

module.exports = Color;

},{"famous-transitions":23}],26:[function(require,module,exports){
'use strict';

/**
 * Collection to map keyboard codes in plain english
 *
 * @class KeyCodes
 * @static
 */
module.exports = {
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    9: 57,
    a: 97,
    b: 98,
    c: 99,
    d: 100,
    e: 101,
    f: 102,
    g: 103,
    h: 104,
    i: 105,
    j: 106,
    k: 107,
    l: 108,
    m: 109,
    n: 110,
    o: 111,
    p: 112,
    q: 113,
    r: 114,
    s: 115,
    t: 116,
    u: 117,
    v: 118,
    w: 119,
    x: 120,
    y: 121,
    z: 122,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    ENTER : 13,
    LEFT_ARROW: 37,
    RIGHT_ARROW: 39,
    UP_ARROW: 38,
    DOWN_ARROW: 40,
    SPACE: 32,
    SHIFT: 16,
    TAB: 9
};


},{}],27:[function(require,module,exports){
'use strict';

function MethodStore () {
    this._events = {};
}

MethodStore.prototype.on = function on (key, cbclass, cbname) {
    var events = this._events[key];
    if (!events) events = [];
    events.push(cbclass, cbname);
    return this;
}

MethodStore.prototype.off = function off (key, cbclass) {
    var events = this._events[key];
    if (events) {
        var index = events.indexOf(cbclass);
        if (index > -1) events.splice(index, 2);
    }
    return this;
}

MethodStore.prototype.trigger = function trigger (key, payload) {
    var events = this._events[key];
    if (events) {
        var i = 0;
        var len = events.length;
        for (; i < len ; i += 2) events[i][events[i + 1]](payload);
    }
    return this;
};

module.exports = MethodStore;

},{}],28:[function(require,module,exports){
'use strict';

/**
 * Singleton object to manage recycling of objects with typically short lifespans, used to cut down on the
 * amount of garbage collection required.
 *
 * @singleton
 */
var ObjectManager = {};

ObjectManager.pools = {};

/**
 * Register request and free functions for the given type.
 *
 * @method register
 * @param {String} type
 * @param {Function} Constructor
 */
ObjectManager.register = function(type, Constructor) {
    var pool = this.pools[type] = [];

    this['request' + type] = _request(pool, Constructor);
    this['free' + type] = _free(pool);
};

function _request(pool, Constructor) {
    return function request() {
        if (pool.length !== 0) return pool.pop();
        else return new Constructor();
    }
}

function _free(pool) {
    return function free(obj) {
        pool.push(obj);
    }
}

/**
 * Untrack all object of the given type. Used to allow allocated objects to be garbage collected.
 *
 * @method disposeOf
 * @param {String}
 */
ObjectManager.disposeOf= function(type) {
    var pool = this.pools[type];
    var i = pool.length;
    while (i--) pool.pop();
};

module.exports = ObjectManager;

},{}],29:[function(require,module,exports){
'use strict';

/**
 *  Deep clone an object.
 *  @memberof Utilities
 *  @param b {Object} Object to clone
 *  @return a {Object} Cloned object.
 */
var clone = function clone(b) {
    var a;
    if (typeof b === 'object') {
        a = (b instanceof Array) ? [] : {};
        for (var key in b) {
            if (typeof b[key] === 'object' && b[key] !== null) {
                if (b[key] instanceof Array) {
                    a[key] = new Array(b[key].length);
                    for (var i = 0; i < b[key].length; i++) {
                        a[key][i] = clone(b[key][i]);
                    }
                }
                else {
                  a[key] = clone(b[key]);
                }
            }
            else {
                a[key] = b[key];
            }
        }
    }
    else {
        a = b;
    }
    return a;
};

module.exports = clone;

},{}],30:[function(require,module,exports){
'use strict';

/**
 * Flat clone an object.
 * @memberof Utilities
 * @param {Object} obj - Object to clone
 * @return {Object} Cloned object
 */
function flatClone(obj) {
    var clone = {};
    for (var key in obj) clone[key] = obj[key];
    return clone;
}

module.exports = flatClone;

},{}],31:[function(require,module,exports){
'use strict';

module.exports = {
    CallbackStore: require('./CallbackStore'),
    clone: require('./clone'),
    flatClone: require('./flatClone'),
    KeyCodes: require('./KeyCodes'),
    loadURL: require('./loadURL'),
    MethodStore: require('./MethodStore'),
    ObjectManager: require('./ObjectManager'),
    Color: require('./Color'),
    strip: require('./strip'),
    keyValueToArrays: require('./keyValueToArrays')
};


},{"./CallbackStore":24,"./Color":25,"./KeyCodes":26,"./MethodStore":27,"./ObjectManager":28,"./clone":29,"./flatClone":30,"./keyValueToArrays":32,"./loadURL":33,"./strip":34}],32:[function(require,module,exports){
/**
 * Takes an object containing keys and values and returns an object
 * comprising two "associate" arrays, one with the keys and the other
 * with the values.
 *
 * @method keyValuesToArrays
 *
 * @param {Object} Object
 * @returns {Object} Object Object containing two arrays, one with the keys and the other for values
 */
module.exports = function keyValuesToArrays(obj) {
    var keysArray = [], valuesArray = [];
    var i = 0;
    for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keysArray[i] = key;
            valuesArray[i] = obj[key];
            i++;
        }
    }
    return {
        keys: keysArray,
        values: valuesArray
    };
};

},{}],33:[function(require,module,exports){
'use strict';

/**
 * Load a URL and return its contents in a callback
 *
 * @method loadURL
 * @memberof Utilities
 * @param {string} url URL of object
 * @param {function} callback callback to dispatch with content
 */
var loadURL = function loadURL(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function onreadystatechange() {
        if (this.readyState === 4) {
            if (callback) callback(this.responseText);
        }
    };
    xhr.open('GET', url);
    xhr.send();
};

module.exports = loadURL;

},{}],34:[function(require,module,exports){
'use strict';

/**
 * Removes all values not being of a primitive type from an arbitrary object
 * literal.
 *
 * @method strip
 * @memberof Utilities
 * @param  {any}        primitive or (non-)serializable object without
 *                      circular references
 * @return {any}        primitive or (nested) object only containing primitive
 *                      types (serializable)
 */
function strip(obj) {
    switch (obj) {
        case null:
        case undefined:
            return obj;
    }
    switch (obj.constructor) {
        case Boolean:
        case Number:
        case String:
        case Symbol:
            return obj;
        case Object:
            for (var key in obj) {
                var stripped = strip(obj[key], true);
                obj[key] = stripped;
            }
            return obj;
        default:
            return null;
    }
}

module.exports = strip;

},{}],35:[function(require,module,exports){
'use strict';

var Position = require('./Position');

/**
 * @class Align
 * @constructor
 * @component
 * @param {LocalDispatch} node LocalDispatch to be retrieved from corresponding Render Node of the Align component
 */

function Align(node) {
    Position.call(this, node);

    var initial = node.getAlign();

    this._x.set(initial[0]);
    this._y.set(initial[1]);
    this._z.set(initial[2]);
}

/**
*
* stringifies Align
*
* @method
* @return {String} the name of the Component Class: 'Align'
*/
Align.toString = function toString() {
    return Align.toString;
};

Align.prototype = Object.create(Position.prototype);
Align.prototype.constructor = Align;

Align.prototype.update = function update() {
    this._node.setAlign(this._x.get(), this._y.get(), this._z.get());
    this._checkUpdate();
};

Align.prototype.onUpdate = Align.prototype.update;

module.exports = Align;

},{"./Position":43}],36:[function(require,module,exports){
'use strict';

/**
 * @class Camera
 * @constructor
 * @component
 * @param {RenderNode} RenderNode to which the instance of Camera will be a component of
 */
function Camera(node) {
    this._node = node;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;
    this._requestingUpdate = false;
    this._id = node.addComponent(this);
    this._viewTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._viewDirty = false;
    this._perspectiveDirty = false;
    this.setFlat();
}

Camera.FRUSTUM_PROJECTION = 0;
Camera.PINHOLE_PROJECTION = 1;
Camera.ORTHOGRAPHIC_PROJECTION = 2;

// Return the name of the Element Class: 'Camera'
Camera.toString = function toString() {
    return 'Camera';
};

Camera.prototype.getValue = function getValue() {
    return {
        component: this.constructor.toString(),
        projectionType: this._projectionType,
        focalDepth: this._focalDepth,
        near: this._near,
        far: this._far
    };
};

Camera.prototype.setValue = function setValue(state) {
    if (state.component === this.constructor.toString()) {
        this.set(state.projectionType, state.focalDepth, state.near, state.far);
        return true;
    }
    return false;
};

Camera.prototype.set = function set(type, depth, near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._projectionType = type;
    this._focalDepth = depth;
    this._near = near;
    this._far = far;
};

Camera.prototype.setDepth = function setDepth(depth) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._perspectiveDirty = true;
    this._projectionType = Camera.PINHOLE_PROJECTION;
    this._focalDepth = depth;
    this._near = 0;
    this._far = 0;

    return this;
};

Camera.prototype.setFrustum = function setFrustum(near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._perspectiveDirty = true;
    this._projectionType = Camera.FRUSTUM_PROJECTION;
    this._focalDepth = 0;
    this._near = near;
    this._far = far;

    return this;
};

Camera.prototype.setFlat = function setFlat() {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._perspectiveDirty = true;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;

    return this;
};

Camera.prototype.onUpdate = function onUpdate() {
    this._requestingUpdate = false;

    var path = this._node.getLocation();

    this._node
        .sendDrawCommand('WITH')
        .sendDrawCommand(path);

    if (this._perspectiveDirty) {
        this._perspectiveDirty = false;

        switch (this._projectionType) {
            case Camera.FRUSTUM_PROJECTION:
                this._node.sendDrawCommand('FRUSTUM_PROJECTION');
                this._node.sendDrawCommand(this._near);
                this._node.sendDrawCommand(this._far);
                break;
            case Camera.PINHOLE_PROJECTION:
                this._node.sendDrawCommand('PINHOLE_PROJECTION');
                this._node.sendDrawCommand(this._focalDepth);
                break;
            case Camera.ORTHOGRAPHIC_PROJECTION:
                this._node.sendDrawCommand('ORTHOGRAPHIC_PROJECTION');
                break;
        }
    }

    if (this._viewDirty) {
        this._viewDirty = false;

        this._node.sendDrawCommand('CHANGE_VIEW_TRANSFORM');
        this._node.sendDrawCommand(this._viewTransform[0]);
        this._node.sendDrawCommand(this._viewTransform[1]);
        this._node.sendDrawCommand(this._viewTransform[2]);
        this._node.sendDrawCommand(this._viewTransform[3]);

        this._node.sendDrawCommand(this._viewTransform[4]);
        this._node.sendDrawCommand(this._viewTransform[5]);
        this._node.sendDrawCommand(this._viewTransform[6]);
        this._node.sendDrawCommand(this._viewTransform[7]);

        this._node.sendDrawCommand(this._viewTransform[8]);
        this._node.sendDrawCommand(this._viewTransform[9]);
        this._node.sendDrawCommand(this._viewTransform[10]);
        this._node.sendDrawCommand(this._viewTransform[11]);

        this._node.sendDrawCommand(this._viewTransform[12]);
        this._node.sendDrawCommand(this._viewTransform[13]);
        this._node.sendDrawCommand(this._viewTransform[14]);
        this._node.sendDrawCommand(this._viewTransform[15]);
    }
};


Camera.prototype.onTransformChange = function onTransformChange(transform) {
    var a = transform;
    this._viewDirty = true;

    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

    b00 = a00 * a11 - a01 * a10,
    b01 = a00 * a12 - a02 * a10,
    b02 = a00 * a13 - a03 * a10,
    b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11,
    b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30,
    b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30,
    b09 = a21 * a32 - a22 * a31,
    b10 = a21 * a33 - a23 * a31,
    b11 = a22 * a33 - a23 * a32,

    det = 1/(b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);

    this._viewTransform[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    this._viewTransform[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    this._viewTransform[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    this._viewTransform[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    this._viewTransform[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    this._viewTransform[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    this._viewTransform[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    this._viewTransform[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    this._viewTransform[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    this._viewTransform[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    this._viewTransform[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    this._viewTransform[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    this._viewTransform[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    this._viewTransform[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    this._viewTransform[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    this._viewTransform[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
};

module.exports = Camera;

},{}],37:[function(require,module,exports){
'use strict';

/**
 * Component to manage general event emission.
 *
 * @class EventEmitter
 * @param {Node} node The node to send events through.
 */
function EventEmitter(node) {
    this.node = node;
}

/**
 * Returns the name of EventEmitter as a string.
 *
 * @method toString
 * @static
 * @return {String} 'EventEmitter'
 */
EventEmitter.toString = function toString() {
    return 'EventEmitter';
};

/**
 * Emit an event with a payload.
 *
 * @method emit
 * @param {Object} event The event name.
 * @param {Object} payload The event payload.
 */
EventEmitter.prototype.emit = function emit(event, payload) {
    this.node.emit(event, payload);
    return this;
};

module.exports = EventEmitter;

},{}],38:[function(require,module,exports){
'use strict';

var CallbackStore = require('famous-utilities').CallbackStore;

/**
 * Component to handle general events.
 *
 * @class EventHandler
 * @param {Node} node The node on which this component is registered.
 */
function EventHandler (node) {
    this.node = node;
    this.id = node.addComponent(this);
    this._events = new CallbackStore();
}

/**
 * Returns the name of EventHandler as a string.
 *
 * @method toString
 * @static
 * @return {String} 'EventHandler'
 */
EventHandler.toString = function toString() {
    return 'EventHandler';
};

/**
 * Register a callback to be invoked on an event.
 *
 * @method on
 * @param {String} ev The event name.
 * @param {Function} cb The callback.
 */
EventHandler.prototype.on = function on (ev, cb) {
    this._events.on(ev, cb);
};

/**
 * Deregister a callback from an event.
 *
 * @method on
 * @param {String} ev The event name.
 * @param {Function} cb The callback.
 */
EventHandler.prototype.off = function off (ev, cb) {
    this._events.off(ev, cb);
};

/**
 * Trigger the callback associated with an event, passing in a payload.
 *
 * @method trigger
 * @param {String} ev The event name.
 * @param {Object} payload The event payload.
 */
EventHandler.prototype.trigger = function trigger (ev, payload) {
    this._events.trigger(ev, payload);
};

EventHandler.prototype.onReceive = EventHandler.prototype.trigger;

module.exports = EventHandler;

},{"famous-utilities":31}],39:[function(require,module,exports){
'use strict';

var CallbackStore = require('famous-utilities').CallbackStore;
var Vec2 = require('famous-math').Vec2;

var VEC_REGISTER = new Vec2();

var gestures = {drag: true, tap: true, rotate: true, pinch: true};

/**
 * Component to manage gesture events. Will track 'pinch', 'rotate', 'tap', and 'drag' events, on an
 * as-requested basis.
 *
 * @class GestureHandler
 * @param {LocalDispatch} node The node with which to register the handler.
 * @param {Object[]} events An array of event objects specifying .event and .callback properties.
 */

function GestureHandler (node, events) {
    this.node = node;
    this.id = node.addComponent(this);

    this._events = new CallbackStore();

    this.last1 = new Vec2();
    this.last2 = new Vec2();

    this.delta1 = new Vec2();
    this.delta2 = new Vec2();

    this.velocity1 = new Vec2();
    this.velocity2 = new Vec2();

    this.dist = 0;
    this.diff12 = new Vec2();

    this.center = new Vec2();
    this.centerDelta = new Vec2();
    this.centerVelocity = new Vec2();

    this.pointer1 = {
        position: this.last1,
        delta: this.delta1,
        velocity: this.velocity1,
    };

    this.pointer2 = {
        position: this.last2,
        delta: this.delta2,
        velocity: this.velocity2,
    };

    this.event = {
        status: null,
        time: 0,
        pointers: [],
        center: this.center,
        centerDelta: this.centerDelta,
        centerVelocity: this.centerVelocity,
        points: 0,
        current: 0
    };

    this.trackedPointerIDs = [-1, -1];
    this.timeOfPointer = 0;
    this.multiTap = 0;

    this.mice = [];

    this.gestures = [];
    this.options = {};
    this.trackedGestures = {};

    var i;
    var len;

    if (events) {
        for (i = 0, len = events.length; i < len; i++) {
            this.on(events[i], events[i].callback);
        }
    }

    node.addUIEvent('touchstart');
    node.addUIEvent('mousedown');
    node.addUIEvent('touchmove');
    node.addUIEvent('mousemove');
    node.addUIEvent('touchend');
    node.addUIEvent('mouseup');
    node.addUIEvent('mouseleave');
}

GestureHandler.prototype.onReceive = function onReceive (ev, payload) {
    switch(ev) {
        case 'touchstart':
        case 'mousedown':
            _processPointerStart.call(this, payload);
            break;
        case 'touchmove':
        case 'mousemove':
            _processPointerMove.call(this, payload);
            break;
        case 'touchend':
        case 'mouseup':
            _processPointerEnd.call(this, payload);
            break;
        case 'mouseleave':
            _processMouseLeave.call(this, payload);
            break;
        default:
            break;
    }
};

/**
 * Returns the name of GestureHandler as a string.
 *
 * @method toString
 * @static
 * @return {String} 'GestureHandler'
 */
GestureHandler.toString = function toString() {
    return 'GestureHandler';
};

/**
 * Register a callback to be invoked on an event.
 *
 * @method on
 * @param {Object|String} ev The event object or event name.
 * @param {Function} cb The callback.
 */
GestureHandler.prototype.on = function on(ev, cb) {
    var gesture = ev.event || ev;
    if (gestures[gesture]) {
        this.trackedGestures[gesture] = true;
        this.gestures.push(gesture);
        if (ev.event) this.options[gesture] = ev;
        this._events.on(gesture, cb);
    }
};

/**
 * Trigger gestures in the order they were requested, if they occured.
 *
 * @method triggerGestures
 */
GestureHandler.prototype.triggerGestures = function() {
    var payload = this.event;
    for (var i = 0, len = this.gestures.length; i < len; i++) {
        var gesture = this.gestures[i];
        switch (gesture) {
            case 'rotate':
            case 'pinch':
                if (payload.points === 2) this.trigger(gesture, payload);
                break;
            case 'tap':
                if (payload.status === 'start') {
                    if (this.options.tap) {
                        var pts = this.options.tap.points || 1;
                        if(this.multiTap >= pts && payload.points >= pts) this.trigger(gesture, payload);
                    }
                    else this.trigger(gesture, payload);
                }
                break;
            default:
                this.trigger(gesture, payload);
                break;
        }
    }
};

/**
 * Trigger the callback associated with an event, passing in a payload.
 *
 * @method trigger
 * @param {String} ev The event name.
 * @param {Object} payload The event payload.
 */
GestureHandler.prototype.trigger = function trigger (ev, payload) {
    this._events.trigger(ev, payload);
};

/**
 * Process up to the first two touch/mouse move events. Exit out if the first two points are already being tracked.
 *
 * @method _processPointerStart
 * @private
 * @param {Object} e The event object.
 */
function _processPointerStart(e) {
    var t;
    if (!e.targetTouches) {
        this.mice[0] = e;
        t = this.mice;
        e.identifier = 1;
    }
    else t = e.targetTouches;

    if (t[0] && t[1] && this.trackedPointerIDs[0] === t[0].identifier && this.trackedPointerIDs[1] === t[1].identifier) {
        return;
    }

    this.event.time = Date.now();

    var threshold;
    var id;

    if (this.trackedPointerIDs[0] !== t[0].identifier) {
        if (this.trackedGestures.tap) {
            threshold = (this.options.tap && this.options.tap.threshold) || 250;
            if (this.event.time - this.timeOfPointer < threshold) this.event.taps++;
            else this.event.taps = 1;
            this.timeOfPointer = this.event.time;
            this.multiTap = 1;
        }
        this.event.current = 1;
        this.event.points = 1;
        id = t[0].identifier;
        this.trackedPointerIDs[0] = id;

        this.last1.set(t[0].pageX, t[0].pageY);
        this.velocity1.clear();
        this.delta1.clear();
        this.event.pointers.push(this.pointer1);
    }
    if (t[1] && this.trackedPointerIDs[1] !== t[1].identifier) {
        if (this.trackedGestures.tap) {
            threshold = (this.options.tap && this.options.tap.threshold) || 250;
            if (this.event.time - this.timeOfPointer < threshold) this.multiTap = 2;
        }
        this.event.current = 2;
        this.event.points = 2;
        id = t[1].identifier;
        this.trackedPointerIDs[1] = id;

        this.last2.set(t[1].pageX, t[1].pageY);
        this.velocity2.clear();
        this.delta2.clear();

        Vec2.add(this.last1, this.last2, this.center).scale(0.5);
        this.centerDelta.clear();
        this.centerVelocity.clear();

        Vec2.subtract(this.last2, this.last1, this.diff12);
        this.dist = this.diff12.length();

        if (this.trackedGestures.pinch) {
            this.event.scale = this.event.scale || 1;
            this.event.scaleDelta = 0;
            this.event.scaleVelocity = 0;
        }
        if (this.trackedGestures.rotate) {
            this.event.rotation = this.event.rotation || 0;
            this.event.rotationDelta = 0;
            this.event.rotationVelocity = 0;
        }
        this.event.pointers.push(this.pointer2);
    }

    this.event.status = 'start';
    if (this.event.points === 1) {
        this.center.copy(this.last1);
        this.centerDelta.clear();
        this.centerVelocity.clear();
        if (this.trackedGestures.pinch) {
            this.event.scale = 1;
            this.event.scaleDelta = 0;
            this.event.scaleVelocity = 0;
        }
        if (this.trackedGestures.rotate) {
            this.event.rotation = 0;
            this.event.rotationDelta = 0;
            this.event.rotationVelocity = 0;
        }
    }
    this.triggerGestures();
}

/**
 * Process up to the first two touch/mouse move events.
 *
 * @method _processPointerMove
 * @private
 * @param {Object} e The event object.
 */
function _processPointerMove(e) {
    var t;
    if (!e.targetTouches) {
        if (!this.event.current) return;
        this.mice[0] = e;
        t = this.mice;
        e.identifier = 1;
    }
    else t = e.targetTouches;

    var time = Date.now();
    var dt = time - this.event.time;
    if (dt === 0) return;
    var invDt = 1000 / dt;
    this.event.time = time;

    this.event.current = 1;
    this.event.points = 1;
    if (this.trackedPointerIDs[0] === t[0].identifier) {
        VEC_REGISTER.set(t[0].pageX, t[0].pageY);
        Vec2.subtract(VEC_REGISTER, this.last1, this.delta1);
        Vec2.scale(this.delta1, invDt, this.velocity1);
        this.last1.copy(VEC_REGISTER);

    }
    if (t[1]) {
        this.event.current = 2;
        this.event.points = 2;
        VEC_REGISTER.set(t[1].pageX, t[1].pageY);
        Vec2.subtract(VEC_REGISTER, this.last2, this.delta2);
        Vec2.scale(this.delta2, invDt, this.velocity2);
        this.last2.copy(VEC_REGISTER);

        Vec2.add(this.last1, this.last2, VEC_REGISTER).scale(0.5);
        Vec2.subtract(VEC_REGISTER, this.center, this.centerDelta);
        Vec2.add(this.velocity1, this.velocity2, this.centerVelocity).scale(0.5);
        this.center.copy(VEC_REGISTER);

        Vec2.subtract(this.last2, this.last1, VEC_REGISTER);

        if (this.trackedGestures.rotate) {
            var dot = VEC_REGISTER.dot(this.diff12);
            var cross = VEC_REGISTER.cross(this.diff12);
            var theta = -Math.atan2(cross, dot);
            this.event.rotation += theta;
            this.event.rotationDelta = theta;
            this.event.rotationVelocity = theta * invDt;
        }

        var dist = VEC_REGISTER.length();
        var scale = dist / this.dist;
        this.diff12.copy(VEC_REGISTER);
        this.dist = dist;

        if (this.trackedGestures.pinch) {
            this.event.scale *= scale;
            scale -= 1.0;
            this.event.scaleDelta = scale;
            this.event.scaleVelocity = scale * invDt;
        }
    }

    this.event.status = 'move';
    if (this.event.points === 1) {
        this.center.copy(this.last1);
        this.centerDelta.copy(this.delta1);
        this.centerVelocity.copy(this.velocity1);
        if (this.trackedGestures.pinch) {
            this.event.scale = 1;
            this.event.scaleDelta = 0;
            this.event.scaleVelocity = 0;
        }
        if (this.trackedGestures.rotate) {
            this.event.rotation = 0;
            this.event.rotationDelta = 0;
            this.event.rotationVelocity = 0;
        }
    }
    this.triggerGestures();
}

/**
 * Process up to the first two touch/mouse end events. Exit out if the two points being tracked are still active.
 *
 * @method _processPointerEnd
 * @private
 * @param {Object} e The event object.
 */
function _processPointerEnd(e) {
    var t;
    if (!e.targetTouches) {
        if (!this.event.current) return;
        this.mice.pop();
        t = this.mice;
    }
    else t = e.targetTouches;

    if (t[0] && t[1] && this.trackedPointerIDs[0] === t[0].identifier && this.trackedPointerIDs[1] === t[1].identifier) {
            return;
    }

    var id;

    this.event.status = 'end';
    if (!t[0]) {
        this.event.current = 0;
        this.trackedPointerIDs[0] = -1;
        this.trackedPointerIDs[1] = -1;
        this.triggerGestures();
        this.event.pointers.pop();
        this.event.pointers.pop();
        return;
    }
    else if(this.trackedPointerIDs[0] !== t[0].identifier) {
        this.trackedPointerIDs[0] = -1;
        id = t[0].identifier;
        this.trackedPointerIDs[0] = id;

        this.last1.set(t[0].pageX, t[0].pageY);
        this.velocity1.clear();
        this.delta1.clear();
    }
    if (!t[1]) {
        this.event.current = 1;
        this.trackedPointerIDs[1] = -1;
        this.triggerGestures();
        this.event.points = 1;
        this.event.pointers.pop();
    }
    else if (this.trackedPointerIDs[1] !== t[1].identifier) {
        this.trackedPointerIDs[1] = -1;
        this.event.points = 2;
        id = t[1].identifier;
        this.trackedPointerIDs[1] = id;

        this.last2.set(t[1].pageX, t[1].pageY);
        this.velocity2.clear();
        this.delta2.clear();

        Vec2.add(this.last1, this.last2, this.center).scale(0.5);
        this.centerDelta.clear();
        this.centerVelocity.clear();

        Vec2.subtract(this.last2, this.last1, this.diff12);
        this.dist = this.diff12.length();
    }
}

/**
 * Treats a mouseleave event as a gesture end.
 *
 * @method _processMouseLeave
 * @private
 */
function _processMouseLeave() {
    if (this.event.current) {
        this.event.status = 'end';
        this.event.current = 0;
        this.trackedPointerIDs[0] = -1;
        this.triggerGestures();
        this.event.pointers.pop();
    }
}

module.exports = GestureHandler;

},{"famous-math":15,"famous-utilities":31}],40:[function(require,module,exports){
'use strict';

var Position = require('./Position');

/**
 * @class MountPoint
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved from corresponding Render Node of the MountPoint component
 */
function MountPoint(node) {
    Position.call(this, node);

    var initial = node.getMountPoint();

    this._x.set(initial[0]);
    this._y.set(initial[1]);
    this._z.set(initial[2]);
}

/**
*
* Stringifies MountPoint
*
* @method
* @return {String} the name of the Component Class: 'MountPoint'
*/
MountPoint.toString = function toString() {
    return 'MountPoint';
};

MountPoint.prototype = Object.create(Position.prototype);
MountPoint.prototype.constructor = MountPoint;

MountPoint.prototype.update = function update() {
    this._node.setMountPoint(this._x.get(), this._y.get(), this._z.get());
    this._checkUpdate();
};

MountPoint.prototype.onUpdate = MountPoint.prototype.update;

module.exports = MountPoint;

},{"./Position":43}],41:[function(require,module,exports){
'use strict';

var Transitionable = require('famous-transitions').Transitionable;


/**
 * @class Opacity
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved from corresponding Render Node of the Opacity component
 */
function Opacity(node) {
    this._node = node;
    this._id = node.addComponent(this);
    this._value = new Transitionable(1);

    this._requestingUpdate = false;
}

/**
*
* returns stringified Opacity
*
* @method
* @return {String} the name of the Component Class: 'Opacity'
*/
Opacity.toString = function toString() {
    return 'Opacity';
};

/**
*
* Retrieves state of Opacity
*
* @method
* @return {Object} contains component key which holds the stringified constructor 
* and value key which contains the numeric value
*/
Opacity.prototype.getValue = function getValue() {
    return {
        component: this.constructor.toString(),
        value: this._value.get()
    };
};

/**
*
* Setter for Opacity state
*
* @method
* @param {Object} state contains component key, which holds stringified constructor, and a value key, which contains a numeric value used to set opacity if the constructor value matches
* @return {Boolean} true if set is successful, false otherwise
*/
Opacity.prototype.setValue = function setValue(value) {
    if (this.constructor.toString() === value.component) {
        this.set(value.value);
        return true;
    }
    return false;
};

/**
*
* Setter for Opacity with callback
*
* @method
* @param {Number} value value used to set Opacity
* @param {Object} options options hash
* @param {Function} callback to be called following Opacity set
* @chainable
*/
Opacity.prototype.set = function set(value, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._value.set(value, options, callback);
    return this;
};

/**
*
* Getter for Opacity
*
* @method
* @return {Number}
*/
Opacity.prototype.get = function get() {
    return this._value.get();
};

/**
*
* Stops Opacity transition
*
* @method
* @chainable
*/
Opacity.prototype.halt = function halt() {
    this._value.halt();
    return this;
};

Opacity.prototype.isActive = function isActive(){
    return this._value.isActive();
};

Opacity.prototype.update = function update () {
    this._node.setOpacity(this._value.get());
    if (this._value.isActive()) {
      this._node.requestUpdateOnNextTick(this._id);
    } else {
      this._requestingUpdate = false;
    }
};

Opacity.prototype.onUpdate = Opacity.prototype.update;

module.exports = Opacity;

},{"famous-transitions":18}],42:[function(require,module,exports){
'use strict';

var Position = require('./Position');

/**
 * @class Origin
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved from corresponding Render Node of the Origin component
 */
function Origin(node) {
    Position.call(this, node);

    var initial = node.getOrigin();

    this._x.set(initial[0]);
    this._y.set(initial[1]);
    this._z.set(initial[2]);
}


/**
*
* returns stringified Origin
*
* @method
* @return {String} the name of the Component Class: 'Origin'
*/
Origin.toString = function toString() {
    return 'Origin';
};

Origin.prototype = Object.create(Position.prototype);
Origin.prototype.constructor = Origin;

Origin.prototype.update = function update() {
    this._node.setOrigin(this._x.get(), this._y.get(), this._z.get());
    this._checkUpdate();
};

Origin.prototype.onUpdate = Origin.prototype.update;

module.exports = Origin;

},{"./Position":43}],43:[function(require,module,exports){
'use strict';

var Transitionable = require('famous-transitions').Transitionable;

/**
 * @class Position
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved from corresponding Render Node of the Position component
 */
function Position(node) {
    this._node = node;
    this._id = node.addComponent(this);
  
    this._requestingUpdate = false;
    
    var initialPosition = node.getPosition();

    this._x = new Transitionable(initialPosition[0]);
    this._y = new Transitionable(initialPosition[1]);
    this._z = new Transitionable(initialPosition[2]);
}

/** 
*
* stringifies Position constructor
*
* @method
* @return {String} the definition of the Component Class: 'Position'
*/
Position.toString = function toString() {
    return 'Position';
};

/**
*
* Gets object containing stringified constructor, x, y, z coordinates
*
* @method
* @return {Object}
*/
Position.prototype.getValue = function getValue() {
    return {
        component: this.constructor.toString(),
        x: this._x.get(),
        y: this._y.get(),
        z: this._z.get()
    };
};

/**
*
* Setter for position coordinates
*
* @method
* @param {Object} state Object -- component: stringified constructor, x: number, y: number, z: number
* @return {Boolean} true on success
*/
Position.prototype.setValue = function setValue(state) {
    if (state.component === this.constructor.toString()) {
        this.set(state.x, state.y, state.z);
        return true;
    }
    return false;
};

/**
*
* Getter for X position
*
* @method
* @return {Number}
*/
Position.prototype.getX = function getX() {
    return this._x.get();
};

/**
*
* Getter for Y position
*
* @method
* @return {Number}
*/
Position.prototype.getY = function getY() {
    return this._y.get();
};

/**
*
* Getter for Z position
*
* @method
* @return {Number}
*/
Position.prototype.getZ = function getZ() {
    return this._z.get();
};

/**
*
* Getter for any active coordinates
*
* @method
* @return {Boolean}
*/
Position.prototype.isActive = function isActive() {
    return this._x.isActive() || this._y.isActive() || this._z.isActive();
};

Position.prototype._checkUpdate = function _checkUpdate() {
    if (this.isActive()) this._node.requestUpdateOnNextTick(this._id);
    else this._requestingUpdate = false;
};


Position.prototype.update = function update () {
    this._node.setPosition(this._x.get(), this._y.get(), this._z.get());
    this._checkUpdate();
};

/** 
*
* If true, component is to be updated on next engine tick
*
* @method
*/
Position.prototype.onUpdate = Position.prototype.update;

/** 
*
* Setter for X position
*
* @method
* @param {Number} val used to set x coordinate
* @param {Object} options options hash
* @param {Function} callback function to execute after setting X
* @chainable
*/
Position.prototype.setX = function setX(val, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._x.set(val, options, callback);
    return this;
};

/** 
*
* Setter for Y position
*
* @method
* @param {Number} val used to set y coordinate
* @param {Object} options options hash
* @param {Function} callback function to execute after setting Y
* @chainable
*/
Position.prototype.setY = function setY(val, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._y.set(val, options, callback);
    return this;
};

/** 
*
* Setter for Z position
*
* @method
* @param {Number} val used to set z coordinate
* @param {Object} options options hash
* @param {Function} callback function to execute after setting Z
* @chainable
*/
Position.prototype.setZ = function setZ(val, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._z.set(val, options, callback);
    return this;
};


/**
*
* Setter for XYZ position with callback
*
* @method
* @param {Number} x used to set x coordinate
* @param {Number} y used to set y coordinate
* @param {Number} z used to set z coordinate
* @param {Object} options options hash
* @param {Function} callback function to execute after setting each coordinate
* @chainable
*/
Position.prototype.set = function set(x, y, z, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var xCallback;
    var yCallback;
    var zCallback;

    if (z != null) {
        zCallback = callback;
    }
    else if (y != null) {
        yCallback = callback;
    }
    else if (x != null) {
        xCallback = callback;
    }

    if (x != null) this._x.set(x, options, xCallback);
    if (y != null) this._y.set(y, options, yCallback);
    if (z != null) this._z.set(z, options, zCallback);

    return this;
};

/**
*
* Stops transition of Position component
*
* @method
* @chainable
*/
Position.prototype.halt = function halt() {
    this._x.halt();
    this._y.halt();
    this._z.halt();
    return this;
};

module.exports = Position;

},{"famous-transitions":18}],44:[function(require,module,exports){
'use strict';

var Position = require('./Position');

/**
 * @class Rotation
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved from corresponding Render Node of the Rotation component
 */
function Rotation(node) {
    Position.call(this, node);

    var initial = node.getRotation();

    var x = initial[0];
    var y = initial[1];
    var z = initial[2];
    var w = initial[3];

    var xx = x * x;
    var yy = y * y;
    var zz = z * z;

    var ty = 2 * (x * z + y * w);
    ty = ty < -1 ? -1 : ty > 1 ? 1 : ty;

    var rx = Math.atan2(2 * (x * w - y * z), 1 - 2 * (xx + yy));
    var ry = Math.asin(ty);
    var rz = Math.atan2(2 * (z * w - x * y), 1 - 2 * (yy + zz));

    this._x.set(rx);
    this._y.set(ry);
    this._z.set(rz);
}

/**
*
* stringifies Rotation
*
* @method
* @return {String} the name of the Component Class: 'Rotation'
*/
Rotation.toString = function toString() {
    return 'Rotation';
};

Rotation.prototype = Object.create(Position.prototype);
Rotation.prototype.constructor = Rotation;

Rotation.prototype.update = function update() {
    this._node.setRotation(this._x.get(), this._y.get(), this._z.get());
    this._checkUpdate();
};

Rotation.prototype.onUpdate = Rotation.prototype.update;

module.exports = Rotation;

},{"./Position":43}],45:[function(require,module,exports){
'use strict';

var Position = require('./Position');

/**
 * @class Scale
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved from corresponding Render Node of the Scale component
 */
function Scale(node) {
    Position.call(this, node);
    this._x.set(1);
    this._y.set(1);
    this._z.set(1);
}

/**
*
* stringifies Scale
*
* @method 
* @return {String} the name of the Component Class: 'Scale'
*/
Scale.toString = function toString() {
    return 'Scale';
};

Scale.prototype = Object.create(Position.prototype);
Scale.prototype.constructor = Scale;

Scale.prototype.update = function update() {
    this._node.setScale(this._x.get(), this._y.get(), this._z.get());
    this._checkUpdate();
};

Scale.prototype.onUpdate = Scale.prototype.update;

module.exports = Scale;

},{"./Position":43}],46:[function(require,module,exports){
'use strict';

var Transitionable = require('famous-transitions').Transitionable;
var CoreSize = require('famous-core').Size;

/**
 * Size component used for managing the size of the underlying RenderContext.
 * Supports absolute and relative (proportional and differential) sizing.
 *
 * @class Size
 * @constructor
 * @component
 *
 * @param {LocalDispatch} node LocalDispatch to be retrieved from
 *                                 corresponding RenderNode of the Size
 *                                 component
 */
function Size(node) {
    this._node = node;
    this._id = node.addComponent(this);
    this._requestingUpdate = false;

    var initialProportionalSize = node.getProportionalSize();
    var initialDifferentialSize = node.getDifferentialSize();
    var initialAbsoluteSize = node.getAbsoluteSize();

    this._proportional = {
        x: new Transitionable(initialProportionalSize[0]),
        y: new Transitionable(initialProportionalSize[1]),
        z: new Transitionable(initialProportionalSize[2])
    };
    this._differential = {
        x: new Transitionable(initialDifferentialSize[0]),
        y: new Transitionable(initialDifferentialSize[1]),
        z: new Transitionable(initialDifferentialSize[2])
    };
    this._absolute = {
        x: new Transitionable(initialAbsoluteSize[0]),
        y: new Transitionable(initialAbsoluteSize[1]),
        z: new Transitionable(initialAbsoluteSize[2])
    };
}

Size.RELATIVE = CoreSize.RELATIVE;
Size.ABSOLUTE = CoreSize.ABSOLUTE;
Size.RENDER = CoreSize.RENDER;
Size.DEFAULT = CoreSize.DEFAULT;

Size.prototype.setMode = function setMode(x, y, z) {
    this._node.setSizeMode(x, y, z);
    return this;
};

/**
* Stringifies Size.
*
* @method toString
*
* @return {String} `Size`
*/
Size.toString = function toString() {
    return 'Size';
};

/**
 * @typedef absoluteSizeValue
 * @type {Object}
 * @property {String} type current type of sizing being applied ('absolute')
 * @property {String} component component name ('Size')
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef relativeSizeValue
 * @type {Object}
 * @property {String} type current type of sizing being applied ('relative')
 * @property {String} component component name ('Size')
 * @property {Object} differential
 * @property {number} differential.x
 * @property {number} differential.y
 * @property {number} differential.z
 * @property {Object} proportional
 * @property {number} proportional.x
 * @property {number} proportional.y
 * @property {number} proportional.z
 */

/**
* Returns serialized state of the component.
*
* @method getValue
*
* @return {absoluteSizeValue|relativeSizeValue}
*/
Size.prototype.getValue = function getValue() {
    return {
        sizeMode: this._node.value.sizeMode,
        absolute: {
            x: this._absolute.x.get(),
            y: this._absolute.y.get(),
            z: this._absolute.z.get()
        },
        differential: {
            x: this._differential.x.get(),
            y: this._differential.y.get(),
            z: this._differential.z.get()
        },
        proportional: {
            x: this._proportional.x.get(),
            y: this._proportional.y.get(),
            z: this._proportional.z.get()
        }
    };
};

/**
* Updates state of component.
*
* @method setValue
*
* @param {absoluteSizeValue|relativeSizeValue} state state encoded in same
*                                                    format as state retrieved
*                                                    through `getValue`
* @return {Boolean}                                  boolean indicating
*                                                    whether the new state has
*                                                    been applied
*/
Size.prototype.setValue = function setValue(state) {
    if (state.component === this.constructor.toString()) {
        this.setMode.apply(this, state.sizeMode);
        if (state.absolute) {
            this.setAbsolute(state.absolute.x, state.absolute.y, state.absolute.z);
        }
        if (state.differential) {
            this.setAbsolute(state.differential.x, state.differential.y, state.differential.z);
        }
        if (state.proportional) {
            this.setAbsolute(state.proportional.x, state.proportional.y, state.proportional.z);
        }
    }
    return false;
};

Size.prototype._isActive = function _isActive(type) {
    return type.x.isActive() || type.y.isActive() || type.z.isActive();
};

Size.prototype.isActive = function isActive(){
    return (
        this._isActive(this._absolute) ||
        this._isActive(this._proportional) ||
        this._isActive(this._differential)
    );
};

Size.prototype.onUpdate = function onUpdate() {
    var abs = this._absolute;
    this._node.setAbsoluteSize(
        abs.x.get(),
        abs.y.get(),
        abs.z.get()
    );
    var prop = this._proportional;
    var diff = this._differential;
    this._node.setProportionalSize(
        prop.x.get(),
        prop.y.get(),
        prop.z.get()
    );
    this._node.setDifferentialSize(
        diff.x.get(),
        diff.y.get(),
        diff.z.get()
    );

    if (this.isActive()) this._node.requestUpdateOnNextTick(this._id);
    else this._requestingUpdate = false;
};


/**
* Applies absolute size.
*
* @method setAbsolute
* @chainable
*
* @param {Number} x used to set absolute size in x-direction (width)
* @param {Number} y used to set absolute size in y-direction (height)
* @param {Number} z used to set absolute size in z-direction (depth)
* @param {Object} options options hash
* @param {Function} callback callback function to be executed after the
*                            transitions have been completed
* @return {Size} this
*/
Size.prototype.setAbsolute = function setAbsolute(x, y, z, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var xCallback;
    var yCallback;
    var zCallback;

    if (z != null) {
        zCallback = callback;
    }
    else if (y != null) {
        yCallback = callback;
    }
    else if (x != null) {
        xCallback = callback;
    }

    var abs = this._absolute;
    if (x != null) {
        abs.x.set(x, options, xCallback);
    }
    if (y != null) {
        abs.y.set(y, options, yCallback);
    }
    if (z != null) {
        abs.z.set(z, options, zCallback);
    }
};

/**
* Applies proportional size.
*
* @method setProportional
* @chainable
*
* @param {Number} x used to set proportional size in x-direction (width)
* @param {Number} y used to set proportional size in y-direction (height)
* @param {Number} z used to set proportional size in z-direction (depth)
* @param {Object} options options hash
* @param {Function} callback callback function to be executed after the
*                            transitions have been completed
* @return {Size} this
*/
Size.prototype.setProportional = function setProportional(x, y, z, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var xCallback;
    var yCallback;
    var zCallback;

    if (z != null) {
        zCallback = callback;
    }
    else if (y != null) {
        yCallback = callback;
    }
    else if (x != null) {
        xCallback = callback;
    }

    var prop = this._proportional;
    if (x != null) {
        prop.x.set(x, options, xCallback);
    }
    if (y != null) {
        prop.y.set(y, options, yCallback);
    }
    if (z != null) {
        prop.z.set(z, options, zCallback);
    }
    return this;
};

/**
* Applies differential size to Size component.
*
* @method setDifferential
* @chainable
*
* @param {Number} x used to set differential size in x-direction (width)
* @param {Number} y used to set differential size in y-direction (height)
* @param {Number} z used to set differential size in z-direction (depth)
* @param {Object} options options hash
* @param {Function} callback callback function to be executed after the
*                            transitions have been completed
*/
Size.prototype.setDifferential = function setDifferential(x, y, z, options, callback) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var xCallback;
    var yCallback;
    var zCallback;

    if (z != null) {
        zCallback = callback;
    }
    else if (y != null) {
        yCallback = callback;
    }
    else if (x != null) {
        xCallback = callback;
    }

    var diff = this._differential;
    if (x != null) {
        diff.x.set(x, options, xCallback);
    }
    if (y != null) {
        diff.y.set(y, options, yCallback);
    }
    if (z != null) {
        diff.z.set(z, options, zCallback);
    }
    return this;
};

/**
* Retrieves the computed size applied to the underlying RenderContext.
*
* @method get
*
* @return {Number[]} size three dimensional computed size
*/
Size.prototype.get = function get () {
    return this._node.getSize();
};

/**
 * Halts all currently active size transitions.
 *
 * @method halt
 * @chainable
 *
 * @return {Size} this
 */
Size.prototype.halt = function halt () {
    this._proportional.x.halt();
    this._proportional.y.halt();
    this._proportional.z.halt();
    this._differential.x.halt();
    this._differential.y.halt();
    this._differential.z.halt();
    this._absolute.x.halt();
    this._absolute.y.halt();
    this._absolute.z.halt();
    return this;
};

module.exports = Size;

},{"famous-core":10,"famous-transitions":18}],47:[function(require,module,exports){
'use strict';

var Transitionable = require('famous-transitions').Transitionable;
var Quaternion = require('famous-math').Quaternion;

var Q_REGISTER = new Quaternion();
var Q2_REGISTER = new Quaternion();

function Vec3Transitionable(x, y, z, transform) {
    this._transform = transform;
    this._dirty = false;
    this.x = new Transitionable(x);
    this.y = new Transitionable(y);
    this.z = new Transitionable(z);
    this._values = {x: x, y: y, z: z};
}

Vec3Transitionable.prototype.get = function get() {
    this._values.x = this.x.get();
    this._values.y = this.y.get();
    this._values.z = this.z.get();
    return this._values;
};

Vec3Transitionable.prototype.set = function set(x, y, z, options, callback) {
    this.dirty();

    var cbX = null;
    var cbY = null;
    var cbZ = null;

    if (z != null) cbZ = callback;
    else if (y != null) cbY = callback;
    else if (x != null) cbX = callback;

    if (x != null) this.x.set(x, options, cbX);
    if (y != null) this.y.set(y, options, cbY);
    if (z != null) this.z.set(z, options, cbZ);

    return this;
};

Vec3Transitionable.prototype.isActive = function isActive() {
    return this.x.isActive() || this.y.isActive() || this.z.isActive();
};

Vec3Transitionable.prototype.pause = function pause() {
    this.x.pause();
    this.y.pause();
    this.z.pause();
    return this;
};

Vec3Transitionable.prototype.resume = function resume() {
    this.x.resume();
    this.y.resume();
    this.z.resume();
    return this;
};

Vec3Transitionable.prototype.halt = function halt() {
    this.x.halt();
    this.y.halt();
    this.z.halt();
    return this;
};

Vec3Transitionable.prototype.dirty = function dirty() {
    if (!this._transform._dirty) {
        this._transform._node.requestUpdate(this._transform._id);
        this._transform._dirty = true;
    }
    this._dirty = true;
    return this;
};

function QuatTransitionable(x, y, z, w, transform) {
    this._transform = transform;
    this._queue = [];
    this._front = 0;
    this._end = 0;
    this._dirty = false;
    this._t = new Transitionable(0);
    this._fromQ = new Quaternion(w, x, y, z);
    this._toQ = new Quaternion();
    this._q = new Quaternion(w, x, y, z);
}

QuatTransitionable.prototype.get = function get() {
    var t = this._t.get();
    var w, x, y, z;
    var queue = this._queue;
    while (t >= this._front + 1) {
        this._front++;
        w = queue.shift();
        x = queue.shift();
        y = queue.shift();
        z = queue.shift();
        this._q.set(w, x, y, z);
        this._fromQ.set(w, x, y, z);
        if (this._queue.length !== 0) this._toQ.set(queue[0], queue[1], queue[2], queue[3]);
    }
    if (this._queue.length !== 0) this._fromQ.slerp(this._toQ, t - this._front, this._q);
    return this._q;
};

QuatTransitionable.prototype.set = function set(x, y, z, w, options, callback) {
    if (!this._transform._dirty) {
        this._transform._node.requestUpdate(this._transform._id);
        this._transform._dirty = true;
    }
    this._dirty = true;
    if (this._queue.length === 0) this._toQ.set(w, x, y, z);
    this._queue.push(w, x, y, z);
    this._end++;
    this._t.set(this._end, options, callback);
    return this;
};

QuatTransitionable.prototype.isActive = function isActive() {
    return this._t.isActive();
};

QuatTransitionable.prototype.pause = function pause() {
    this._t.pause();
    return this;
};

QuatTransitionable.prototype.resume = function resume() {
    this._t.resume();
    return this;
};

QuatTransitionable.prototype.halt = function halt() {
    this._dirty = false;
    this._t.reset(0);
    this._queue.length = 0;
    this._front = 0;
    this._end = 0;
    return this;
};

function Transform(node) {
    this._node = node;
    this._id = node.addComponent(this);
    this.origin = null;
    this.mountPoint = null;
    this.align = null;
    this.scale = null;
    this.position = null;
    this.rotation = null;

    this._dirty = false;
}

Transform.toString = function toString() {
    return 'Transform';
};

Transform.prototype.getValue = function getValue() {
    return {
        component: this.constructor.toString(),
        origin: this.origin && this.origin.get(),
        mountPoint: this.mountPoint && this.mountPoint.get(),
        align: this.align && this.align.get(),
        scale: this.scale && this.scale.get(),
        position: this.position && this.position.get(),
        rotation: this.rotation && this.rotation.get()
    };
};

Transform.prototype.setState = function setState(state) {
    if (state.component === this.constructor.toString()) {
        state.origin && this.setOrigin(state.origin.x, state.origin.y, state.origin.z);
        state.mountPoint && this.setMountPoint(state.mountPoint.x, state.mountPoint.y, state.mountPoint.z);
        state.align && this.setAlign(state.align.x, state.align.y, state.align.z);
        state.scale && this.setScale(state.scale.x, state.scale.y, state.scale.z);
        state.position && this.setPosition(state.position.x, state.position.y, state.position.z);
        state.rotation && this.setRotation(state.rotation.x, state.rotation.y, state.rotation.z, state.rotation.w);
        return true;
    }
    return false;
};

Transform.prototype.setOrigin = function setOrigin(x, y, z, options, callback) {
    if (!this.origin) {
        var v = this._node.getOrigin();
        this.origin = new Vec3Transitionable(v[0], v[1], v[2], this);
    }
    this.origin.set(x, y, z, options, callback);
    return this;
};

Transform.prototype.setMountPoint = function setMountPoint(x, y, z, options, callback) {
    if (!this.mountPoint) {
        var v = this._node.getMountPoint();
        this.mountPoint = new Vec3Transitionable(v[0], v[1], v[2], this);
    }
    this.mountPoint.set(x, y, z, options, callback);
    return this;
};

Transform.prototype.setAlign = function setAlign(x, y, z, options, callback) {
    if (!this.align) {
        var v = this._node.getAlign();
        this.align = new Vec3Transitionable(v[0], v[1], v[2], this);
    }
    this.align.set(x, y, z, options, callback);
    return this;
};

Transform.prototype.setScale = function setScale(x, y, z, options, callback) {
    if (!this.scale) {
        var v = this._node.getScale();
        this.scale = new Vec3Transitionable(v[0], v[1], v[2], this);
    }
    this.scale.set(x, y, z, options, callback);
    return this;
};

Transform.prototype.setPosition = function setPosition(x, y, z, options, callback) {
    if (!this.position) {
        var v = this._node.getPosition();
        this.position = new Vec3Transitionable(v[0], v[1], v[2], this);
    }
    this.position.set(x, y, z, options, callback);
    return this;
};

Transform.prototype.translate = function translate(x, y, z, options, callback) {
    if (!this.position) {
        var v = this._node.getPosition();
        this.position = new Vec3Transitionable(v[0], v[1], v[2], this);
    }
    var p = this.position;
    var xq = p.x._queue;
    var yq = p.y._queue;
    var zq = p.z._queue;
    var xEnd = x == null ? null : x + (xq.length > 0 ? xq[xq.length - 4] : p.x._end);
    var yEnd = y == null ? null : y + (yq.length > 0 ? yq[yq.length - 4] : p.y._end);
    var zEnd = z == null ? null : z + (zq.length > 0 ? zq[zq.length - 4] : p.z._end);
    this.position.set(xEnd, yEnd, zEnd, options, callback);
    return this;
};

Transform.prototype.setRotation = function setRotation(x, y, z, w, options, callback) {
    if (!this.rotation) {
        var v = this._node.getRotation();
        this.rotation = new QuatTransitionable(v[0], v[1], v[2], v[3], this);
    }
    var q = Q_REGISTER;
    if (typeof w === 'number') {
        q.set(w, x, y, z);
    }
    else {
        q.fromEuler(x, y, z);
        callback = options;
        options = w;
    }
    this.rotation.set(q.x, q.y, q.z, q.w, options, callback);
    return this;
};

Transform.prototype.rotate = function rotate(x, y, z, w, options, callback) {
    if (!this.rotation) {
        var v = this._node.getRotation();
        this.rotation = new QuatTransitionable(v[0], v[1], v[2], v[3], this);
    }
    var queue = this.rotation._queue;
    var len = this.rotation._queue.length;
    var referenceQ;
    if (len !== 0) {
        referenceQ = Q2_REGISTER.set(queue[len - 4], queue[len - 3], queue[len - 2], queue[len - 1]);
    }
    else referenceQ = Q2_REGISTER.copy(this.rotation._q);

    var rotQ = Q_REGISTER;
    if (typeof w === 'number') {
        rotQ.set(w, x, y, z);
    }
    else {
        rotQ.fromEuler(x, y, z);
        callback = options;
        options = w;
    }

    var q = referenceQ.multiply(rotQ);
    this.rotation.set(q.x, q.y, q.z, q.w, options, callback);
    return this;
};

Transform.prototype.clean = function clean() {
    var node = this._node;
    var c;
    var isDirty = false;
    if ((c = this.origin) && c._dirty) {
        node.setOrigin(c.x.get(), c.y.get(), c.z.get());
        c._dirty = c.isActive();
        isDirty = isDirty || c._dirty;
    }
    if ((c = this.mountPoint) && c._dirty) {
        node.setMountPoint(c.x.get(), c.y.get(), c.z.get());
        c._dirty = c.isActive();
        isDirty = isDirty || c._dirty;
    }
    if ((c = this.align) && c._dirty) {
        node.setAlign(c.x.get(), c.y.get(), c.z.get());
        c._dirty = c.isActive();
        isDirty = isDirty || c._dirty;
    }
    if ((c = this.scale) && c._dirty) {
        node.setScale(c.x.get(), c.y.get(), c.z.get());
        c._dirty = c.isActive();
        isDirty = isDirty || c._dirty;
    }
    if ((c = this.position) && c._dirty) {
        node.setPosition(c.x.get(), c.y.get(), c.z.get());
        c._dirty = c.isActive();
        isDirty = isDirty || c._dirty;
    }
    if ((c = this.rotation) && c._dirty) {
        c.get();
        node.setRotation(c._q.x, c._q.y, c._q.z, c._q.w);
        c._dirty = c.isActive();
        isDirty = isDirty || c._dirty;
    }
    if (isDirty) this._node.requestUpdateOnNextTick(this._id);
    else this._dirty = false;
};

Transform.prototype.onUpdate = Transform.prototype.clean;

module.exports = Transform;

},{"famous-math":15,"famous-transitions":18}],48:[function(require,module,exports){
'use strict';

var CallbackStore = require('famous-utilities').CallbackStore;

/**
 * Component to manage DOM events. When registering an event, the user may specify .methods and
 * .properties to preprocess the event object.
 *
 * @class UIEventHandler
 * @param {LocalDispatch} dispatch The dispatch with which to register the handler.
 * @param {Object[]} events An array of event objects specifying .event and .callback properties.
 */
function UIEventHandler (dispatch, events) {
    this.dispatch = dispatch;
    this._events = new CallbackStore();

    if (events) {
        for (var i = 0, len = events.length; i < len; i++) {
            this.on(events[i], events[i].callback);
        }
    }
}

/**
 * Returns the name of UIEventHandler as a string.
 *
 * @method toString
 * @static
 * @return {String} 'UIEventHandler'
 */
UIEventHandler.toString = function toString() {
    return 'UIEventHandler';
};

/**
 * Register a callback to be invoked on an event.
 *
 * @method on
 * @param {Object|String} ev The event object or event name.
 * @param {Function} cb The callback.
 */
UIEventHandler.prototype.on = function on(ev, cb) {
    var renderables = this.dispatch.getRenderables();
    var eventName = ev.event || ev;
    var methods = ev.methods;
    var properties = ev.properties;
    for (var i = 0, len = renderables.length; i < len; i++) {
        if (renderables[i].on) renderables[i].on(eventName, methods, properties);
    }
    this._events.on(eventName, cb);
    this.dispatch.registerTargetedEvent(eventName, this.trigger.bind(this, eventName));
};

/**
 * Deregister a callback from an event.
 *
 * @method on
 * @param {String} ev The event name.
 * @param {Function} cb The callback.
 */
UIEventHandler.prototype.off = function off(ev, cb) {
    this._events.off(ev, cb);
    this.dispatch.deregisterGlobalEvent(ev, this.trigger.bind(this, ev));
};

/**
 * Trigger the callback associated with an event, passing in a payload.
 *
 * @method trigger
 * @param {String} ev The event name.
 * @param {Object} payload The event payload.
 */
UIEventHandler.prototype.trigger = function trigger (ev, payload) {
    this._events.trigger(ev, payload);
};

module.exports = UIEventHandler;

},{"famous-utilities":31}],49:[function(require,module,exports){
'use strict';

module.exports = {
    Align: require('./Align'),
    Camera: require('./Camera'),
    EventEmitter: require('./EventEmitter'),
    EventHandler: require('./EventHandler'),
    GestureHandler: require('./GestureHandler'),
    MountPoint: require('./MountPoint'),
    Opacity: require('./Opacity'),
    Origin: require('./Origin'),
    Position: require('./Position'),
    Rotation: require('./Rotation'),
    Scale: require('./Scale'),
    Size: require('./Size'),
    Transform: require('./Transform'),
    UIEventHandler: require('./UIEventHandler')
};

},{"./Align":35,"./Camera":36,"./EventEmitter":37,"./EventHandler":38,"./GestureHandler":39,"./MountPoint":40,"./Opacity":41,"./Origin":42,"./Position":43,"./Rotation":44,"./Scale":45,"./Size":46,"./Transform":47,"./UIEventHandler":48}],50:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"dup":2}],51:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"./Dispatch":52,"./Node":55,"./Size":56,"dup":3}],52:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],53:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],54:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"./Clock":50,"./Context":51,"dup":6}],55:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"./Size":56,"./Transform":57,"dup":7}],56:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8}],57:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],58:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"./Clock":50,"./Context":51,"./Dispatch":52,"./Event":53,"./Famous":54,"./Node":55,"./Size":56,"./Transform":57,"dup":10}],59:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],60:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],61:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":59,"dup":21}],62:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],63:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":59,"./Easing":60,"./Transitionable":61,"./after":62,"dup":23}],64:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],65:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":63}],66:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],67:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],68:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],69:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],70:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],71:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":64,"./Color":65,"./KeyCodes":66,"./MethodStore":67,"./ObjectManager":68,"./clone":69,"./flatClone":70,"./keyValueToArrays":72,"./loadURL":73,"./strip":74,"dup":31}],72:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],73:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],74:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],75:[function(require,module,exports){
'use strict';

var CallbackStore = require('famous-utilities').CallbackStore;

var RENDER_SIZE = 2;

/**
 * A DOMElement is a renderable that can be added just like a "normal"
 * component to a node using `addComponent`.
 * Renderables send draw commands to the node they are attached to.
 * Those commands then get interpreted by the `DOMRenderer` in the Main thread
 * to build the actual DOM representation.
 *
 * @class DOMElement
 * @constructor
 * 
 * @param {Node} node                   The entity to which the `DOMElement`
 *                                      renderable should be attached to.
 * @param {Object} options              Initial options used for instantiating
 *                                      the Node.
 * @param {Object} options.properties   CSS properties that should be added to
 *                                      the actual DOMElement on the initial draw.
 */
function DOMElement (node, options) {
    if (typeof options === 'string') {
        console.warn(
            'HTMLElement constructor signature changed!\n' +
            'Pass in an options object with {tagName: ' + options + '} instead.'
        );
        options = {
            tagName: options
        };
    }

    this._node = node;

    this._requestingUpdate = false;

    this._changeQueue = [];
    
    this._UIEvents = node.getUIEvents().slice(0);
    this._classes = ['fa-surface'];
    this._requestingEventListeners = [];
    this._styles = {
        display: node.isShown() 
    };
    this._attributes = {};
    this._content = '';

    this._tagName = options && options.tagName ? options.tagName : 'div';
    this._id = node.addComponent(this);

    this._callbacks = new CallbackStore();

    if (!options) return;

    if (options.classes) {
        for (var i = 0; i < options.classes.length; i++)
            this.addClass(options.classes[i]);
    }

    if (options.attributes) {
        for (var key in options.attributes)
            this.setAttribute(key, options.attributes[key]);
    }

    if (options.properties) {
        for (var key in options.properties)
            this.setProperty(key, options.properties[key]);
    }

    if (options.id) this.setId(options.id);
    if (options.content) this.setContent(options.content);
}

/**
 * Serializes the state of the DOMElement. This method will be invoked by
 * @{@link Node#getValue} in order to serialize the node and possibly entire
 * scene graph hierarchies.
 *
 * @method getValue
 * 
 * @return {Object}     serialized component.
 */
DOMElement.prototype.getValue = function getValue () {
    return {
        classes: this._classes,
        styles: this._styles,
        attributes: this._attributes,
        content: this._content,
        id: this._attributes.id,
        tagName: this._tagName
    };
};

/**
 * Method to be invoked by the node as soon as an update occurs. This allows
 * the DOMElement renderable to dynamically react to state changes on the Node.
 *
 * This flushes the internal draw command queue by sending individual commands
 * to the node using `sendDrawCommand`.
 *
 * @method onUpdate
 */
DOMElement.prototype.onUpdate = function onUpdate () {
    var node = this._node;
    var queue = this._changeQueue;
    var len = queue.length;

    if (len && node) {
        node.sendDrawCommand('WITH');
        node.sendDrawCommand(node.getLocation());
        node.sendDrawCommand('DOM');

        while (len--) node.sendDrawCommand(queue.shift());
    }

    this._requestingUpdate = false;
};

/**
 * Method to be invoked by the Node as soon as the node (or any of its
 * ancestors) is being mounted.
 *
 * @method onMount
 * 
 * @param  {Node} node      Parent node to which the component should be added.
 * @param  {String} id      Path at which the component (or node) is being
 *                          attached. The path is being set on the actual
 *                          DOMElement as a `data-fa-path`-attribute.
 */
DOMElement.prototype.onMount = function onMount (node, id) {
    this._node = node;
    this._id = id;
    this._UIEvents = node.getUIEvents().slice(0);
    this.draw();
    this.setAttribute('data-fa-path', node.getLocation());
};

/**
 * Method to be invoked by the Node as soon as the node is being dismounted 
 * either directly or by dismounting one of its ancestors).
 *
 * @method onDismount
 */
DOMElement.prototype.onDismount = function onDismount () {
    this.setProperty('display', 'none');
    this.setAttribute('data-fa-path', '');
    this._initialized = false;
};

/**
 * Method to be invoked by the node as soon as the DOMElement is being shown.
 * This results into the DOMElement setting the `display` property to `block`
 * and therefore visually showing the corresponding DOMElement (again).
 *
 * @method onShow
 */
DOMElement.prototype.onShow = function onShow () {
    this.setProperty('display', 'block');
};

/**
 * Method to be invoked by the node as soon as the DOMElement is being hidden.
 * This results into the DOMElement setting the `display` property to `none`
 * and therefore visually hiding the corresponding DOMElement (again).
 *
 * @method onHide
 */
DOMElement.prototype.onHide = function onHide () {
    this.setProperty('display', 'none');
};

/**
 * Method to be invoked by the node as soon as the transform matrix associated
 * with the node changes.
 * The DOMElement will react to transform changes by sending `CHANGE_TRANSFORM`
 * commands to the `DOMRenderer`.
 *
 * @method onTransformChange
 * 
 * @param  {Float32Array} transform     The final transform matrix.
 */
DOMElement.prototype.onTransformChange = function onTransformChange (transform) {
    this._changeQueue.push('CHANGE_TRANSFORM');
    for (var i = 0, len = transform.length ; i < len ; i++)
        this._changeQueue.push(transform[i]);

    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * Method to be invoked by the node as soon as its computed size changes.
 * 
 * @method onSizeChange
 * @chainable
 * 
 * @param  {Float32Array} size      Absolute, pixel size.
 * @return {DOMElement} this
 */
DOMElement.prototype.onSizeChange = function onSizeChange (size) {
    var sizeMode = this._node.getSizeMode();
    var sizedX = sizeMode[0] !== RENDER_SIZE;
    var sizedY = sizeMode[1] !== RENDER_SIZE;
    if (this._initialized) 
        this._changeQueue.push('CHANGE_SIZE',
            sizedX ? size[0] : sizedX,
            sizedY ? size[1] : sizedY);

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Method to be invoked by the node as soon as its opacity changes.
 * 
 * @method onOpacityChange
 * @chainable
 * 
 * @param  {Number} opacity      The new opacity, as a scalar from 0 to 1.
 * @return {DOMElement} this
 */
DOMElement.prototype.onOpacityChange = function onOpacityChange (opacity) {
    return this.setProperty('opacity', opacity);
};

/**
 * Method to be invoked by the node as soon as a new UIEvent is being added.
 * This results into an `ADD_EVENT_LISTENER` command being send.
 * 
 * @param  {String} UIEvent     UIEvent to be subscribed to (e.g. `click`).
 */
DOMElement.prototype.onAddUIEvent = function onAddUIEvent (UIEvent) {
    var index = this._UIEvents.indexOf(UIEvent);
    if (index === -1) {
        this._changeQueue.push('ADD_EVENT_LISTENER', UIEvent, void 0, true, 'EVENT_END');
        this._UIEvents.push(UIEvent);
    }
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * Method to be invoked by the node as soon as the underlying size mode
 * changes. This results into the size being fetched from the node in
 * order to update the actual, rendered size.
 *
 * @method onSizeModeChange
 */
DOMElement.prototype.onSizeModeChange = function onSizeModeChange () {
    this.onSizeChange(this._node.getSize());
}; 

DOMElement.prototype._requestUpdate = function _requestUpdate () {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
};

/**
 * Initializes the DOMElement by sending the `INIT_DOM` command. This creates
 * or reallocates a new Element in the actual DOM hierarchy.
 *
 * @method init
 */
DOMElement.prototype.init = function init () {
    this._changeQueue.push('INIT_DOM', this._tagName);
    this._initialized = true;
    this.onTransformChange(this._node.getTransform());
    this.onSizeChange(this._node.getSize());
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * Sets the id attribute of the DOMElement.
 *
 * @method setId
 * @chainable
 *
 * @param {String} id   New id to be set.
 */
DOMElement.prototype.setId = function setId (id) {
    this.setAttribute('id', id);
    return this;
};

/**
 * Adds a new class to the internal class list of the underlying Element in the
 * DOM.
 *
 * @method addClass
 * @chainable
 * 
 * @param {String} value    New class name to be added.
 * @return {DOMElement} this
 */
DOMElement.prototype.addClass = function addClass (value) {
    if (this._classes.indexOf(value) < 0) {
        if (this._initialized) this._changeQueue.push('ADD_CLASS', value);
        this._classes.push(value);
        if (!this._requestingUpdate) this._requestUpdate();
        return this;
    }

    if (this._inDraw) {
        if (this._initialized) this._changeQueue.push('ADD_CLASS', value);
        if (!this._requestingUpdate) this._requestUpdate();
    }
    return this;
};

/**
 * Removes a class from the DOMElement's classList.
 *
 * @method removeClass
 * 
 * @param  {String} value       Class name to be removed.
 * @return {DOMElement} this
 */
DOMElement.prototype.removeClass = function removeClass (value) {
    var index = this._classes.indexOf(value);

    if (index < 0) return this;

    this._changeQueue.push('REMOVE_CLASS', value);

    this._classes.splice(index, 1);

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Sets an attribute of the DOMElement.
 *
 * @method setAttribute
 * 
 * @param {String} name     Attribute key (e.g. `src`)
 * @param {String} value    Attribute value (e.g. `http://famo.us`)
 */
DOMElement.prototype.setAttribute = function setAttribute (name, value) {
    if (this._attributes[name] !== value || this._inDraw) {
        this._attributes[name] = value;
        if (this._initialized) this._changeQueue.push('CHANGE_ATTRIBUTE', name, value);
        if (!this._requestUpdate) this._requestUpdate();
    }
    return this;
};

/**
 * Sets a CSS property.
 *
 * @method setProperty
 * @chainable
 * 
 * @param {String} name  Name of the CSS rule (e.g. `background-color`).
 * @param {String} value Value of CSS property (e.g. `red`).
 * @return {DOMElement} this
 */
DOMElement.prototype.setProperty = function setProperty (name, value) {
    if (this._styles[name] !== value || this._inDraw) {
        this._styles[name] = value;
        if (this._initialized) this._changeQueue.push('CHANGE_PROPERTY', name, value);
        if (!this._requestingUpdate) this._requestUpdate();
    }
    return this;
};

/**
 * Sets the content of the DOMElement. This is using `innerHTML`, escaping user
 * generated content is therefore essential for security purposes.
 *
 * @method setContent
 * 
 * @param {String} content     Content to be set using `.innerHTML = ...`
 */
DOMElement.prototype.setContent = function setContent (content) {
    if (this._content !== content || this._inDraw) {
        this._content = content;
        if (this._initialized) this._changeQueue.push('CHANGE_CONTENT', content);
        if (!this._requestingUpdate) this._requestUpdate();
    }
    return this;
};

/**
 * Subscribes to a DOMElement using.
 *
 * @method on
 * 
 * @param  {String} event       The event type (e.g. `click`).
 * @param  {Function} listener  Handler function for the specified event type
 *                              in which the payload event object will be
 *                              passed into.
 */
DOMElement.prototype.on = function on (event, listener) {
    return this._callbacks.on(event, listener);
};

/**
 * Function to be invoked by the Node whenever an UIEvent is being received.
 * There are two different ways to subscribe for those events:
 *
 * 1. By overriding the onReceive method (and possibly using `switch` in order
 *     to differentiate between the different event types).
 * 2. By using @{@link DOMElement#on} and using the built-in
 *     @{@linkCallbackStore}.
 *
 * @method onReceive
 * 
 * @param  {String} event   Event type (e.g. `click`).
 * @param  {Object} payload Event object.
 */
DOMElement.prototype.onReceive = function onReceive (event, payload) {
    this._callbacks.trigger(event, payload);
};

/**
 * The draw function is being used in order to allow mutating the DOMElement
 * before actually mounting the corresponding node.
 *
 * @method draw
 * @private
 */
DOMElement.prototype.draw = function draw () {
    var key;
    var i;
    var len;

    this._inDraw = true;

    this.init();

    for (i = 0, len = this._classes.length ; i < len ; i++)
        this.addClass(this._classes[i]);

    this.setContent(this._content);

    for (key in this._styles) 
        if (this._styles[key])
            this.setProperty(key, this._styles[key]);

    for (key in this._attributes)
        if (this._attributes[key])
            this.setAttribute(key, this._attributes[key]);
    
    for (i = 0, len = this._UIEvents.length ; i < len ; i++)
        this._changeQueue.push('ADD_EVENT_LISTENER', this._UIEvents[i], void 0, true, 'EVENT_END');

    this._inDraw = false;
};

module.exports = DOMElement;


},{"famous-utilities":71}],76:[function(require,module,exports){
'use strict';

var DOMElement = require('./DOMElement');
var CallbackStore = require('famous-utilities').CallbackStore;

var WITH = 'WITH';
var CHANGE_TRANSFORM = 'CHANGE_TRANSFORM';
var CHANGE_PROPERTY = 'CHANGE_PROPERTY';
var INIT_DOM = 'INIT_DOM';
var CHANGE_ATTRIBUTE = 'CHANGE_ATTRIBUTE';
var ADD_CLASS = 'ADD_CLASS';
var REMOVE_CLASS = 'REMOVE_CLASS';
var CHANGE_ATTRIBUTE = 'CHANGE_ATTRIBUTE';
var CHANGE_CONTENT = 'CHANGE_CONTENT';
var ADD_EVENT_LISTENER = 'ADD_EVENT_LISTENER';
var EVENT_PROPERTIES = 'EVENT_PROPERTIES';
var EVENT_END = 'EVENT_END';
var RECALL = 'RECALL';

/**
 * The Element class is responsible for providing the API for how
 *   a RenderNode will interact with the DOM API's.  The element is
 *   responsible for adding a set of commands to the renderer.
 *
 * @class HTMLElement
 * @constructor
 * @component
 * @param {RenderNode} RenderNode to which the instance of Element will be a component of
 */
function HTMLElement(node, tagName) {
    console.warn("HTMLElement was depricated\n use DOMElement");
    return new DOMElement(node, tagName);
} 

module.exports = HTMLElement;

},{"./DOMElement":75,"famous-utilities":71}],77:[function(require,module,exports){
'use strict';

module.exports = {
    HTMLElement: require('./HTMLElement'),
    DOMElement: require('./DOMElement')
};

},{"./DOMElement":75,"./HTMLElement":76}],78:[function(require,module,exports){
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 
// MIT license

'use strict';

var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];

var rAF, cAF;

if (typeof window === 'object') {
    rAF = window.requestAnimationFrame;
    cAF = window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
    for (var x = 0; x < vendors.length && !rAF; ++x) {
        rAF = window[vendors[x] + 'RequestAnimationFrame'];
        cAF = window[vendors[x] + 'CancelRequestAnimationFrame']
            || window[vendors[x] + 'CancelAnimationFrame'];
    }

    if (rAF && !cAF) {
        // cAF not supported.
        // Fall back to setInterval for now (very rare).
        rAF = null;
    }
}

var now = Date.now ? Date.now : function () {
    return new Date().getTime();
};

if (!rAF) {
    rAF = function(callback) {
        var currTime = now();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = setTimeout(function () {
            callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

    cAF = function (id) {
        clearTimeout(id);
    };
}

module.exports = {
    requestAnimationFrame: rAF,
    cancelAnimationFrame: cAF
};

},{}],79:[function(require,module,exports){
'use strict';

module.exports = {
    requestAnimationFrame: require('./animationFrame').requestAnimationFrame,
    cancelAnimationFrame: require('./animationFrame').cancelAnimationFrame
};

},{"./animationFrame":78}],80:[function(require,module,exports){
'use strict';

var polyfills = require('famous-polyfills');
var rAF = polyfills.requestAnimationFrame;
var cAF = polyfills.cancelAnimationFrame;

var _now;
if (typeof performance !== 'undefined') {
    _now = function() {
        return performance.now();
    };
}
else {
    _now = Date.now;
}

if (typeof document !== 'undefined') {
    var VENDOR_HIDDEN, VENDOR_VISIBILITY_CHANGE;

    // Opera 12.10 and Firefox 18 and later support
    if (typeof document.hidden !== 'undefined') {
        VENDOR_HIDDEN = 'hidden';
        VENDOR_VISIBILITY_CHANGE = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        VENDOR_HIDDEN = 'mozHidden';
        VENDOR_VISIBILITY_CHANGE = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        VENDOR_HIDDEN = 'msHidden';
        VENDOR_VISIBILITY_CHANGE = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        VENDOR_HIDDEN = 'webkitHidden';
        VENDOR_VISIBILITY_CHANGE = 'webkitvisibilitychange';
    }
}

/**
 * Engine class used for updating objects on a frame-by-frame. Synchronizes the
 * `update` method invocations to the refresh rate of the screen. Manages
 * the `requestAnimationFrame`-loop by normalizing the passed in timestamp
 * when switching tabs.
 * 
 * @class Engine
 * @constructor
 */
function Engine() {
    this._updates = [];
    var _this = this;
    this._looper = function(time) {
        _this.loop(time);
    };
    this._stoppedAt = _now();
    this._sleep = 0;
    this._startOnVisibilityChange = true;
    this._rAF = null;
    this.start();

    if (typeof document !== 'undefined') {
        document.addEventListener(VENDOR_VISIBILITY_CHANGE, function() {
            if (document[VENDOR_HIDDEN]) {
                cAF(this._rAF);
                var startOnVisibilityChange = _this._startOnVisibilityChange;
                _this.stop();
                _this._startOnVisibilityChange = startOnVisibilityChange;
            }
            else {
                if (_this._startOnVisibilityChange) {
                    _this.start();
                }
            }
        });
    }
}

/**
 * Starts the Engine.
 *
 * @method start
 * @chainable
 * 
 * @return {Engine} this
 */
Engine.prototype.start = function start() {
    if (!this._running) {
        this._startOnVisibilityChange = true;
        this._running = true;
        this._sleep += _now() - this._stoppedAt;
        this._rAF = rAF(this._looper);
    }
    return this;
};

/**
 * Stops the Engine.
 *
 * @method stop
 * @chainable
 * 
 * @return {Engine} this
 */
Engine.prototype.stop = function stop() {
    if (this._running) {
        this._startOnVisibilityChange = false;
        this._running = false;
        this._stoppedAt = _now();
        cAF(this._rAF);
    }
    return this;
};

/**
 * Determines whether the Engine is currently running or not.
 *
 * @method isRunning
 * 
 * @return {Boolean}    boolean value indicating whether the Engine is
 *                      currently running or not
 */
Engine.prototype.isRunning = function isRunning() {
    return this._running;
};

/**
 * Updates all registered objects.
 *
 * @method step
 * @chainable
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 * @return {Engine}      this
 */
Engine.prototype.step = function step (time) {
    for (var i = 0, len = this._updates.length ; i < len ; i++) {
        this._updates[i].update(time);
    }
    return this;
};

/**
 * Method being called by `requestAnimationFrame` on every paint. Indirectly
 * recursive by scheduling a future invocation of itself on the next paint.
 *
 * @method loop
 * @chainable
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 * @return {Engine}      this
 */
Engine.prototype.loop = function loop(time) {
    this.step(time - this._sleep);
    this._rAF = rAF(this._looper);
    return this;
};

/**
 * Registeres an updateable object which `update` method should be invoked on
 * every paint, starting on the next paint (assuming the Engine is running).
 *
 * @method update
 * @chainable
 * 
 * @param  {Object} updateable          object to be updated
 * @param  {Function} updateable.update update function to be called on the
 *                                      registered object
 * @return {Engine}                     this
 */
Engine.prototype.update = function update(updateable) {
    if (this._updates.indexOf(updateable) === -1) {
        this._updates.push(updateable);
    }
    return this;
};

/**
 * Deregisters an updateable object previously registered using `update` to be
 * no longer updated.
 *
 * @method noLongerUpdate
 * @chainable
 * 
 * @param  {Object} updateable          updateable object previously
 *                                      registered using `update`
 * @return {Engine}                     this
 */
Engine.prototype.noLongerUpdate = function noLongerUpdate(updateable) {
    var index = this._updates.indexOf(updateable);
    if (index > -1) {
        this._updates.splice(index, 1);
    }
    return this;
};

module.exports = Engine;

},{"famous-polyfills":79}],81:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],82:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./Mat33":81,"dup":12}],83:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],84:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],85:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"./Mat33":81,"./Quaternion":82,"./Vec2":83,"./Vec3":84,"dup":15}],86:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],87:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./Mat33":86,"dup":12}],88:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],89:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],90:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"./Mat33":86,"./Quaternion":87,"./Vec2":88,"./Vec3":89,"dup":15}],91:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],92:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],93:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":91,"dup":21}],94:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],95:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":91,"./Easing":92,"./Transitionable":93,"./after":94,"dup":23}],96:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],97:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":95}],98:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],99:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],100:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],101:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],102:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],103:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":96,"./Color":97,"./KeyCodes":98,"./MethodStore":99,"./ObjectManager":100,"./clone":101,"./flatClone":102,"./keyValueToArrays":104,"./loadURL":105,"./strip":106,"dup":31}],104:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],105:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],106:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],107:[function(require,module,exports){
'use strict';

var Vec3 = require('famous-math').Vec3;
var Mat33 = require('famous-math').Mat33;

var ObjectManager = require('famous-utilities').ObjectManager;
ObjectManager.register('DynamicGeometry', DynamicGeometry);
ObjectManager.register('DynamicGeometryFeature', DynamicGeometryFeature);
var OMRequestDynamicGeometryFeature = ObjectManager.requestDynamicGeometryFeature;
var OMFreeDynamicGeometryFeature = ObjectManager.freeDynamicGeometryFeature;

var TRIPLE_REGISTER = new Vec3();

/**
 * The so called triple product. Used to find a vector perpendicular to (v2 - v1) in the direction of v3.
 * (v1 x v2) x v3.
 *
 * @method tripleProduct
 * @private
 * @param {Vec3} v1 The first Vec3.
 * @param {Vec3} v2 The second Vec3.
 * @param {Vec3} v3 The third Vec3.
 * @return {Vec3} The result of the triple product.
 */
function tripleProduct(v1, v2, v3) {
    var v = TRIPLE_REGISTER;

    Vec3.cross(v1, v2, v);
    Vec3.cross(v, v3, v);

    return v;
}

/**
 * Of a set of vertices, retrieves the vertex furthest in the given direction.
 *
 * @method _hullSupport
 * @private
 * @param {Vec3[]} vertices The reference set of Vec3's.
 * @param {Vec3} direction The direction to compare against.
 * @return {Object} The vertex and its index in the vertex array.
 */
function _hullSupport(vertices, direction) {
    var furthest;
    var max = -Infinity;
    var dot;
    var vertex;
    var index;
    for (var i = 0; i < vertices.length; i++) {
        vertex = vertices[i];
        dot = Vec3.dot(vertex, direction);
        if (dot > max) {
            furthest = vertex;
            max = dot;
            index = i;
        }
    }

    return {
        vertex: furthest,
        index: index
    };
}

var VEC_REGISTER = new Vec3();
var POINTCHECK_REGISTER = new Vec3();
var AO_REGISTER = new Vec3();
var AB_REGISTER = new Vec3();
var AC_REGISTER = new Vec3();
var AD_REGISTER = new Vec3();
var BC_REGISTER = new Vec3();
var BD_REGISTER = new Vec3();

/**
 * Used internally to represent polyhedral facet information.
 *
 * @class DynamicGeometryFeature
 * @param {Number} distance The distance of the feature from the origin.
 * @param {Vec3} normal The Vec3 orthogonal to the feature, pointing out of the geometry.
 * @param {Number[]} vertexIndices The indices of the vertices which compose the feature.
 */
function DynamicGeometryFeature(distance, normal, vertexIndices) {
    this.distance = distance;
    this.normal = normal;
    this.vertexIndices = vertexIndices;
}

/**
 * Used by ObjectManager to reset objects.
 *
 * @method reset
 * @param {Array} args Argument array analogous to that used in instantiation.
 * @chainable
 */
DynamicGeometryFeature.prototype.reset = function(distance, normal, vertexIndices) {
    this.distance = distance;
    this.normal = normal;
    this.vertexIndices = vertexIndices;

    return this;
};

/**
 * Abstract object representing a growing polyhedron. Used in ConvexHull and in GJK+EPA collision detection.
 *
 * @class DynamicGeometry
 */
function DynamicGeometry() {
    this.vertices = [];
    this.numVertices = 0;
    this.features = [];
    this.numFeatures = 0;
    this.lastVertexIndex = 0;

    this._IDPool = {
        vertices: [],
        features: []
    };
}

/**
 * Used by ObjectManager to reset objects.
 *
 * @method reset
 * @param {Array} args Argument array analogous to that used in instantiation.
 * @chainable
 */
DynamicGeometry.prototype.reset = function reset() {
    this.vertices = [];
    this.numVertices = 0;
    this.features = [];
    this.numFeatures = 0;
    this.lastVertexIndex = 0;

    this._IDPool = {
        vertices: [],
        features: []
    };

    return this;
};

/**
 * Add a vertex to the polyhedron.
 *
 * @method addVertex
 * @param {Object} vertexObj Object returned by the support function.
 */
DynamicGeometry.prototype.addVertex = function(vertexObj) {
    var index = this._IDPool.vertices.length ? this._IDPool.vertices.pop() : this.vertices.length;
    this.vertices[index] = vertexObj;
    this.lastVertexIndex = index;
    this.numVertices++;
};

/**
 * Remove a vertex and push its location in the vertex array to the IDPool for later use.
 *
 * @method removeVertex
 * @param {Number} index Index of the vertex to remove.
 */
DynamicGeometry.prototype.removeVertex = function(index) {
    var vertex = this.vertices[index];
    this.vertices[index] = null;
    this._IDPool.vertices.push(index);
    this.numVertices--;

    return vertex;
};

/**
 * Add a feature (facet) to the polyhedron. Used internally in the reshaping process.
 *
 * @method addFeature
 * @param {Number} distance The distance of the feature from the origin.
 * @param {Vec3} normal The facet normal.
 * @param {Number[]} vertexIndices The indices of the vertices which compose the feature.
 */
DynamicGeometry.prototype.addFeature = function(distance, normal, vertexIndices) {
    var index = this._IDPool.features.length ? this._IDPool.features.pop() : this.features.length;
    this.features[index] = OMRequestDynamicGeometryFeature().reset(distance, normal, vertexIndices);
    this.numFeatures++;
};

/**
 * Remove a feature and push its location in the feature array to the IDPool for later use.
 *
 * @method removeFeature
 * @param {Number} index Index of the feature to remove.
 */
DynamicGeometry.prototype.removeFeature = function(index) {
    var feature = this.features[index];
    this.features[index] = null;
    this._IDPool.features.push(index);
    this.numFeatures--;

    OMFreeDynamicGeometryFeature(feature);
};

/**
 * Retrieve the last vertex object added to the geometry.
 *
 * @method getLastVertex
 * @return {Object}
 */
DynamicGeometry.prototype.getLastVertex = function() {
    return this.vertices[this.lastVertexIndex];
};

/**
 * Of the closest face to the origin, returns the normal vector pointed away from the origin.
 *
 * @method getFeatureClosestToOrigin
 * @return {Object}
 */
DynamicGeometry.prototype.getFeatureClosestToOrigin = function() {
    var min = Infinity;
    var closest = null;
    var features = this.features;
    for (var i = 0, len = features.length; i < len; i++) {
        var feature = features[i];
        if (!feature) continue;
        if (feature.distance < min) {
            min = feature.distance;
            closest = feature;
        }
    }
    return closest;
};

/**
 * Adds edge if not already on the frontier, removes if the edge or its reverse are on the frontier.
 * Used when reshaping DynamicGeometry's.
 *
 * @method _validateEdge
 * @private
 * @param {Object[]} vertices Vec3 reference array.
 * @param {Number[][]} frontier Current edges potentially separating the features to remove from the persistant shape.
 * @param {Number} start The index of the starting Vec3 on the edge.
 * @param {Number} end The index of the culminating Vec3.
 */
function _validateEdge(vertices, frontier, start, end) {
    var e0 = vertices[start].vertex;
    var e1 = vertices[end].vertex;
    for (var i = 0, len = frontier.length; i < len; i++) {
        var edge = frontier[i];
        if (!edge) continue;
        var v0 = vertices[edge[0]].vertex;
        var v1 = vertices[edge[1]].vertex;
        if ((e0 === v0 && (e1 === v1)) || (e0 === v1 && (e1 === v0))) {
            frontier[i] = null;
            return;
        }
    }
    frontier.push([start, end]);
}

/**
 * Based on the last (exterior) point added to the polyhedron, removes features as necessary and redetermines
 * its (convex) shape to include the new point by adding triangle features. Uses referencePoint, a point on the shape's
 * interior, to ensure feature normals point outward, else takes referencePoint to be the origin.
 *
 * @method reshape
 * @param {Vec3} referencePoint Point known to be in the interior, used to orient feature normals.
 */
DynamicGeometry.prototype.reshape = function(referencePoint) {
    var vertices = this.vertices;
    var point = this.getLastVertex().vertex;
    var features = this.features;
    var vertexOnFeature;
    var featureVertices;

    var i, j, len;

    // The removal of features creates a hole in the polyhedron -- frontierEdges maintains the edges
    // of this hole, each of which will form one edge of a new feature to be created
    var frontierEdges = [];

    for (i = 0, len = features.length; i < len; i++) {
        if (!features[i]) continue;
        featureVertices = features[i].vertexIndices;
        vertexOnFeature = vertices[featureVertices[0]].vertex;
        // If point is 'above' the feature, remove that feature, and check to add its edges to the frontier.
        if (Vec3.dot(features[i].normal, Vec3.subtract(point, vertexOnFeature, POINTCHECK_REGISTER)) > -0.001) {
            _validateEdge(vertices, frontierEdges, featureVertices[0], featureVertices[1]);
            _validateEdge(vertices, frontierEdges, featureVertices[1], featureVertices[2]);
            _validateEdge(vertices, frontierEdges, featureVertices[2], featureVertices[0]);
            this.removeFeature(i);
        }
    }

    var A = point;
    var a = this.lastVertexIndex;
    for (j = 0, len = frontierEdges.length; j < len; j++) {
        if (!frontierEdges[j]) continue;
        var b = frontierEdges[j][0];
        var c = frontierEdges[j][1];
        var B = vertices[b].vertex;
        var C = vertices[c].vertex;

        var AB = Vec3.subtract(B, A, AB_REGISTER);
        var AC = Vec3.subtract(C, A, AC_REGISTER);
        var ABC = Vec3.cross(AB, AC, new Vec3());
        ABC.normalize();

        if (!referencePoint) {
            var distance = Vec3.dot(ABC, A);
            if (distance < 0) {
                ABC.invert();
                distance *= -1;
            }
            this.addFeature(distance, ABC, [a, b, c]);
        }
        else {
            var reference = Vec3.subtract(referencePoint, A, VEC_REGISTER);
            if (Vec3.dot(ABC, reference) > -0.001) ABC.invert();
            this.addFeature(null, ABC, [a, b, c]);
        }
    }
};

/**
 * Checks if the Simplex instance contains the origin, returns true or false.
 * If false, removes a point and, as a side effect, changes input direction to be both
 * orthogonal to the current working simplex and point toward the origin.
 * Calls callback on the removed point.
 *
 * @method simplexContainsOrigin
 * @param {Vec3} direction Vector used to store the new search direction.
 * @param {Function} callback Function invoked with the removed vertex, used e.g. to free the vertex object
 * in the object manager.
 * @return {Boolean} The result of the containment check.
 */
DynamicGeometry.prototype.simplexContainsOrigin = function(direction, callback) {
    var numVertices = this.vertices.length;

    var a = this.lastVertexIndex;
    var b = a - 1;
    var c = a - 2;
    var d = a - 3;

    b = b < 0 ? b + numVertices : b;
    c = c < 0 ? c + numVertices : c;
    d = d < 0 ? d + numVertices : d;

    var A = this.vertices[a].vertex;
    var B = this.vertices[b].vertex;
    var C = this.vertices[c].vertex;
    var D = this.vertices[d].vertex;

    var AO = Vec3.scale(A, -1, AO_REGISTER);
    var AB = Vec3.subtract(B, A, AB_REGISTER);
    var AC, AD, BC, BD;
    var ABC, ACD, ABD, BCD;
    var distanceABC, distanceACD, distanceABD, distanceBCD;

    var vertexToRemove;

    if (numVertices === 4) {
        // Tetrahedron
        AC = Vec3.subtract(C, A, AC_REGISTER);
        AD = Vec3.subtract(D, A, AD_REGISTER);

        ABC = Vec3.cross(AB, AC, new Vec3());
        ACD = Vec3.cross(AC, AD, new Vec3());
        ABD = Vec3.cross(AB, AD, new Vec3());
        ABC.normalize();
        ACD.normalize();
        ABD.normalize();
        if (Vec3.dot(ABC, AD) > 0) ABC.invert();
        if (Vec3.dot(ACD, AB) > 0) ACD.invert();
        if (Vec3.dot(ABD, AC) > 0) ABD.invert();
        // Don't need to check BCD because we would have just checked that in the previous iteration
        // -- we added A to the BCD triangle because A was in the direction of the origin.

        distanceABC = Vec3.dot(ABC, AO);
        distanceACD = Vec3.dot(ACD, AO);
        distanceABD = Vec3.dot(ABD, AO);

        // Norms point away from origin -> origin is inside tetrahedron
        if (distanceABC < 0.001 && distanceABD < 0.001 && distanceACD < 0.001) {
            BC = Vec3.subtract(C, B, BC_REGISTER);
            BD = Vec3.subtract(D, B, BD_REGISTER);
            BCD = Vec3.cross(BC, BD, new Vec3());
            BCD.normalize();
            if (Vec3.dot(BCD, AB) <= 0) BCD.invert();
            distanceBCD = -1 * Vec3.dot(BCD,B);
            // Prep features for EPA
            this.addFeature(-distanceABC, ABC, [a,b,c]);
            this.addFeature(-distanceACD, ACD, [a,c,d]);
            this.addFeature(-distanceABD, ABD, [a,d,b]);
            this.addFeature(-distanceBCD, BCD, [b,c,d]);
            return true;
        }
        else if (distanceABC >= 0.001) {
            vertexToRemove = this.removeVertex(d);
            direction.copy(ABC);
        }
        else if (distanceACD >= 0.001) {
            vertexToRemove = this.removeVertex(b);
            direction.copy(ACD);
        }
        else {
            vertexToRemove = this.removeVertex(c);
            direction.copy(ABD);
        }
    }
    else if (numVertices === 3) {
        // Triangle
        AC = Vec3.subtract(C, A, AC_REGISTER);
        Vec3.cross(AB, AC, direction);
        if (Vec3.dot(direction, AO) <= 0) direction.invert();
    }
    else {
        // Line
        direction.copy(tripleProduct(AB, AO, AB));
    }
    if (vertexToRemove && callback) callback(vertexToRemove);
    return false;
};

/**
 * Given an array of Vec3's, computes the convex hull. Used in constructing bodies in the physics system and to
 * create custom GL meshes.
 *
 * @class ConvexHull
 * @constructor
 * @param {Vec3[]} vertices Cloud of vertices of which the enclosing convex hull is desired.
 * @param {Number} [iterations = 1e3] Maximum number of vertices to compose the convex hull.
 */
function ConvexHull(vertices, iterations) {
    iterations = iterations || 1e3;
    var hull = _computeConvexHull(vertices, iterations);

    var i, len;

    var indices = [];
    for (i = 0, len = hull.features.length; i < len; i++) {
        var f = hull.features[i];
        if (f) indices.push(f.vertexIndices);
    }

    var polyhedralProperties = _computePolyhedralProperties(hull.vertices, indices);
    var centroid = polyhedralProperties.centroid;

    var worldVertices = [];
    for (i = 0, len = hull.vertices.length; i < len; i++) {
        worldVertices.push(Vec3.subtract(hull.vertices[i].vertex, centroid, new Vec3()));
    }

    var normals = [];
    for (i = 0, len = worldVertices.length; i < len; i++) {
        normals.push(Vec3.normalize(worldVertices[i], new Vec3()));
    }

    var graph = {};
    var _neighborMatrix = {};
    for (i = 0; i < indices.length; i++) {
        var a = indices[i][0];
        var b = indices[i][1];
        var c = indices[i][2];

        _neighborMatrix[a] = _neighborMatrix[a] || {};
        _neighborMatrix[b] = _neighborMatrix[b] || {};
        _neighborMatrix[c] = _neighborMatrix[c] || {};

        graph[a] = graph[a] || [];
        graph[b] = graph[b] || [];
        graph[c] = graph[c] || [];

        if (!_neighborMatrix[a][b]) {
            _neighborMatrix[a][b] = 1;
            graph[a].push(b);
        }
        if (!_neighborMatrix[a][c]) {
            _neighborMatrix[a][c] = 1;
            graph[a].push(c);
        }
        if (!_neighborMatrix[b][a]) {
            _neighborMatrix[b][a] = 1;
            graph[b].push(a);
        }
        if (!_neighborMatrix[b][c]) {
            _neighborMatrix[b][c] = 1;
            graph[b].push(c);
        }
        if (!_neighborMatrix[c][a]) {
            _neighborMatrix[c][a] = 1;
            graph[c].push(a);
        }
        if (!_neighborMatrix[c][b]) {
            _neighborMatrix[c][b] = 1;
            graph[c].push(b);
        }
    }

    this.indices = indices;
    this.vertices = worldVertices;
    this.normals = normals;
    this.polyhedralProperties = polyhedralProperties;
    this.graph = graph;
}

/**
 * Performs the actual computation of the convex hull.
 *
 * @method _computeConvexHull
 * @private
 * @param {Vec3[]} vertices Cloud of vertices of which the enclosing convex hull is desired.
 * @param {Number} maxIterations Maximum number of vertices to compose the convex hull.
 * @return {DynamicGeometry} The computed hull.
 */
function _computeConvexHull(vertices, maxIterations) {
    var hull = new DynamicGeometry();

    hull.addVertex(_hullSupport(vertices, new Vec3(1, 0, 0)));
    hull.addVertex(_hullSupport(vertices, new Vec3(-1, 0, 0)));
    var A = hull.vertices[0].vertex;
    var B = hull.vertices[1].vertex;
    var AB = Vec3.subtract(B, A, AB_REGISTER);

    var dot;
    var vertex;
    var furthest;
    var index;
    var i, len;

    var max = -Infinity;
    for (i = 0; i < vertices.length; i++) {
        vertex = vertices[i];
        if (vertex === A || vertex === B) continue;
        var AV = Vec3.subtract(vertex, A, VEC_REGISTER);
        dot = Vec3.dot(AV, tripleProduct(AB, AV, AB));
        dot = dot < 0 ? dot * -1 : dot;
        if (dot > max) {
            max = dot;
            furthest = vertex;
            index = i;
        }
    }
    hull.addVertex({
        vertex: furthest,
        index: index
    });

    var C = furthest;
    var AC = Vec3.subtract(C, A, AC_REGISTER);
    var ABC = Vec3.cross(AB, AC, new Vec3());
    ABC.normalize();

    max = -Infinity;
    for (i = 0; i < vertices.length; i++) {
        vertex = vertices[i];
        if (vertex === A || vertex === B || vertex === C) continue;
        dot = Vec3.dot(Vec3.subtract(vertex, A, VEC_REGISTER), ABC);
        dot = dot < 0 ? dot * -1 : dot;
        if (dot > max) {
            max = dot;
            furthest = vertex;
            index = i;
        }
    }
    hull.addVertex({
        vertex: furthest,
        index: index
    });

    var D = furthest;
    var AD = Vec3.subtract(D, A, AD_REGISTER);
    var BC = Vec3.subtract(C, B, BC_REGISTER);
    var BD = Vec3.subtract(D, B, BD_REGISTER);

    var ACD = Vec3.cross(AC, AD, new Vec3());
    var ABD = Vec3.cross(AB, AD, new Vec3());
    var BCD = Vec3.cross(BC, BD, new Vec3());
    ACD.normalize();
    ABD.normalize();
    BCD.normalize();
    if (Vec3.dot(ABC, AD) > 0) ABC.invert();
    if (Vec3.dot(ACD, AB) > 0) ACD.invert();
    if (Vec3.dot(ABD, AC) > 0) ABD.invert();
    if (Vec3.dot(BCD, AB) < 0) BCD.invert();

    var a = 0;
    var b = 1;
    var c = 2;
    var d = 3;

    hull.addFeature(null, ABC, [a, b, c]);
    hull.addFeature(null, ACD, [a, c, d]);
    hull.addFeature(null, ABD, [a, b, d]);
    hull.addFeature(null, BCD, [b, c, d]);

    var assigned = {};
    for (i = 0, len = hull.vertices.length; i < len; i++) {
       assigned[hull.vertices[i].index] = true;
    }


    var cx = A.x + B.x + C.x + D.x;
    var cy = A.y + B.y + C.y + D.y;
    var cz = A.z + B.z + C.z + D.z;
    var referencePoint = new Vec3(cx, cy, cz);
    referencePoint.scale(0.25);

    var features = hull.features;
    var iteration = 0;
    while (iteration++ < maxIterations) {
        var currentFeature = null;
        for (i = 0, len = features.length; i < len; i++) {
            if (!features[i] || features[i].done) continue;
            currentFeature = features[i];
            furthest = null;
            index = null;
            A = hull.vertices[currentFeature.vertexIndices[0]].vertex;
            var s = _hullSupport(vertices, currentFeature.normal);
            furthest = s.vertex;
            index = s.index;
            var dist = Vec3.dot(Vec3.subtract(furthest, A, VEC_REGISTER), currentFeature.normal);

            if (dist < 0.001 || assigned[index]) {
                currentFeature.done = true;
                continue;
            }

            assigned[index] = true;
            hull.addVertex(s);
            hull.reshape(referencePoint);
        }
            // No feature has points 'above' it -> finished
        if (currentFeature === null) break;
    }

    return hull;
}

/**
 * Helper function used in _computePolyhedralProperties.
 * Sets f0 - f2 and g0 - g2 depending on w0 - w2.
 *
 * @method _subexpressions
 * @private
 * @param {Number} w0 Reference x coordinate.
 * @param {Number} w1 Reference y coordinate.
 * @param {Number} w2 Reference z coordinate.
 * @param {Number[]} f One of two output registers to contain the result of the calculation.
 * @param {Number[]} g One of two output registers to contain the result of the calculation.
 */
function _subexpressions(w0, w1, w2, f, g) {
    var t0 = w0 + w1;
    f[0] = t0 + w2;
    var t1 = w0 * w0;
    var t2 = t1 + w1 * t0;
    f[1] = t2 + w2 * f[0];
    f[2] = w0 * t1 + w1 * t2 + w2 * f[1];
    g[0] = f[1] + w0 * (f[0] + w0);
    g[1] = f[1] + w1 * (f[0] + w1);
    g[2] = f[1] + w2 * (f[0] + w2);
}

/**
 * Determines various properties of the volume.
 *
 * @method _computePolyhedralProperties
 * @private
 * @param {Vec3[]} vertices The vertices of the polyhedron.
 * @param {Number[][]} indices Array of arrays of indices of vertices composing the triangular features of the polyhedron,
 * one array for each feature.
 * @return {Object} Object holding the calculated span, volume, center, and euler tensor.
 */
function _computePolyhedralProperties(vertices, indices) {
    // Order: 1, x, y, z, x^2, y^2, z^2, xy, yz, zx
    var integrals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var fx = [];
    var fy = [];
    var fz = [];
    var gx = [];
    var gy = [];
    var gz = [];

    var i, len;

    for (i = 0, len = indices.length; i < len; i++) {
        var A = vertices[indices[i][0]].vertex;
        var B = vertices[indices[i][1]].vertex;
        var C = vertices[indices[i][2]].vertex;
        var AB = Vec3.subtract(B, A, AB_REGISTER);
        var AC = Vec3.subtract(C, A, AC_REGISTER);
        var ABC = AB.cross(AC);
        if (Vec3.dot(A, ABC) < 0) ABC.invert();

        var d0 = ABC.x;
        var d1 = ABC.y;
        var d2 = ABC.z;

        var x0 = A.x;
        var y0 = A.y;
        var z0 = A.z;
        var x1 = B.x;
        var y1 = B.y;
        var z1 = B.z;
        var x2 = C.x;
        var y2 = C.y;
        var z2 = C.z;

        _subexpressions(x0, x1, x2, fx, gx);
        _subexpressions(y0, y1, y2, fy, gy);
        _subexpressions(z0, z1, z2, fz, gz);

        integrals[0] += d0 * fx[0];
        integrals[1] += d0 * fx[1];
        integrals[2] += d1 * fy[1];
        integrals[3] += d2 * fz[1];
        integrals[4] += d0 * fx[2];
        integrals[5] += d1 * fy[2];
        integrals[6] += d2 * fz[2];
        integrals[7] += d0 * (y0 * gx[0] + y1 * gx[1] + y2 * gx[2]);
        integrals[8] += d1 * (z0 * gy[0] + z1 * gy[1] + z2 * gy[2]);
        integrals[9] += d2 * (x0 * gz[0] + x1 * gz[1] + x2 * gz[2]);
    }

    integrals[0] /= 6;
    integrals[1] /= 24;
    integrals[2] /= 24;
    integrals[3] /= 24;
    integrals[4] /= 60;
    integrals[5] /= 60;
    integrals[6] /= 60;
    integrals[7] /= 120;
    integrals[8] /= 120;
    integrals[9] /= 120;

    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;

    for (i = 0, len = vertices.length; i < len; i++) {
        var vertex = vertices[i].vertex;
        if (vertex.x < minX) minX = vertex.x;
        if (vertex.x > maxX) maxX = vertex.x;
        if (vertex.y < minY) minY = vertex.y;
        if (vertex.y > maxY) maxY = vertex.y;
        if (vertex.z < minZ) minZ = vertex.z;
        if (vertex.z > maxZ) maxZ = vertex.z;
    }

    var size = [maxX - minX, maxY - minY, maxZ - minZ];
    var volume = integrals[0];
    var centroid = new Vec3(integrals[1], integrals[2], integrals[3]);
    centroid.scale(1 / volume);

    var eulerTensor = new Mat33([
                                  integrals[4], integrals[7], integrals[9],
                                  integrals[7], integrals[5], integrals[8],
                                  integrals[9], integrals[8], integrals[6]
                                 ]);

    return {
        size: size,
        volume: volume,
        centroid: centroid,
        eulerTensor: eulerTensor
    };
}

module.exports = {
    DynamicGeometry: DynamicGeometry,
    ConvexHull: ConvexHull
};

},{"famous-math":90,"famous-utilities":103}],108:[function(require,module,exports){
'use strict';

var Particle = require('./bodies/Particle');
var Constraint = require('./constraints/Constraint');
var Force = require('./forces/Force');

var Vec3 = require('famous-math').Vec3;
var Quaternion = require('famous-math').Quaternion;

var VEC_REGISTER = new Vec3();
var ZYX_REGISTER = new Vec3();
var QUAT_REGISTER = new Quaternion();
var DELTA_REGISTER = new Vec3();

/**
 * Singleton PhysicsEngine object.
 * Manages bodies, forces, constraints.
 *
 * @class PhysicsEngine
 * @param {Object} options A hash of configurable options.
 */
function PhysicsEngine(options) {
    options = options || {};
    /** @prop bodies The bodies currently active in the engine. */
    this.bodies = [];
    /** @prop forces The forces currently active in the engine. */
    this.forces = [];
    /** @prop constraints The constraints currently active in the engine. */
    this.constraints = [];

    /** @prop step The time between frames in the engine. */
    this.step = options.step || 1000/60;
    /** @prop iterations The number of times each constraint is solved per frame. */
    this.iterations = options.iterations || 10;
    /** @prop _indexPool Pools of indicies to track holes in the arrays. */
    this._indexPools = {
        bodies: [],
        forces: [],
        constraints: []
    };

    this._entityMaps = {
        bodies: {},
        forces: {},
        constraints: {}
    };

    this.speed = options.speed || 1.0;
    this.time = 0;
    this.delta = 0;

    this.origin = options.origin || new Vec3();
    this.orientation = options.orientation ? options.orientation.normalize() :  new Quaternion();

    this.prestep = [];
    this.poststep = [];

    this.frameDependent = options.frameDependent || false;

    this.transformBuffers = {
        position: [0, 0, 0],
        rotation: [0, 0, 0]
    };
}

/**
 * Set the origin of the world.
 *
 * @method setOrigin
 * @chainable
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 */
PhysicsEngine.prototype.setOrigin = function setOrigin(x, y, z) {
    this.origin.set(x, y, z);
    return this;
};

/**
 * Set the orientation of the world.
 *
 * @method setOrientation
 * @chainable
 * @param {Number} w The w component.
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 */
PhysicsEngine.prototype.setOrientation = function setOrientation(w, x, y, z) {
    this.orientation.set(w, x, y, z).normalize();
    return this;
};

/**
 * Private helper method to store an element in a library array.
 *
 * @method _addElement
 * @private
 * @param {Object} element The body, force, or constraint to add.
 * @param {String} key Where to store the element.
 */
function _addElement(context, element, key) {
    var map = context._entityMaps[key];
    if (map[element._ID] == null) {
        var library = context[key];
        var indexPool = context._indexPools[key];
        if (indexPool.length) map[element._ID] = indexPool.pop();
        else map[element._ID] = library.length;
        library[map[element._ID]] = element;
    }
}

/**
 * Private helper method to remove an element from a library array.
 *
 * @method _removeElement
 * @private
 * @param {Object} element The body, force, or constraint to remove.
 * @param {String} key Where to store the element.
 */
function _removeElement(context, element, key) {
    var map = context._entityMaps[key];
    var index = map[element._ID];
    if (index != null) {
        context._indexPools[key].push(index);
        context[key][index] = null;
        map[element._ID] = null;
    }
}

/**
 * Add a group of bodies, force, or constraints to the engine.
 *
 * @method add
 * @chainable
 */
PhysicsEngine.prototype.add = function add() {
    for (var j = 0, lenj = arguments.length; j < lenj; j++) {
        var entity = arguments[j];
        if (entity instanceof Array) {
            for (var i = 0, len = entity.length; i < len; i++) {
                var e = entity[i];
                this.add(e);
            }
        } else {
            if (entity instanceof Particle) this.addBody(entity);
            else if (entity instanceof Constraint) this.addConstraint(entity);
            else if (entity instanceof Force) this.addForce(entity);
        }
    }
    return this;
};

/**
 * Remove a group of bodies, force, or constraints from the engine.
 *
 * @method remove
 * @chainable
 */
PhysicsEngine.prototype.remove = function remove() {
    for (var j = 0, lenj = arguments.length; j < lenj; j++) {
        var entity = arguments[j];
        if (entity instanceof Array) {
            for (var i = 0, len = entity.length; i < len; i++) {
                var e = entity[i];
                this.add(e);
            }
        } else {
            if (entity instanceof Particle) this.removeBody(entity);
            else if (entity instanceof Constraint) this.removeConstraint(entity);
            else if (entity instanceof Force) this.removeForce(entity);
        }
    }
    return this;
};

/**
 * Begin tracking a body.
 *
 * @method addBody
 * @param {Particle} body The body to track.
 */
PhysicsEngine.prototype.addBody = function addBody(body) {
    _addElement(this, body, 'bodies');
};

/**
 * Begin tracking a force.
 *
 * @method addForce
 * @param {Force} force The force to track.
 */
PhysicsEngine.prototype.addForce = function addForce(force) {
    _addElement(this, force, 'forces');
};

/**
 * Begin tracking a constraint.
 *
 * @method addConstraint
 * @param {Constraint} constraint The constraint to track.
 */
PhysicsEngine.prototype.addConstraint = function addConstraint(constraint) {
    _addElement(this, constraint, 'constraints');
};

/**
 * Stop tracking a body.
 *
 * @method removeBody
 * @param {Particle} body The body to stop tracking.
 */
PhysicsEngine.prototype.removeBody = function removeBody(body) {
    _removeElement(this, body, 'bodies');
};

/**
 * Stop tracking a force.
 *
 * @method removeForce
 * @param {Force} force The force to stop tracking.
 */
PhysicsEngine.prototype.removeForce = function removeForce(force) {
    _removeElement(this, force, 'forces');
};

/**
 * Stop tracking a constraint.
 *
 * @method removeConstraint
 * @param {Constraint} constraint The constraint to stop tracking.
 */
PhysicsEngine.prototype.removeConstraint = function removeConstraint(constraint) {
    _removeElement(this, constraint, 'constraints');
};

/**
 * Update the physics system to reflect the changes since the last frame. Steps forward in increments of
 * PhysicsEngine.step.
 *
 * @method update
 * @param {Number} time
 */
PhysicsEngine.prototype.update = function update(time) {
    if (this.time === 0) this.time = time;

    var bodies = this.bodies;
    var forces = this.forces;
    var constraints = this.constraints;

    var frameDependent = this.frameDependent;
    var step = this.step;
    var dt = step * 0.001;
    var speed = this.speed;

    var delta = this.delta;
    delta += (time - this.time) * speed;
    this.time = time;

    var i, len;
    var force, body, constraint;

    while(delta > step) {
        for (i = 0, len = this.prestep.length; i < len; i++) {
            this.prestep[i](time, dt);
        }

        // Update Forces on particles
        for (i = 0, len = forces.length; i < len; i++) {
            force = forces[i];
            if (force === null) continue;
            force.update(time, dt);
        }

        // Tentatively update velocities
        for (i = 0, len = bodies.length; i < len; i++) {
            body = bodies[i];
            if (body === null) continue;
            _integrateVelocity(body, dt);
        }

        // Prep constraints for solver
        for (i = 0, len = constraints.length; i < len; i++) {
            constraint = constraints[i];
            if (constraint === null) continue;
            constraint.update(time, dt);
        }

        // Iteratively resolve constraints
        for (var j = 0, numIterations = this.iterations; j < numIterations; j++) {
            for (i = 0, len = constraints.length; i < len; i++) {
                constraint = constraints[i];
                if (constraint === null) continue;
                constraint.resolve(time, dt);
            }
        }

        // Increment positions and orientations
        for (i = 0, len = bodies.length; i < len; i++) {
            body = bodies[i];
            if (body === null) continue;
            _integratePose(body, dt);
        }

        for (i = 0, len = this.poststep.length; i < len; i++) {
            this.poststep[i](time, dt);
        }

        if (frameDependent) delta = 0;
        else delta -= step;
    }

    this.delta = delta;
};

/**
 * Get the transform equivalent to the Particle's position and orientation.
 *
 * @method getTransform
 * @return {Object} Position and rotation of the boy, taking into account
 * the origin and orientation of the world.
 */
PhysicsEngine.prototype.getTransform = function getTransform(body) {
    var o = this.origin;
    var oq = this.orientation;
    var transform = this.transformBuffers;

    var p = body.position;
    var q = body.orientation;
    var rot = q;
    var loc = p;

    if (oq.w !== 1) {
        rot = Quaternion.multiply(q, oq, QUAT_REGISTER);
        loc = oq.rotateVector(p, VEC_REGISTER);
    }
    var ZYX = rot.toEuler(ZYX_REGISTER);

    transform.position[0] = o.x+loc.x;
    transform.position[1] = o.y+loc.y;
    transform.position[2] = o.z+loc.z;

    transform.rotation[0] = ZYX.x;
    transform.rotation[1] = ZYX.y;
    transform.rotation[2] = ZYX.z;

    return transform;
};

/**
 * Update the Particle momenta based off of current incident force and torque.
 *
 * @method _integrateVelocity
 * @private
 * @param {Particle} body
 * @param {Number} dt delta time
 */
function _integrateVelocity(body, dt) {
    body.momentum.add(Vec3.scale(body.force, dt, DELTA_REGISTER));
    body.angularMomentum.add(Vec3.scale(body.torque, dt, DELTA_REGISTER));
    Vec3.scale(body.momentum, body.inverseMass, body.velocity);
    body.inverseInertia.vectorMultiply(body.angularMomentum, body.angularVelocity);
    body.force.clear();
    body.torque.clear();
}

/**
 * Update the Particle position and orientation based off current translational and angular velocities.
 *
 * @method _integratePose
 * @private
 * @param {Particle} body
 * @param dt {Number} delta time
 */
function _integratePose(body, dt) {
    if (body.restrictions !== 0) {
        var restrictions = body.restrictions;
        var x = null;
        var y = null;
        var z = null;
        var ax = null;
        var ay = null;
        var az = null;

        if (restrictions & 32) x = 0;
        if (restrictions & 16) y = 0;
        if (restrictions & 8) z = 0;
        if (restrictions & 4) ax = 0;
        if (restrictions & 2) ay = 0;
        if (restrictions & 1) az = 0;

        if (x !== null || y !== null || z !== null) body.setVelocity(x,y,z);
        if (ax !== null || ay !== null || az !== null) body.setAngularVelocity(ax, ay, az);
    }

    body.position.add(Vec3.scale(body.velocity, dt, DELTA_REGISTER));

    var w = body.angularVelocity;
    var q = body.orientation;
    var wx = w.x;
    var wy = w.y;
    var wz = w.z;

    var qw = q.w;
    var qx = q.x;
    var qy = q.y;
    var qz = q.z;

    var hdt = dt * 0.5;
    q.w += (-wx * qx - wy * qy - wz * qz) * hdt;
    q.x += (wx * qw + wy * qz - wz * qy) * hdt;
    q.y += (wy * qw + wz * qx - wx * qz) * hdt;
    q.z += (wz * qw + wx * qy - wy * qx) * hdt;

    q.normalize();

    body.updateInertia();
}

module.exports = PhysicsEngine;

},{"./bodies/Particle":111,"./constraints/Constraint":116,"./forces/Force":128,"famous-math":90}],109:[function(require,module,exports){
'use strict';

var Vec3 = require('famous-math').Vec3;
var ConvexBodyFactory = require('./ConvexBodyFactory');

var _Box = ConvexBodyFactory([
            // Order: back-left,back-right,front-left,front-right
            // Top half
            new Vec3(-100, -100, -100),
            new Vec3(100, -100, -100),
            new Vec3(-100, -100, 100),
            new Vec3(100, -100, 100),
            // Bottom half
            new Vec3(-100, 100, -100),
            new Vec3(100, 100, -100),
            new Vec3(-100, 100, 100),
            new Vec3(100, 100, 100),
        ]);

/**
 * @class Box
 * @extends Particle
 * @param {Object} options
 */
function Box(options) {
    _Box.call(this, options);
    this.normals = [
        // Order: top, right, front
        new Vec3(0, 1, 0),
        new Vec3(1, 0, 0),
        new Vec3(0, 0, 1)
    ];

    this.type = 1 << 1;
}

Box.prototype = Object.create(_Box.prototype);
Box.prototype.constructor = Box;

module.exports = Box;

},{"./ConvexBodyFactory":110,"famous-math":90}],110:[function(require,module,exports){
'use strict';

var Particle = require('../bodies/Particle');
var Mat33 = require('famous-math').Mat33;
var Vec3 = require('famous-math').Vec3;
var Geometry = require('../Geometry');
var ConvexHull = Geometry.ConvexHull;

var TEMP_REGISTER = new Vec3();

/**
 * Returns a constructor for a physical body reflecting the shape defined by input ConvexHull or Vec3 array.
 *
 * @method ConvexBodyFactory
 * @param {ConvexHull | Vec3[]} hull
 * @return {Function} The constructor.
 */
function ConvexBodyFactory(hull) {
    if (!(hull instanceof ConvexHull)) {
        if (!(hull instanceof Array)) throw new Error('ConvexBodyFactory requires a ConvexHull object or an array of Vec3\'s as input.');
        else hull = new ConvexHull(hull);
    }

    /**
     * The body class with inertia and vertices inferred from the input ConvexHull or Vec3 array.
     *
     * @class ConvexBody
     * @param {Object} options The options hash.
     */
    function ConvexBody(options) {
        Particle.call(this, options);

        var originalSize = hull.polyhedralProperties.size;
        var size = options.size || originalSize;

        var scaleX = size[0] / originalSize[0];
        var scaleY = size[1] / originalSize[1];
        var scaleZ = size[2] / originalSize[2];

        this._scale = [scaleX, scaleY, scaleZ];

        var T = new Mat33([scaleX, 0, 0, 0, scaleY, 0, 0, 0, scaleZ]);

        this.hull = hull;

        this.vertices = [];
        for (var i = 0, len = hull.vertices.length; i < len; i++) {
            this.vertices.push(T.vectorMultiply(hull.vertices[i], new Vec3()));
        }

        _computeInertiaProperties.call(this, T);
        this.inverseInertia.copy(this.localInverseInertia);
        this.updateInertia();
    }

    ConvexBody.prototype = Object.create(Particle.prototype);
    ConvexBody.prototype.constructor = ConvexBody;

    /**
     * Set the size and recalculate
     *
     * @method setSize
     * @chainable
     * @param {Number} x The x span.
     * @param {Number} y The y span.
     * @param {Number} z The z span.
     */
    ConvexBody.prototype.setSize = function setSize(x,y,z) {
        var originalSize = hull.polyhedralProperties.size;

        this.size[0] = x;
        this.size[1] = y;
        this.size[2] = z;

        var scaleX = x / originalSize[0];
        var scaleY = y / originalSize[1];
        var scaleZ = z / originalSize[2];

        this._scale = [scaleX, scaleY, scaleZ];

        var T = new Mat33([scaleX, 0, 0, 0, scaleY, 0, 0, 0, scaleZ]);

        var vertices = this.vertices;
        for (var i = 0, len = hull.vertices.length; i < len; i++) {
            T.vectorMultiply(hull.vertices[i], vertices[i]);
        }

        return this;
    };

    /**
     * Update the local inertia and inverse inertia to reflect the current size.
     *
     * @method updateLocalInertia
     * @chainable
     */
    ConvexBody.prototype.updateLocalInertia = function updateInertia() {
        var scaleX = this._scale[0];
        var scaleY = this._scale[1];
        var scaleZ = this._scale[2];

        var T = new Mat33([scaleX, 0, 0, 0, scaleY, 0, 0, 0, scaleZ]);

        _computeInertiaProperties.call(this, T);

        return this;
    };

    /**
     * Retrieve the vertex furthest in a direction. Used internally for collision detection.
     *
     * @method support
     * @return {Vec3} The furthest vertex.
     */
    ConvexBody.prototype.support = function support(direction) {
        var vertices = this.vertices;
        var vertex, dot, furthest;
        var max = -Infinity;
        for (var i = 0, len = vertices.length; i < len; i++) {
            vertex = vertices[i];
            dot = Vec3.dot(vertex,direction);
            if (dot > max) {
                furthest = vertex;
                max = dot;
            }
        }
        return furthest;
    };

    /**
     * Update vertices to reflect current orientation.
     *
     * @method updateShape
     * @chainable
     */
    ConvexBody.prototype.updateShape = function updateShape() {
        var vertices = this.vertices;
        var q = this.orientation;
        var modelVertices = this.hull.vertices;

        var scaleX = this._scale[0];
        var scaleY = this._scale[1];
        var scaleZ = this._scale[2];

        var t = TEMP_REGISTER;
        for (var i = 0, len = vertices.length; i < len; i++) {
            t.copy(modelVertices[i]);
            t.x *= scaleX;
            t.y *= scaleY;
            t.z *= scaleZ;
            Vec3.applyRotation(t, q, vertices[i]);
        }

        return this;
    };

    return ConvexBody;
}

/**
 * Determines mass and inertia tensor based off the density, size, and facet information of the polyhedron.
 *
 * @method _computeInertiaProperties
 * @private
 * @param {Mat33} T The matrix transforming the intial set of vertices to a set reflecting the body size.
 */
function _computeInertiaProperties(T) {
    var polyhedralProperties = this.hull.polyhedralProperties;
    var T_values = T.get();
    var detT = T_values[0] * T_values[4] * T_values[8];

    var E_o = polyhedralProperties.eulerTensor;

    var E = new Mat33();
    Mat33.multiply(T, E_o, E);
    Mat33.multiply(E, T, E);
    var E_values = E.get();

    var Exx = E_values[0];
    var Eyy = E_values[4];
    var Ezz = E_values[8];
    var Exy = E_values[1];
    var Eyz = E_values[7];
    var Exz = E_values[2];

    var newVolume = polyhedralProperties.volume * detT;
    var mass = this.mass;
    var density = mass / newVolume;

    var Ixx = Eyy + Ezz;
    var Iyy = Exx + Ezz;
    var Izz = Exx + Eyy;
    var Ixy = -Exy;
    var Iyz = -Eyz;
    var Ixz = -Exz;

    var centroid = polyhedralProperties.centroid;

    Ixx -= newVolume * (centroid.y * centroid.y + centroid.z * centroid.z);
    Iyy -= newVolume * (centroid.z * centroid.z + centroid.x * centroid.x);
    Izz -= newVolume * (centroid.x * centroid.x + centroid.y * centroid.y);
    Ixy += newVolume * centroid.x * centroid.y;
    Iyz += newVolume * centroid.y * centroid.z;
    Ixz += newVolume * centroid.z * centroid.x;

    Ixx *= density * detT;
    Iyy *= density * detT;
    Izz *= density * detT;
    Ixy *= density * detT;
    Iyz *= density * detT;
    Ixz *= density * detT;

    var inertia = [
        Ixx, Ixy, Ixz,
        Ixy, Iyy, Iyz,
        Ixz, Iyz, Izz
    ];

    this.localInertia.set(inertia);
    Mat33.inverse(this.localInertia, this.localInverseInertia);
}

module.exports = ConvexBodyFactory;

},{"../Geometry":107,"../bodies/Particle":111,"famous-math":90}],111:[function(require,module,exports){
'use strict';

var Vec3 = require('famous-math').Vec3;
var Quaternion = require('famous-math').Quaternion;
var Mat33 = require('famous-math').Mat33;

var CallbackStore = require('famous-utilities').CallbackStore;

var ZERO_VECTOR = new Vec3();

var MAT1_REGISTER = new Mat33();

var _ID = 0;
/**
 * Fundamental physical body. Maintains translational and angular momentum, position and orientation, and other properties
 * such as size and coefficients of restitution and friction used in collision response.
 *
 * @class Particle
 * @extends Particle
 * @param {Object} options sets the initial state of the Particle
 * @constructor
 */
function Particle(options) {
    options = options || {};

    this.events = new CallbackStore();

    this.position = options.position || new Vec3();
    this.orientation = options.orientation || new Quaternion();

    this.velocity = new Vec3();
    this.momentum = new Vec3();
    this.angularVelocity = new Vec3();
    this.angularMomentum = new Vec3();

    this.mass = options.mass || 1;
    this.inverseMass = 1 / this.mass;

    this.force = new Vec3();
    this.torque = new Vec3();

    this.restitution = options.restitution != null ? options.restitution : 0.4;
    this.friction = options.friction != null ? options.friction : 0.2;

    this.inverseInertia = new Mat33([0,0,0,0,0,0,0,0,0]);

    this.localInertia = new Mat33([0,0,0,0,0,0,0,0,0]);
    this.localInverseInertia = new Mat33([0,0,0,0,0,0,0,0,0]);

    this.size = options.size || [0, 0, 0];

    var v = options.velocity;
    var w = options.angularVelocity;
    if (v) this.setVelocity(v.x, v.y, v.z);
    if (w) this.setAngularVelocity(w.x, w.y, w.z);

    this.restrictions = 0;
    this.setRestrictions.apply(this, options.restrictions || []);

    this.collisionMask = options.collisionMask || 1;
    this.collisionGroup = options.collisionGroup || 1;

    this.type = 1 << 0;

    this._ID = _ID++;
}

/**
 * Getter for the restriction bitmask. Converts the restrictions to their string representation.
 *
 * @method getRestrictions
 * @return {String[]} restrictions
 */
Particle.prototype.getRestrictions = function getRestrictions() {
    var linear = '';
    var angular = '';
    var restrictions = this.restrictions;
    if (restrictions & 32) linear += 'x';
    if (restrictions & 16) linear += 'y';
    if (restrictions & 8) linear += 'z';
    if (restrictions & 4) angular += 'x';
    if (restrictions & 2) angular += 'y';
    if (restrictions & 1) angular += 'z';

    return [linear, angular];
};

/**
 * Setter for the particle restriction bitmask.
 *
 * @method setRestrictions
 * @param {String} transRestrictions
 * @param {String} rotRestrictions
 * @chainable
 */
Particle.prototype.setRestrictions = function setRestrictions(transRestrictions, rotRestrictions) {
    transRestrictions = transRestrictions || '';
    rotRestrictions = rotRestrictions || '';
    this.restrictions = 0;
    if (transRestrictions.indexOf('x') > -1) this.restrictions |= 32;
    if (transRestrictions.indexOf('y') > -1) this.restrictions |= 16;
    if (transRestrictions.indexOf('z') > -1) this.restrictions |= 8;
    if (rotRestrictions.indexOf('x') > -1) this.restrictions |= 4;
    if (rotRestrictions.indexOf('y') > -1) this.restrictions |= 2;
    if (rotRestrictions.indexOf('z') > -1) this.restrictions |= 1;
    return this;
};

/**
 * Getter for mass
 *
 * @method getMass
 * @return {Number} mass
 */
Particle.prototype.getMass = function getMass() {
    return this.mass;
};

/**
 * Set the mass of the Particle.  Can be used to change the mass several times
 *
 * @method setMass
 * @param {Number} mass
 * @chainable
 */
Particle.prototype.setMass = function setMass(mass) {
    this.mass = mass;
    this.inverseMass = 1 / mass;
    return this;
};

/**
 * Getter for inverse mass
 *
 * @method getInverseMass
 * @return {Number} inverse mass
 */
Particle.prototype.getInverseMass = function() {
    return this.inverseMass;
};

/**
 * Resets the inertia tensor and its inverse to reflect the current shape.
 *
 * @method updateLocalInertia
 * @chainable
 * @param {Mat33} Mat33
 */
Particle.prototype.updateLocalInertia = function updateLocalInertia() {
    this.localInertia.set([0,0,0,0,0,0,0,0,0]);
    this.localInverseInertia.set([0,0,0,0,0,0,0,0,0]);
    return this;
};

/**
 * Updates the world inverse inertia tensor.
 *
 * @method updateInertia
 * @chainable
 */
Particle.prototype.updateInertia = function updateInertia() {
    var localInvI = this.localInverseInertia;
    var q = this.orientation;
    if (localInvI[0] === localInvI[4] && localInvI[4] === localInvI[8]) return;
    if (q.w === 1) return;
    var R = q.toMatrix(MAT1_REGISTER);
    Mat33.multiply(R, this.inverseInertia, this.inverseInertia);
    Mat33.multiply(this.localInverseInertia, R.transpose(), this.inverseInertia);
    return this;
};

/**
 * Getter for position
 *
 * @method getPosition
 * @return {Vec3} position
 */
Particle.prototype.getPosition = function getPosition() {
    return this.position;
};

/**
 * Setter for position
 *
 * @method setPosition
 * @param {Number} x the x coordinate for position
 * @param {Number} y the y coordinate for position
 * @param {Number} z the z coordinate for position
 * @return {Particle} this
 * @chainable
 */
Particle.prototype.setPosition = function setPosition(x, y, z) {
    this.position.set(x, y, z);
    return this;
};

/**
 * Getter for velocity
 *
 * @method getVelocity
 * @return {Vec3} velocity
 */
Particle.prototype.getVelocity = function getVelocity() {
    return this.velocity;
};

/**
 * Setter for velocity
 *
 * @method setvelocity
 * @param {Number} x the x coordinate for velocity
 * @param {Number} y the y coordinate for velocity
 * @param {Number} z the z coordinate for velocity
 * @chainable
 */
Particle.prototype.setVelocity = function setVelocity(x, y, z) {
    this.velocity.set(x, y, z);
    Vec3.scale(this.velocity, this.mass, this.momentum);
    return this;
};

/**
 * Getter for momenutm
 *
 * @method getMomentum
 * @return {Vec3} momentum
 */
Particle.prototype.getMomentum = function getMomentum() {
    return this.momentum;
};

/**
 * Setter for momentum
 *
 * @method setMomentum
 * @param {Number} x the x coordinate for momentum
 * @param {Number} y the y coordinate for momentum
 * @param {Number} z the z coordinate for momentum
 * @chainable
 */
Particle.prototype.setMomentum = function setMomentum(x, y, z) {
    this.momentum.set(x, y, z);
    Vec3.scale(this.momentum, this.inverseMass, this.velocity);
    return this;
};

/**
 * Getter for orientation
 *
 * @method getOrientation
 * @return {Quaternion} orientation
 */
Particle.prototype.getOrientation = function getOrientation() {
    return this.orientation;
};

/**
 * Setter for orientation
 *
 * @method setOrientation
 * @param {Number} w
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @chainable
 */
Particle.prototype.setOrientation = function setOrientation(w,x,y,z) {
    this.orientation.set(w,x,y,z).normalize();
    this.updateInertia();
    return this;
};

/**
 * Getter for angular velocity
 *
 * @method getAngularVelocity
 * @return {Vec3} angularVelocity
 */
Particle.prototype.getAngularVelocity = function getAngularVelocity() {
    return this.angularVelocity;
};

/**
 * Setter for angular velocity
 *
 * @method setAngularVelocity
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 */
Particle.prototype.setAngularVelocity = function setAngularVelocity(x,y,z) {
    this.angularVelocity.set(x,y,z);
    var I = Mat33.inverse(this.inverseInertia, MAT1_REGISTER);
    if (I) I.vectorMultiply(this.angularVelocity, this.angularMomentum);
    else this.angularMomentum.clear();
    return this;
};

/**
 * Getter for angular momentum
 *
 * @method getAngularMomentum
 * @return {Vec3} angular momentum
 */
Particle.prototype.getAngularMomentum = function getAngularMomentum() {
    return this.angularMomentum;
};

/**
 * Setter for angular momentum
 *
 * @method setAngularMomentum
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 */
Particle.prototype.setAngularMomentum = function setAngularMomentum(x,y,z) {
    this.angularMomentum.set(x,y,z);
    this.inverseInertia.vectorMultiply(this.angularMomentum, this.angularVelocity);
    return this;
};

/**
 * Getter for the force on the Particle
 *
 * @method getForce
 * @return {Vec3} force
 */
Particle.prototype.getForce = function getForce() {
    return this.force;
};

/**
 * Setter for the force on the Particle
 *
 * @method setForce
 * @param {Vec3} v the new Force
 * @chainable
 */
Particle.prototype.setForce = function setForce(x, y, z) {
    this.force.set(x, y, z);
    return this;
};

/**
 * Getter for torque.
 *
 * @method getTorque
 */
Particle.prototype.getTorque = function getTorque() {
    return this.torque;
};

/**
 * Setter for torque.
 *
 * @method setTorque
 * @param {Vec3} v
 * @chainable
 */
Particle.prototype.setTorque = function setTorque(x, y, z) {
    this.torque.set(x, y, z);
    return this;
};

/**
 * Extends Particle.applyForce with an optional argument
 * to apply the force at an off-centered location, resulting in a torque.
 *
 * @method applyForce
 * @param force {Vec3} force
 * @param {Vec3} location off-center location on the Particle (optional)
 */
Particle.prototype.applyForce = function applyForce(force) {
    this.force.add(force);
    return this;
};

/**
 * Applied a torque force to a Particle, inducing a rotation.
 *
 * @method applyTorque
 * @param torque {Vec3} torque
 */
Particle.prototype.applyTorque = function applyTorque(torque) {
    this.torque.add(torque);
    return this;
};

/**
 * Applies an impulse to momentum and updates velocity.
 *
 * @method applyImpulse
 * @param {Vec3} impulse
 */
Particle.prototype.applyImpulse = function applyImpulse(impulse) {
    this.momentum.add(impulse);
    Vec3.scale(this.momentum, this.inverseMass, this.velocity);
    return this;
};

/**
 * Applies an angular impulse to angular momentum and updates angular velocity.
 *
 * @method applyAngularImpulse
 * @param {Vec3} angularImpulse
 */
Particle.prototype.applyAngularImpulse = function applyAngularImpulse(angularImpulse) {
    this.angularMomentum.add(angularImpulse);
    this.inverseInertia.vectorMultiply(this.angularMomentum, this.angularVelocity);
    return this;
};

/**
 * Used in collision detection. The support function should accept a Vec3 direction
 * and return the point on the body's shape furthest in that direction. For point particles,
 * this returns the zero vector.
 *
 * @method support
 * @return {Vec3}
 */
Particle.prototype.support = function support() {
    return ZERO_VECTOR;
};

/**
 * Update the body's shape to reflect current orientation. Called in _integratePose.
 * Noop for point particles.
 *
 * @method updateShape
 */
Particle.prototype.updateShape = function updateShape() {};

module.exports = Particle;

},{"famous-math":90,"famous-utilities":103}],112:[function(require,module,exports){
'use strict';

var Particle = require('./Particle');
var Vec3 = require('famous-math').Vec3;

var SUPPORT_REGISTER = new Vec3();

/**
 * Spherical Rigid body
 *
 * @class Sphere
 * @extends Particle
 * @param {Object} options
 */
function Sphere(options) {
    Particle.call(this, options);
    var r  = options.radius || 1;
    this.radius = r;
    this.size = [2*r, 2*r, 2*r];
    this.updateLocalInertia();
    this.inverseInertia.copy(this.localInverseInertia);

    this.type = 1 << 2;
}

Sphere.prototype = Object.create(Particle.prototype);
Sphere.prototype.constructor = Sphere;

/**
 * Getter for radius.
 *
 * @method getRadius
 * @return {Number} radius
 */
Sphere.prototype.getRadius = function getRadius() {
    return this.radius;
};

/**
 * Setter for radius.
 *
 * @method setRadius
 * @param {Number} radius The intended radius of the sphere.
 * @chainable
 */
Sphere.prototype.setRadius = function setRadius(radius) {
    this.radius = radius;
    this.size = [2*this.radius, 2*this.radius, 2*this.radius];
    return this;
};

/**
 * Infers the inertia tensor.
 *
 * @override
 * @method updateInertia
 */
Sphere.prototype.updateLocalInertia = function updateInertia() {
    var m = this.mass;
    var r = this.radius;

    var mrr = m * r * r;

    this.localInertia.set([
        0.4 * mrr, 0, 0,
        0, 0.4 * mrr, 0,
        0, 0, 0.4 * mrr
    ]);

    this.localInverseInertia.set([
        2.5 / mrr, 0, 0,
        0, 2.5 / mrr, 0,
        0, 0, 2.5 / mrr
    ]);
};

/**
 * Returns the point on the sphere furthest in a given direction.
 *
 * @method support
 * @param {Vec3} direction
 * @param {Vec3}
 */
Sphere.prototype.support = function support(direction) {
    return Vec3.scale(direction, this.radius, SUPPORT_REGISTER);
};

/**
 * @exports Sphere
 * @module Sphere
 */
module.exports = Sphere;

},{"./Particle":111,"famous-math":90}],113:[function(require,module,exports){
'use strict';

var Particle = require('./Particle');
var Vec3 = require('famous-math').Vec3;

/**
 * @enum directions
 */
Wall.DOWN = 0;
Wall.UP = 1;
Wall.LEFT = 2;
Wall.RIGHT = 3;
Wall.FORWARD = 4;
Wall.BACKWARD = 5;

/**
 * An axis-aligned boundary. Will not respond to forces or impulses.
 *
 * @class Wall
 * @extends Particle
 * @param {Object} options
 */
function Wall(options) {
    Particle.call(this, options);

    var n = this.normal = new Vec3();

    var d = this.direction = options.direction;
    switch (d) {
        case Wall.DOWN:
            n.set(0, 1, 0);
            break;
        case Wall.UP:
            n.set(0, -1, 0);
            break;
        case Wall.LEFT:
            n.set(-1, 0, 0);
            break;
        case Wall.RIGHT:
            n.set(1, 0, 0);
            break;
        case Wall.FORWARD:
            n.set(0, 0, -1);
            break;
        case Wall.BACKWARD:
            n.set(0, 0, 1);
            break;
        default:
            break;
    }

    this.invNormal = Vec3.clone(n, new Vec3()).invert();

    this.mass = Infinity;
    this.inverseMass = 0;

    this.type = 1 << 3;
}

Wall.prototype = Object.create(Particle.prototype);
Wall.prototype.constructor = Wall;

module.exports = Wall;

},{"./Particle":111,"famous-math":90}],114:[function(require,module,exports){
'use strict';

var Constraint = require('./Constraint');
var Vec3 = require('famous-math').Vec3;
var Mat33 = require('famous-math').Mat33;

var DELTA_REGISTER = new Vec3();

/**
 *  A constraint that keeps a physics body a given direction away from a given
 *  anchor, or another attached body.
 *
 *  @class Angle
 *  @extends Constraint
 *  @param {Particle} a One of the bodies.
 *  @param {Particle} b The other body.
 *  @param {Object} options An object of configurable options.
 */
function Angle(a, b, options) {
    this.a = a;
    this.b = b;

    Constraint.call(this, options);

    this.effectiveInertia = new Mat33();
    this.angularImpulse = new Vec3();
    this.error = 0;
}

Angle.prototype = Object.create(Constraint.prototype);
Angle.prototype.constructor = Angle;

/**
 * Initialize the Angle. Sets defaults if a property was not already set.
 *
 * @method init
 * @param {Object} options The options hash.
 */
Angle.prototype.init = function() {
    this.cosAngle = this.cosAngle || this.a.orientation.dot(this.b.orientation);
};

/**
 * Warmstart the constraint and prepare calculations used in .resolve.
 *
 * @method update
 */
Angle.prototype.update = function update() {
    var a = this.a;
    var b = this.b;

    var q1 = a.orientation;
    var q2 = b.orientation;

    var cosTheta = q1.dot(q2);
    var diff = 2*(cosTheta - this.cosAngle);

    this.error = diff;

    var angularImpulse = this.angularImpulse;
    b.applyAngularImpulse(angularImpulse);
    a.applyAngularImpulse(angularImpulse.invert());

    Mat33.add(a.inverseInertia, b.inverseInertia, this.effectiveInertia);
    this.effectiveInertia.inverse();

    angularImpulse.clear();
};

/**
 * Adds an angular impulse to a physics body's angular velocity.
 *
 * @method resolve
 */
Angle.prototype.resolve = function update() {
    var a = this.a;
    var b = this.b;

    var diffW = DELTA_REGISTER;

    var w1 = a.angularVelocity;
    var w2 = b.angularVelocity;

    Vec3.subtract(w1, w2, diffW);
    diffW.scale(1 + this.error);

    var angularImpulse = diffW.applyMatrix(this.effectiveInertia);

    b.applyAngularImpulse(angularImpulse);
    a.applyAngularImpulse(angularImpulse.invert());
    angularImpulse.invert();
    this.angularImpulse.add(angularImpulse);
};

module.exports = Angle;

},{"./Constraint":116,"famous-math":90}],115:[function(require,module,exports){
'use strict';

var Vec3 = require('famous-math').Vec3;
var Constraint = require('./Constraint');

var SweepAndPrune = require('./collision/SweepAndPrune');
var BruteForce = require('./collision/BruteForce');
var ConvexCollision = require('./collision/ConvexCollisionDetection');
var GJK = ConvexCollision.GJK;
var EPA = ConvexCollision.EPA;
var ContactManifoldTable = require('./collision/ContactManifold');

var ObjectManager = require('famous-utilities').ObjectManager;
ObjectManager.register('CollisionData', CollisionData);
var OMRequestCollisionData = ObjectManager.requestCollisionData;

var VEC_REGISTER = new Vec3();

/**
 * Helper function to clamp a value to a given range.
 *
 * @method clamp
 * @private
 * @param {Number} value
 * @param {Number} lower
 * @param {Number} upper
 * @return {Number}
 */
function clamp(value, lower, upper) {
    return value < lower ? lower : value > upper ? upper : value;
}

/**
 * Object maintaining various figures of a collision. Registered in ObjectManager.
 *
 * @class CollisionData
 * @param {Number} penetration
 * @param {Vec3} normal
 * @param {Vec3} worldContactA
 * @param {Vec3} worldContactB
 * @param {Vec3} localContactA
 * @param {Vec3} localContactB
 */
function CollisionData(penetration, normal, worldContactA, worldContactB, localContactA, localContactB) {
    this.penetration = penetration;
    this.normal = normal;
    this.worldContactA = worldContactA;
    this.worldContactB = worldContactB;
    this.localContactA = localContactA;
    this.localContactB = localContactB;
}

/**
 * Used by ObjectManager to reset the object with different data.
 *
 * @method reset
 * @param {Object[]} args
 * @chainable
 */
CollisionData.prototype.reset = function reset(penetration, normal, worldContactA, worldContactB, localContactA, localContactB) {
    this.penetration = penetration;
    this.normal = normal;
    this.worldContactA = worldContactA;
    this.worldContactB = worldContactB;
    this.localContactA = localContactA;
    this.localContactB = localContactB;

    return this;
};

/**
 * Ridid body Elastic Collision
 *
 * @class Collision
 * @extends Constraint
 * @param {Object} options
 */
function Collision(targets, options) {
    this.targets = [].concat(targets);

    Constraint.call(this, options);
}

Collision.prototype = Object.create(Constraint.prototype);
Collision.prototype.constructor = Collision;

/**
 * Initialize the Collision tracker. Sets defaults if a property was not already set.
 *
 * @method init
 * @param {Object} options The options hash.
 */
Collision.prototype.init = function() {
    if (this.broadPhase) {
        if (this.broadPhase instanceof Function) this.broadPhase = new this.broadPhase(this.targets);
    }
    else this.broadPhase = new SweepAndPrune(this.targets);
    this.contactManifoldTable = this.contactManifoldTable || new ContactManifoldTable();
};

/**
 * Collison detection. Updates the existing contact manifolds, runs the broadphase, and performs narrowphase
 * collision detection. Warm starts the contacts based on the results of the previous physics frame
 * and prepares necesssary calculations for the resolution.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
 Collision.prototype.update = function update(time, dt) {
    this.contactManifoldTable.update(dt);
    if (this.targets.length === 0) return;
    var i, len;
    for (i = 0, len = this.targets.length; i < len; i++) {
        this.targets[i].updateShape();
    }
    var potentialCollisions = this.broadPhase.update();
    var pair;
    for (i = 0, len = potentialCollisions.length; i < len; i++) {
        (pair = potentialCollisions[i]) && this.applyNarrowPhase(pair);
    }
    this.contactManifoldTable.prepContacts(dt);
};

/**
 * Apply impulses to resolve all Contact constraints.
 *
 * @method resolve
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Collision.prototype.resolve = function resolve(time, dt) {
    this.contactManifoldTable.resolveManifolds(dt);
};

/**
 * Add a target or targets to the collision system.
 *
 * @method addTarget
 * @param {Particle}
 */
Collision.prototype.addTarget = function addTarget(target) {
    this.targets.push(target);
    this.broadPhase.add(target);
};

/**
 * Remove a target or targets from the collision system.
 *
 * @method addTarget
 * @param {Particle}
 */
Collision.prototype.removeTarget = function removeTarget(target) {
    var index = this.targets.indexOf(target);
    if (index < 0) return;
    this.targets.splice(index, 1);
    this.broadPhase.remove(target);
};


var CONVEX = 1 << 0;
var BOX = 1 << 1;
var SPHERE = 1 << 2;
var WALL = 1 << 3;

var CONVEX_CONVEX = CONVEX | CONVEX;
var BOX_BOX = BOX | BOX;
var BOX_CONVEX = BOX | CONVEX;
var SPHERE_SPHERE = SPHERE | SPHERE;
var BOX_SPHERE = BOX | SPHERE;
var CONVEX_SPHERE = CONVEX | SPHERE;
var CONVEX_WALL = CONVEX | WALL;
var BOX_WALL = BOX | WALL;
var SPHERE_WALL = SPHERE | WALL;

var dispatch = {};
dispatch[CONVEX_CONVEX] = convexIntersectConvex;
dispatch[BOX_BOX] = convexIntersectConvex;
dispatch[BOX_CONVEX] = convexIntersectConvex;
dispatch[CONVEX_SPHERE] = convexIntersectConvex;
dispatch[SPHERE_SPHERE] = sphereIntersectSphere;
dispatch[BOX_SPHERE] = boxIntersectSphere;
dispatch[CONVEX_WALL] = convexIntersectWall;
dispatch[BOX_WALL] = convexIntersectWall;
dispatch[SPHERE_WALL] = convexIntersectWall;

/**
 * Narrowphase collision detection,
 * registers the Contact constraints for colliding bodies.
 *
 * Will detect the type of bodies in the collision.
 *
 * @method applyNarrowPhase
 * @param {Particle[]} targets
 */
Collision.prototype.applyNarrowPhase = function applyNarrowPhase(targets) {
    for (var i = 0, len = targets.length; i < len; i++) {
        for (var j = i + 1; j < len; j++) {
            var  a = targets[i];
            var b = targets[j];

            if ((a.collisionMask & b.collisionGroup && a.collisionGroup & b.collisionMask) === 0) continue;

            var collisionType = a.type | b.type;

            dispatch[collisionType] && dispatch[collisionType](this, a, b);
        }
    }
};

/**
 * Detects sphere-sphere collisions and registers the Contact.
 *
 * @private
 * @method sphereIntersectSphere
 * @param {Object} context
 * @param {Sphere} sphere1
 * @param {Sphere} sphere2
 */
function sphereIntersectSphere(context, sphere1, sphere2) {
    var p1 = sphere1.position;
    var p2 = sphere2.position;
    var relativePosition = Vec3.subtract(p2, p1, new Vec3());
    var distance = relativePosition.length();
    var sumRadii = sphere1.radius + sphere2.radius;
    var n = relativePosition.scale(1/distance);

    var overlap = sumRadii - distance;

    // Distance check
    if (overlap < 0) return;

    var rSphere1 = Vec3.scale(n, sphere1.radius, new Vec3());
    var rSphere2 = Vec3.scale(n, -sphere2.radius, new Vec3());

    var wSphere1 = Vec3.add(p1, rSphere1, new Vec3());
    var wSphere2 = Vec3.add(p2, rSphere2, new Vec3());

    var collisionData = OMRequestCollisionData().reset(overlap, n, wSphere1, wSphere2, rSphere1, rSphere2);

    context.contactManifoldTable.registerContact(sphere1, sphere2, collisionData);
}

/**
* Detects box-sphere collisions and registers the Contact.
*
* @param {Object} context
* @param {Box} box
* @param {Sphere} sphere
*/
function boxIntersectSphere(context, box, sphere) {
    if (box.type === SPHERE) {
        var temp = sphere;
        sphere = box;
        box = temp;
    }

    var pb = box.position;
    var ps = sphere.position;
    var relativePosition = Vec3.subtract(ps, pb, VEC_REGISTER);

    var q = box.orientation;

    var r = sphere.radius;

    var bsize = box.size;
    var halfWidth = bsize[0]*0.5;
    var halfHeight = bsize[1]*0.5;
    var halfDepth = bsize[2]*0.5;

    // x, y, z
    var bnormals = box.normals;
    var n1 = q.rotateVector(bnormals[1], new Vec3());
    var n2 = q.rotateVector(bnormals[0], new Vec3());
    var n3 = q.rotateVector(bnormals[2], new Vec3());

    // Find the point on the cube closest to the center of the sphere
    var closestPoint = new Vec3();
    closestPoint.x = clamp(Vec3.dot(relativePosition,n1), -halfWidth, halfWidth);
    closestPoint.y = clamp(Vec3.dot(relativePosition,n2), -halfHeight, halfHeight);
    closestPoint.z = clamp(Vec3.dot(relativePosition,n3), -halfDepth, halfDepth);
    // The vector found is relative to the center of the unrotated box -- rotate it
    // to find the point w.r.t. to current orientation
    closestPoint.applyRotation(q);

    // The impact point in world space
    var impactPoint = Vec3.add(pb, closestPoint, new Vec3());
    var sphereToImpact = Vec3.subtract(impactPoint, ps, impactPoint);
    var distanceToSphere = sphereToImpact.length();

    // If impact point is not closer to the sphere's center than its radius -> no collision
    var overlap = r - distanceToSphere;
    if (overlap < 0) return;

    var n = Vec3.scale(sphereToImpact, -1 / distanceToSphere, new Vec3());
    var rBox = closestPoint;
    var rSphere = sphereToImpact;

    var wBox = Vec3.add(pb, rBox, new Vec3());
    var wSphere = Vec3.add(ps, rSphere, new Vec3());

    var collisionData = OMRequestCollisionData().reset(overlap, n, wBox, wSphere, rBox, rSphere);

    context.contactManifoldTable.registerContact(box, sphere, collisionData);
}

/**
* Detects convex-convex collisions and registers the Contact. Uses GJK to determine overlap and then
* EPA to determine the actual collision data.
*
* @param {Object} context
* @param {ConvexBody} convex1
* @param {ConvexBody} convex2
*/
function convexIntersectConvex(context, convex1, convex2) {
    var glkSimplex = GJK(convex1, convex2);

    // No simplex -> no collision
    if (!glkSimplex) return;

    var collisionData = EPA(convex1, convex2, glkSimplex);
    if (collisionData !== null) context.contactManifoldTable.registerContact(convex1, convex2, collisionData);
}

/**
* Detects convex-wall collisions and registers the Contact.
*
* @param {Object} context
* @param {ConvexBody} convex
* @param {ConvexBody} wall
*/
function convexIntersectWall(context, convex, wall) {
    if (convex.type === WALL) {
        var temp = wall;
        wall = convex;
        convex = temp;
    }

    var convexPos = convex.position;
    var wallPos = wall.position;

    var n = wall.normal;
    var invN = wall.invNormal;

    var rConvex = convex.support(invN);
    var wConvex = Vec3.add(convexPos, rConvex, new Vec3());

    var diff = Vec3.subtract(wConvex, wallPos, VEC_REGISTER);

    var penetration = Vec3.dot(diff, invN);

    if (penetration < 0) return;

    var wWall = Vec3.scale(n, penetration, new Vec3()).add(wConvex);
    var rWall = Vec3.subtract(wWall, wall.position, new Vec3());

    var collisionData = OMRequestCollisionData().reset(penetration, invN, wConvex, wWall, rConvex, rWall);

    context.contactManifoldTable.registerContact(convex, wall, collisionData);
}

Collision.SweepAndPrune = SweepAndPrune;
Collision.BruteForce = BruteForce.BruteForce;
Collision.BruteForceAABB = BruteForce.BruteForceAABB;

module.exports = Collision;

},{"./Constraint":116,"./collision/BruteForce":123,"./collision/ContactManifold":124,"./collision/ConvexCollisionDetection":125,"./collision/SweepAndPrune":126,"famous-math":90,"famous-utilities":103}],116:[function(require,module,exports){
'use strict';

var _ID = 0;
/**
 * Base Constraint class to be used in the Physics
 * Subclass this class to implement a constraint
 *
 * @virtual
 * @class Constraint
 */
function Constraint(options) {
    options = options || {};
    this.setOptions(options);

    this._ID = _ID++;
}

/**
 * Decorates the Constraint with the options object.
 *
 * @method setOptions
 * @param {Object} Options
 */
Constraint.prototype.setOptions = function setOptions(options) {
    for (var key in options) this[key] = options[key];
    this.init(options);
};

/**
 * Method invoked upon instantiation and the setting of options.
 *
 * @method init
 * @param {Object} options The options hash.
 */
Constraint.prototype.init = function init(options) {};

/**
 * Detect violations of the constraint. Warm start the constraint, if possible.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Constraint.prototype.update = function update(time, dt) {};

/**
 * Apply impulses to resolve the constraint.
 *
 * @method resolve
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Constraint.prototype.resolve = function resolve(time, dt) {};

module.exports = Constraint;

},{}],117:[function(require,module,exports){
'use strict';

var Constraint = require('./Constraint');
var Vec3 = require('famous-math').Vec3;

var IMPULSE_REGISTER = new Vec3();
var NORMAL_REGISTER = new Vec3();

/** @const */
var EPSILSON = 1e-7;
/** @const */
var PI = Math.PI;


/**
 *  A constraint that keeps a physics body on a given implicit curve.
 *
 *  @class Curve
 *  @constructor
 *  @extends Constraint
 */
function Curve(targets, options) {
    if (targets) {
        if (targets instanceof Array) this.targets = targets;
        else this.targets = [targets];
    }
    else this.targets = [];

    Constraint.call(this, options);

    this.impulses = {};
    this.normals = {};
    this.velocityBiases = {};
    this.divisors = {};
}

Curve.prototype = Object.create(Constraint.prototype);
Curve.prototype.constructor = Curve;

/**
 * Initialize the Curve. Sets defaults if a property was not already set.
 *
 * @method init
 */
Curve.prototype.init = function() {
    this.equation1 = this.equation1 || function() {
        return 0;
    };
    this.equation2 = this.equation2 || function(x, y, z) {
        return z;
    };
    this.period = this.period || 1;
    this.dampingRatio = this.dampingRatio || 0.5;

    this.stiffness = 4 * PI * PI / (this.period * this.period);
    this.damping = 4 * PI * this.dampingRatio / this.period;
};

/**
 * Warmstart the constraint and prepare calculations used in the .resolve step.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Curve.prototype.update = function update(time, dt) {
    var targets = this.targets;

    var normals = this.normals;
    var velocityBiases = this.velocityBiases;
    var divisors = this.divisors;
    var impulses = this.impulses;

    var impulse = IMPULSE_REGISTER;
    var n = NORMAL_REGISTER;

    var f = this.equation1;
    var g = this.equation2;

    var _c = this.damping;
    var _k = this.stiffness;

    for (var i = 0, len = targets.length; i < len; i++) {
        var body = targets[i];
        var ID = body._ID;
        if (body.immune) continue;

        var p = body.position;
        var m = body.mass;

        var gamma;
        var beta;

        if (this.period === 0) {
            gamma = 0;
            beta = 1;
        } else {
            var c = _c * m;
            var k = _k * m;

            gamma = 1 / (dt*(c + dt*k));
            beta  = dt*k / (c + dt*k);
        }

        var x = p.x;
        var y = p.y;
        var z = p.z;

        var f0 = f(x, y, z);
        var dfx = (f(x + EPSILSON, y, z) - f0) / EPSILSON;
        var dfy = (f(x, y + EPSILSON, z) - f0) / EPSILSON;
        var dfz = (f(x, y, z + EPSILSON) - f0) / EPSILSON;

        var g0 = g(x, y, z);
        var dgx = (g(x + EPSILSON, y, z) - g0) / EPSILSON;
        var dgy = (g(x, y + EPSILSON, z) - g0) / EPSILSON;
        var dgz = (g(x, y, z + EPSILSON) - g0) / EPSILSON;

        n.set(dfx + dgx, dfy + dgy, dfz + dgz);
        n.normalize();

        var baumgarte = beta * (f0 + g0) / dt;
        var divisor = gamma + 1 / m;

        var lambda = impulses[ID] || 0;
        Vec3.scale(n, lambda, impulse);
        body.applyImpulse(impulse);

        normals[ID] = normals[ID] || new Vec3();
        normals[ID].copy(n);
        velocityBiases[ID] = baumgarte;
        divisors[ID] = divisor;
        impulses[ID] = 0;
    }
};

/**
 * Adds a curve impulse to a physics body.
 *
 * @method resolve
 */
Curve.prototype.resolve = function resolve() {
    var targets = this.targets;

    var normals = this.normals;
    var velocityBiases = this.velocityBiases;
    var divisors = this.divisors;
    var impulses = this.impulses;

    var impulse = IMPULSE_REGISTER;

    for (var i = 0, len = targets.length; i < len; i++) {
        var body = targets[i];
        var ID = body._ID;
        if (body.immune) continue;

        var v = body.velocity;
        var n = normals[ID];

        var lambda = -(Vec3.dot(n, v) + velocityBiases[ID]) / divisors[ID];

        Vec3.scale(n, lambda, impulse);
        body.applyImpulse(impulse);


        impulses[ID] += lambda;
    }
};

module.exports = Curve;
},{"./Constraint":116,"famous-math":90}],118:[function(require,module,exports){
'use strict';

var Constraint = require('./Constraint');
var Vec3 = require('famous-math').Vec3;

var NORMAL_REGISTER = new Vec3();
var IMPULSE_REGISTER = new Vec3();
var V_REGISTER = new Vec3();
var P_REGISTER = new Vec3();
var DIRECTION_REGISTER = new Vec3();

/** @const */
var PI = Math.PI;

/**
 *  A constraint that maintains the direction of one body from another.
 *
 *  @class Direction
 *  @extends Constraint
 *  @param {Particle} a One of the bodies.
 *  @param {Particle} b The other body.
 *  @param {Object} options An object of configurable options.
 */
function Direction(a, b, options) {
    this.a = a;
    this.b = b;

    Constraint.call(this, options);

    this.impulse = 0;
    this.distance = 0;
    this.normal = new Vec3();
    this.velocityBias = 0;
    this.divisor = 0;
}

Direction.prototype = Object.create(Constraint.prototype);
Direction.prototype.constructor = Direction;

/**
 * Initialize the Direction. Sets defaults if a property was not already set.
 *
 * @method init
 */
Direction.prototype.init = function() {
    this.direction = this.direction || Vec3.subtract(this.b.position, this.a.position, new Vec3());
    this.direction.normalize();
    this.minLength = this.minLength || 0;
    this.period = this.period || 0.2;
    this.dampingRatio = this.dampingRatio || 0.5;

    this.stiffness = 4 * PI * PI / (this.period * this.period);
    this.damping = 4 * PI * this.dampingRatio / this.period;
};

/**
 * Warmstart the constraint and prepare calculations used in .resolve.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Direction.prototype.update = function update(time, dt) {
    var a = this.a;
    var b = this.b;

    var n = NORMAL_REGISTER;
    var diffP = P_REGISTER;
    var impulse = IMPULSE_REGISTER;
    var directionVector = DIRECTION_REGISTER;

    var p1 = a.position;
    var w1 = a.inverseMass;

    var p2 = b.position;
    var w2 = b.inverseMass;

    var direction = this.direction;

    Vec3.subtract(p2, p1, diffP);
    Vec3.scale(direction, Vec3.dot(direction, diffP), directionVector);
    var goal = directionVector.add(p1);

    Vec3.subtract(p2, goal, n);
    var dist = n.length();
    n.normalize();

    var invEffectiveMass = w1 + w2;
    var effectiveMass = 1 / invEffectiveMass;
    var gamma;
    var beta;

    if (this.period === 0) {
        gamma = 0;
        beta  = 1;
    }
    else {
        var c = this.damping * effectiveMass;
        var k = this.stiffness * effectiveMass;

        gamma = 1 / (dt*(c + dt*k));
        beta  = dt*k / (c + dt*k);
    }

    var baumgarte = beta * dist / dt;
    var divisor = gamma + invEffectiveMass;

    var lambda = this.impulse;
    Vec3.scale(n, lambda, impulse);
    b.applyImpulse(impulse);
    a.applyImpulse(impulse.invert());

    this.normal.copy(n);
    this.distance = dist;
    this.velocityBias = baumgarte;
    this.divisor = divisor;
    this.impulse = 0;
};

/**
 * Adds an impulse to a physics body's velocity due to the constraint
 *
 * @method resolve
 */
Direction.prototype.resolve = function update() {
    var a = this.a;
    var b = this.b;

    var impulse  = IMPULSE_REGISTER;
    var diffV = V_REGISTER;

    var minLength = this.minLength;

    var dist = this.distance;
    if (Math.abs(dist) < minLength) return;

    var v1 = a.velocity;
    var v2 = b.velocity;
    var n = this.normal;

    Vec3.subtract(v2, v1, diffV);

    var lambda = -(Vec3.dot(n, diffV) + this.velocityBias) / this.divisor;
    Vec3.scale(n, lambda, impulse);
    b.applyImpulse(impulse);
    a.applyImpulse(impulse.invert());

    this.impulse += lambda;
};

module.exports = Direction;

},{"./Constraint":116,"famous-math":90}],119:[function(require,module,exports){
'use strict';

var Constraint = require('./Constraint');
var Vec3 = require('famous-math').Vec3;

var NORMAL_REGISTER = new Vec3();
var IMPULSE_REGISTER = new Vec3();
var V_REGISTER = new Vec3();
var P_REGISTER = new Vec3();

/** @const */
var PI = Math.PI;

/**
 *  A constraint that keeps two bodies within a certain distance.
 *
 *  @class Distance
 *  @extends Constraint
 *  @param {Particle} a One of the bodies.
 *  @param {Particle} b The other body.
 *  @param {Object} options An object of configurable options.
 */
function Distance(a, b, options) {
    this.a = a;
    this.b = b;

    Constraint.call(this, options);

    this.impulse = 0;
    this.distance = 0;
    this.normal = new Vec3();
    this.velocityBias = 0;
    this.divisor = 0;
}

Distance.prototype = Object.create(Constraint.prototype);
Distance.prototype.constructor = Distance;

/**
 * Initialize the Distance. Sets defaults if a property was not already set.
 *
 * @method init
 */
Distance.prototype.init = function() {
    this.length = this.length || Vec3.subtract(this.b.position, this.a.position, P_REGISTER).length();
    this.minLength = this.minLength || 0;
    this.period = this.period || 0.2;
    this.dampingRatio = this.dampingRatio || 0.5;

    this.stiffness = 4 * PI * PI / (this.period * this.period);
    this.damping = 4 * PI * this.dampingRatio / this.period;
};

/**
 * Detect violations of the constraint. Warm start the constraint, if possible.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Distance.prototype.update = function(time, dt) {
    var a = this.a;
    var b = this.b;

    var n = NORMAL_REGISTER;
    var diffP = P_REGISTER;
    var impulse = IMPULSE_REGISTER;

    var length = this.length;

    var p1 = a.position;
    var w1 = a.inverseMass;

    var p2 = b.position;
    var w2 = b.inverseMass;

    Vec3.subtract(p2, p1, diffP);

    var separation = diffP.length();

    Vec3.scale(diffP, 1 / separation, n);

    var dist = separation - length;

    var invEffectiveMass = w1 + w2;
    var effectiveMass = 1 / invEffectiveMass;
    var gamma;
    var beta;

    if (this.period === 0) {
        gamma = 0;
        beta  = 1;
    }
    else {
        var c = this.damping * effectiveMass;
        var k = this.stiffness * effectiveMass;

        gamma = 1 / (dt*(c + dt*k));
        beta  = dt*k / (c + dt*k);
    }

    var baumgarte = beta * dist / dt;
    var divisor = gamma + invEffectiveMass;

    var lambda = this.impulse;
    Vec3.scale(n, lambda, impulse);
    b.applyImpulse(impulse);
    a.applyImpulse(impulse.invert());

    this.normal.copy(n);
    this.distance = dist;
    this.velocityBias = baumgarte;
    this.divisor = divisor;
    this.impulse = 0;
};

/**
 * Apply impulses to resolve the constraint.
 *
 * @method resolve
 */
Distance.prototype.resolve = function resolve() {
    var a = this.a;
    var b = this.b;

    var impulse = IMPULSE_REGISTER;
    var diffV = V_REGISTER;

    var minLength = this.minLength;

    var dist = this.distance;
    if (Math.abs(dist) < minLength) return;

    var v1 = a.getVelocity();
    var v2 = b.getVelocity();

    var n = this.normal;

    Vec3.subtract(v2, v1, diffV);
    var lambda = -(Vec3.dot(n, diffV) + this.velocityBias) / this.divisor;
    Vec3.scale(n, lambda, impulse);
    b.applyImpulse(impulse);
    a.applyImpulse(impulse.invert());

    this.impulse += lambda;
};

module.exports = Distance;

},{"./Constraint":116,"famous-math":90}],120:[function(require,module,exports){
'use strict';

var Constraint = require('./Constraint');
var Vec3 = require('famous-math').Vec3;
var Mat33 = require('famous-math').Mat33;
var Quaternion = require('famous-math').Quaternion;

var VEC1_REGISTER = new Vec3();
var VEC2_REGISTER = new Vec3();
var VEC3_REGISTER = new Vec3();
var VEC4_REGISTER = new Vec3();
var VB1_REGISTER = new Vec3();
var VB2_REGISTER = new Vec3();
var WxR_REGISTER = new Vec3();
var DELTA_REGISTER = new Vec3();

/**
 *  A constraint that confines two bodies to the plane defined by the axis of the hinge.
 *
 *  @class Hinge
 *  @extends Constraint
 *  @param {Options} [options] An object of configurable options.
 *
 */
function Hinge(a, b, options) {
    this.a = a;
    this.b = b;

    Constraint.call(this, options);

    this.impulse = new Vec3();
    this.angImpulseA = new Vec3();
    this.angImpulseB = new Vec3();
    this.error = new Vec3();
    this.errorRot = [0,0];
    this.effMassMatrix = new Mat33();
    this.effMassMatrixRot = [];
}

Hinge.prototype = Object.create(Constraint.prototype);
Hinge.prototype.constructor = Hinge;

/**
 * Initialize the Hinge. Sets defaults if a property was not already set.
 *
 * @method init
 */
Hinge.prototype.init = function() {
    var w = this.anchor;

    var u = this.axis.normalize();

    var a = this.a;
    var b = this.b;

    var q1t = Quaternion.conjugate(a.orientation, new Quaternion());
    var q2t = Quaternion.conjugate(b.orientation, new Quaternion());

    this.rA = Vec3.subtract(w, a.position, new Vec3());
    this.rB = Vec3.subtract(w, b.position, new Vec3());

    this.bodyRA = q1t.rotateVector(this.rA, new Vec3());
    this.bodyRB = q2t.rotateVector(this.rB, new Vec3());

    this.axisA = Vec3.clone(u);
    this.axisB = Vec3.clone(u);

    this.axisBTangent1 = new Vec3();
    this.axisBTangent2 = new Vec3();

    this.t1xA = new Vec3();
    this.t2xA = new Vec3();

    this.bodyAxisA = q1t.rotateVector(u, new Vec3());
    this.bodyAxisB = q2t.rotateVector(u, new Vec3());
};

/**
 * Detect violations of the constraint. Warm start the constraint, if possible.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Hinge.prototype.update = function(time, dt) {
    var a = this.a;
    var b = this.b;

    var axisA = a.orientation.rotateVector(this.bodyAxisA, this.axisA);
    var axisB = b.orientation.rotateVector(this.bodyAxisB, this.axisB);
    this.axis.copy(axisB);

    var n = axisB;
    var t1 = this.axisBTangent1;
    var t2 = this.axisBTangent2;

    if (n.x >= 0.57735) {
        t1.set(n.y, -n.x, 0);
    }
    else {
        t1.set(0, n.z, -n.y);
    }
    t1.normalize();
    Vec3.cross(n, t1, t2);

    var t1xA = Vec3.cross(t1, axisA, this.t1xA);
    var t2xA = Vec3.cross(t2, axisA, this.t2xA);

    var rA = a.orientation.rotateVector(this.bodyRA, this.rA);
    var rB = b.orientation.rotateVector(this.bodyRB, this.rB);

    var xRA = new Mat33([0,rA.z,-rA.y,-rA.z,0,rA.x,rA.y,-rA.x,0]);
    var xRB = new Mat33([0,rB.z,-rB.y,-rB.z,0,rB.x,rB.y,-rB.x,0]);

    var RIaRt = Mat33.multiply(xRA, a.inverseInertia, new Mat33()).multiply(xRA.transpose());
    var RIbRt = Mat33.multiply(xRB, b.inverseInertia, new Mat33()).multiply(xRB.transpose());

    var invEffInertia = Mat33.add(RIaRt, RIbRt, RIaRt);

    var worldA = Vec3.add(a.position, this.rA, this.anchor);
    var worldB = Vec3.add(b.position, this.rB, VEC1_REGISTER);

    var invDt = 1/dt;
    Vec3.subtract(worldB, worldA, this.error);
    this.error.scale(0.2*invDt);

    var imA = a.inverseMass;
    var imB = b.inverseMass;

    var invEffMass = new Mat33([imA + imB,0,0,0,imA + imB,0,0,0,imA + imB]);

    Mat33.add(invEffInertia, invEffMass, this.effMassMatrix);
    this.effMassMatrix.inverse();

    var invIAt1xA = a.inverseInertia.vectorMultiply(t1xA, VEC1_REGISTER);
    var invIAt2xA = a.inverseInertia.vectorMultiply(t2xA, VEC2_REGISTER);
    var invIBt1xA = b.inverseInertia.vectorMultiply(t1xA, VEC3_REGISTER);
    var invIBt2xA = b.inverseInertia.vectorMultiply(t2xA, VEC4_REGISTER);

    var a11 = Vec3.dot(t1xA, invIAt1xA) + Vec3.dot(t1xA, invIBt1xA);
    var a12 = Vec3.dot(t1xA, invIAt2xA) + Vec3.dot(t1xA, invIBt2xA);
    var a21 = Vec3.dot(t2xA, invIAt1xA) + Vec3.dot(t2xA, invIBt1xA);
    var a22 = Vec3.dot(t2xA, invIAt2xA) + Vec3.dot(t2xA, invIBt2xA);

    var det = 1 / (a11*a22 - a12*a21);

    this.effMassMatrixRot[0] = a22 * det;
    this.effMassMatrixRot[1] = -a21 * det;
    this.effMassMatrixRot[2] = -a12 * det;
    this.effMassMatrixRot[3] = a11 * det;

    this.errorRot[0] = Vec3.dot(axisA, t1) * 0.2*invDt;
    this.errorRot[1] = Vec3.dot(axisA, t2) * 0.2*invDt;

    var impulse = this.impulse.scale(0.5);
    var angImpulseA = this.angImpulseA.scale(0.5);
    var angImpulseB = this.angImpulseB.scale(0.5);

    b.applyImpulse(impulse);
    b.applyAngularImpulse(angImpulseB);
    impulse.invert();
    a.applyImpulse(impulse);
    a.applyAngularImpulse(angImpulseA);

    impulse.clear();
    angImpulseA.clear();
    angImpulseB.clear();
};

/**
 * Apply impulses to resolve the constraint.
 *
 * @method resolve
 */
Hinge.prototype.resolve = function resolve() {
    var a = this.a;
    var b = this.b;

    var rA = this.rA;
    var rB = this.rB;

    var t1xA = this.t1xA;
    var t2xA = this.t2xA;

    var w1 = a.angularVelocity;
    var w2 = b.angularVelocity;

    var v1 = Vec3.add(a.velocity, Vec3.cross(w1, rA, WxR_REGISTER), VB1_REGISTER);
    var v2 = Vec3.add(b.velocity, Vec3.cross(w2, rB, WxR_REGISTER), VB2_REGISTER);

    var impulse = v1.subtract(v2).subtract(this.error).applyMatrix(this.effMassMatrix);

    var diffW = Vec3.subtract(w2, w1, DELTA_REGISTER);

    var errorRot = this.errorRot;
    var jv1 = Vec3.dot(t1xA, diffW) + errorRot[0];
    var jv2 = Vec3.dot(t2xA, diffW) + errorRot[1];

    var K = this.effMassMatrixRot;

    var l1 = -(K[0]*jv1 + K[1]*jv2);
    var l2 = -(K[2]*jv1 + K[3]*jv2);

    var angImpulse = Vec3.scale(t1xA, l1, VEC2_REGISTER).add(Vec3.scale(t2xA, l2, VEC3_REGISTER));

    var angImpulseB = Vec3.cross(rB, impulse, VEC1_REGISTER).add(angImpulse);
    var angImpulseA = Vec3.cross(rA, impulse, VEC4_REGISTER).invert().subtract(angImpulse);

    b.applyImpulse(impulse);
    b.applyAngularImpulse(angImpulseB);
    impulse.invert();
    a.applyImpulse(impulse);
    a.applyAngularImpulse(angImpulseA);
    impulse.invert();

    this.impulse.add(impulse);
    this.angImpulseA.add(angImpulseA);
    this.angImpulseB.add(angImpulseB);
};

module.exports = Hinge;

},{"./Constraint":116,"famous-math":90}],121:[function(require,module,exports){
'use strict';

var Constraint = require('./Constraint');
var Vec3 = require('famous-math').Vec3;
var Mat33 = require('famous-math').Mat33;
var Quaternion = require('famous-math').Quaternion;

var VEC1_REGISTER = new Vec3();
var VEC2_REGISTER = new Vec3();
var VB1_REGISTER = new Vec3();
var VB2_REGISTER = new Vec3();
var WxR_REGISTER = new Vec3();

/**
 *  A constraint that maintains positions and orientations with respect to a specific anchor point.
 *
 *  @class Point2Point
 *  @extends Constraint
 *  @param {Particle} a One of the bodies.
 *  @param {Particle} b The other body.
 *  @param {Options} options An object of configurable options.
 */
function Point2Point(a, b, options) {
    this.a = a;
    this.b = b;

    Constraint.call(this, options);

    this.impulse = new Vec3();
    this.angImpulseA = new Vec3();
    this.angImpulseB = new Vec3();
    this.error = new Vec3();
    this.effMassMatrix = new Mat33();
}

Point2Point.prototype = Object.create(Constraint.prototype);
Point2Point.prototype.constructor = Point2Point;

/**
 * Initialize the Point2Point. Sets defaults if a property was not already set.
 *
 * @method init
 */
Point2Point.prototype.init = function() {
    var w = this.anchor;

    var a = this.a;
    var b = this.b;

    var q1t = Quaternion.conjugate(a.orientation, new Quaternion());
    var q2t = Quaternion.conjugate(b.orientation, new Quaternion());

    this.rA = Vec3.subtract(w, a.position, new Vec3());
    this.rB = Vec3.subtract(w, b.position, new Vec3());

    this.bodyRA = q1t.rotateVector(this.rA, new Vec3());
    this.bodyRB = q2t.rotateVector(this.rB, new Vec3());
};

/**
 * Detect violations of the constraint. Warm start the constraint, if possible.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Point2Point.prototype.update = function(time, dt) {
    var a = this.a;
    var b = this.b;

    var rA = a.orientation.rotateVector(this.bodyRA, this.rA);
    var rB = b.orientation.rotateVector(this.bodyRB, this.rB);

    var xRA = new Mat33([0,rA.z,-rA.y,-rA.z,0,rA.x,rA.y,-rA.x,0]);
    var xRB = new Mat33([0,rB.z,-rB.y,-rB.z,0,rB.x,rB.y,-rB.x,0]);

    var RIaRt = Mat33.multiply(xRA, a.inverseInertia, new Mat33()).multiply(xRA.transpose());
    var RIbRt = Mat33.multiply(xRB, b.inverseInertia, new Mat33()).multiply(xRB.transpose());

    var invEffInertia = Mat33.add(RIaRt, RIbRt, RIaRt);

    var worldA = Vec3.add(a.position, this.rA, this.anchor);
    var worldB = Vec3.add(b.position, this.rB, VEC2_REGISTER);

    Vec3.subtract(worldB, worldA, this.error);
    this.error.scale(0.2/dt);

    var imA = a.inverseMass;
    var imB = b.inverseMass;

    var invEffMass = new Mat33([imA + imB,0,0,0,imA + imB,0,0,0,imA + imB]);

    Mat33.add(invEffInertia, invEffMass, this.effMassMatrix);
    this.effMassMatrix.inverse();

    var impulse = this.impulse;
    var angImpulseA = this.angImpulseA;
    var angImpulseB = this.angImpulseB;

    b.applyImpulse(impulse);
    b.applyAngularImpulse(angImpulseB);
    impulse.invert();
    a.applyImpulse(impulse);
    a.applyAngularImpulse(angImpulseA);

    impulse.clear();
    angImpulseA.clear();
    angImpulseB.clear();
};

/**
 * Apply impulses to resolve the constraint.
 *
 * @method resolve
 */
Point2Point.prototype.resolve = function resolve() {
    var a = this.a;
    var b = this.b;

    var rA = this.rA;
    var rB = this.rB;

    var v1 = Vec3.add(a.velocity, Vec3.cross(a.angularVelocity, rA, WxR_REGISTER), VB1_REGISTER);
    var v2 = Vec3.add(b.velocity, Vec3.cross(b.angularVelocity, rB, WxR_REGISTER), VB2_REGISTER);

    var impulse = v1.subtract(v2).subtract(this.error).applyMatrix(this.effMassMatrix);
    var angImpulseB = Vec3.cross(rB, impulse, VEC1_REGISTER);
    var angImpulseA = Vec3.cross(rA, impulse, VEC2_REGISTER).invert();

    b.applyImpulse(impulse);
    b.applyAngularImpulse(angImpulseB);
    impulse.invert();
    a.applyImpulse(impulse);
    a.applyAngularImpulse(angImpulseA);
    impulse.invert();

    this.impulse.add(impulse);
    this.angImpulseA.add(angImpulseA);
    this.angImpulseB.add(angImpulseB);
};

module.exports = Point2Point;

},{"./Constraint":116,"famous-math":90}],122:[function(require,module,exports){
'use strict';

/**
 * Axis-aligned bounding box. Used in collision broadphases.
 *
 * @class AABB
 */
function AABB(body) {
    this._body = body;
    this._ID = body._ID;
    this.position = null;
    this.vertices = {
        x: [],
        y: [],
        z: []
    };
    this.update();
}

var SPHERE = 1 << 2;
var WALL = 1 << 3;

var DOWN = 0;
var UP = 1;
var LEFT = 2;
var RIGHT = 3;
var FORWARD = 4;
var BACKWARD = 5;

/**
 * Update the bounds to reflect the current orientation and position of the parent Body.
 *
 * @method update
 */
AABB.prototype.update = function() {
    var body = this._body;
    var pos = this.position = body.position;

    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;

    var type = body.type;
    if (type === SPHERE) {
        maxX = maxY = maxZ = body.radius;
        minX = minY = minZ = -body.radius;
    }
    else if (type === WALL) {
        var d = body.direction;
        maxX = maxY = maxZ = 1e6;
        minX = minY = minZ = -1e6;
        switch (d) {
            case DOWN:
                maxY = 25;
                minY = -1e3;
                break;
            case UP:
                maxY = 1e3;
                minY = -25;
                break;
            case LEFT:
                maxX = 25;
                minX = -1e3;
                break;
            case RIGHT:
                maxX = 1e3;
                minX = -25;
                break;
            case FORWARD:
                maxZ = 25;
                minZ = -1e3;
                break;
            case BACKWARD:
                maxZ = 1e3;
                minZ = -25;
                break;
            default:
                break;
       }
    }
    else if (body.vertices) {
        // ConvexBody
        var bodyVertices = body.vertices;
        for (var i = 0, len = bodyVertices.length; i < len; i++) {
            var vertex = bodyVertices[i];
            if (vertex.x < minX) minX = vertex.x;
            if (vertex.x > maxX) maxX = vertex.x;
            if (vertex.y < minY) minY = vertex.y;
            if (vertex.y > maxY) maxY = vertex.y;
            if (vertex.z < minZ) minZ = vertex.z;
            if (vertex.z > maxZ) maxZ = vertex.z;
        }
    } else {
        // Particle
        maxX = maxY = maxZ = 25;
        minX = minY = minZ = -25;
    }
    var vertices = this.vertices;
    vertices.x[0] = minX + pos.x;
    vertices.x[1] = maxX + pos.x;
    vertices.y[0] = minY + pos.y;
    vertices.y[1] = maxY + pos.y;
    vertices.z[0] = minZ + pos.z;
    vertices.z[1] = maxZ + pos.z;
};

/**
 * Check for overlap between two AABB's.
 *
 * @method checkOverlap
 * @param {AABB} aabb1
 * @param {AABB} aabb2
 */
AABB.checkOverlap = function(aabb1, aabb2) {
    var vertices1 = aabb1.vertices;
    var vertices2 = aabb2.vertices;

    var x10 = vertices1.x[0];
    var x11 = vertices1.x[1];
    var x20 = vertices2.x[0];
    var x21 = vertices2.x[1];
    if ((x20 <= x10 && x10 <= x21) || (x10 <= x20 && x20 <= x11)) {
        var y10 = vertices1.y[0];
        var y11 = vertices1.y[1];
        var y20 = vertices2.y[0];
        var y21 = vertices2.y[1];
        if ((y20 <= y10 && y10 <= y21) || (y10 <= y20 && y20 <= y11)) {
            var z10 = vertices1.z[0];
            var z11 = vertices1.z[1];
            var z20 = vertices2.z[0];
            var z21 = vertices2.z[1];
            if ((z20 <= z10 && z10 <= z21) || (z10 <= z20 && z20 <= z11)) {
                return true;
            }
        }
    }
    return false;
};

AABB.vertexThreshold = 100;

module.exports = AABB;

},{}],123:[function(require,module,exports){
'use strict';

var AABB = require('./AABB');

/**
 * O(n^2) comparisons with an AABB check for a midphase. Likely to be more performant
 * that the BruteForce when the bodies have many vertices. Only feasible for a small number of bodies.
 *
 * @class BruteForAABB
 * @param {Particles[]} targets
 * @param {Object} options
 */
function BruteForceAABB(targets) {
    this._volumes = [];
    this._entityRegistry = {};
    for (var i = 0; i < targets.length; i++) {
        this.add(targets[i]);
    }
}

/**
 * Start tracking a Particle.
 *
 * @method add
 * @param {Particle} body
 */
BruteForceAABB.prototype.add = function add(body) {
    var boundingVolume = new AABB(body);

    this._entityRegistry[body._ID] = body;
    this._volumes.push(boundingVolume);
};

/**
 * Return an array of possible collision pairs, culled by an AABB intersection test.
 *
 * @method update
 * @return {Particle[][]}
 */
BruteForceAABB.prototype.update = function update() {
    var _volumes = this._volumes;
    var _entityRegistry = this._entityRegistry;

    for (var k = 0, len = _volumes.length; k < len; k++) {
        _volumes[k].update();
    }

    var result = [];
    for (var i = 0, numTargets = _volumes.length; i < numTargets; i++) {
        for (var j = i + 1; j < numTargets; j++) {
            if (AABB.checkOverlap(_volumes[i], _volumes[j])) {
                result.push([_entityRegistry[i], _entityRegistry[j]]);
            }
        }
    }
    return result;
};

/**
 * The most simple yet computationally intensive broad-phase. Immediately passes its targets to the narrow-phase,
 * resulting in an O(n^2) process. Only feasible for a relatively small number of bodies.
 *
 * @class BruteForce
 * @param {Particle[]} targets
 */
function BruteForce(targets) {
    this.targets = targets;
}

/**
 * Start tracking a Particle.
 *
 * @method add
 * @param {Particle} body
 */
BruteForce.prototype.add = function add(body) {
    this.targets.push(body);
};

/**
 * Immediately returns an array of possible collisions.
 *
 * @method update
 * @return {Particle[][]}
 */
BruteForce.prototype.update = function update() {
    return [this.targets];
};

module.exports.BruteForceAABB = BruteForceAABB;
module.exports.BruteForce = BruteForce;

},{"./AABB":122}],124:[function(require,module,exports){
'use strict';

var Vec3 = require('famous-math').Vec3;
var ObjectManager = require('famous-utilities').ObjectManager;

ObjectManager.register('Manifold', Manifold);
ObjectManager.register('Contact', Contact);
var OMRequestManifold = ObjectManager.requestManifold;
var OMRequestContact = ObjectManager.requestContact;
var OMFreeManifold = ObjectManager.freeManifold;
var OMFreeContact = ObjectManager.freeContact;

/**
 * Helper function to clamp a value to a given range.
 *
 * @method clamp
 * @param {Number} value
 * @param {Number} lower
 * @param {Number} upper
 * @return {Number}
 * @private
 */
function clamp(value, lower, upper) {
    return value < lower ? lower : value > upper ? upper : value;
}

var VEC1_REGISTER = new Vec3();
var VEC2_REGISTER = new Vec3();
var VB1_REGISTER = new Vec3();
var VB2_REGISTER = new Vec3();
var WxR_REGISTER = new Vec3();
var R1_REGISTER = new Vec3();
var R2_REGISTER = new Vec3();
var NORMALIMPULSE_REGISTER = new Vec3();
var TANGENTIMPULSE1_REGISTER = new Vec3();
var TANGENTIMPULSE2_REGISTER = new Vec3();
var WA_REGISTER = new Vec3();
var WB_REGISTER = new Vec3();
var PENETRATING_REGISTER = new Vec3();
var DRIFTA_REGISTER = new Vec3();
var DRIFTB_REGISTER = new Vec3();

/**
 * Table maintaining and managing current contact manifolds.
 *
 * @class ContactManifoldTable
 */
function ContactManifoldTable() {
    this.manifolds = [];
    this.collisionMatrix = {};
    this._IDPool = [];
}

/**
 * Create a new contact manifold. Tracked by the collisionMatrix according to
 * its low-high ordered ID pair.
 *
 * @method addManifold
 * @param {Number} lowId
 * @param {Number} highID
 * @param {Particle} bodyA
 * @param {Particle} bodyB
 * @return {ContactManifold}
 */
ContactManifoldTable.prototype.addManifold = function addManifold(lowID, highID, bodyA, bodyB) {
    var collisionMatrix = this.collisionMatrix;
    collisionMatrix[lowID] = collisionMatrix[lowID] || {};

    var index = this._IDPool.length ? this._IDPool.pop() : this.manifolds.length;
    this.collisionMatrix[lowID][highID] = index;
    var manifold = OMRequestManifold().reset(lowID, highID, bodyA, bodyB);
    this.manifolds[index] = manifold;

    return manifold;
};

/**
 * Remove a manifold and free it for later reuse.
 *
 * @method removeManifold
 * @param {ContactManifold} manifold
 * @param {Number} index
 */
ContactManifoldTable.prototype.removeManifold = function removeManifold(manifold, index) {
    var collisionMatrix = this.collisionMatrix;

    this.manifolds[index] = null;
    collisionMatrix[manifold.lowID][manifold.highID] = null;
    this._IDPool.push(index);

    OMFreeManifold(manifold);
};

/**
 * Update each of the manifolds, removing those that no longer contain contact points.
 *
 * @method update
 * @param {Number} dt
 */
ContactManifoldTable.prototype.update = function update(dt) {
    var manifolds = this.manifolds;
    for (var i = 0, len = manifolds.length; i < len; i++) {
        var manifold = manifolds[i];
        if (!manifold) continue;
        var persists = manifold.update(dt);
        if (!persists) {
            this.removeManifold(manifold, i);
            manifold.bodyA.events.trigger('collision:end', manifold);
            manifold.bodyB.events.trigger('collision:end', manifold);
        }
    }
};

/**
 * Warm start all Contacts, and perform precalculations needed in the iterative solver.
 *
 * @method prepContacts
 * @param {Number} dt
 */
ContactManifoldTable.prototype.prepContacts = function prepContacts(dt) {
    var manifolds = this.manifolds;
    for (var i = 0, len = manifolds.length; i < len; i++) {
        var manifold = manifolds[i];
        if (!manifold) continue;
        var contacts = manifold.contacts;
        for (var j = 0, lenj = contacts.length; j < lenj; j++) {
            var contact = contacts[j];
            if (!contact) continue;
            contact.update(dt);
        }
    }
};

/**
 * Resolve all contact manifolds.
 *
 * @method resolveManifolds
 */
ContactManifoldTable.prototype.resolveManifolds = function resolveManifolds() {
    var manifolds = this.manifolds;
    for (var i = 0, len = manifolds.length; i < len; i++) {
        var manifold = manifolds[i];
        if (!manifold) continue;
        manifold.resolveContacts();
    }
};

/**
 * Create a new Contact, also creating a new Manifold if one does not already exist for that pair.
 *
 * @method registerContact
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {CollisionData} collisionData
 */
ContactManifoldTable.prototype.registerContact = function registerContact(bodyA, bodyB, collisionData) {
    var lowID;
    var highID;

    if (bodyA._ID < bodyB._ID) {
        lowID = bodyA._ID;
        highID = bodyB._ID;
    } else {
        lowID = bodyB._ID;
        highID = bodyA._ID;
    }

    var manifolds = this.manifolds;
    var collisionMatrix = this.collisionMatrix;
    var manifold;
    if (!collisionMatrix[lowID] || collisionMatrix[lowID][highID] == null) {
        manifold = this.addManifold(lowID, highID, bodyA, bodyB);
        manifold.addContact(bodyA, bodyB, collisionData);
        bodyA.events.trigger('collision:start', manifold);
        bodyB.events.trigger('collision:start', manifold);
    } else {
        manifold = manifolds[ collisionMatrix[lowID][highID] ];
        manifold.contains(collisionData);
        manifold.addContact(bodyA, bodyB, collisionData);
    }
};

var THRESHOLD = 10;

/**
 * Class to keep track of Contact points.
 * @class manifold
 * @param {Number} lowId
 * @param {Number} highId
 * @param {Body} bodyA
 * @param {Body} bodyB
 */
function Manifold(lowID, highID, bodyA, bodyB) {
    this.lowID = lowID;
    this.highID = highID;

    this.contacts = [];
    this.numContacts = 0;

    this.bodyA = bodyA;
    this.bodyB = bodyB;

    this.lru = 0;
}

/**
 * Used by ObjectManager to reset the object with different data.
 *
 * @method reset
 * @param {Object[]} args
 * @chainable
 */
Manifold.prototype.reset = function reset(lowID, highID, bodyA, bodyB) {
    this.lowID = lowID;
    this.highID = highID;

    this.contacts = [];
    this.numContacts = 0;

    this.bodyA = bodyA;
    this.bodyB = bodyB;

    this.lru = 0;

    return this;
};

/**
 * Create a new Contact point and add it to the Manifold.
 *
 * @method addContact
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {CollisionData} collisionData
 */
Manifold.prototype.addContact = function addContact(bodyA, bodyB, collisionData) {
    var index = this.lru;
    if (this.contacts[index]) this.removeContact(this.contacts[index], index);
    this.contacts[index] = OMRequestContact().reset(bodyA, bodyB, collisionData);
    this.lru = (this.lru + 1) % 4;
    this.numContacts++;
};

/**
 * Remove and free a Contact for later reuse.
 *
 * @method removeContact
 * @param {Contact} contact
 * @param {Number} index
 */
Manifold.prototype.removeContact = function removeContact(contact, index) {
    this.contacts[index] = null;
    this.numContacts--;

    ObjectManager.freeCollisionData(contact.data);
    contact.data = null;
    OMFreeContact(contact);
};

/**
 * Check if a Contact already exists for the collision data within a certain tolerance.
 * If found, remove the Contact.
 *
 * @method contains
 * @param {CollisionData} collisionData
 * @return {Boolean}
 */
Manifold.prototype.contains = function contains(collisionData) {
    var wA = collisionData.worldContactA;
    var wB = collisionData.worldContactB;

    var contacts = this.contacts;
    for (var i = 0, len = contacts.length; i < len; i++) {
        var contact = contacts[i];
        if (!contact) continue;
        var data = contact.data;
        var distA = Vec3.subtract(data.worldContactA, wA, DRIFTA_REGISTER).length();
        var distB = Vec3.subtract(data.worldContactB, wB, DRIFTB_REGISTER).length();

        if (distA < THRESHOLD || distB < THRESHOLD) {
            this.removeContact(contact, i);
            return true;
        }
    }

    return false;
};

/**
 * Remove Contacts the local points of which have drifted above a certain tolerance.
 * Return true or false to indicate that the Manifold still contains at least one Contact.
 *
 * @method update
 * @return {Boolean} whether or not the manifold persists
 */
Manifold.prototype.update = function update() {
    var contacts = this.contacts;
    var bodyA = this.bodyA;
    var bodyB = this.bodyB;

    var posA = bodyA.position;
    var posB = bodyB.position;

    for (var i = 0, len = contacts.length; i < len; i++) {
        var contact = contacts[i];
        if (!contact) continue;
        var data = contact.data;
        var n = data.normal;
        var rA = data.localContactA;
        var rB = data.localContactB;

        var cached_wA = data.worldContactA;
        var cached_wB = data.worldContactB;

        var wA = Vec3.add(posA, rA, WA_REGISTER);
        var wB = Vec3.add(posB, rB, WB_REGISTER);

        var notPenetrating = Vec3.dot(Vec3.subtract(wB, wA, PENETRATING_REGISTER), n) > 0;

        var driftA = Vec3.subtract(cached_wA, wA, DRIFTA_REGISTER);
        var driftB = Vec3.subtract(cached_wB, wB, DRIFTB_REGISTER);


        if (driftA.length() >= THRESHOLD || driftB.length() >= THRESHOLD || notPenetrating) {
            this.removeContact(contact, i);
        }
    }

    if (this.numContacts) return true;
    else return false;
};

/**
 * Resolve all contacts.
 *
 * @method resolveContacts
 */
Manifold.prototype.resolveContacts = function resolveContacts() {
    var contacts = this.contacts;
    for (var i = 0, len = contacts.length; i < len; i++) {
        if (!contacts[i]) continue;
        contacts[i].resolve();
    }
};

/**
 * Class to maintain collision data between two bodies.
 * The end of the resolve chain, and where the actual impulses are applied.
 *
 * @class Contact
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {CollisionData} collisionData
 */
function Contact(bodyA, bodyB, collisionData) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.data = collisionData;

    this.normalImpulse = 0;
    this.tangentImpulse1 = 0;
    this.tangentImpulse2 = 0;

    this.impulse = new Vec3();
    this.angImpulseA = new Vec3();
    this.angImpulseB = new Vec3();

    if (collisionData) this.init();
}

/**
 * Used by ObjectManager to reset the object with different data.
 *
 * @method reset
 * @param {Object[]} args
 * @chainable
 */
Contact.prototype.reset = function reset(bodyA, bodyB, collisionData) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.data = collisionData;

    this.normalImpulse = 0;
    this.tangentImpulse1 = 0;
    this.tangentImpulse2 = 0;

    this.impulse.clear();
    this.angImpulseA.clear();
    this.angImpulseB.clear();

    this.init();

    return this;
};

/**
 * Initialization method called on instantiantion or reset of the Contact. Performs
 * precalculations that will not change over the life of the Contact.
 *
 * @method init
 */
Contact.prototype.init = function init() {
    var data = this.data;
    var n = data.normal;
    var t1 = new Vec3();
    if (n.x >= 0.57735) {
        t1.set(n.y, -n.x, 0);
    } else {
        t1.set(0, n.z, -n.y);
    }
    t1.normalize();
    var t2 = Vec3.cross(n, t1, new Vec3());

    this.tangent1 = t1;
    this.tangent2 = t2;

    var bodyA = this.bodyA;
    var bodyB = this.bodyB;

    var rBodyA = data.localContactA;
    var rBodyB = data.localContactB;

    var invEffectiveMass = bodyA.inverseMass + bodyB.inverseMass;

    var r1n = Vec3.cross(rBodyA, n, R1_REGISTER);
    var r2n = Vec3.cross(rBodyB, n, R2_REGISTER);
    this.effNormalMass = 1 / (invEffectiveMass +
        Vec3.dot(r1n, bodyA.inverseInertia.vectorMultiply(r1n, VEC1_REGISTER)) +
        Vec3.dot(r2n, bodyB.inverseInertia.vectorMultiply(r2n, VEC1_REGISTER)));

    var r1t1 = Vec3.cross(rBodyA, t1, R1_REGISTER);
    var r2t1 = Vec3.cross(rBodyB, t1, R2_REGISTER);
    this.effTangentialMass1 = 1 / (invEffectiveMass +
        Vec3.dot(r1t1, bodyA.inverseInertia.vectorMultiply(r1t1, VEC1_REGISTER)) +
         Vec3.dot(r2t1, bodyB.inverseInertia.vectorMultiply(r2t1, VEC1_REGISTER)));

    var r1t2 = Vec3.cross(rBodyA, t2, R1_REGISTER);
    var r2t2 = Vec3.cross(rBodyB, t2, R2_REGISTER);
    this.effTangentialMass2 = 1 / (invEffectiveMass +
        Vec3.dot(r1t2, bodyA.inverseInertia.vectorMultiply(r1t2, VEC1_REGISTER)) +
         Vec3.dot(r2t2, bodyB.inverseInertia.vectorMultiply(r2t2, VEC1_REGISTER)));

    this.restitution = Math.min(bodyA.restitution, bodyB.restitution);
    this.friction = bodyA.friction * bodyB.friction;
};

/**
 * Warm start the Contact, prepare for the iterative solver, and reset impulses.
 *
 * @method update
 * @param {Number} dt
 */
Contact.prototype.update = function update(dt) {
    var data = this.data;
    var bodyA = this.bodyA;
    var bodyB = this.bodyB;

    var rBodyA = data.localContactA;
    var rBodyB = data.localContactB;

    var n = data.normal;

    var vb1 = Vec3.add(bodyA.velocity, Vec3.cross(bodyA.angularVelocity, rBodyA, WxR_REGISTER), VB1_REGISTER);
    var vb2 = Vec3.add(bodyB.velocity, Vec3.cross(bodyB.angularVelocity, rBodyB, WxR_REGISTER), VB2_REGISTER);
    var relativeVelocity = vb2.subtract(vb1);
    var contactSpeed = Vec3.dot(relativeVelocity, n);

    var beta = 0.15;
    var slop = 1.5;
    var velocityTolerance = 20.0;

    var restitution = Math.abs(contactSpeed) < velocityTolerance ? 0.0 : this.restitution;
    this.velocityBias = -beta * Math.max(data.penetration - slop, 0.0) / dt;
    this.velocityBias += restitution * contactSpeed;

    var impulse = this.impulse.scale(0.25);
    var angImpulseA = this.angImpulseA.scale(0.25);
    var angImpulseB = this.angImpulseB.scale(0.25);

    bodyB.applyImpulse(impulse);
    bodyB.applyAngularImpulse(angImpulseB);
    impulse.invert();
    bodyA.applyImpulse(impulse);
    bodyA.applyAngularImpulse(angImpulseA);

    this.normalImpulse = 0;
    this.tangentImpulse1 = 0;
    this.tangentImpulse2 = 0;

    impulse.clear();
    angImpulseA.clear();
    angImpulseB.clear();
};

/**
 * Apply impulses to resolve the contact and simulate friction.
 *
 * @method resolve
 */
Contact.prototype.resolve = function resolve() {
    var data = this.data;
    var bodyA = this.bodyA;
    var bodyB = this.bodyB;

    var rBodyA = data.localContactA;
    var rBodyB = data.localContactB;

    var n = data.normal;
    var t1 = this.tangent1;
    var t2 = this.tangent2;

    var vb1 = Vec3.add(bodyA.velocity, Vec3.cross(bodyA.angularVelocity, rBodyA, WxR_REGISTER), VB1_REGISTER);
    var vb2 = Vec3.add(bodyB.velocity, Vec3.cross(bodyB.angularVelocity, rBodyB, WxR_REGISTER), VB2_REGISTER);
    var relativeVelocity = vb2.subtract(vb1);

    var normalLambda = -(Vec3.dot(relativeVelocity, n) + this.velocityBias) * this.effNormalMass;
    var newNormalImpulse = Math.max(this.normalImpulse + normalLambda, 0);
    normalLambda = newNormalImpulse - this.normalImpulse;

    var maxFriction = this.friction * newNormalImpulse;

    var tangentLambda1 = -Vec3.dot(relativeVelocity, t1) * this.effTangentialMass1;
    var newTangentImpulse1 = clamp(this.tangentImpulse1 + tangentLambda1, -maxFriction, maxFriction);
    tangentLambda1 = newTangentImpulse1 - this.tangentImpulse1;

    var tangentLambda2 = -Vec3.dot(relativeVelocity, t2) * this.effTangentialMass2;
    var newTangentImpulse2 = clamp(this.tangentImpulse2 + tangentLambda2, -maxFriction, maxFriction);
    tangentLambda2 = newTangentImpulse2 - this.tangentImpulse2;

    var impulse = Vec3.scale(n, normalLambda, NORMALIMPULSE_REGISTER);
    var tangentImpulse1 = Vec3.scale(t1, tangentLambda1, TANGENTIMPULSE1_REGISTER);
    var tangentImpulse2 = Vec3.scale(t2, tangentLambda2, TANGENTIMPULSE2_REGISTER);

    impulse.add(tangentImpulse1).add(tangentImpulse2);

    var angImpulseB = Vec3.cross(rBodyB, impulse, VEC1_REGISTER);
    var angImpulseA = Vec3.cross(rBodyA, impulse, VEC2_REGISTER).invert();

    bodyB.applyImpulse(impulse);
    bodyB.applyAngularImpulse(angImpulseB);
    impulse.invert();
    bodyA.applyImpulse(impulse);
    bodyA.applyAngularImpulse(angImpulseA);

    this.normalImpulse = newNormalImpulse;
    this.tangentImpulse1 = newTangentImpulse1;
    this.tangentImpulse2 = newTangentImpulse2;

    this.impulse.add(impulse);
    this.angImpulseA.add(angImpulseA);
    this.angImpulseB.add(angImpulseB);
};

module.exports = ContactManifoldTable;

},{"famous-math":90,"famous-utilities":103}],125:[function(require,module,exports){
'use strict';

var Vec3 = require('famous-math').Vec3;
var ObjectManager = require('famous-utilities').ObjectManager;

ObjectManager.register('GJK_EPASupportPoint', GJK_EPASupportPoint);
var OMRequestGJK_EPASupportPoint = ObjectManager.requestGJK_EPASupportPoint;
var OMRequestDynamicGeometry = ObjectManager.requestDynamicGeometry;
var OMFreeGJK_EPASupportPoint = ObjectManager.freeGJK_EPASupportPoint;
var OMFreeDynamicGeometry = ObjectManager.freeDynamicGeometry;
var OMFreeDynamicGeometryFeature = ObjectManager.freeDynamicGeometryFeature;

var P_REGISTER = new Vec3();
var V0_REGISTER = new Vec3();
var V1_REGISTER = new Vec3();
var V2_REGISTER = new Vec3();

var DIRECTION_REGISTER = new Vec3();
var INVDIRECTION_REGISTER = new Vec3();

/**
 * Support point to be added to the DynamicGeometry. The point in Minkowski space as well as the
 * original pair.
 *
 * @class GJK_EPASupportPoint
 * @param {Vec3} vertex
 * @param {Vec3} worldVertexA
 * @param {Vec3} worldVertexAB
 */
function GJK_EPASupportPoint(vertex, worldVertexA, worldVertexB) {
    this.vertex = vertex;
    this.worldVertexA = worldVertexA;
    this.worldVertexB = worldVertexB;
}

/**
 * Used by ObjectManager to reset the object with different data.
 *
 * @method reset
 * @param {Object[]} args
 * @chainable
 */
GJK_EPASupportPoint.prototype.reset = function reset(vertex, worldVertexA, worldVertexB) {
    this.vertex = vertex;
    this.worldVertexA = worldVertexA;
    this.worldVertexB = worldVertexB;

    return this;
};

/**
 * Free the DynamicGeomtetry and associate vertices and features for later reuse.
 *
 * @method freeGJK_EPADynamicGeometry
 * @param {DynamicGeometry} geometry
 */
function freeGJK_EPADynamicGeometry(geometry) {
    var vertices = geometry.vertices;
    var i;
    i = vertices.length;
    while (i--) {
        var v = vertices.pop();
        if (v !== null) OMFreeGJK_EPASupportPoint(v);
    }
    geometry.numVertices = 0;
    var features = geometry.features;
    i = features.length;
    while (i--) {
        var f = features.pop();
        if (f !== null) OMFreeDynamicGeometryFeature(f);
    }
    geometry.numFeatures = 0;
    OMFreeDynamicGeometry(geometry);
}

/**
 * Find the point in Minkowski space furthest in a given direction for two convex Bodies.
 *
 * @method minkowskiSupport
 * @param {Body} body1
 * @param {Body} body2
 * @param {Vec3} direction
 * @return {GJK_EPASupportPoint}
 */
function minkowskiSupport(body1, body2, direction) {
    var inverseDirection = Vec3.scale(direction, -1, INVDIRECTION_REGISTER);

    var furthest1 = body1.support(direction);
    var furthest2 = body2.support(inverseDirection);

    var w1 = Vec3.add(furthest1, body1.position, new Vec3());
    var w2 = Vec3.add(furthest2, body2.position, new Vec3());

    // The vertex in Minkowski space as well as the original pair in world space
    return OMRequestGJK_EPASupportPoint().reset(Vec3.subtract(w1, w2, new Vec3()), w1, w2);
}

/**
 * Gilbert-Johnson-Keerthi collision detection. Returns a DynamicGeometry simplex if the bodies are found
 * to have collided or false for no collsion.
 *
 * @method GJK
 * param {Body} body1
 * param {Body} body2
 * @return {DynamicGeometry | Boolean}
 */
function GJK(body1, body2) {
    var support = minkowskiSupport;
    // Use p2 - p1 to seed the initial choice of direction
    var direction = Vec3.subtract(body2.position, body1.position, DIRECTION_REGISTER).normalize();
    var simplex = OMRequestDynamicGeometry();
    simplex.addVertex(support(body1, body2, direction));
    direction.invert();

    var i = 0;
    var maxIterations = 1e3;
    while(i++ < maxIterations) {
        if (direction.x === 0 && direction.y === 0 && direction.z === 0) break;
        simplex.addVertex(support(body1, body2, direction));
        if (Vec3.dot(simplex.getLastVertex().vertex, direction) < 0) break;
        // If simplex contains origin, return for use in EPA
        if (simplex.simplexContainsOrigin(direction, OMFreeGJK_EPASupportPoint)) return simplex;
    }
    freeGJK_EPADynamicGeometry(simplex);
    return false;
}

/**
 * Expanding Polytope Algorithm--penetration depth, collision normal, and contact points.
 * Returns a CollisonData object.
 *
 * @method EPA
 * @param {Body} body1
 * @param {Body} body2
 * @param {DynamicGeometry} polytope
 * @return {CollisionData}
 */
function EPA(body1, body2, polytope) {
    var support = minkowskiSupport;
    var depthEstimate = Infinity;

    var i = 0;
    var maxIterations = 1e3;
    while(i++ < maxIterations) {
        var closest = polytope.getFeatureClosestToOrigin();
        if (closest === null) return null;
        var direction = closest.normal;
        var point = support(body1, body2, direction);
        depthEstimate = Math.min(depthEstimate, Vec3.dot(point.vertex, direction));
        if (depthEstimate - closest.distance <= 0.01) {
            var supportA = polytope.vertices[closest.vertexIndices[0]];
            var supportB = polytope.vertices[closest.vertexIndices[1]];
            var supportC = polytope.vertices[closest.vertexIndices[2]];

            var A = supportA.vertex;
            var B = supportB.vertex;
            var C = supportC.vertex;
            var P = Vec3.scale(direction, closest.distance, P_REGISTER);

            var V0 = Vec3.subtract(B, A, V0_REGISTER);
            var V1 = Vec3.subtract(C, A, V1_REGISTER);
            var V2 = Vec3.subtract(P, A, V2_REGISTER);

            var d00 = Vec3.dot(V0, V0);
            var d01 = Vec3.dot(V0, V1);
            var d11 = Vec3.dot(V1, V1);
            var d20 = Vec3.dot(V2, V0);
            var d21 = Vec3.dot(V2, V1);
            var denom = d00*d11 - d01*d01;

            var v = (d11*d20 - d01*d21) / denom;
            var w = (d00*d21 - d01*d20) / denom;
            var u = 1.0 - v - w;

            var body1Contact =      supportA.worldVertexA.scale(u)
                               .add(supportB.worldVertexA.scale(v))
                               .add(supportC.worldVertexA.scale(w));

            var body2Contact =      supportA.worldVertexB.scale(u)
                               .add(supportB.worldVertexB.scale(v))
                               .add(supportC.worldVertexB.scale(w));

            var localBody1Contact = Vec3.subtract(body1Contact, body1.position, new Vec3());
            var localBody2Contact = Vec3.subtract(body2Contact, body2.position, new Vec3());

            freeGJK_EPADynamicGeometry(polytope);
            OMFreeGJK_EPASupportPoint(point);

            return ObjectManager.requestCollisionData().reset(closest.distance, direction, body1Contact, body2Contact, localBody1Contact, localBody2Contact);
        } else {
            polytope.addVertex(point);
            polytope.reshape();
        }
    }
    throw new Error('EPA failed to terminate in allotted iterations.');
}

module.exports.GJK = GJK;
module.exports.EPA = EPA;

},{"famous-math":90,"famous-utilities":103}],126:[function(require,module,exports){
'use strict';

var AABB = require('./AABB');

/**
 * @const {String[]} AXES x, y, and z axes
 */
var AXES = ['x', 'y', 'z'];

/**
 * Persistant object maintaining sorted lists of AABB endpoints used in a sweep-and-prune broadphase.
 * Used to accelerate collision detection.
 * http://en.wikipedia.org/wiki/Sweep_and_prune
 *
 * @class SweepAndPrune
 * @param {Body[]} targets
 */
function SweepAndPrune(targets) {
    this._sweepVolumes = [];
    this._entityRegistry = {};
    this._boundingVolumeRegistry = {};
    this.endpoints = {x: [], y: [], z: []};

    this.overlaps = [];
    this.overlapsMatrix = {};
    this._IDPool = [];
    targets = targets || [];
    for (var i = 0; i < targets.length; i++) {
        this.add(targets[i]);
    }
}

/**
 * Start tracking a body in the broad-phase.
 *
 * @method add
 * @param {Body} body
 */
SweepAndPrune.prototype.add = function(body) {
    var boundingVolume = new AABB(body);
    var sweepVolume = new SweepVolume(boundingVolume);

    this._entityRegistry[body._ID] = body;
    this._boundingVolumeRegistry[body._ID] = boundingVolume;
    this._sweepVolumes.push(sweepVolume);
    for (var i = 0; i < 3; i++) {
        var axis = AXES[i];
        this.endpoints[axis].push(sweepVolume.points[axis][0]);
        this.endpoints[axis].push(sweepVolume.points[axis][1]);
    }
};

/**
 * Stop tracking a body in the broad-phase.
 *
 * @method add
 * @param {Body} body
 */
SweepAndPrune.prototype.remove = function remove(body) {
    this._entityRegistry[body._ID] = null;
    this._boundingVolumeRegistry[body._ID] = null;
    var i, len;
    var index;
    for (i = 0, len = this._sweepVolumes.length; i < len; i++) {
        if (this._sweepVolumes[i]._ID === body._ID) {
            index = i;
            break;
        }
    }
    this._sweepVolumes.splice(index, 1);
    var endpoints = this.endpoints;
    var point;

    var xs = [];
    for (i = 0, len = endpoints.x.length; i < len; i++) {
        point = endpoints.x[i];
        if (point._ID !== body._ID) xs.push(point);
    }
    var ys = [];
    for (i = 0, len = endpoints.y.length; i < len; i++) {
        point = endpoints.y[i];
        if (point._ID !== body._ID) ys.push(point);
    }
    var zs = [];
    for (i = 0, len = endpoints.z.length; i < len; i++) {
        point = endpoints.z[i];
        if (point._ID !== body._ID) zs.push(point);
    }
    endpoints.x = xs;
    endpoints.y = ys;
    endpoints.z = zs;
};

/**
 * Update the endpoints of the tracked AABB's and resort the endpoint lists accordingly. Uses an insertion sort,
 * where swaps during the sort are taken to signify a potential change in overlap status for the two
 * relevant AABB's. Returns pairs of overlapping AABB's.
 *
 * @param update
 * @return {Particle[][]}
 */
SweepAndPrune.prototype.update = function() {
    var _sweepVolumes = this._sweepVolumes;
    var _entityRegistry = this._entityRegistry;
    var _boundingVolumeRegistry = this._boundingVolumeRegistry;

    var i, j, k, len;

    for (j = 0, len = _sweepVolumes.length; j < len; j++) {
        _sweepVolumes[j].update();
    }

    var endpoints = this.endpoints;
    var overlaps = this.overlaps;
    var overlapsMatrix = this.overlapsMatrix;
    var _IDPool = this._IDPool;

    for (k = 0; k < 3; k++) {
        var axis = AXES[k];
        // Insertion sort:
        var endpointAxis = endpoints[axis];
        for (j = 1, len = endpointAxis.length; j < len; j++) {
            var current = endpointAxis[j];
            var val = current.value;
            var swap;
            var row;
            var index;
            var lowID;
            var highID;
            var cID;
            var sID;

            i = j - 1;
            while (i >= 0 && (swap = endpointAxis[i]).value > val) {
                // A swap occurence indicates that current and swap either just started or just stopped overlapping

                cID = current._ID;
                sID = swap._ID;

                if (cID < sID) {
                    lowID = cID;
                    highID = sID;
                } else {
                    lowID = sID;
                    highID = cID;
                }

                // If, for this axis, min point of current and max point of swap
                if (~current.side & swap.side) {
                    // Now overlapping on this axis -> possible overlap, do full AABB check
                    if (AABB.checkOverlap(_boundingVolumeRegistry[cID], _boundingVolumeRegistry[sID])) {
                        row = overlapsMatrix[lowID] = overlapsMatrix[lowID] || {};
                        index = row[highID] = _IDPool.length ? _IDPool.pop() : overlaps.length;
                        overlaps[index] = [_entityRegistry[lowID], _entityRegistry[highID]];
                    }
                // // Else if, for this axis, max point of current and min point of swap
                } else if (current.side & ~swap.side) {
                    // Now not overlapping on this axis -> definitely not overlapping
                    if ((row = overlapsMatrix[lowID]) && row[highID] != null) {
                        index = row[highID];
                        overlaps[index] = null;
                        row[highID] = null;
                        _IDPool.push(index);
                    }
                }
                // Else if max of both or min of both, still overlapping

                endpointAxis[i + 1] = swap;
                i--;
            }
            endpointAxis[i + 1] = current;
        }
    }

    return overlaps;
};

/**
 * Object used to associate an AABB with its endpoints in the sorted lists.
 *
 * @class SweepVolume
 * @constructor
 * @param {AABB} boundingVolume
 */
function SweepVolume(boundingVolume) {
    this._boundingVolume = boundingVolume;
    this._ID = boundingVolume._ID;
    this.points = {
        x: [{_ID: boundingVolume._ID, side: 0, value: null}, {_ID: boundingVolume._ID, side: 1, value: null}],
        y: [{_ID: boundingVolume._ID, side: 0, value: null}, {_ID: boundingVolume._ID, side: 1, value: null}],
        z: [{_ID: boundingVolume._ID, side: 0, value: null}, {_ID: boundingVolume._ID, side: 1, value: null}]
    };
    this.update();
}

/**
 * Update the endpoints to reflect the current location of the AABB.
 *
 * @method update
 */
SweepVolume.prototype.update = function() {
    var boundingVolume = this._boundingVolume;
    boundingVolume.update();

    var points = this.points;

    for (var i = 0; i < 3; i++) {
        var axis = AXES[i];
        points[axis][0].value = boundingVolume.vertices[axis][0];
        points[axis][1].value = boundingVolume.vertices[axis][1];
    }
};

module.exports = SweepAndPrune;

},{"./AABB":122}],127:[function(require,module,exports){
'use strict';

var Force = require('./Force');
var Vec3 = require('famous-math').Vec3;

var FORCE_REGISTER = new Vec3();

/**
 * Use drag to oppose momentum of a moving object
 *
 * @class Drag
 * @extends Force
 * @param {Object} options
 */
function Drag(targets, options) {
    Force.call(this, targets, options);
}

Drag.prototype = Object.create(Force.prototype);
Drag.prototype.constructor = Drag;

/**
 * Used to scale velocity in the computation of the drag force.
 *
 * @attribute QUADRATIC
 * @type Function
 * @param {Number} v
 * @return {Number} used to square the magnitude of the velocity
 */
Drag.QUADRATIC = function QUADRATIC(v) {
    return v*v;
};

/**
 * Used to scale velocity in the computation of the drag force.
 *
 * @attribute LINEAR
 * @type Function
 * @param {Number} v
 * @return {Number} strength 1, will not scale the velocity
 */
Drag.LINEAR = function LINEAR(v) {
    return v;
};

/**
 * Initialize the Force. Sets defaults if a property was not already set.
 *
 * @method init
 * @param {Object} options The options hash.
 */
Drag.prototype.init = function() {
    this.max = this.max || Infinity;
    this.strength = this.strength || 1;
    this.type = this.type || Drag.LINEAR;
};

/**
 * Apply the force.
 *
 * @method update
 */
Drag.prototype.update = function update() {
    var targets = this.targets;
    var type = this.type;

    var force = FORCE_REGISTER;

    var max = this.max;
    var strength = this.strength;
    for (var i = 0, len = targets.length; i < len; i++) {
        var target = targets[i];
        var velocity = target.velocity;
        var v = velocity.length();
        var invV = v ? 1 / v : 0;
        var magnitude = -strength * type(v);
        Vec3.scale(velocity, (magnitude < -max ? -max : magnitude) * invV, force);
        target.applyForce(force);
    }
};

module.exports = Drag;

},{"./Force":128,"famous-math":90}],128:[function(require,module,exports){
'use strict';

var _ID = 0;
/**
 * Abstract force manager to apply forces to targets.
 *
 * @class Force
 * @virtual
 * @param {Particle[]} targets The targets of the force.
 * @param {Object} options The options hash.
 */
function Force(targets, options) {
    if (targets) {
        if (targets instanceof Array) this.targets = targets;
        else this.targets = [targets];
    }
    else this.targets = [];

    options = options || {};
    this.setOptions(options);

    this._ID = _ID++;
}

/**
 * Decorates the Force with the options object.
 *
 * @method setOptions
 * @param {Object} options The options hash.
 */
Force.prototype.setOptions = function setOptions(options) {
    for (var key in options) this[key] = options[key];
    this.init(options);
};

/**
 * Add a target or targets to the Force.
 *
 * @method addTarget
 * @param {Particle} target The body to begin targetting.
 */
Force.prototype.addTarget = function addTarget(target) {
    this.targets.push(target);
};

/**
 * Remove a target or targets from the Force.
 *
 * @method addTarget
 * @param {Particle} target The body to stop targetting.
 */
Force.prototype.removeTarget = function removeTarget(target) {
    var index = this.targets.indexOf(target);
    if (index < 0) return;
    this.targets.splice(index, 1);
};

/**
 * Method invoked upon instantiation and the setting of options.
 *
 * @method init
 * @param {Object} options The options hash.
 */
Force.prototype.init = function init(options) {};

/**
 * Apply forces on each target.
 *
 * @method update
 * @param {Number} time The current time in the physics engine.
 * @param {Number} dt The physics engine frame delta.
 */
Force.prototype.update = function update(time, dt) {};

module.exports = Force;

},{}],129:[function(require,module,exports){
'use strict';

var Force = require('./Force');
var Vec3 = require('famous-math').Vec3;

var FORCE_REGISTER = new Vec3();

/**
 * Force that pulls all objects in a direction with constant acceleration
 *
 * @class Gravity1D
 * @extends Force
 * @param {Object} options
 */
function Gravity1D(targets, options) {
    Force.call(this, targets, options);
}

Gravity1D.prototype = Object.create(Force.prototype);
Gravity1D.prototype.constructor = Gravity1D;

/**
 * @enum directions
 */
Gravity1D.DOWN     = 0;
Gravity1D.UP       = 1;
Gravity1D.LEFT     = 2;
Gravity1D.RIGHT    = 3;
Gravity1D.FORWARD  = 4;
Gravity1D.BACKWARD = 5;

/**
 * Initialize the Force. Sets defaults if a property was not already set.
 *
 * @method init
 * @param {Object} options The options hash.
 */
Gravity1D.prototype.init = function(options) {
    this.max = this.max || Infinity;
    if (options.acceleration) {
        this.strength = this.acceleration.length();
        this.direction = -1;
        return;
    }
    var acceleration = this.acceleration = new Vec3();
    var direction = this.direction = this.direction || Gravity1D.DOWN;
    var magnitude = this.strength = this.strength || 200;
    switch (direction) {
        case Gravity1D.DOWN:
            acceleration.set(0, magnitude, 0);
            break;
        case Gravity1D.UP:
            acceleration.set(0, -1 * magnitude, 0);
            break;
        case Gravity1D.LEFT:
            acceleration.set(-1 * magnitude, 0, 0);
            break;
        case Gravity1D.RIGHT:
            acceleration.set(magnitude, 0, 0);
            break;
        case Gravity1D.FORWARD:
            acceleration.set(0, 0, -1 * magnitude);
            break;
        case Gravity1D.BACKWARD:
            acceleration.set(0, 0, magnitude);
            break;
        default:
            break;
    }
};

/**
 * Apply the force.
 *
 * @method update
 */
Gravity1D.prototype.update = function() {
    var targets = this.targets;

    var force = FORCE_REGISTER;

    var max = this.max;
    var acceleration = this.acceleration;
    var a = acceleration.length();
    var invA = a ? 1 / a : 0;
    for (var i = 0, len = targets.length; i < len; i++) {
        var target = targets[i];
        var magnitude = a * target.mass;
        Vec3.scale(acceleration, (magnitude > max ? max : magnitude) * invA, force);
        target.applyForce(force);
    }
};

module.exports = Gravity1D;

},{"./Force":128,"famous-math":90}],130:[function(require,module,exports){
'use strict';

var Force = require('./Force');
var Vec3 = require('famous-math').Vec3;

var FORCE_REGISTER = new Vec3();

/**
 * An inverse square force dependent on the masses of the source and targets.
 *
 * @class Gravity3D
 * @extends Force
 * @param {Object} options
 */
function Gravity3D(source, targets, options) {
    this.source = source || null;
    Force.call(this, targets, options);
}

Gravity3D.prototype = Object.create(Force.prototype);
Gravity3D.prototype.constructor = Gravity3D;

/**
 * Initialize the Force. Sets defaults if a property was not already set.
 *
 * @method init
 */
Gravity3D.prototype.init = function() {
    this.max = this.max || Infinity;
    this.strength = this.strength || 200;
};

/**
 * Apply the force.
 *
 * @method update
 */
Gravity3D.prototype.update = function() {
    var source = this.source;
    var targets = this.targets;

    var force = FORCE_REGISTER;

    var strength = this.strength;
    var max = this.max;
    var anchor = this.anchor || source.position;
    var sourceMass = this.anchor ? 1 : source.mass;
    for (var i = 0, len = targets.length; i < len; i++) {
        var target = targets[i];
        Vec3.subtract(anchor, target.position, force);
        var dist = force.length();
        var invDistance = dist ? 1 / dist : 0;
        var magnitude = strength * sourceMass * target.mass * invDistance * invDistance;
        if (magnitude < 0) {
            magnitude = magnitude < -max ? -max : magnitude;
        } else {
            magnitude = magnitude > max ? max : magnitude;
        }
        force.scale(magnitude * invDistance);
        target.applyForce(force);
        if (source) source.applyForce(force.invert());
    }
};

module.exports = Gravity3D;

},{"./Force":128,"famous-math":90}],131:[function(require,module,exports){
'use strict';

var Force = require('./Force');
var Vec3 = require('famous-math').Vec3;

var TORQUE_REGISTER = new Vec3();

/**
 * A behavior that slows angular velocity by applying torque.
 *
 * @class RotationalDrag
 * @extends Force
 * @param {Object} options options to set on drag
 */
function RotationalDrag(targets, options) {
    Force.call(this, targets, options);
}

RotationalDrag.prototype = Object.create(Force.prototype);
RotationalDrag.prototype.constructor = RotationalDrag;

/**
 * Used to scale angular velocity in the computation of the drag torque.
 *
 * @attribute QUADRATIC
 * @type Function
 * @param {Vec3} omega
 * @return {Number}
 */
RotationalDrag.QUADRATIC = function QUADRATIC(omega) {
    return omega.length();
};

/**
 * Used to scale angular velocity in the computation of the drag torque.
 *
 * @attribute LINEAR
 * @type Function
 * @return {Number}
 */
RotationalDrag.LINEAR = function LINEAR() {
    return 1;
};

/**
 * Initialize the Force. Sets defaults if a property was not already set.
 *
 * @method init
 */
RotationalDrag.prototype.init = function init() {
    this.max = this.max || Infinity;
    this.strength = this.strength || 1;
    this.type = this.type || RotationalDrag.LINEAR;
};

/**
 * Adds a rotational drag force to a physics body's torque accumulator.
 *
 * @method update
 */
RotationalDrag.prototype.update = function update() {
    var targets = this.targets;
    var type = this.type;

    var torque = TORQUE_REGISTER;

    var max = this.max;
    var strength = this.strength;
    for (var i = 0, len = targets.length; i < len; i++) {
        var target = targets[i];
        var omega = target.angularVelocity;
        var magnitude = -strength * type(omega);
        Vec3.scale(omega, magnitude < -max ? -max : magnitude, torque);
        target.applyTorque(torque);
    }
};

module.exports = RotationalDrag;

},{"./Force":128,"famous-math":90}],132:[function(require,module,exports){
'use strict';

var Force = require('./Force');
var Quaternion = require('famous-math').Quaternion;
var Vec3 = require('famous-math').Vec3;
var Mat33 = require('famous-math').Mat33;

var Q_REGISTER = new Quaternion();
var DAMPING_REGISTER = new Vec3();
var XYZ_REGISTER = new Vec3();
var MAT_REGISTER = new Mat33();

/** @const PI */
var PI = Math.PI;

/**
 * A spring-like behavior that attempts to enforce a specfic orientation by applying torque.
 *
 * @class RotationalSpring
 * @extends Force
 * @param {Object} options
 */
function RotationalSpring(source, targets, options) {
    this.source = source || null;
    Force.call(this, targets, options);
}

RotationalSpring.prototype = Object.create(Force.prototype);
RotationalSpring.prototype.constructor = RotationalSpring;

/**
 * Initialize the Force. Sets defaults if a property was not already set.
 *
 * @method init
 * @param {Object} options The options hash.
 */
RotationalSpring.prototype.init = function init(options) {
    if (!this.source) this.anchor = this.anchor ? this.anchor.normalize() : new Quaternion(1,0,0,0);
    if (options.stiffness || options.damping) {
        this.stiffness = this.stiffness || 100;
        this.damping = this.damping || 0;
        this.period = null;
        this.dampingRatio = null;
    }
    else if (options.period || options.dampingRatio) {
        this.period = this.period || 1;
        this.dampingRatio = this.dampingRatio || 0;

        this.stiffness = 2 * PI / this.period;
        this.stiffness *= this.stiffness;
        this.damping = 4 * PI * this.dampingRatio / this.period;
    }
};

/**
 * Adds a torque force to a physics body's torque accumulator.
 *
 * @method update
 */
RotationalSpring.prototype.update = function update() {
    var source = this.source;
    var targets = this.targets;

    var deltaQ = Q_REGISTER;
    var dampingTorque = DAMPING_REGISTER;
    var XYZ = XYZ_REGISTER;
    var effInertia = MAT_REGISTER;

    var max = this.max;
    var stiffness = this.stiffness;
    var damping = this.damping;
    var anchor = this.anchor || source.orientation;
    var invSourceInertia = this.anchor ? null : source.inverseInertia;
    for (var i = 0, len = targets.length; i < len; i++) {
        var target = targets[i];
        var q = target.orientation;
        Quaternion.conjugate(q, deltaQ);
        deltaQ.multiply(anchor);

        if (deltaQ.w >= 1) continue;
        var halftheta = Math.acos(deltaQ.w);
        var length = Math.sqrt(1 - deltaQ.w * deltaQ.w);

        var deltaOmega = XYZ.copy(deltaQ).scale(2 * halftheta / length);

        deltaOmega.scale(stiffness);

        if (invSourceInertia !== null) {
            Mat33.add(invSourceInertia, target.inverseInertia, effInertia).inverse();
        } else {
            Mat33.inverse(target.inverseInertia, effInertia);
        }

        if (damping !== 0) {
            if (source) {
                deltaOmega.add(Vec3.subtract(target.angularVelocity, source.angularVelocity, dampingTorque).scale(-damping));
            }
            else {
                deltaOmega.add(Vec3.scale(target.angularVelocity, -damping, dampingTorque));
            }
        }

        var torque = deltaOmega.applyMatrix(effInertia);
        var magnitude = torque.length();

        if (magnitude > max) torque.scale(max/magnitude);

        target.applyTorque(torque);
        if (source) source.applyTorque(torque.invert());
    }
};

module.exports = RotationalSpring;

},{"./Force":128,"famous-math":90}],133:[function(require,module,exports){
'use strict';

var Force = require('./Force');
var Vec3 = require('famous-math').Vec3;

var FORCE_REGISTER = new Vec3();
var DAMPING_REGISTER = new Vec3();

/**
 * A force that accelerates a Particle towards a specific anchor point. Can be anchored to
 * a Vec3 or another source Particle.
 *
 *  @class Spring
 *  @extends Force
 *  @param {Object} options options to set on drag
 */
function Spring(source, targets, options) {
    this.source = source || null;
    Force.call(this, targets, options);
}

Spring.prototype = Object.create(Force.prototype);
Spring.prototype.constructor = Spring;

/** @const */
var PI = Math.PI;

/**
 * A FENE (Finitely Extensible Nonlinear Elastic) spring force
 *      see: http://en.wikipedia.org/wiki/FENE
 * @attribute FENE
 * @type Function
 * @param {Number} dist current distance target is from source body
 * @param {Number} rMax maximum range of influence
 * @return {Number} unscaled force
 */
Spring.FENE = function(dist, rMax) {
    var rMaxSmall = rMax * 0.99;
    var r = Math.max(Math.min(dist, rMaxSmall), -rMaxSmall);
    return r / (1 - r * r/(rMax * rMax));
};

/**
 * A Hookean spring force, linear in the displacement
 *      see: http://en.wikipedia.org/wiki/Hooke's_law
 * @attribute HOOKE
 * @type Function
 * @param {Number} dist current distance target is from source body
 * @return {Number} unscaled force
 */
Spring.HOOKE = function(dist) {
    return dist;
};

/**
 * Initialize the Force. Sets defaults if a property was not already set.
 *
 * @method init
 * @param {Object} options The options hash.
 */
Spring.prototype.init = function(options) {
    this.max = this.max || Infinity;
    this.length = this.length || 0;
    this.type = this.type || Spring.HOOKE;
    this.maxLength = this.maxLength || Infinity;
    if (options.stiffness || options.damping) {
        this.stiffness = this.stiffness || 100;
        this.damping = this.damping || 0;
        this.period = null;
        this.dampingRatio = null;
    }
    else if (options.period || options.dampingRatio) {
        this.period = this.period || 1;
        this.dampingRatio = this.dampingRatio || 0;

        this.stiffness = 2 * PI / this.period;
        this.stiffness *= this.stiffness;
        this.damping = 4 * PI * this.dampingRatio / this.period;
    }
};

/**
 * Apply the force.
 *
 * @method update
 */
Spring.prototype.update = function() {
    var source = this.source;
    var targets = this.targets;

    var force = FORCE_REGISTER;
    var dampingForce = DAMPING_REGISTER;

    var max = this.max;
    var stiffness = this.stiffness;
    var damping = this.damping;
    var restLength = this.length;
    var maxLength = this.maxLength;
    var anchor = this.anchor || source.position;
    var invSourceMass = this.anchor ? 0 : source.inverseMass;
    var type = this.type;

    for (var i = 0, len = targets.length; i < len; i++) {
        var target = targets[i];
        Vec3.subtract(anchor, target.position, force);
        var dist = force.length();
        var stretch = dist - restLength;

        if (Math.abs(stretch) < 1e-6) continue;

        var effMass = 1 / (target.inverseMass + invSourceMass);
        if (this.period !== null) {
            stiffness *= effMass;
            damping *= effMass;
        }

        force.scale(stiffness * type(stretch, maxLength) / stretch);

        if (damping !== 0) {
            if (source) {
                force.add(Vec3.subtract(target.velocity, source.velocity, dampingForce).scale(-damping));
            }
            else {
                force.add(Vec3.scale(target.velocity, -damping, dampingForce));
            }
        }

        var magnitude = force.length();
        var invMag = magnitude ? 1 / magnitude : 0;

        Vec3.scale(force, (magnitude > max ? max : magnitude) * invMag, force);

        target.applyForce(force);
        if (source) source.applyForce(force.invert());
    }
};

module.exports = Spring;

},{"./Force":128,"famous-math":90}],134:[function(require,module,exports){
'use strict';

module.exports = {
    Particle: require('./bodies/Particle'),
    ConvexBodyFactory: require('./bodies/ConvexBodyFactory'),
    Box: require('./bodies/Box'),
    Sphere: require('./bodies/Sphere'),
    Wall: require('./bodies/Wall'),

    Constraint: require('./constraints/Constraint'),
    Angle: require('./constraints/Angle'),
    Collision: require('./constraints/Collision'),
    Direction: require('./constraints/Direction'),
    Distance: require('./constraints/Distance'),
    Curve: require('./constraints/Curve'),
    Hinge: require('./constraints/Hinge'),
    Point2Point: require('./constraints/Point2Point'),

    Force: require('./forces/Force'),
    Drag: require('./forces/Drag'),
    RotationalDrag: require('./forces/RotationalDrag'),
    Gravity1D: require('./forces/Gravity1D'),
    Gravity3D: require('./forces/Gravity3D'),
    Spring: require('./forces/Spring'),
    RotationalSpring: require('./forces/RotationalSpring'),

    PhysicsEngine: require('./PhysicsEngine'),
    Geometry: require('./Geometry')
};

},{"./Geometry":107,"./PhysicsEngine":108,"./bodies/Box":109,"./bodies/ConvexBodyFactory":110,"./bodies/Particle":111,"./bodies/Sphere":112,"./bodies/Wall":113,"./constraints/Angle":114,"./constraints/Collision":115,"./constraints/Constraint":116,"./constraints/Curve":117,"./constraints/Direction":118,"./constraints/Distance":119,"./constraints/Hinge":120,"./constraints/Point2Point":121,"./forces/Drag":127,"./forces/Force":128,"./forces/Gravity1D":129,"./forces/Gravity3D":130,"./forces/RotationalDrag":131,"./forces/RotationalSpring":132,"./forces/Spring":133}],135:[function(require,module,exports){
arguments[4][78][0].apply(exports,arguments)
},{"dup":78}],136:[function(require,module,exports){
arguments[4][79][0].apply(exports,arguments)
},{"./animationFrame":135,"dup":79}],137:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"dup":2}],138:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"./Dispatch":139,"./Node":142,"./Size":143,"dup":3}],139:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],140:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],141:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"./Clock":137,"./Context":138,"dup":6}],142:[function(require,module,exports){
'use strict';

var Transform = require('./Transform');
var Size = require('./Size');

var TRANSFORM_PROCESSOR = new Transform();
var SIZE_PROCESSOR = new Size();

var IDENT = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var ONES = [1, 1, 1];
var QUAT = [0, 0, 0, 1];

/**
 * Nodes define hierarchy and geometrical transformations. They can be moved
 * (translated), scaled and rotated.
 * 
 * A Node is either mounted or unmounted. Unmounted nodes are detached from the
 * scene graph. Unmounted nodes have no parent node, while each mounted node has
 * exactly one parent. Nodes have an arbitary number of children, which can be
 * dynamically added using @{@link addChild}.
 *
 * Each Nodes have an arbitrary number of `components`. Those components can
 * send `draw` commands to the renderer or mutate the node itself, in which case
 * they define behavior in the most explicit way. Components that send `draw`
 * commands aare considered `renderables`. From the node's perspective, there is
 * no distinction between nodes that send draw commands and nodes that define
 * behavior.
 *
 * Because of the fact that Nodes themself are very unopinioted (they don't
 * "render" to anything), they are often being subclassed in order to add e.g.
 * components at initialization to them. Because of this flexibility, they might
 * as well have been called `Entities`.
 *
 * @example
 * // create three detached (unmounted) nodes
 * var parent = new Node();
 * var child1 = new Node();
 * var child2 = new Node();
 *
 * // build an unmounted subtree (parent is still detached)
 * parent.addChild(child1);
 * parent.addChild(child2);
 *
 * // mount parent by adding it to the context
 * var context = Famous.createContext("body");
 * context.addChild(parent);
 *
 * @class Node
 * @constructor
 */
function Node () {
    this._calculatedValues = {
        transform: new Float32Array(IDENT),
        size: new Float32Array(3)
    };

    this._requestingUpdate = false;
    this._inUpdate = false;

    this._updateQueue = [];
    this._nextUpdateQueue = [];

    this._freedComponentIndicies = [];
    this._components = [];

    this._freedChildIndicies = [];
    this._children = [];

    this._parent = null;
    this._globalUpdater = null;

    this.value = new Node.Spec();
}

Node.RELATIVE_SIZE = Size.RELATIVE;
Node.ABSOLUTE_SIZE = Size.ABSOLUTE;
Node.RENDER_SIZE = Size.RENDER;
Node.DEFAULT_SIZE = Size.DEFAULT;

/**
 * A Node spec holds the "data" associated with a Node.
 *
 * @property {String} location path to the node (e.g. "body/0/1")
 * @property {Object} showState
 * @property {Boolean} showState.mounted
 * @property {Boolean} showState.shown
 * @property {Number} showState.opacity
 * @property {Object} offsets
 * @property {Float32Array.<Number>} offsets.mountPoint
 * @property {Float32Array.<Number>} offsets.align
 * @property {Float32Array.<Number>} offsets.origin
 * @property {Object} vectors
 * @property {Float32Array.<Number>} vectors.position
 * @property {Float32Array.<Number>} vectors.rotation
 * @property {Float32Array.<Number>} vectors.scale
 * @property {Object} size
 * @property {Float32Array.<Number>} size.sizeMode
 * @property {Float32Array.<Number>} size.proportional
 * @property {Float32Array.<Number>} size.differential
 * @property {Float32Array.<Number>} size.absolute
 * @property {Float32Array.<Number>} size.render
 */
Node.Spec = function Spec () {
    this.location = null;
    this.showState = {
        mounted: false,
        shown: false,
        opacity: 1
    };
    this.offsets = {
        mountPoint: new Float32Array(3),
        align: new Float32Array(3),
        origin: new Float32Array(3)
    };
    this.vectors = {
        position: new Float32Array(3),
        rotation: new Float32Array(QUAT),
        scale: new Float32Array(ONES)
    };
    this.size = {
        sizeMode: new Float32Array([Size.RELATIVE, Size.RELATIVE, Size.RELATIVE]),
        proportional: new Float32Array(ONES),
        differential: new Float32Array(3),
        absolute: new Float32Array(3),
        render: new Float32Array(3)
    };
    this.UIEvents = [];
};

/**
 * @method getContext
 * @chainable
 *
 * @deprecated Node can be used directly instead!
 * @return {Node} this
 */
Node.prototype.getContext = function getContext () {
    console.warn(
        'Node#getContext is deprecated!\n' +
        'Nodes can be used directly!'
    );
    return this;
};

/**
 * @method getDispatch
 * @chainable
 *
 * @deprecated Node can be used directly instead!
 * @return {Node} this
 */
Node.prototype.getDispatch = function getDispatch () {
    console.warn(
        'Node#getDispatch is deprecated!\n' +
        'Component constructors accept a Node instead!' +
        'Use new Component(node) instead of new Component(node.getDispatch())!'
    );
    return this;
};

/**
 * @method getRenderProxy
 * @chainable
 *
 * @deprecated Node can be used directly instead!
 * @return {Node} this
 */
Node.prototype.getRenderProxy = function getRenderProxy () {
    console.warn(
        'Node#getRenderProxy is deprecated!\n' +
        'RenderProxy functionality has been merged into Node!'
    );
    return this;
};

/**
 * @method getRenderPath
 * @chainable
 *
 * @deprecated Use #getLocation()
 * @return {string} render path
 */
Node.prototype.getRenderPath = function getRenderPath () {
    console.warn(
        'Node#getRenderPath is deprecated!\n' +
        'Use Node#getLocation instead!'
    );
    return this.getLocation();
};

/**
 * @method addRenderable
 * @chainable
 *
 * @deprecated Use addComponent
 * @param {*} component component to be added
 * @return this
 */
Node.prototype.addRenderable = function addRenderable (component) {
    console.warn(
        'Node#addRenderable is deprecated!\n' +
        'use node.addComponent instead'
    );
    this.addComponent(component);
    return this;
};

/**
 * Determine the node's location in the scene graph hierarchy.
 * A location of `body/0/1` can be interpreted as the following scene graph
 * hierarchy (ignoring siblings of ancestors and additional child nodes):
 *
 * `Context:body` -> `Node:0` -> `Node:1`, where `Node:1` is the node the
 * `getLocation` method has been invoked on.
 *
 * @method getLocation
 * 
 * @return {String} location (path), e.g. `body/0/1`
 */
Node.prototype.getLocation = function getLocation () {
    return this.value.location;
};

/**
 * @alias getId
 */
Node.prototype.getId = Node.prototype.getLocation;

/**
 * Dispatches the event on the node by recursively traversing the scene graph
 * upwards.
 *
 * @method emit
 * 
 * @param  {String} event   Event type.
 * @param  {Object} payload Event object to be dispatched.
 */
Node.prototype.emit = function emit (event, payload) {
    var p = this.getParent();
    // the context is its own ancestor
    while (p !== (p = p.getParent()));
    p.getDispatch().dispatch(event, payload);
    return this;
};

// THIS WILL BE DEPRICATED
Node.prototype.sendDrawCommand = function sendDrawCommand (message) {
    this._globalUpdater.message(message);
    return this;
};

/**
 * Recursively serializes the Node, including all previously added components.
 *
 * @method getValue
 * 
 * @return {Object}     Serialized representation of the node, including
 *                      components.
 */
Node.prototype.getValue = function getValue () {
    var numberOfChildren = this._children.length;
    var numberOfComponents = this._components.length;
    var i = 0;

    var value = {
        location: this.value.location,
        spec: this.value,
        components: new Array(numberOfComponents),
        children: new Array(numberOfChildren)
    };

    for (; i < numberOfChildren ; i++)
        value.children[i] = this._children[i].getValue();

    for (i = 0 ; i < numberOfComponents ; i++)
        if (this._components[i].getValue)
            value.components[i] = this._components[i].getValue();

    return value;
};

/**
 * Similar to @{@link getValue}, but returns the actual "computed" value. E.g.
 * a proportional size of 0.5 might resolve into a "computed" size of 200px
 * (assuming the parent has a width of 400px).
 *
 * @method getComputedValue
 * 
 * @return {Object}     Serialized representation of the node, including
 *                      children, excluding components.
 */
Node.prototype.getComputedValue = function getComputedValue () {
    var numberOfChildren = this._children.length;

    var value = {
        location: this.value.location,
        computedValues: this._calculatedValues,
        children: new Array(numberOfChildren)
    };

    for (var i = 0 ; i < numberOfChildren ; i++)
        value.children[i] = this._children[i].getComputedValue();

    return value;
};

/**
 * Retrieves all children of the current node.
 *
 * @method getChildren
 * 
 * @return {Array.<Node>}   An array of children.
 */
Node.prototype.getChildren = function getChildren () {
    return this._children;
};

/**
 * Retrieves the parent of the current node. Unmounted nodes do not have a
 * parent node.
 *
 * @method getParent
 * 
 * @return {Node}       Parent node.
 */
Node.prototype.getParent = function getParent () {
    return this._parent;
};

/**
 * Schedules the @{@link update} function of the node to be invoked on the next
 * frame (if no update during this frame has been scheduled already).
 * If the node is currently being updated (which means one of the requesters
 * invoked requestsUpdate while being updated itself), an update will be
 * scheduled on the next frame.
 *
 * @method requestUpdate
 * 
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 */
Node.prototype.requestUpdate = function requestUpdate (requester) {
    if (this._inUpdate) return this.requestUpdateOnNextTick(requester);
    this._updateQueue.push(requester);
    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Schedules an update on the next tick. Similarily to @{@link requestUpdate},
 * `requestUpdateOnNextTick` schedules the node's `onUpdate` function to be
 * invoked on the frame after the next invocation on the node's onUpdate function.
 *
 * @method requestUpdateOnNextTick
 * 
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 */
Node.prototype.requestUpdateOnNextTick = function requestUpdateOnNextTick (requester) {
    this._nextUpdateQueue.push(requester);
    return this;
};

/**
 * If the context has been created using @{@link Famous.createContext}, the
 * @{@link Famous} singleton will be the global updater.
 *
 * @method getUpdater
 * 
 * @return {Object} The global updater.
 */
Node.prototype.getUpdater = function getUpdater () {
    return this._globalUpdater;
};

/**
 * Checks if the node is mounted. Unmounted nodes are detached from the scene
 * graph.
 *
 * @method isMounted
 * 
 * @return {Boolean}    Boolean indicating weather the node is mounted or not.
 */
Node.prototype.isMounted = function isMounted () {
    return this.value.showState.mounted;
};

/**
 * Checks if the node is visible ("shown").
 *
 * @method isShown
 * 
 * @return {Boolean}    Boolean indicating weather the node is visible
 *                      ("shown") or not.
 */
Node.prototype.isShown = function isShown () {
    return this.value.showState.shown;
};

/**
 * Determines the node's relative opacity.
 * The opacity needs to be within [0, 1], where 0 indicates a completely
 * transparent, therefore invisible node, whereas an opacity of 1 means the
 * node is completely solid.
 *
 * @method getOpacity
 * 
 * @return {Number}         Relative opacity of the node.
 */
Node.prototype.getOpacity = function getOpacity () {
    return this.value.showState.opacity;
};

/**
 * Determines the node's previously set mount point.
 * 
 * @method getMountPoint
 * 
 * @return {Float32Array}   An array representing the mount point.
 */
Node.prototype.getMountPoint = function getMountPoint () {
    return this.value.offsets.mountPoint;
};

/**
 * Determines the node's previously set align.
 * 
 * @method getAlign
 * 
 * @return {Float32Array}   An array representing the align.
 */
Node.prototype.getAlign = function getAlign () {
    return this.value.offsets.align;
};

/**
 * Determines the node's previously set origin.
 * 
 * @method getOrigin
 * 
 * @return {Float32Array}   An array representing the origin.
 */
Node.prototype.getOrigin = function getOrigin () {
    return this.value.offsets.origin;
};

/**
 * Determines the node's previously set position.
 *
 * @method getPosition
 * 
 * @return {Float32Array}   An array representing the position.
 */
Node.prototype.getPosition = function getPosition () {
    return this.value.vectors.position;
};

Node.prototype.getRotation = function getRotation () {
    return this.value.vectors.rotation;
};

Node.prototype.getScale = function getScale () {
    return this.value.vectors.scale;
};

Node.prototype.getSizeMode = function getSizeMode () {
    return this.value.size.sizeMode;
};

Node.prototype.getProportionalSize = function getProportionalSize () {
    return this.value.size.proportional;
};

Node.prototype.getDifferentialSize = function getDifferentialSize () {
    return this.value.size.differential;
};

Node.prototype.getAbsoluteSize = function getAbsoluteSize () {
    return this.value.size.absolute;
};

Node.prototype.getRenderSize = function getRenderSize () {
    return this.value.size.render;
};

Node.prototype.getSize = function getSize () {
    return this._calculatedValues.size;
};

Node.prototype.getTransform = function getTransform () {
    return this._calculatedValues.transform;
};

Node.prototype.getUIEvents = function getUIEvents () {
    return this.value.UIEvents;
};

Node.prototype.addChild = function addChild (child) {
    var index = child ? this._children.indexOf(child) : -1;
    child = child ? child : new Node();

    if (index === -1) {
        index = this._freedChildIndicies.length ? this._freedChildIndicies.pop() : this._children.length;
        this._children[index] = child;

        if (this.isMounted() && child.onMount) {
            var myId = this.getId();
            var childId = myId + '/' + index;
            child.onMount(this, childId);
        }

    }

    return child;
};

Node.prototype.removeChild = function removeChild (child) {
    var index = this._children.indexOf(child);
    var added = index !== -1;
    if (added) {
        this._freedChildIndicies.push(index);

        if (this.isMounted() && child.onDismount)
            child.onDismount();

        this._children[index] = null;
    }
    return added;
};

/**
 * Each component can only be added once per node.
 *
 * @method addComponent
 * 
 * @param {Object} component    An component to be added.
 */
Node.prototype.addComponent = function addComponent (component) {
    var index = this._components.indexOf(component);
    if (index === -1) {
        index = this._freedComponentIndicies.length ? this._freedComponentIndicies.pop() : this._components.length;
        this._components[index] = component;

        if (this.isMounted() && component.onMount)
            component.onMount(this, index);

        if (this.isShown() && component.onShow)
            component.onShow();
    }

    return index;
};

/**
 * Removes a previously via @{@link addComponent} added component.
 *
 * @method removeComponent
 * 
 * @param  {Object} component   An component that has previously been added
 *                              using @{@link addComponent}.
 */
Node.prototype.removeComponent = function removeComponent (component) {
    var index = this._components.indexOf(component);
    if (index !== -1) {
        this._freedComponentIndicies.push(index);
        if (this.isShown() && component.onHide)
            component.onHide();

        if (this.isMounted() && component.onDismount)
            component.onDismount();

        this._components[index] = null;
    }
    return component;
};

Node.prototype.addUIEvent = function addUIEvent (eventName) {
    var UIEvents = this.getUIEvents();
    var components = this._components;
    var component;

    var added = UIEvents.indexOf(eventName) !== -1;
    if (!added) {
        UIEvents.push(eventName);
        for (var i = 0, len = components.length ; i < len ; i++) {
            component = components[i];
            if (component.onAddUIEvent) component.onAddUIEvent(eventName);
        }
    }
    return added;
};

Node.prototype._requestUpdate = function _requestUpdate (force) {
    if (force || (!this._requestingUpdate && this._globalUpdater)) {
        this._globalUpdater.requestUpdate(this);
        this._requestingUpdate = true;
    }
};

Node.prototype._vecOptionalSet = function _vecOptionalSet (vec, index, val) {
    if (val != null && vec[index] !== val) {
        vec[index] = val;
        if (!this._requestingUpdate) this._requestUpdate();
        return true;
    }
    return false;
};

Node.prototype.show = function show () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = true;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onShow) item.onShow();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentShow) item.onParentShow();
    }
    return this;
};

Node.prototype.hide = function hide () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = false;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onHide) item.onHide();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentHide) item.onParentHide();
    }
    return this;
};

Node.prototype.setAlign = function setAlign (x, y, z) {
    var vec3 = this.value.offsets.align;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAlignChange) item.onAlignChange(x, y, z);
        }
    }
    return this;
};

Node.prototype.setMountPoint = function setMountPoint (x, y, z) {
    var vec3 = this.value.offsets.mountPoint;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onMountPointChange) item.onMountPointChange(x, y, z);
        }
    }
    return this;
};

Node.prototype.setOrigin = function setOrigin (x, y, z) {
    var vec3 = this.value.offsets.origin;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOriginChange) item.onOriginChange(x, y, z);
        }
    }
    return this;
};


Node.prototype.setPosition = function setPosition (x, y, z) {
    var vec3 = this.value.vectors.position;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onPositionChange) item.onPositionChange(x, y, z);
        }
    }

    return this;
};

Node.prototype.setRotation = function setRotation (x, y, z, w) {
    var quat = this.value.vectors.rotation;
    var propogate = false;
    var qx, qy, qz, qw;

    if (w != null) {
        qx = x;
        qy = y;
        qz = z;
        qw = w;
    }
    else {
        var hx = x * 0.5;
        var hy = y * 0.5;
        var hz = z * 0.5;

        var sx = Math.sin(hx);
        var sy = Math.sin(hy);
        var sz = Math.sin(hz);
        var cx = Math.cos(hx);
        var cy = Math.cos(hy);
        var cz = Math.cos(hz);

        var sysz = sy * sz;
        var cysz = cy * sz;
        var sycz = sy * cz;
        var cycz = cy * cz;

        qx = sx * cycz + cx * sysz;
        qy = cx * sycz - sx * cysz;
        qz = cx * cysz + sx * sycz;
        qw = cx * cycz - sx * sysz;
    }

    propogate = this._vecOptionalSet(quat, 0, qx) || propogate;
    propogate = this._vecOptionalSet(quat, 1, qy) || propogate;
    propogate = this._vecOptionalSet(quat, 2, qz) || propogate;
    propogate = this._vecOptionalSet(quat, 3, qw) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = quat[0];
        y = quat[1];
        z = quat[2];
        w = quat[3];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onRotationChange) item.onRotationChange(x, y, z, w);
        }
    }
    return this;
};

Node.prototype.setScale = function setScale (x, y, z) {
    var vec3 = this.value.vectors.scale;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onScaleChange) item.onScaleChange(x, y, z);
        }
    }
    return this;
};

Node.prototype.setOpacity = function setOpacity (val) {
    if (val != this.value.showState.opacity) {
        this.value.showState.opacity = val;
        if (!this._requestingUpdate) this._requestUpdate();

        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOpacityChange) item.onOpacityChange(val);
        }
    }
    return this;
};

/**
 * Sets the size mode being used for determining the nodes final width, height
 * and depth.
 * Size modes are a way to define the way the node's size is being calculated.
 * Size modes are enums set on the @{@link Size} constructor (and aliased on
 * the Node).
 *
 * @example
 * node.setSizeMode(Node.RELATIVE_SIZE, Node.ABSOLUTE_SIZE, Node.ABSOLUTE_SIZE);
 * // Instead of null, any proporional height or depth can be passed in, since
 * // it would be ignored in any case.
 * node.setProportionalSize(0.5, null, null);
 * node.setAbsoluteSize(null, 100, 200);
 *
 * @method setSizeMode
 * 
 * @param {SizeMode} x    The size mode being used for determining the size in
 *                        x direction ("width").
 * @param {SizeMode} y    The size mode being used for determining the size in
 *                        y direction ("height").
 * @param {SizeMode} z    The size mode being used for determining the size in
 *                        z direction ("depth").
 */
Node.prototype.setSizeMode = function setSizeMode (x, y, z) {
    var vec3 = this.value.size.sizeMode;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onSizeModeChange) item.onSizeModeChange(x, y, z);
        }
    }
    return this;
};

/**
 * A proportional size defines the node's dimensions relative to its parents
 * final size.
 * Proportional sizes need to be within the range of [0, 1].
 *
 * @method setProportionalSize
 * 
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 */
Node.prototype.setProportionalSize = function setProportionalSize (x, y, z) {
    var vec3 = this.value.size.proportional;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onProportionalSizeChange) item.onProportionalSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Differential sizing can be used to add or subtract an absolute size from a
 * otherwise proportionally sized node.
 * E.g. a differential width of `-10` and a proportional width of `0.5` is
 * being interpreted as setting the node's size to 50% of its parent's width
 * *minus* 10 pixels.
 *
 * @method setDifferentialSize
 * 
 * @param {Number} x    x-Size to be added to the relatively sized node in
 *                      pixels ("width").
 * @param {Number} y    y-Size to be added to the relatively sized node in
 *                      pixels ("height").
 * @param {Number} z    z-Size to be added to the relatively sized node in
 *                      pixels ("depth").
 */
Node.prototype.setDifferentialSize = function setDifferentialSize (x, y, z) {
    var vec3 = this.value.size.differential;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onDifferentialSizeChange) item.onDifferentialSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the nodes size in pixels, independent of its parent.
 *
 * @method setAbsoluteSize
 * 
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 */
Node.prototype.setAbsoluteSize = function setAbsoluteSize (x, y, z) {
    var vec3 = this.value.size.absolute;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAbsoluteSizeChange) item.onAbsoluteSizeChange(x, y, z);
        }
    }
    return this;
};

Node.prototype._transformChanged = function _transformChanged (transform) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onTransformChange) item.onTransformChange(transform);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentTransformChange) item.onParentTransformChange(transform);
    }
};

Node.prototype._sizeChanged = function _sizeChanged (size) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onSizeChange) item.onSizeChange(size);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentSizeChange) item.onParentSizeChange(size);
    }
};

// DEPRICATE
Node.prototype.getFrame = function getFrame () {
    return this._globalUpdater.getFrame();
};

/**
 * Enters the node's update phase while updating its own spec and updating its components.
 *
 * @method update
 * 
 * @param  {Number} time    high-resolution timstamp, usually retrieved using
 *                          requestAnimationFrame
 */
Node.prototype.update = function update (time){
    this._inUpdate = true;
    var nextQueue = this._nextUpdateQueue;
    var queue = this._updateQueue;
    var item;

    while (nextQueue.length) queue.unshift(nextQueue.pop());

    while (queue.length) {
        item = this._components[queue.shift()];
        if (item && item.onUpdate) item.onUpdate(time);
    }

    var mySize = this.getSize();
    var myTransform = this.getTransform();
    var parent = this.getParent();
    var parentSize = parent.getSize();
    var parentTransform = parent.getTransform();
    var sizeChanged = SIZE_PROCESSOR.fromSpecWithParent(parentSize, this.value, mySize);

    var transformChanged = TRANSFORM_PROCESSOR.fromSpecWithParent(parentTransform, this.value, mySize, parentSize, myTransform);
    if (transformChanged) this._transformChanged(myTransform);
    if (sizeChanged) this._sizeChanged(mySize);

    this._inUpdate = false;
    this._requestingUpdate = false;

    if (this._nextUpdateQueue.length) {
        this._globalUpdater.requestUpdateOnNextTick(this);
        this._requestingUpdate = true;
    }
    if (!this.isMounted()) {
        // last update
        this._parent = null;
        this.value.location = null;
        this._globalUpdater = null;
    }
    return this;
};

/**
 * Mounts the node and therefore its subtree by setting it as a child of the
 * passed in parent.
 *
 * @method mount
 * 
 * @param  {Node} parent    parent node
 * @param  {String} myId    path to node (e.g. `body/0/1`)
 */
Node.prototype.mount = function mount (parent, myId) {
    if (this.isMounted()) return;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this._parent = parent;
    this._globalUpdater = parent.getUpdater();
    this.value.location = myId;
    this.value.showState.mounted = true;

    for (; i < len ; i++) {
        item = list[i];
        if (item.onMount) item.onMount(this, i);
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item.onParentMount) item.onParentMount(this, myId, i);
    }

    if (this._requestingUpdate) this._requestUpdate(true);
    return this;
};

/**
 * Dismounts (detaches) the node from the scene graph by removing it as a
 * child of its parent.
 *
 * @method dismount
 */
Node.prototype.dismount = function dismount () {
    if (!this.isMounted()) return;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this.value.showState.mounted = false;

    this._parent.removeChild(this);

    for (; i < len ; i++) {
        item = list[i];
        if (item.onDismount) item.onDismount();
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item.onParentDismount) item.onParentDismount();
    }

    if (!this._requestingUpdate) this._requestUpdate();
    this._globalUpdater = null;
    return this;
};

/**
 * Function to be invoked by the parent as soon as the parent is
 * being mounted.
 *
 * @method onParentMount
 * 
 * @param  {Node} parent        The parent node.
 * @param  {String} parentId    The parent id (path to parent).
 * @param  {Number} index       Id the node should be mounted to.
 */
Node.prototype.onParentMount = function onParentMount (parent, parentId, index) {
    return this.mount(parent, parentId + '/' + index);
};

/**
 * Function to be invoked by the parent as soon as the parent is being
 * unmounted.
 *
 * @method onParentDismount
 */
Node.prototype.onParentDismount = function onParentDismount () {
    return this.dismount();
};

/**
 * Method to be called in order to dispatch an event to the node and all its
 * components. Note that this doesn't recurse the subtree.
 *
 * @method receive
 * 
 * @param  {String} type   The event type (e.g. "click").
 * @param  {Object} ev     The event payload object to be dispatched.
 */
Node.prototype.receive = function receive (type, ev) {
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onReceive) item.onReceive(type, ev);
    }
    return this;
};


Node.prototype._requestUpdateWithoutArgs = function _requestUpdateWithoutArgs () {
    if (!this._requestingUpdate) this._requestUpdate();
};

Node.prototype.onUpdate = Node.prototype.update;

Node.prototype.onParentShow = Node.prototype.show;

Node.prototype.onParentHide = Node.prototype.hide;

Node.prototype.onParentTransformChange = Node.prototype._requestUpdateWithoutArgs;

Node.prototype.onParentSizeChange = Node.prototype._requestUpdateWithoutArgs;

Node.prototype.onShow = Node.prototype.show;

Node.prototype.onHide = Node.prototype.hide;

Node.prototype.onMount = Node.prototype.mount;

Node.prototype.onDismount = Node.prototype.dismount;

Node.prototype.onReceive = Node.prototype.receive;

module.exports = Node;

},{"./Size":143,"./Transform":144}],143:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8}],144:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],145:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"./Clock":137,"./Context":138,"./Dispatch":139,"./Event":140,"./Famous":141,"./Node":142,"./Size":143,"./Transform":144,"dup":10}],146:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],147:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./Mat33":146,"dup":12}],148:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],149:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],150:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"./Mat33":146,"./Quaternion":147,"./Vec2":148,"./Vec3":149,"dup":15}],151:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],152:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],153:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":151,"dup":21}],154:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],155:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":151,"./Easing":152,"./Transitionable":153,"./after":154,"dup":23}],156:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],157:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],158:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":156,"dup":21}],159:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],160:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":156,"./Easing":157,"./Transitionable":158,"./after":159,"dup":23}],161:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],162:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":160}],163:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],164:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],165:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],166:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],167:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],168:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":161,"./Color":162,"./KeyCodes":163,"./MethodStore":164,"./ObjectManager":165,"./clone":166,"./flatClone":167,"./keyValueToArrays":169,"./loadURL":170,"./strip":171,"dup":31}],169:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],170:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],171:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],172:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"./Position":180,"dup":35}],173:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],174:[function(require,module,exports){
arguments[4][37][0].apply(exports,arguments)
},{"dup":37}],175:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38,"famous-utilities":168}],176:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39,"famous-math":150,"famous-utilities":168}],177:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"./Position":180,"dup":40}],178:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"dup":41,"famous-transitions":155}],179:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"./Position":180,"dup":42}],180:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"dup":43,"famous-transitions":155}],181:[function(require,module,exports){
arguments[4][44][0].apply(exports,arguments)
},{"./Position":180,"dup":44}],182:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"./Position":180,"dup":45}],183:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46,"famous-core":145,"famous-transitions":155}],184:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"dup":47,"famous-math":150,"famous-transitions":155}],185:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48,"famous-utilities":168}],186:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"./Align":172,"./Camera":173,"./EventEmitter":174,"./EventHandler":175,"./GestureHandler":176,"./MountPoint":177,"./Opacity":178,"./Origin":179,"./Position":180,"./Rotation":181,"./Scale":182,"./Size":183,"./Transform":184,"./UIEventHandler":185,"dup":49}],187:[function(require,module,exports){
'use strict';

var ElementCache = require('./ElementCache');
var math = require('./Math');
var vendorPrefix = require('./VendorPrefix');
var eventMap = require('./events/EventMap');

var TRANSFORM = vendorPrefix('transform');

/**
 * DOMRenderer is a class responsible for adding elements
 * to the DOM and writing to those elements.
 * there is a DOMRenderer per context, represented as an
 * element and a selector. It is instantiated in the 
 * context class.
 *
 * @class DOMRenderer
 * 
 * @param {HTMLElement} an element.
 * @param {String} the selector of the element.
 * @param {Compositor}
 */
function DOMRenderer (element, selector, compositor) {
    this._compositor = compositor; // a reference to the compositor

    this._target = null; // a register for holding the current
                         // element that the Renderer is operating
                         // upon

    this._parent = null; // a register for holding the parent
                         // of the target

    this._path = null; // a register for holding the path of the target
                       // this register must be set first, and then
                       // children, target, and parent are all looked
                       // up from that.

    this._children = []; // a register for holding the children of the
                         // current target.

    this._root = new ElementCache(element, selector); // the root
                                                      // of the dom tree that this
                                                      // renderer is responsible
                                                      // for

    this._boundTriggerEvent = this._triggerEvent.bind(this);

    this._selector = selector;
    
    this._elements = {};

    this._elements[selector] = this._root;

    this.perspectiveTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._VPtransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    this._eventListeners = {};

    this._size = [null, null];
}

DOMRenderer.prototype.addEventListener = function addEventListener(path, type, properties, preventDefault) {
    if (!this._eventListeners[type]) {
        this._eventListeners[type] = {};
        if (eventMap[type][1]) {
            // Use event delegation
            this._root.element.addEventListener(type, this._boundTriggerEvent);
        } else {
            // Directly link event handler to DOM element
            this._elements[path].element.addEventListener(type, this._boundTriggerEvent);
        }
    }

    this._eventListeners[type][path] = {
        preventDefault: preventDefault
    };
};

DOMRenderer.prototype._triggerEvent = function _triggerEvent(ev) {
    var evPath = ev.path ? ev.path : _getPath(ev);
    for (var i = 0; i < evPath.length; i++) {
        if (!evPath[i].dataset) continue;
        var path = evPath[i].dataset.faPath;
        if (this._eventListeners[ev.type][path]) {

            ev.stopPropagation();
            if (this._eventListeners[ev.type][path].preventDefault) {
                ev.preventDefault();
            }

            var EventConstructor = eventMap[ev.type][0];
            this._compositor.sendEvent(path, ev.type, new EventConstructor(ev));

            break;
        }
    }
};

function _getPath (ev) {
    var path = [];
    var node = ev.target;
    while (node !== document.body) {
        path.push(node);
        node = node.parentNode;
    }
    return path;
}

DOMRenderer.prototype.getSize = function getSize () {
    this._size[0] = this._root.element.offsetWidth;
    this._size[1] = this._root.element.offsetHeight;
    return this._size;
};

DOMRenderer.prototype._getSize = DOMRenderer.prototype.getSize;

DOMRenderer.prototype.draw = function draw (renderState) {
    if (renderState.perspectiveDirty) {
        this.perspectiveDirty = true;

        this.perspectiveTransform[0] = renderState.perspectiveTransform[0];
        this.perspectiveTransform[1] = renderState.perspectiveTransform[1];
        this.perspectiveTransform[2] = renderState.perspectiveTransform[2];
        this.perspectiveTransform[3] = renderState.perspectiveTransform[3];

        this.perspectiveTransform[4] = renderState.perspectiveTransform[4];
        this.perspectiveTransform[5] = renderState.perspectiveTransform[5];
        this.perspectiveTransform[6] = renderState.perspectiveTransform[6];
        this.perspectiveTransform[7] = renderState.perspectiveTransform[7];

        this.perspectiveTransform[8] = renderState.perspectiveTransform[8];
        this.perspectiveTransform[9] = renderState.perspectiveTransform[9];
        this.perspectiveTransform[10] = renderState.perspectiveTransform[10];
        this.perspectiveTransform[11] = renderState.perspectiveTransform[11];

        this.perspectiveTransform[12] = renderState.perspectiveTransform[12];
        this.perspectiveTransform[13] = renderState.perspectiveTransform[13];
        this.perspectiveTransform[14] = renderState.perspectiveTransform[14];
        this.perspectiveTransform[15] = renderState.perspectiveTransform[15];
    }

    if (renderState.viewDirty || renderState.perspectiveDirty) {
        math.multiply(this._VPtransform, this.perspectiveTransform, renderState.viewTransform);
        this._root.element.style[TRANSFORM] = this._stringifyMatrix(this._VPtransform);
    }
};

DOMRenderer.prototype._assertPathLoaded = function _asserPathLoaded () {
    if (!this._path) throw new Error('path not loaded');
};

DOMRenderer.prototype._assertParentLoaded = function _assertParentLoaded () {
    if (!this._parent) throw new Error('parent not loaded');
};

DOMRenderer.prototype._assertChildrenLoaded = function _assertChildrenLoaded () {
    if (!this._children) throw new Error('children not loaded');
};

DOMRenderer.prototype.findParent = function findParent () {
    this._assertPathLoaded();

    var path = this._path;
    var parent;

    while (!parent && path.length) {
        path = path.substring(0, path.lastIndexOf('/'));
        parent = this._elements[path];
    }
    this._parent = parent;
    return parent;
};

DOMRenderer.prototype.findChildren = function findChildren (array) {
    this._assertPathLoaded();
    
    var path = this._path;
    var keys = Object.keys(this._elements);
    var i = 0;
    var len;
    array = array ? array : this._children;

    this._children.length = 0;

    while (i < keys.length) {
        if (keys[i].indexOf(path) === -1 || keys[i] === path) keys.splice(i, 1);
        else i++;
    }
    var currentPath;
    var j = 0;
    for (i = 0 ; i < keys.length ; i++) {
        currentPath = keys[i];
        for (j = 0 ; j < keys.length ; j++) {
            if (i !== j && keys[j].indexOf(currentPath) !== -1) {
                keys.splice(j, 1);
                i--;
            }
        }
    }
    for (i = 0, len = keys.length ; i < len ; i++)
        array[i] = this._elements[keys[i]];

    return array;
};

DOMRenderer.prototype.findTarget = function findTarget () {
    this._target = this._elements[this._path];
    return this._target;
};

DOMRenderer.prototype.loadPath = function loadPath (path) {
    this._path = path;
    return this._path;
};

DOMRenderer.prototype.insertEl = function insertEl (tagName) {
    if (!this._target ||
         this._target.element.tagName.toLowerCase() === tagName.toLowerCase()) {
        
        this.findParent();
        this.findChildren();
        
        this._assertParentLoaded();
        this._assertChildrenLoaded();

        if (this._target) this._parent.element.removeChild(this._target.element);
 
        this._target = new ElementCache(document.createElement(tagName), this._path);
        this._parent.element.appendChild(this._target.element);
        this._elements[this._path] = this._target;
        
        for (var i = 0, len = this._children.length ; i < len ; i++) {
            this._target.element.appendChild(this._children[i].element);
        }
    }
};

DOMRenderer.prototype._assertTargetLoaded = function _assertTargetLoaded () {
    if (!this._target) throw new Error('No target loaded');
};

DOMRenderer.prototype.setProperty = function setProperty (name, value) {
    this._assertTargetLoaded();
    this._target.element.style[name] = value;
};

DOMRenderer.prototype.setSize = function setSize (width, height) {
    this._assertTargetLoaded();
    this._target.element.style.width = (width === true) ? '' : width + 'px';
    this._target.element.style.height = (height === true) ? '' : height + 'px';
};

DOMRenderer.prototype.setAttribute = function setAttribute (name, value) {
    this._assertTargetLoaded();
    this._target.element.setAttribute(name, value);
};

DOMRenderer.prototype.setContent = function setContent (content) {
    this._assertTargetLoaded();
    this.findChildren();

    // TODO Temporary solution
    for (var i = 0 ; i < this._children.length ; i++) {
        this._target.element.removeChild(this._children[i].element);
    }

    this._target.element.innerHTML = content;

    for (var i = 0 ; i < this._children.length ; i++)
        this._target.element.appendChild(this._children[i].element);
};

DOMRenderer.prototype.setMatrix = function setMatrix (transform) { 
    this._assertTargetLoaded();
    this.findParent();
    var worldTransform = this._target.worldTransform;
    var changed = false;

    if (transform)
        for (var i = 0, len = 16 ; i < len ; i++) {
            changed = changed ? changed : worldTransform[i] === transform[i];
            worldTransform[i] = transform[i];
        }
    else changed = true;

    if (changed) {
        math.invert(this._target.invertedParent, this._parent.worldTransform);
        math.multiply(this._target.finalTransform, this._target.invertedParent, worldTransform);

        // TODO: this is a temporary fix for draw commands
        // coming in out of order
        var children = this.findChildren([]);
        var previousPath = this._path;
        var previousTarget = this._target;
        for (var i = 0, len = children.length ; i < len ; i++) {
            this._target = children[i];
            this._path = this._target.path;
            this.setMatrix();
        }
        this._path = previousPath;
        this._target = previousTarget;
    }

    this._target.element.style[TRANSFORM] = this._stringifyMatrix(this._target.finalTransform);
};

DOMRenderer.prototype.addClass = function addClass (domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.add(domClass);
};

DOMRenderer.prototype.removeClass = function removeClass (domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.remove(domClass);
};

DOMRenderer.prototype._stringifyMatrix = function _stringifyMatrix(m) {
    var r = 'matrix3d(';

    r += (m[0] < 0.000001 && m[0] > -0.000001) ? '0,' : m[0] + ',';
    r += (m[1] < 0.000001 && m[1] > -0.000001) ? '0,' : m[1] + ',';
    r += (m[2] < 0.000001 && m[2] > -0.000001) ? '0,' : m[2] + ',';
    r += (m[3] < 0.000001 && m[3] > -0.000001) ? '0,' : m[3] + ',';
    r += (m[4] < 0.000001 && m[4] > -0.000001) ? '0,' : m[4] + ',';
    r += (m[5] < 0.000001 && m[5] > -0.000001) ? '0,' : m[5] + ',';
    r += (m[6] < 0.000001 && m[6] > -0.000001) ? '0,' : m[6] + ',';
    r += (m[7] < 0.000001 && m[7] > -0.000001) ? '0,' : m[7] + ',';
    r += (m[8] < 0.000001 && m[8] > -0.000001) ? '0,' : m[8] + ',';
    r += (m[9] < 0.000001 && m[9] > -0.000001) ? '0,' : m[9] + ',';
    r += (m[10] < 0.000001 && m[10] > -0.000001) ? '0,' : m[10] + ',';
    r += (m[11] < 0.000001 && m[11] > -0.000001) ? '0,' : m[11] + ',';
    r += (m[12] < 0.000001 && m[12] > -0.000001) ? '0,' : m[12] + ',';
    r += (m[13] < 0.000001 && m[13] > -0.000001) ? '0,' : m[13] + ',';
    r += (m[14] < 0.000001 && m[14] > -0.000001) ? '0,' : m[14] + ',';

    r += m[15] + ')';
    return r;
};

module.exports = DOMRenderer;


},{"./ElementCache":188,"./Math":189,"./VendorPrefix":190,"./events/EventMap":193}],188:[function(require,module,exports){
'use strict';

var ident = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

function ElementCache (element, path) {
    this.element = element;
    this.path = path;
    this.worldTransform = new Float32Array(ident);
    this.invertedParent = new Float32Array(ident);
    this.finalTransform = new Float32Array(ident);
    this.postRenderSize = new Float32Array(2);
}

module.exports = ElementCache;


},{}],189:[function(require,module,exports){
'use strict';

function invert (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}

function multiply (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3],
        b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7],
        b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11],
        b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];

    var changed = false;
    var out0, out1, out2, out3;

    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[0] ||
                        out1 === out[1] ||
                        out2 === out[2] ||
                        out3 === out[3];

    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = out3;

    b0 = b4; b1 = b5; b2 = b6; b3 = b7;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[4] ||
                        out1 === out[5] ||
                        out2 === out[6] ||
                        out3 === out[7];

    out[4] = out0;
    out[5] = out1;
    out[6] = out2;
    out[7] = out3;

    b0 = b8; b1 = b9; b2 = b10; b3 = b11;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[8] ||
                        out1 === out[9] ||
                        out2 === out[10] ||
                        out3 === out[11];

    out[8] = out0;
    out[9] = out1;
    out[10] = out2;
    out[11] = out3;

    b0 = b12; b1 = b13; b2 = b14; b3 = b15;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[12] ||
                        out1 === out[13] ||
                        out2 === out[14] ||
                        out3 === out[15];

    out[12] = out0;
    out[13] = out1;
    out[14] = out2;
    out[15] = out3;

    return out;
}

module.exports = {
    multiply: multiply,
    invert: invert
};

},{}],190:[function(require,module,exports){
'use strict';

var PREFIXES = ['', '-ms-', '-webkit-', '-moz-', '-o-'];

/**
 * A helper function for determining if a CSS property
 * has a vendor prefix.
 *
 * @method vendorPrefix
 * @private
 * 
 * @param {String} property
 */
function vendorPrefix(property) {
    for (var i = 0; i < PREFIXES.length; i++) {
        var prefixed = PREFIXES[i] + property;
        if (document.documentElement.style[prefixed] === '') {
            return prefixed;
        }
    }
    return property;
}

module.exports = vendorPrefix;

},{}],191:[function(require,module,exports){
'use strict';

var UIEvent = require('./UIEvent');

function CompositionEvent(ev) {
    // [Constructor(DOMString typeArg, optional CompositionEventInit compositionEventInitDict)]
    // interface CompositionEvent : UIEvent {
    //     readonly    attribute DOMString data;
    // };

    UIEvent.call(this, ev);
    this.data = ev.data;
}

CompositionEvent.prototype = UIEvent.prototype;
CompositionEvent.prototype.constructor = CompositionEvent;

module.exports = CompositionEvent;

},{"./UIEvent":199}],192:[function(require,module,exports){
'use strict';

function Event(ev) {
    // [Constructor(DOMString type, optional EventInit eventInitDict),
    //  Exposed=Window,Worker]
    // interface Event {
    //   readonly attribute DOMString type;
    //   readonly attribute EventTarget? target;
    //   readonly attribute EventTarget? currentTarget;

    //   const unsigned short NONE = 0;
    //   const unsigned short CAPTURING_PHASE = 1;
    //   const unsigned short AT_TARGET = 2;
    //   const unsigned short BUBBLING_PHASE = 3;
    //   readonly attribute unsigned short eventPhase;

    //   void stopPropagation();
    //   void stopImmediatePropagation();

    //   readonly attribute boolean bubbles;
    //   readonly attribute boolean cancelable;
    //   void preventDefault();
    //   readonly attribute boolean defaultPrevented;

    //   [Unforgeable] readonly attribute boolean isTrusted;
    //   readonly attribute DOMTimeStamp timeStamp;

    //   void initEvent(DOMString type, boolean bubbles, boolean cancelable);
    // };

    this.type = ev.type;
    this.defaultPrevented = ev.defaultPrevented;
    this.isTrusted = ev.isTrusted;
    this.timeStamp = ev.timeStamp;
}

Event.prototype.proxy = function proxy (ev) {
    this.prototype.constructor.call(this, ev);
};

module.exports = Event;

},{}],193:[function(require,module,exports){
'use strict';

var CompositionEvent = require('./CompositionEvent');
var Event = require('./Event');
var FocusEvent = require('./FocusEvent');
var InputEvent = require('./InputEvent');
var KeyboardEvent = require('./KeyboardEvent');
var MouseEvent = require('./MouseEvent');
var TouchEvent = require('./TouchEvent');
var UIEvent = require('./UIEvent');
var WheelEvent = require('./WheelEvent');

var EventMap = {
    // UI Events (http://www.w3.org/TR/uievents/)
    'abort': [Event, false],
    'beforeinput': [InputEvent, true],
    'blur': [FocusEvent, false],
    'click': [MouseEvent, true],
    'compositionend': [CompositionEvent, true],
    'compositionstart': [CompositionEvent, true],
    'compositionupdate': [CompositionEvent, true],
    'dblclick': [MouseEvent, true],
    'focus': [FocusEvent, false],
    'focusin': [FocusEvent, true],
    'focusout': [FocusEvent, true],
    'input': [InputEvent, true],
    'keydown': [KeyboardEvent, true],
    'keyup': [KeyboardEvent, true],
    'load': [Event, false],
    'mousedown': [MouseEvent, true],
    'mouseenter': [MouseEvent, false],
    'mouseleave': [MouseEvent, false],

    // bubbles, but will be triggered very frequently
    'mousemove': [MouseEvent, false],

    'mouseout': [MouseEvent, true],
    'mouseover': [MouseEvent, true],
    'mouseup': [MouseEvent, true],
    'resize': [UIEvent, false],

    // might bubble
    'scroll': [UIEvent, false],
    
    'select': [Event, true],
    'unload': [Event, false],
    'wheel': [WheelEvent, true],

    // Touch Events Extension (http://www.w3.org/TR/touch-events-extensions/)
    'touchcancel': [TouchEvent, true],
    'touchend': [TouchEvent, true],
    'touchmove': [TouchEvent, true],
    'touchstart': [TouchEvent, true],
};

module.exports = EventMap;

},{"./CompositionEvent":191,"./Event":192,"./FocusEvent":194,"./InputEvent":195,"./KeyboardEvent":196,"./MouseEvent":197,"./TouchEvent":198,"./UIEvent":199,"./WheelEvent":200}],194:[function(require,module,exports){
'use strict';

var UIEvent = require('./UIEvent');

function FocusEvent(ev) {
    // [Constructor(DOMString typeArg, optional FocusEventInit focusEventInitDict)]
    // interface FocusEvent : UIEvent {
    //     readonly    attribute EventTarget? relatedTarget;
    // };

    UIEvent.call(this, ev);
}

FocusEvent.prototype = UIEvent.prototype;
FocusEvent.prototype.constructor = FocusEvent;

module.exports = FocusEvent;

},{"./UIEvent":199}],195:[function(require,module,exports){
'use strict';

var UIEvent = require('./UIEvent');

function InputEvent(ev) {
    // [Constructor(DOMString typeArg, optional InputEventInit inputEventInitDict)]
    // interface InputEvent : UIEvent {
    //     readonly    attribute DOMString inputType;
    //     readonly    attribute DOMString data;
    //     readonly    attribute boolean   isComposing;
    //     readonly    attribute Range     targetRange;
    // };

    UIEvent.call(this, ev);
    this.inputType = ev.inputType;
    this.data = ev.data;
    this.isComposing = ev.isComposing;
    this.targetRange = ev.targetRange;
}

InputEvent.prototype = UIEvent.prototype;
InputEvent.prototype.constructor = InputEvent;

module.exports = InputEvent;

},{"./UIEvent":199}],196:[function(require,module,exports){
'use strict';

var UIEvent = require('./UIEvent');

function KeyboardEvent(ev) {
    // [Constructor(DOMString typeArg, optional KeyboardEventInit keyboardEventInitDict)]
    // interface KeyboardEvent : UIEvent {
    //     // KeyLocationCode
    //     const unsigned long DOM_KEY_LOCATION_STANDARD = 0x00;
    //     const unsigned long DOM_KEY_LOCATION_LEFT = 0x01;
    //     const unsigned long DOM_KEY_LOCATION_RIGHT = 0x02;
    //     const unsigned long DOM_KEY_LOCATION_NUMPAD = 0x03;
    //     readonly    attribute DOMString     key;
    //     readonly    attribute DOMString     code;
    //     readonly    attribute unsigned long location;
    //     readonly    attribute boolean       ctrlKey;
    //     readonly    attribute boolean       shiftKey;
    //     readonly    attribute boolean       altKey;
    //     readonly    attribute boolean       metaKey;
    //     readonly    attribute boolean       repeat;
    //     readonly    attribute boolean       isComposing;
    //     boolean getModifierState (DOMString keyArg);
    // };
    
    UIEvent.call(this, ev);
    this.DOM_KEY_LOCATION_STANDARD = 0x00;
    this.DOM_KEY_LOCATION_LEFT = 0x01;
    this.DOM_KEY_LOCATION_RIGHT = 0x02;
    this.DOM_KEY_LOCATION_NUMPAD = 0x03;
    this.key = ev.key;
    this.code = ev.code;
    this.location = ev.location;
    this.ctrlKey = ev.ctrlKey;
    this.shiftKey = ev.shiftKey;
    this.altKey = ev.altKey;
    this.metaKey = ev.metaKey;
    this.repeat = ev.repeat;
    this.isComposing = ev.isComposing;
    this.keyArg = ev.keyArg;
}

KeyboardEvent.prototype = UIEvent.prototype;
KeyboardEvent.prototype.constructor = KeyboardEvent;

module.exports = KeyboardEvent;

},{"./UIEvent":199}],197:[function(require,module,exports){
'use strict';

var UIEvent = require('./UIEvent');

function MouseEvent(ev) {
    // [Constructor(DOMString typeArg, optional MouseEventInit mouseEventInitDict)]
    // interface MouseEvent : UIEvent {
    //     readonly    attribute long           screenX;
    //     readonly    attribute long           screenY;
    //     readonly    attribute long           clientX;
    //     readonly    attribute long           clientY;
    //     readonly    attribute boolean        ctrlKey;
    //     readonly    attribute boolean        shiftKey;
    //     readonly    attribute boolean        altKey;
    //     readonly    attribute boolean        metaKey;
    //     readonly    attribute short          button;
    //     readonly    attribute EventTarget?   relatedTarget;
    //     // Introduced in this specification
    //     readonly    attribute unsigned short buttons;
    //     boolean getModifierState (DOMString keyArg);
    // };

    UIEvent.call(this, ev);
    this.screenX = ev.screenX;
    this.screenX = ev.screenX;
    this.screenY = ev.screenY;
    this.clientX = ev.clientX;
    this.clientY = ev.clientY;
    this.ctrlKey = ev.ctrlKey;
    this.shiftKey = ev.shiftKey;
    this.altKey = ev.altKey;
    this.metaKey = ev.metaKey;
    this.button = ev.button;
    this.buttons = ev.buttons;
}

MouseEvent.prototype = UIEvent.prototype;
MouseEvent.prototype.constructor = MouseEvent;

module.exports = MouseEvent;

},{"./UIEvent":199}],198:[function(require,module,exports){
'use strict';

var UIEvent = require('./UIEvent');

function Touch(touch) {
    // interface Touch {
    //     readonly    attribute long        identifier;
    //     readonly    attribute EventTarget target;
    //     readonly    attribute double      screenX;
    //     readonly    attribute double      screenY;
    //     readonly    attribute double      clientX;
    //     readonly    attribute double      clientY;
    //     readonly    attribute double      pageX;
    //     readonly    attribute double      pageY;
    // };
    
    this.identifier = touch.identifier;
    this.target = touch.target;
    this.screenX = touch.screenX;
    this.screenY = touch.screenY;
    this.clientX = touch.clientX;
    this.clientY = touch.clientY;
    this.pageX = touch.pageX;
    this.pageY = touch.pageY;
}

function cloneTouchList(touchList) {
    // interface TouchList {
    //     readonly    attribute unsigned long length;
    //     getter Touch? item (unsigned long index);
    // };
    
    var touchListArray = [];
    for (var i = 0; i < touchList.length; i++) {
        touchListArray[i] = new Touch(touchList[i]);
    }
    return touchListArray;
}

function TouchEvent(ev) {
    // interface TouchEvent : UIEvent {
    //     readonly    attribute TouchList touches;
    //     readonly    attribute TouchList targetTouches;
    //     readonly    attribute TouchList changedTouches;
    //     readonly    attribute boolean   altKey;
    //     readonly    attribute boolean   metaKey;
    //     readonly    attribute boolean   ctrlKey;
    //     readonly    attribute boolean   shiftKey;
    // };

    UIEvent.call(this, ev);
    this.touches = cloneTouchList(ev.touches);
    this.targetTouches = cloneTouchList(ev.targetTouches);
    this.changedTouches = cloneTouchList(ev.changedTouches);
    this.altKey = ev.altKey;
    this.metaKey = ev.metaKey;
    this.ctrlKey = ev.ctrlKey;
    this.shiftKey = ev.shiftKey;
}


TouchEvent.prototype = UIEvent.prototype;
TouchEvent.prototype.constructor = TouchEvent;

module.exports = TouchEvent;

},{"./UIEvent":199}],199:[function(require,module,exports){
'use strict';

var Event = require('./Event');

function UIEvent(ev) {
    // [Constructor(DOMString type, optional UIEventInit eventInitDict)]
    // interface UIEvent : Event {
    //     readonly    attribute Window? view;
    //     readonly    attribute long    detail;
    // };

    Event.call(this, ev);
    this.detail = ev.detail;
}

UIEvent.prototype = Event.prototype;
UIEvent.prototype.constructor = UIEvent;

module.exports = UIEvent;

},{"./Event":192}],200:[function(require,module,exports){
'use strict';

var MouseEvent = require('./MouseEvent');

function WheelEvent(ev) {
    // [Constructor(DOMString typeArg, optional WheelEventInit wheelEventInitDict)]
    // interface WheelEvent : MouseEvent {
    //     // DeltaModeCode
    //     const unsigned long DOM_DELTA_PIXEL = 0x00;
    //     const unsigned long DOM_DELTA_LINE = 0x01;
    //     const unsigned long DOM_DELTA_PAGE = 0x02;
    //     readonly    attribute double        deltaX;
    //     readonly    attribute double        deltaY;
    //     readonly    attribute double        deltaZ;
    //     readonly    attribute unsigned long deltaMode;
    // };

    MouseEvent.call(this, ev);
    this.DOM_DELTA_PIXEL = 0x00;
    this.DOM_DELTA_LINE = 0x01;
    this.DOM_DELTA_PAGE = 0x02;
    this.deltaX = ev.deltaX;
    this.deltaY = ev.deltaY;
    this.deltaZ = ev.deltaZ;
    this.deltaMode = ev.deltaMode;
}

WheelEvent.prototype = MouseEvent.prototype;
WheelEvent.prototype.constructor = WheelEvent;

module.exports = WheelEvent;

},{"./MouseEvent":197}],201:[function(require,module,exports){
'use strict';

module.exports = {
    CompositionEvent: require('./CompositionEvent'),
    Event: require('./Event'),
    EventMap: require('./EventMap'),
    FocusEvent: require('./FocusEvent'),
    InputEvent: require('./InputEvent'),
    KeyboardEvent: require('./KeyboardEvent'),
    MouseEvent: require('./MouseEvent'),
    TouchEvent: require('./TouchEvent'),
    UIEvent: require('./UIEvent'),
    WheelEvent: require('./WheelEvent')
};


},{"./CompositionEvent":191,"./Event":192,"./EventMap":193,"./FocusEvent":194,"./InputEvent":195,"./KeyboardEvent":196,"./MouseEvent":197,"./TouchEvent":198,"./UIEvent":199,"./WheelEvent":200}],202:[function(require,module,exports){
'use strict';

module.exports = {
    DOMRenderer: require('./DOMRenderer'),
    ElementCache: require('./ElementCache'),
    Events: require('./events'),
    Math: require('./Math'),
    VendorPrefix: require('./VendorPrefix')
};

},{"./DOMRenderer":187,"./ElementCache":188,"./Math":189,"./VendorPrefix":190,"./events":201}],203:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],204:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],205:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":203,"dup":21}],206:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],207:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":203,"./Easing":204,"./Transitionable":205,"./after":206,"dup":23}],208:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],209:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":207}],210:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],211:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],212:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],213:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],214:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],215:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":208,"./Color":209,"./KeyCodes":210,"./MethodStore":211,"./ObjectManager":212,"./clone":213,"./flatClone":214,"./keyValueToArrays":216,"./loadURL":217,"./strip":218,"dup":31}],216:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],217:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],218:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],219:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],220:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],221:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":219,"dup":21}],222:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],223:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":219,"./Easing":220,"./Transitionable":221,"./after":222,"dup":23}],224:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],225:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":223}],226:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],227:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],228:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],229:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],230:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],231:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":224,"./Color":225,"./KeyCodes":226,"./MethodStore":227,"./ObjectManager":228,"./clone":229,"./flatClone":230,"./keyValueToArrays":232,"./loadURL":233,"./strip":234,"dup":31}],232:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],233:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],234:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],235:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],236:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./Mat33":235,"dup":12}],237:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],238:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],239:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"./Mat33":235,"./Quaternion":236,"./Vec2":237,"./Vec3":238,"dup":15}],240:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],241:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],242:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":240,"dup":21}],243:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],244:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":240,"./Easing":241,"./Transitionable":242,"./after":243,"dup":23}],245:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],246:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":244}],247:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],248:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],249:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],250:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],251:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],252:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":245,"./Color":246,"./KeyCodes":247,"./MethodStore":248,"./ObjectManager":249,"./clone":250,"./flatClone":251,"./keyValueToArrays":253,"./loadURL":254,"./strip":255,"dup":31}],253:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],254:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],255:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],256:[function(require,module,exports){
'use strict';

var Geometry = require('./Geometry');

/**
 * DynamicGeometry is a component that defines the data that should
 *   be drawn to the webGL canvas. Manages vertex data and attributes.
 *
 * @class DynamicGeometry
 * @constructor
 * 
 * @param {Object} options instantiation options
 */
function DynamicGeometry(options) {
    Geometry.call(this, options);

    this.spec.dynamic = true;
}

/**
 * Returns the number of attribute values used to draw the DynamicGeometry.
 *
 * @class DynamicGeometry
 * @constructor
 * 
 * @return {Object} flattened length of the vertex positions attribute
 * in the geometry.
 */
DynamicGeometry.prototype.getLength = function getLength() {
    return this.getVertexPositions().length;
};

/**
 * Gets the buffer object based on buffer name. Throws error
 * if bufferName is not provided.
 *
 * @method getVertexBuffer
 *
 * @param {String} bufferName Name of vertexBuffer to be retrieved.
 * @return {Object} value of buffer with corresponding bufferName.
 */
DynamicGeometry.prototype.getVertexBuffer = function getVertexBuffer(bufferName) {
    if (! bufferName) throw 'getVertexBuffer requires a name';

    var idx = this.spec.bufferNames.indexOf(bufferName);
    if (idx === -1) throw 'buffer does not exist';
    else {
        return this.spec.bufferValues[idx];
    }
};

/**
 * Sets a vertex buffer with given name to input value. Registers a new 
 * buffer if one does not exist with given name.
 * 
 * @method setVertexBuffer
 * @param {String} bufferName Name of vertexBuffer to be set.
 * @param {Array} value Input data to fill target buffer.
 * @param {Number} size Vector size of input buffer data.
 * @return {Object} current geometry.
 */
DynamicGeometry.prototype.setVertexBuffer = function setVertexBuffer(bufferName, value, size) {
    var idx = this.spec.bufferNames.indexOf(bufferName);

    if (idx === -1) {
        idx = this.spec.bufferNames.push(bufferName) - 1;
    }

    this.spec.bufferValues[idx] = value || [];
    this.spec.bufferSpacings[idx] = size || this.DEFAULT_BUFFER_SIZE;

    if (this.spec.invalidations.indexOf(idx) === -1) {
        this.spec.invalidations.push(idx);
    }

    return this;
};

/**
 * Copies and sets all buffers from another geometry instance.
 *
 * @method fromGeometry
 *
 * @param {Object} geometry Geometry instance to copy buffers from.
 * @return {Object} current geometry.
 */
DynamicGeometry.prototype.fromGeometry = function fromGeometry(geometry) {
    var len = geometry.spec.bufferNames.length;
    for (var i = 0; i < len; i++) {
        this.setVertexBuffer(
            geometry.spec.bufferNames[i],
            geometry.spec.bufferValues[i],
            geometry.spec.bufferSpacings[i]
        );
    }
    return this;
};

/**
 *  Set the positions of the vertices in this geometry.
 * 
 *  @method setVertexPositions
 *  @param {Array} value New value for vertex position buffer
 *  @return {Object} current geometry.
 */
DynamicGeometry.prototype.setVertexPositions = function (value) {
    return this.setVertexBuffer('pos', value, 3);
};

/**
 *  Set the normals on this geometry.
 * 
 *  @method setNormals
 *  @param {Array} value Value to set normal buffer to.
 *  @return {Object} current geometry.
 */
DynamicGeometry.prototype.setNormals = function (value) {
    return this.setVertexBuffer('normals', value, 3);
};

/**
 *  Set the texture coordinates on this geometry.
 * 
 *  @method setTextureCoords
 *  @param {Array} value New value for texture coordinates buffer.
 *  @return {Object} current geometry.
 */
DynamicGeometry.prototype.setTextureCoords = function (value) {
    return this.setVertexBuffer('texCoord', value, 2);
};

/**
 *  Set the texture coordinates on this geometry.
 *  @method setTextureCoords
 *  @param {Array} value New value for index buffer
 *  @return {Object} current geometry.
 */
DynamicGeometry.prototype.setIndices = function (value) {
    return this.setVertexBuffer('indices', value, 1);
};

/**
 *  Set the WebGL drawing primitive for this geometry.
 *  @method setDrawType
 *  @param {String} type New drawing primitive for geometry
 *  @return {Object} current geometry.
 */
DynamicGeometry.prototype.setDrawType = function (value) {
    this.spec.type = value.toUpperCase();
    return this;
};

/**
 * Returns the 'pos' vertex buffer of the geometry.
 * @method getVertexPositions
 * @return {Array} Vertex buffer.
 */
DynamicGeometry.prototype.getVertexPositions = function () {
    return this.getVertexBuffer('pos');
};

/**
 * Returns the 'normal' vertex buffer of the geometry.
 * @method getNormals
 * @return {Array} Vertex Buffer.
 */
DynamicGeometry.prototype.getNormals = function () {
    return this.getVertexBuffer('normals');
};

/**
 * Returns the 'textureCoord' vertex buffer of the geometry.
 * @method getTextureCoords
 * @return {Array} Vertex Buffer.
 */
DynamicGeometry.prototype.getTextureCoords = function () {
    return this.getVertexBuffer('texCoord');
};

module.exports = DynamicGeometry;

},{"./Geometry":257}],257:[function(require,module,exports){
'use strict';

var GeometryIds = 0;

// WebGL drawing primitives map. This is generated in geometry to 
// avoid chrome deoptimizations in WebGLRenderer draw function.
// TODO: return draw type data retreival to WebGLRenderer.

var DRAW_TYPES = {
    POINTS: 0,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6
};

/**
 * Geometry is a component that defines the data that should
 * be drawn to the webGL canvas. Manages vertex data and attributes.
 *
 * @class Geometry
 * @constructor
 * 
 * @param {Object} options Instantiation options.
 */
function Geometry(options) {
    this.id = GeometryIds++;
    this.options = options || {};
    this.DEFAULT_BUFFER_SIZE = 3;

    this.spec = {
        id: this.id,
        dynamic: false,
        type: DRAW_TYPES[(this.options.type ? this.options.type.toUpperCase() : 'TRIANGLES')],
        bufferNames: [],
        bufferValues: [],
        bufferSpacings: [],
        invalidations: []
    };

    if (this.options.buffers) {
        var len = this.options.buffers.length;
        for (var i = 0; i < len;) {
            this.spec.bufferNames.push(this.options.buffers[i].name);
            this.spec.bufferValues.push(this.options.buffers[i].data);
            this.spec.bufferSpacings.push(this.options.buffers[i].size || this.DEFAULT_BUFFER_SIZE);
            this.spec.invalidations.push(i++);
        }
    }
}

module.exports = Geometry;

},{}],258:[function(require,module,exports){
'use strict';

var Vec3 = require('famous-math').Vec3;
var Vec2 = require('famous-math').Vec2;

var outputs = [
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec2(),
    new Vec2()
];

/**
 * A helper object used to calculate buffers for complicated geometries.
 * Tailored for the WebGLRenderer, used by most primitives.
 *
 * @static
 * @class GeometryHelper
 */
var GeometryHelper = {};

/**
 * A function that iterates through vertical and horizontal slices
 * based on input detail, and generates vertices and indices for each
 * subdivision.
 *
 * @static
 * @method generateParametric
 *
 * @param {Number} detailX Amount of slices to iterate through.
 * @param {Number} detailY Amount of stacks to iterate through.
 * @param {Function} func Function used to generate vertex positions at each point.
 * 
 * @return {Object} Object containing generated vertices and indices.
 */
GeometryHelper.generateParametric = function generateParametric(detailX, detailY, func) {
    var vertices = [],
        i, theta, phi, result, j;

    // We must wrap around slightly more than once for uv coordinates to look correct.

    var Xrange = Math.PI + (Math.PI / (detailX - 1));
    var out = [];

    for (i = 0; i < detailX + 1; i++) {
        theta = i * Xrange / detailX;
        for (j = 0; j < detailY; j++) {
            phi = j * 2.0 * Xrange / detailY;
            func(theta, phi, out);
            vertices.push(out[0], out[1], out[2]);
        }
    }

    var indices = [],
        v = 0,
        next;
    for (i = 0; i < detailX; i++) {
        for (j = 0; j < detailY; j++) {
            next = (j + 1) % detailY;
            indices.push(v + j, v + j + detailY, v + next);
            indices.push(v + next, v + j + detailY, v + next + detailY);
        }
        v += detailY;
    }

    return {
        vertices: vertices,
        indices: indices
    };
}

/**
 * Calculates normals belonging to each face of a geometry.  
 * Assumes clockwise declaration of vertices.
 *
 * @static
 * @method computeNormals
 *
 * @param {Array} vertices Vertices of all points on the geometry.
 * @param {Array} indices Indices declaring faces of geometry.
 * @param {Array} out Array to be filled and returned.
 * 
 * @return {Array} Calculated face normals.
 */
GeometryHelper.computeNormals = function computeNormals(vertices, indices, out) {
    var normals = out || [];
    var vertexThree;
    var vertexTwo;
    var vertexOne;
    var indexOne;
    var indexTwo;
    var indexThree;
    var start;
    var end;
    var normal;
    var j;
    var len = indices.length / 3;

    for (var i = 0; i < len; i++) {
        j = i * 3;
        indexTwo = indices[j + 0] * 3;
        indexOne = indices[j + 1] * 3;
        indexThree = indices[j + 2] * 3;

        outputs[0].set(vertices[indexOne], vertices[indexOne + 1], vertices[indexOne + 2]);
        outputs[1].set(vertices[indexTwo], vertices[indexTwo + 1], vertices[indexTwo + 2]);
        outputs[2].set(vertices[indexThree], vertices[indexThree + 1], vertices[indexThree + 2]);

        normal = outputs[2].subtract(outputs[0]).cross(outputs[1].subtract(outputs[0]));
        normal = normal.normalize().toArray();

        normals[indexOne + 0] = normal[0];
        normals[indexOne + 1] = normal[1];
        normals[indexOne + 2] = normal[2];

        normals[indexTwo + 0] = normal[0];
        normals[indexTwo + 1] = normal[1];
        normals[indexTwo + 2] = normal[2];

        normals[indexThree + 0] = normal[0];
        normals[indexThree + 1] = normal[1];
        normals[indexThree + 2] = normal[2];
    }

    return normals;
};

/**
 * Divides all inserted triangles into four sub-triangles. Alters the
 * passed in arrays.
 *
 * @static
 * @method subdivide
 *
 * @param {Array} indices Indices declaring faces of geometry
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} texutureCoords Texture coordinates of all points on the geometry
 * 
 */
GeometryHelper.subdivide = function subdivide(indices, vertices, textureCoords) {
    var triangleIndex = indices.length / 3,
        abc,
        face,
        i, j, k, pos, tex;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);

        pos = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[1], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[1], pos[2], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[2], outputs[0]), 0.5, outputs[1]).toArray());

        if (textureCoords) {
            tex = face.map(function(vertIndex) {
                return new Vec2(textureCoords[vertIndex * 2], textureCoords[vertIndex * 2 + 1]);
            });
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[1], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[1], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
        }

        i = vertices.length - 3, j = i + 1, k = i + 2;
        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex] = k;
        indices[triangleIndex + 1] = j;
        indices[triangleIndex + 2] = face[2];
    }
};

/**
 * Creates duplicate of vertices that are shared between faces.
 * Alters the input vertex and index arrays.
 *
 * @static
 * @method getUniqueFaces
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * 
 */
GeometryHelper.getUniqueFaces = function getUniqueFaces(vertices, indices) {
    var triangleIndex = indices.length / 3,
        registered = [],
        index;

    while (triangleIndex--) {
        for (var i = 0; i < 3; i++) {

            index = indices[triangleIndex * 3 + i];

            if (registered[index]) {
                vertices.push(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
                indices[triangleIndex * 3 + i] = vertices.length / 3 - 1;
            } else {
                registered[index] = true;
            }
        }
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method subdivide
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * 
 */
GeometryHelper.subdivideSpheroid = function subdivideSpheroid(vertices, indices) {
    var triangleIndex = indices.length / 3,
        abc,
        face,
        i, j, k;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);
        abc = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });

        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[1], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[1], abc[2], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[2], outputs[0]), outputs[1]).toArray());

        i = vertices.length / 3 - 3, j = i + 1, k = i + 2;

        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex * 3] = k;
        indices[triangleIndex * 3 + 1] = j;
        indices[triangleIndex * 3 + 2] = face[2];
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method getSpheroidNormals
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normals.
 * 
 * @return {Array} new list of calculated normals.
 */
GeometryHelper.getSpheroidNormals = function getSpheroidNormals(vertices, out) {
    var out = out || [];
    var length = vertices.length / 3;
    var normalized;

    for(var i = 0; i < length; i++) {
        normalized = new Vec3(
            vertices[i * 3 + 0],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        ).normalize().toArray();

        out[i * 3 + 0] = normalized[0];
        out[i * 3 + 1] = normalized[1];
        out[i * 3 + 2] = normalized[2];
    }

    return out;
};

/**
 * Calculates texture coordinates for spheroid primitives based on
 * input vertices.
 *
 * @static
 * @method getSpheroidUV
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting texture coordinates.
 * 
 * @return {Array} new list of calculated texture coordinates
 */
GeometryHelper.getSpheroidUV = function getSpheroidUV(vertices, out) {
    var out = out || [];
    var length = vertices.length / 3;
    var vertex;

    var uv = [];

    for(var i = 0; i < length; i++) {
        vertex = outputs[0].set(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        )
        .normalize()
        .toArray();

        uv[0] = this.getAzimuth(vertex) * 0.5 / Math.PI + 0.5;
        uv[1] = this.getAltitude(vertex) / Math.PI + 0.5;

        out.push.apply(out, uv);
    }

    return out;
};

/**
 * Iterates through and normalizes a list of vertices.
 *
 * @static
 * @method normalizeAll
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normalized vectors.
 * 
 * @return {Array} new list of normalized vertices
 */
GeometryHelper.normalizeAll = function normalizeAll(vertices, out) {
    var out = out || [];
    var vertex;
    var len = vertices.length / 3;

    for (var i = 0; i < len; i++) {
        Array.prototype.push.apply(out, new Vec3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]).normalize().toArray());
    }

    return out;
};

/**
 * Normalizes a set of vertices to model space.
 *
 * @static
 * @method normalizeVertices
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with model space position vectors.
 * 
 * @return {Array} Output vertices.
 */
GeometryHelper.normalizeVertices = function normalizeVertices(vertices, out) {
    var out = out || [];
    var len = vertices.length / 3;
    var vectors = [];
    var minX;
    var maxX;
    var minY;
    var maxY;
    var minZ;
    var maxZ;
    var v;

    for (var i = 0; i < len; i++) {
        v = vectors[i] = new Vec3(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        );

        if (minX == null || v.x < minX) minX = v.x;
        if (maxX == null || v.x > maxX) maxX = v.x;

        if (minY == null || v.y < minY) minY = v.y;
        if (maxY == null || v.y > maxY) maxY = v.y;

        if (minZ == null || v.z < minZ) minZ = v.z;
        if (maxZ == null || v.z > maxZ) maxZ = v.z;
    };

    var translation = new Vec3(
        getTranslationFactor(maxX, minX),
        getTranslationFactor(maxY, minY),
        getTranslationFactor(maxZ, minZ)
    );

    var scale = Math.min(
        getScaleFactor(maxX + translation.x, minX + translation.x),
        getScaleFactor(maxY + translation.y, minY + translation.y),
        getScaleFactor(maxZ + translation.z, minZ + translation.z)
    );

    for (var i = 0; i < vectors.length; i++) {
        out.push.apply(out, vectors[i].add(translation).scale(scale).toArray());
    }

    return out;
};

/**
 * Determines translation amount for a given axis to normalize model coordinates.
 *
 * @method getTranslationFactor
 * @private
 *
 * @param {Number} max Maximum position value of given axis on the model.
 * @param {Number} min Minimum position value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be translated for all vertices.
 */
function getTranslationFactor(max, min) {
    return -(min + (max - min) / 2);
}

/**
 * Determines scale amount for a given axis to normalize model coordinates.
 *
 * @method getScaleFactor
 * @private
 *
 * @param {Number} max Maximum scale value of given axis on the model.
 * @param {Number} min Minimum scale value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be scaled for all vertices.
 */
function getScaleFactor(max, min) {
    return 1 / ((max - min) / 2);
}

/**
 * Finds the azimuth, or angle above the XY plane, of a given vector.
 *
 * @static
 * @method getAzimuth
 *
 * @param {Array} v Vertex to retreive azimuth from.
 * 
 * @return {Number} Azimuth value in radians. 
 */
GeometryHelper.getAzimuth = function azimuth(v) {
    return Math.atan2(v[2], -v[0]);
};

/**
 * Finds the altitude, or angle above the XZ plane, of a given vector.
 *
 * @static
 * @method getAltitude
 *
 * @param {Array} v Vertex to retreive altitude from.
 * 
 * @return {Number} Altitude value in radians. 
 */
GeometryHelper.getAltitude = function altitude(v) {
    return Math.atan2(-v[1], Math.sqrt((v[0] * v[0]) + (v[2] * v[2])));
};

/**
 * Converts a list of indices from 'triangle' to 'line' format.
 *
 * @static
 * @method trianglesToLines
 *
 * @param {Array} indices Indices of all faces on the geometry
 * 
 * @return {Array} new list of line-formatted indices
 */
GeometryHelper.trianglesToLines = function triangleToLines(indices, out) {
    var numVectors = indices.length / 3;
    var out = [];
    var face;
    var j;
    var i;

    for (i = 0; i < numVectors; i++) {
        out.push(indices[i + 0], indices[i + 1]);
        out.push(indices[i + 1], indices[i + 2]);
        out.push(indices[i + 2], indices[i + 0]);
    }

    return out;
};

module.exports = GeometryHelper;

},{"famous-math":239}],259:[function(require,module,exports){
var loadURL        = require('famous-utilities').loadURL;
var GeometryHelper = require('./GeometryHelper');

/*
 * A singleton object that takes that makes requests
 * for OBJ files and returns the formatted data as
 * an argument to a callback function.
 *
 * @static
 * @class OBJLoader
 */

var OBJLoader = {
    cached: {},
    requests: {}
};

/*
 * Takes a path to desired obj file and makes an XMLHttp request
 * if the resource is not cached. Sets up the 'onresponse' function
 * as a callback for formatting and callback invocation.
 *
 * @method load
 *
 * @param {String} url URL of desired obj
 * @param {Function} cb Function to be fired upon successful formatting of obj
 * @param {Object} options Options hash to that can affect the output of the OBJ
 * vertices.
 */
OBJLoader.load = function load(url, cb, options) {
    if (! this.cached[url]) {
        if(! this.requests[url]) {
            this.requests[url] = [cb];
            loadURL(
                url,
                this._onsuccess.bind(
                    this,
                    url,
                    options
                )
            );
        } else {
            this.requests[url].push(cb);
        }
    } else {
        cb(this.cached[url]);
    }
};

/*
 * Fired on response from server for OBJ asset.  Formats the
 * returned string and stores the buffer data in cache.
 * Invokes all queued callbacks before clearing them.
 *
 * @method _onsuccess
 * @private
 *
 * @param {String} URL of requested obj
 * @param {Boolean} value determining whether or not to manually calculate normals
 * @param {String} content of the server response
 */
OBJLoader._onsuccess = function _onsuccess(url, options, text) {
    var buffers = format.call(this, text, options || {});
    this.cached[url] = buffers;

    for (var i = 0; i < this.requests[url].length; i++) {
        this.requests[url][i](buffers);
    }

    this.requests[url] = null;
};

/*
 * Takes raw string format of obj and converts it to a javascript
 * object representing the buffers needed to draw the geometry.
 *
 * @method format
 * @private
 *
 * @param {String} raw obj data in text format
 * @param {Boolean} value determining whether or not to manually calculate normals
 *
 * @return {Object} vertex buffer data
 */
function format(text, options) {
    var text = sanitize(text);

    var lines = text.split('\n');

    var faceTexCoords = [];
    var faceVertices = [];
    var faceNormals = [];

    var normals = [];
    var texCoords = [];
    var vertices = [];

    var i1, i2, i3, i4;
    var split;
    var line;

    var length = lines.length;

    for (var i = 0; i < length; i++) {
        line = lines[i];
        split = lines[i].split(' ');

        // Handle vertex positions

        if (line.indexOf('v ') !== -1) {
            vertices.push([
                parseFloat(split[1]),
                parseFloat(split[2]),
                parseFloat(split[3])
            ]);
        }

        // Handle texture coordinates

        else if(line.indexOf('vt ') !== -1) {
            texCoords.push([
                parseFloat(split[1]),
                parseFloat(split[2])
            ]);
        }

        // Handle vertex normals

        else if (line.indexOf('vn ') !== -1) {
            normals.push([
                parseFloat(split[1]),
                parseFloat(split[2]),
                parseFloat(split[3])
            ]);
        }

        // Handle face

        else if (line.indexOf('f ') !== -1) {

            // Vertex, Normal

            if (split[1].indexOf('//') !== -1) {
                i1 = split[1].split('//');
                i2 = split[2].split('//');
                i3 = split[3].split('//');

                faceVertices.push([
                    parseFloat(i1[0]) - 1,
                    parseFloat(i2[0]) - 1,
                    parseFloat(i3[0]) - 1
                ]);
                faceNormals.push([
                    parseFloat(i1[1]) - 1,
                    parseFloat(i2[1]) - 1,
                    parseFloat(i3[1]) - 1
                ]);

                // Handle quad

                if (split[4]) {
                    i4 = split[4].split('//');
                    faceVertices.push([
                        parseFloat(i1[0]) - 1,
                        parseFloat(i3[0]) - 1,
                        parseFloat(i4[0]) - 1
                    ]);
                    faceNormals.push([
                        parseFloat(i1[2]) - 1,
                        parseFloat(i3[2]) - 1,
                        parseFloat(i4[2]) - 1
                    ]);
                }
            }

            // Vertex, TexCoord, Normal

            else if (split[1].indexOf('/') !== -1) {
                i1 = split[1].split('/');
                i2 = split[2].split('/');
                i3 = split[3].split('/');

                faceVertices.push([
                    parseFloat(i1[0]) - 1,
                    parseFloat(i2[0]) - 1,
                    parseFloat(i3[0]) - 1
                ]);
                faceTexCoords.push([
                    parseFloat(i1[1]) - 1,
                    parseFloat(i2[1]) - 1,
                    parseFloat(i3[1]) - 1
                ]);
                faceNormals.push([
                    parseFloat(i1[2]) - 1,
                    parseFloat(i2[2]) - 1,
                    parseFloat(i3[2]) - 1
                ]);

                // Handle Quad

                if (split[4]) {
                    i4 = split[4].split('/');

                    faceVertices.push([
                        parseFloat(i1[0]) - 1,
                        parseFloat(i3[0]) - 1,
                        parseFloat(i4[0]) - 1
                    ]);
                    faceTexCoords.push([
                        parseFloat(i1[1]) - 1,
                        parseFloat(i3[1]) - 1,
                        parseFloat(i4[1]) - 1
                    ]);
                    faceNormals.push([
                        parseFloat(i1[2]) - 1,
                        parseFloat(i3[2]) - 1,
                        parseFloat(i4[2]) - 1
                    ]);
                }
            }

            // Vertex

            else {
                faceVertices.push([
                    parseFloat(split[1]) - 1,
                    parseFloat(split[2]) - 1,
                    parseFloat(split[3]) - 1
                ]);
                faceTexCoords.push([
                    parseFloat(split[1]) - 1,
                    parseFloat(split[2]) - 1,
                    parseFloat(split[3]) - 1
                ]);
                faceNormals.push([
                    parseFloat(split[1]) - 1,
                    parseFloat(split[2]) - 1,
                    parseFloat(split[3]) - 1
                ]);

                // Handle Quad

                if (split[4]) {
                    faceVertices.push([
                        parseFloat(split[1]) - 1,
                        parseFloat(split[3]) - 1,
                        parseFloat(split[4]) - 1
                    ]);
                    faceTexCoords.push([
                        parseFloat(split[1]) - 1,
                        parseFloat(split[3]) - 1,
                        parseFloat(split[4]) - 1
                    ]);
                    faceNormals.push([
                        parseFloat(split[1]) - 1,
                        parseFloat(split[3]) - 1,
                        parseFloat(split[4]) - 1
                    ]);
                }
            }
        }
    }

    var cached = cacheVertices(
        vertices,
        normals,
        texCoords,
        faceVertices,
        faceNormals,
        faceTexCoords
    );


    cached.vertices = flatten(cached.vertices);
    cached.normals = flatten(cached.normals);
    cached.texCoords = flatten(cached.texCoords);
    cached.indices = flatten(cached.indices);

    if (options.normalize) {
        cached.vertices = GeometryHelper.normalizeVertices(
            cached.vertices
        );
    }

    if (options.computeNormals) {
        cached.normals = GeometryHelper.computeNormals(
            cached.vertices,
            cached.indices
        );
    }

    return {
        vertices: cached.vertices,
        normals: cached.normals,
        textureCoords: cached.texCoords,
        indices: cached.indices
    };
};

/*
 * Replaces all double spaces with single spaces and removes
 * all trailing spaces from lines of a given string.
 *
 * @method sanitize
 * @private
 *
 * @param {String} text String to be sanitized.
 *
 * @return {String} sanitized string.
 */
function sanitize(text) {
    return text.replace(/ +(?= )/g,'').replace(/\s+$/g, '');
}

/*
 * Takes a given pool of attributes and face definitions
 * and removes all duplicate vertices.
 *
 * @method cacheVertices
 * @private
 *
 * @param {Array} v Pool of vertices used in face declarations.
 * @param {Array} n Pool of normals used in face declarations.
 * @param {Array} t Pool of textureCoords used in face declarations.
 * @param {Array} fv Vertex positions at each face in the OBJ.
 * @param {Array} fn Normals at each face in the OBJ.
 * @param {Array} ft Texture coordinates at each face in the OBJ.
 *
 * @return {Object} Object containing the vertices, textureCoordinates and
 * normals of the OBJ.
 */
function cacheVertices(v, n, t, fv, fn, ft) {
    var outNormals = [];
    var outPos = [];
    var outTexCoord = [];
    var outIndices = [];

    var vertexCache = {};

    var positionIndex;
    var normalIndex;
    var texCoordIndex;

    var currentIndex = 0;
    var fvLength = fv.length;
    var fnLength = fn.length;
    var ftLength = ft.length;
    var faceLength;
    var index;

    for (var i = 0; i < fvLength; i++) {
        outIndices[i] = [];
        faceLength = fv[i].length;

        for (var j = 0; j < faceLength; j++) {
            if (ftLength) texCoordIndex = ft[i][j];
            if (fnLength) normalIndex   = fn[i][j];
                          positionIndex = fv[i][j];

            index = vertexCache[positionIndex + ',' + normalIndex + ',' + texCoordIndex];

            if(index === undefined) {
                index = currentIndex++;

                              outPos.push(v[positionIndex]);
                if (fnLength) outNormals.push(n[normalIndex]);
                if (ftLength) outTexCoord.push(t[texCoordIndex]);

                vertexCache[positionIndex + ',' + normalIndex + ',' + texCoordIndex] = index;
            }

            outIndices[i].push(index);
        }
    }

    return {
        vertices: outPos,
        normals: outNormals,
        texCoords: outTexCoord,
        indices: outIndices
    }
}

/*
 * Flattens an array of arrays. Not recursive. Assumes
 * all children are arrays.
 *
 * @method flatten
 * @private
 *
 * @param {Array} arr Input array to be flattened.
 *
 * @return {Array} Flattened version of input array.
 */
function flatten(arr) {
    var len = arr.length;
    var out = [];

    for (var i = 0; i < len; i++) {
        out.push.apply(out, arr[i]);
    }

    return out;
}

module.exports = OBJLoader;

},{"./GeometryHelper":258,"famous-utilities":252}],260:[function(require,module,exports){
'use strict';

module.exports = {
    Box: require('./primitives/Box'),
    Circle: require('./primitives/Circle'),
    Cylinder: require('./primitives/Cylinder'),
    GeodesicSphere: require('./primitives/GeodesicSphere'),
    Icosahedron: require('./primitives/Icosahedron'),
    ParametricCone: require('./primitives/ParametricCone'),
    Plane: require('./primitives/Plane'),
    Sphere: require('./primitives/Sphere'),
    Tetrahedron: require('./primitives/Tetrahedron'),
    Torus: require('./primitives/Torus'),
    Triangle: require('./primitives/Triangle'),
    GeometryHelper: require('./GeometryHelper'),
    DynamicGeometry: require('./DynamicGeometry'),
    Geometry: require('./Geometry'),
    OBJLoader: require('./OBJLoader'),
};
},{"./DynamicGeometry":256,"./Geometry":257,"./GeometryHelper":258,"./OBJLoader":259,"./primitives/Box":261,"./primitives/Circle":262,"./primitives/Cylinder":263,"./primitives/GeodesicSphere":264,"./primitives/Icosahedron":265,"./primitives/ParametricCone":266,"./primitives/Plane":267,"./primitives/Sphere":268,"./primitives/Tetrahedron":269,"./primitives/Torus":270,"./primitives/Triangle":271}],261:[function(require,module,exports){
'use strict';

var Geometry = require('../Geometry');

function pickOctant(i) {
    return [(i & 1) * 2 - 1, (i & 2) - 1, (i & 4) / 2 - 1];
}

var boxData = [
    [0, 4, 2, 6, -1, 0, 0], 
    [1, 3, 5, 7, +1, 0, 0],
    [0, 1, 4, 5, 0, -1, 0],
    [2, 6, 3, 7, 0, +1, 0],
    [0, 2, 1, 3, 0, 0, -1],
    [4, 5, 6, 7, 0, 0, +1]
];

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class BoxGeometry
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function BoxGeometry(options) {
    var options = options || {};

    var vertices      = [];
    var textureCoords = [];
    var normals       = [];
    var indices       = [];

    var data;
    var d;
    var v;
    var i;
    var j;

    for (i = 0; i < boxData.length; i++) {
        data = boxData[i], v = i * 4;
        for (j = 0; j < 4; j++) {
            d = data[j];
            var octant = pickOctant(d);
            vertices.push(octant[0], octant[1], octant[2]);
            textureCoords.push(j & 1, (j & 2) / 2);
            normals.push(data[4], data[5], data[6]);
        }
        indices.push(v, v + 1, v + 2);
        indices.push(v + 2, v + 1, v + 3);
    }

    return new Geometry({
        buffers: [
            { name: 'pos', data: vertices },
            { name: 'texCoord', data: textureCoords, size: 2 },
            { name: 'normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
};

module.exports = BoxGeometry;

},{"../Geometry":257}],262:[function(require,module,exports){
'use strict';

var Geometry       = require('../Geometry');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Circle
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function Circle (options) {
    var options  = options || {};
    var detail   = options.detail || 30;
    var buffers  = getBuffers(detail);

    return new Geometry({
        type: 'TRIANGLE_FAN',
        buffers: [
            { name: 'pos', data: buffers.vertices },
            { name: 'texCoord', data: buffers.textureCoords, size: 2 },
            { name: 'normals', data: buffers.normals }
        ]
    });
}
    
/**
 * Calculates and returns all vertex positions, texture
 * coordinates and normals of the circle primitive.
 *
 * @method getBuffers
 *
 * @param {Number} detail Amount of detail that determines how many
 * vertices are created and where they are placed
 * 
 * @return {Object} constructed geometry
 */
function getBuffers(detail) {
    var theta = 0;
    var x;
    var y;
    var index = detail + 1;
    var nextTheta;
    var vertices      = [0, 0, 0];
    var normals       = [0, 0, 1];
    var textureCoords = [0.5, 0.5];

    while (index--) {
        theta = index / detail * Math.PI * 2;

        x = Math.cos(theta), y = Math.sin(theta);
        vertices.unshift(x, y, 0);
        normals.unshift(0, 0, 1);
        textureCoords.unshift(0.5 + x * 0.5, 0.5 + -y * 0.5);
    }

    return {
        vertices: vertices,
        normals: normals,
        textureCoords: textureCoords
    };
}

module.exports = Circle;

},{"../Geometry":257}],263:[function(require,module,exports){
'use strict';

var Geometry       = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This class creates a new geometry instance and sets
 * its vertex positions, texture coordinates, normals,
 * and indices to based on the primitive.
 *
 * @class Cylinder
 * @constructor
 * 
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 *
 * @return {Object} constructed geometry
 */
function Cylinder (options) {
    var options  = options || {};
    var radius   = options.radius || 1;
    var detail   = options.detail || 15;
    var buffers;

    buffers = GeometryHelper.generateParametric(
        1,
        detail,
        Cylinder.generator.bind(null, radius)
    );

    return new Geometry({
        buffers: [
            { name: 'pos', data: buffers.vertices },
            { name: 'texCoord', data: GeometryHelper.getSpheroidUV(buffers.vertices), size: 2 },
            { name: 'normals', data: GeometryHelper.computeNormals(buffers.vertices, buffers.indices) },
            { name: 'indices', data: buffers.indices, size: 1 }
        ]
    });
}

/**
 * Function used in iterative construction of parametric primitive.
 *
 * @static
 * @method generator
 * @param {Number} r Cylinder radius.
 * @param {Number} u Longitudal progress from 0 to PI.
 * @param {Number} v Latitudal progress from 0 to PI.
 *
 * @return {Array} x, y and z coordinate of geometry.
 */
Cylinder.generator = function generator(r, u, v, pos) {
    pos[0] = r * Math.cos(v);
    pos[1] = r * (-1 + u / Math.PI * 2);
    pos[2] = r * Math.sin(v);
}

module.exports = Cylinder;

},{"../Geometry":257,"../GeometryHelper":258}],264:[function(require,module,exports){
'use strict';

var Geometry       = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class GeodesicSphere
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function GeodesicSphere (options) {
    var t = (1 + Math.sqrt(5)) * 0.5;

    var vertices = [
        - 1,  t,  0,    1,  t,  0,   - 1, - t,  0,    1, - t,  0,
         0, - 1, -t,    0,  1, -t,    0, - 1,   t,    0,  1,   t,
         t,  0,   1,    t,  0, -1,   - t,  0,   1,   - t,  0, -1
    ];
    var indices = [
        0,  5, 11,    0,  1,  5,    0,  7,  1,    0, 10,  7,    0, 11, 10,
        1,  9,  5,    5,  4, 11,    11, 2, 10,   10,  6,  7,    7,  8,  1,
        3,  4,  9,    3,  2,  4,    3,  6,  2,    3,  8,  6,    3,  9,  8,
        4,  5,  9,    2, 11,  4,    6, 10,  2,    8,  7,  6,    9,  1,  8
    ];

    vertices = GeometryHelper.normalizeAll(vertices);

    var options = options || {};
    var detail  = options.detail || 3;

    while(--detail) GeometryHelper.subdivideSpheroid(vertices, indices);
    GeometryHelper.getUniqueFaces(vertices, indices);

    var normals       = GeometryHelper.computeNormals(vertices, indices);
    var textureCoords = GeometryHelper.getSpheroidUV(vertices);

    return new Geometry({
        buffers: [
            { name: 'pos', data: vertices },
            { name: 'texCoord', data: textureCoords, size: 2 },
            { name: 'normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
}

module.exports = GeodesicSphere;

},{"../Geometry":257,"../GeometryHelper":258}],265:[function(require,module,exports){
'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Icosahedron
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function Icosahedron() {
    var t = ( 1 + Math.sqrt( 5 ) ) / 2;

    var geometry;
    var detail;
    var vertices = [
        - 1,   t,  0,    1,  t,  0,   - 1, - t,  0,    1, - t,  0,
          0, - 1, -t,    0,  1, -t,     0, - 1,  t,    0,   1,  t,
          t,   0,  1,    t,  0, -1,   - t,   0,  1,  - t,   0, -1
    ];
    var indices = [
        0,  5, 11,    0,  1,  5,    0,  7,  1,    0, 10,  7,    0, 11, 10,
        1,  9,  5,    5,  4, 11,    11, 2, 10,   10,  6,  7,    7,  8,  1,
        3,  4,  9,    3,  2,  4,    3,  6,  2,    3,  8,  6,    3,  9,  8,
        4,  5,  9,    2, 11,  4,    6, 10,  2,    8,  7,  6,    9,  1,  8
    ];

    GeometryHelper.getUniqueFaces(vertices, indices);

    var normals       = GeometryHelper.computeNormals(vertices, indices);
    var textureCoords = GeometryHelper.getSpheroidUV(vertices);

    vertices      = GeometryHelper.normalizeAll(vertices);

    return new Geometry({
        buffers: [
            { name: 'pos', data: vertices },
            { name: 'texCoord', data: textureCoords, size: 2 },
            { name: 'normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
}

module.exports = Icosahedron;

},{"../Geometry":257,"../GeometryHelper":258}],266:[function(require,module,exports){
'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class ParametricCone
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function ParametricCone (options) {
    var options  = options || {};
    var detail   = options.detail || 15;
    var radius   = options.radius || 1 / Math.PI;

    var buffers = GeometryHelper.generateParametric(
        detail,
        detail,
        ParametricCone.generator.bind(null, radius)
    );

    return new Geometry({
        buffers: [
            { name: 'pos', data: buffers.vertices },
            { name: 'texCoord', data: GeometryHelper.getSpheroidUV(buffers.vertices), size: 2 },
            { name: 'normals', data: GeometryHelper.computeNormals(buffers.vertices, buffers.indices) },
            { name: 'indices', data: buffers.indices, size: 1 }
        ]
    });
}

/**
 * function used in iterative construction of parametric primitive.
 *
 * @static
 * @method generator
 * @param {Number} r Cone Radius.
 * @param {Number} u Longitudal progress from 0 to PI.
 * @param {Number} v Latitudal progress from 0 to PI.
 * @return {Array} x, y and z coordinate of geometry.
 */

ParametricCone.generator = function generator(r, u, v, pos) {
    pos[0] = r * u * Math.sin(v);
    pos[1] = -r * u * Math.cos(v);
    pos[2] = -u;
}

module.exports = ParametricCone;

},{"../Geometry":257,"../GeometryHelper":258}],267:[function(require,module,exports){
'use strict';

var Geometry = require('../Geometry');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Plane
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function Plane(options) {
    var options = options || {};
    var detailX = options.detailX || options.detail || 1;
    var detailY = options.detailY || options.detail || 1;

    var vertices      = [];
    var textureCoords = [];
    var normals       = [];
    var indices       = [];

    for (var y = 0; y <= detailY; y++) {
        var t = y / detailY;
        for (var x = 0; x <= detailX; x++) {
            var s = x / detailX;
            vertices.push(2. * (s - .5), 2 * (t - .5), 0);
            textureCoords.push(s, 1 - t);
            normals.push(0, 0, 1);
            if (x < detailX && y < detailY) {
                var i = x + y * (detailX + 1);
                indices.push(i, i + 1, i + detailX + 1);
                indices.push(i + detailX + 1, i + 1, i + detailX + 2);
            }
        }
    }
    
    return new Geometry({
        buffers: [
            { name: 'pos', data: vertices },
            { name: 'texCoord', data: textureCoords, size: 2 },
            { name: 'normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
};

module.exports = Plane;

},{"../Geometry":257}],268:[function(require,module,exports){
'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class ParametricSphere
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function ParametricSphere (options) {
    options = options || {};
    var detail = options.detail || 10;
    var detailX = options.detailX || detail;    
    var detailY = options.detailY || detail;

    var buffers = GeometryHelper.generateParametric(
          detailX,
          detailY,
          ParametricSphere.generator
    );

    GeometryHelper.getUniqueFaces(buffers.vertices, buffers.indices);

    return new Geometry({
        buffers: [
            { name: 'pos', data: buffers.vertices },
            { name: 'texCoord', data: GeometryHelper.getSpheroidUV(buffers.vertices), size: 2 },
            { name: 'normals', data: GeometryHelper.getSpheroidNormals(buffers.vertices) },
            { name: 'indices', data: buffers.indices, size: 1 }
        ]
    });
}

/**
 * Function used in iterative construction of parametric primitive.
 *
 * @static
 * @method generator
 * @param {Number} u Longitudal progress from 0 to PI.
 * @param {Number} v Latitudal progress from 0 to PI.
 * @return {Array} x, y and z coordinates of geometry
 */
ParametricSphere.generator = function generator(u, v, pos) {
    var x = Math.sin(u) * Math.cos(v);
    var y = Math.cos(u);
    var z = -Math.sin(u) * Math.sin(v);

    pos[0] = x;
    pos[1] = y;
    pos[2] = z;
};

module.exports = ParametricSphere;

},{"../Geometry":257,"../GeometryHelper":258}],269:[function(require,module,exports){
'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function generates custom buffers and passes them to
 * a new static geometry, which is returned to the user.
 *
 * @class Tetrahedron
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function Tetrahedron(options) {
    var textureCoords = [];
    var normals = [];
    var geometry;
    var detail;
    var i;
    var t = Math.sqrt(3);
    
    var vertices = [
        // Back 
         1, -1, -1 / t,
        -1, -1, -1 / t,
         0,  1,  0,
        
        // Right
         0,  1,  0,
         0, -1, t - 1 / t,
         1, -1, -1 / t,

        // Left
         0,  1,  0,
        -1, -1, -1 / t,
         0, -1,  t - 1 / t,

        // Bottom
         0, -1,  t - 1 / t,
        -1, -1, -1 / t,
         1, -1, -1 / t,
    ];

    var indices = [
        0, 1, 2,
        3, 4, 5,
        6, 7, 8,
        9, 10, 11,
    ];

    for (i = 0; i < 4; i++) {
        textureCoords.push(
            0.0, 0.0,
            0.5, 1.0,
            1.0, 0.0
        );
    }

    options       = options || {};

    while(--detail) GeometryHelper.subdivide(indices, vertices, textureCoords);
    normals       = GeometryHelper.computeNormals(vertices, indices);

    return new Geometry({
        buffers: [
            { name: 'pos', data: vertices },
            { name: 'texCoord', data: textureCoords, size: 2 },
            { name: 'normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
}

module.exports = Tetrahedron;

},{"../Geometry":257,"../GeometryHelper":258}],270:[function(require,module,exports){
'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Torus
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */

function Torus(options) {
    var options  = options || {};
    var detail   = options.detail || 30;
    var holeRadius = options.holeRadius || 0.80;
    var tubeRadius = options.tubeRadius || 0.20;

    var buffers = GeometryHelper.generateParametric(
        detail,
        detail,
        Torus.generator.bind(null, holeRadius, tubeRadius)
    );

    return new Geometry({
        buffers: [
            { name: 'pos', data: buffers.vertices },
            { name: 'texCoord', data: GeometryHelper.getSpheroidUV(buffers.vertices), size: 2 },
            { name: 'normals', data: GeometryHelper.computeNormals(buffers.vertices, buffers.indices) },
            { name: 'indices', data: buffers.indices, size: 1 }
        ]
    });
}

/**
 * function used in iterative construction of parametric primitive.
 *
 * @static
 * @method generator
 * @param {Number} c Radius of inner hole.
 * @param {Number} a Radius of tube.
 * @param {Number} u Longitudal progress from 0 to PI.
 * @param {Number} v Latitudal progress from 0 to PI.
 * @return {Array} x, y and z coordinate of the vertex.
 */
Torus.generator = function generator(c, a, u, v, pos) {
    pos[0] = (c + a * Math.cos(2 * v)) * Math.sin(2 * u);
    pos[1] = -(c + a * Math.cos(2 * v)) * Math.cos(2 * u);
    pos[2] = a * Math.sin(2 * v);
}

module.exports = Torus;

},{"../Geometry":257,"../GeometryHelper":258}],271:[function(require,module,exports){
'use strict';

var Geometry       = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Triangle
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 * 
 * @return {Object} constructed geometry
 */
function Triangle (options) {
    var options  = options || {};
    var detail   = options.detail || 1;
    var normals  = [];
    var textureCoords = [
        0.0, 0.0,
        0.5, 1.0,
        1.0, 0.0
    ];
    var indices  = [
        0, 1, 2
    ];
    var vertices = [
        -1,  1, 0,
         0, -1, 0,
         1,  1, 0
    ];

    while(--detail) GeometryHelper.subdivide(indices, vertices, textureCoords);
    normals       = GeometryHelper.computeNormals(vertices, indices);

    return new Geometry({
        buffers: [
            { name: 'pos', data: vertices },
            { name: 'texCoord', data: textureCoords, size: 2 },
            { name: 'normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
}

module.exports = Triangle;

},{"../Geometry":257,"../GeometryHelper":258}],272:[function(require,module,exports){
module.exports = noop

function noop() {
  throw new Error(
      'You should bundle your code ' +
      'using `glslify` as a transform.'
  )
}

},{}],273:[function(require,module,exports){
module.exports = programify

function programify(vertex, fragment, uniforms, attributes) {
  return {
    vertex: vertex, 
    fragment: fragment,
    uniforms: uniforms, 
    attributes: attributes
  };
}

},{}],274:[function(require,module,exports){
"use strict";
var glslify = require("glslify");
var shaders = require("glslify/simple-adapter.js")("\n#define GLSLIFY 1\n\nmat3 a_x_getNormalMatrix(in mat4 t) {\n  mat3 matNorm;\n  mat4 a = t;\n  float a00 = a[0][0], a01 = a[0][1], a02 = a[0][2], a03 = a[0][3], a10 = a[1][0], a11 = a[1][1], a12 = a[1][2], a13 = a[1][3], a20 = a[2][0], a21 = a[2][1], a22 = a[2][2], a23 = a[2][3], a30 = a[3][0], a31 = a[3][1], a32 = a[3][2], a33 = a[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  det = 1.0 / det;\n  matNorm[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n  matNorm[0][1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n  matNorm[0][2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n  matNorm[1][0] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n  matNorm[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n  matNorm[1][2] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n  matNorm[2][0] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n  matNorm[2][1] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n  matNorm[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n  return matNorm;\n}\nfloat b_x_inverse(float m) {\n  return 1.0 / m;\n}\nmat2 b_x_inverse(mat2 m) {\n  return mat2(m[1][1], -m[0][1], -m[1][0], m[0][0]) / (m[0][0] * m[1][1] - m[0][1] * m[1][0]);\n}\nmat3 b_x_inverse(mat3 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n  float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n  float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n  float b01 = a22 * a11 - a12 * a21;\n  float b11 = -a22 * a10 + a12 * a20;\n  float b21 = a21 * a10 - a11 * a20;\n  float det = a00 * b01 + a01 * b11 + a02 * b21;\n  return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11), b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10), b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n}\nmat4 b_x_inverse(mat4 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3], a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3], a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3], a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  return mat4(a11 * b11 - a12 * b10 + a13 * b09, a02 * b10 - a01 * b11 - a03 * b09, a31 * b05 - a32 * b04 + a33 * b03, a22 * b04 - a21 * b05 - a23 * b03, a12 * b08 - a10 * b11 - a13 * b07, a00 * b11 - a02 * b08 + a03 * b07, a32 * b02 - a30 * b05 - a33 * b01, a20 * b05 - a22 * b02 + a23 * b01, a10 * b10 - a11 * b08 + a13 * b06, a01 * b08 - a00 * b10 - a03 * b06, a30 * b04 - a31 * b02 + a33 * b00, a21 * b02 - a20 * b04 - a23 * b00, a11 * b07 - a10 * b09 - a12 * b06, a00 * b09 - a01 * b07 + a02 * b06, a31 * b01 - a30 * b03 - a32 * b00, a20 * b03 - a21 * b01 + a22 * b00) / det;\n}\nfloat c_x_transpose(float m) {\n  return m;\n}\nmat2 c_x_transpose(mat2 m) {\n  return mat2(m[0][0], m[1][0], m[0][1], m[1][1]);\n}\nmat3 c_x_transpose(mat3 m) {\n  return mat3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]);\n}\nmat4 c_x_transpose(mat4 m) {\n  return mat4(m[0][0], m[1][0], m[2][0], m[3][0], m[0][1], m[1][1], m[2][1], m[3][1], m[0][2], m[1][2], m[2][2], m[3][2], m[0][3], m[1][3], m[2][3], m[3][3]);\n}\nvec4 applyTransform(vec4 pos) {\n  mat4 MVMatrix = view * transform;\n  pos.x += 1.0;\n  pos.y -= 1.0;\n  pos.xyz *= size * 0.5;\n  pos.y *= -1.0;\n  v_Position = (MVMatrix * pos).xyz;\n  v_EyeVector = (resolution * 0.5) - v_Position;\n  MVMatrix[0][1] *= -1.0;\n  MVMatrix[1][1] *= -1.0;\n  MVMatrix[2][1] *= -1.0;\n  MVMatrix[3][1] *= -1.0;\n  mat4 MVPMatrix = perspective * MVMatrix;\n  pos = MVPMatrix * pos;\n  pos.x /= (resolution.x * 0.5);\n  pos.y /= (resolution.y * 0.5);\n  pos.x -= 1.0;\n  pos.y += 1.0;\n  pos.z *= -0.00001;\n  return pos;\n}\n#vert_definitions\n\nvec3 calculateOffset(vec3 ID) {\n  \n  #vert_applications\n  return vec3(0.0);\n}\nvoid main() {\n  gl_PointSize = 10.0;\n  vec3 invertedNormals = normals;\n  invertedNormals.y *= -1.0;\n  v_Normal = c_x_transpose(mat3(b_x_inverse(transform))) * invertedNormals;\n  v_TextureCoordinate = texCoord;\n  vec3 offsetPos = pos + calculateOffset(positionOffset);\n  gl_Position = applyTransform(vec4(offsetPos, 1.0));\n}", "\n#define GLSLIFY 1\n\n#float_definitions\n\nfloat a_x_applyMaterial(float ID) {\n  \n  #float_applications\n  return 1.;\n}\n#vec_definitions\n\nvec3 a_x_applyMaterial(vec3 ID) {\n  \n  #vec_applications\n  return vec3(.5);\n}\nvec3 b_x_applyLight(in vec3 material) {\n  int numLights = int(u_NumLights);\n  vec3 ambientColor = u_AmbientLight * material;\n  vec3 normal = normalize(v_Normal);\n  vec3 eyeVector = normalize(v_EyeVector);\n  vec3 specular = vec3(0.0);\n  vec3 diffuse = vec3(0.0);\n  for(int i = 0; i < 4; i++) {\n    if(i >= numLights)\n      break;\n    vec3 lightDirection = normalize(u_LightPosition[i].xyz - v_Position);\n    float lambertian = max(dot(lightDirection, normal), 0.0);\n    if(lambertian > 0.0) {\n      diffuse += u_LightColor[i].rgb * material * lambertian;\n    }\n    if(glossiness > 0.0) {\n      vec3 halfVector = normalize(lightDirection + eyeVector);\n      float specular = pow(max(dot(halfVector, normal), 0.0), glossiness);\n      diffuse += u_LightColor[i].rgb * specular;\n    }\n  }\n  return ambientColor + diffuse;\n}\nvoid main() {\n  vec3 material = baseColor.r >= 0.0 ? baseColor : a_x_applyMaterial(baseColor);\n  bool lightsEnabled = (u_FlatShading == 0.0) && (u_NumLights > 0.0 || length(u_AmbientLight) > 0.0);\n  vec3 color = lightsEnabled ? b_x_applyLight(material) : material;\n  gl_FragColor = vec4(color, opacity);\n}", [], []);
module.exports = shaders;
},{"glslify":272,"glslify/simple-adapter.js":273}],275:[function(require,module,exports){
'use strict';

/**
 * Buffer is a private class that wraps the vertex data that defines
 * the the points of the triangles that webgl draws. Each buffer 
 * maps to one attribute of a mesh.
 * 
 * @class Buffer
 * @constructor
 * 
 * @param {Number} target The bind target of the buffer to update: ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
 * @param {Object} type Array type to be used in calls to gl.bufferData.
 * @param {WebGLContext} gl The WebGL context that the buffer is hosted by.
 * 
 */
function Buffer(target, type, gl) {
    this.buffer = null;
    this.target = target;
    this.type = type;
    this.data = [];
    this.gl = gl;
}

/**
 * Creates a WebGL buffer if one does not yet exist and binds the buffer to
 * to the context.  Runs bufferData with appropriate data.
 * 
 * @method subData
 * 
 */
Buffer.prototype.subData = function subData() {
    var gl = this.gl;
    var data = [];

    // to prevent against maximum call-stack issue.
    for (var i = 0, chunk = 10000; i < this.data.length; i += chunk)
        data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));

    this.buffer = this.buffer || gl.createBuffer();
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, new this.type(data), gl.STATIC_DRAW);
};

module.exports = Buffer;

},{}],276:[function(require,module,exports){
'use strict';

var INDICES = 'indices';

var Buffer = require('./Buffer');

/**
 * BufferRegistry is a class that manages allocation of buffers to
 * input geometries.
 * 
 * @class BufferRegistry
 * @constructor
 * 
 * @param {WebGLContext} context WebGL drawing context to be passed to buffers.
 */
function BufferRegistry(context) {
    this.gl = context;

    this.registry = {};
    this._dynamicBuffers = [];
    this._staticBuffers = [];
    
    this._arrayBufferMax = 30000;
    this._elementBufferMax = 30000;
}

/**
 * Binds and fills all the vertex data into webgl buffers.  Will reuse buffers if
 * possible.  Populates registry with the name of the buffer, the WebGL buffer
 * object, spacing of the attribute, the attribute's offset within the buffer, 
 * and finally the length of the buffer.  This information is later accessed by
 * the root to draw the buffers.
 *
 * @method allocate
 *
 * @param {Number} geometryId Id of the geometry instance that holds the buffers.
 * @param {String} name Key of the input buffer in the geometry.
 * @param {Array} value Flat array containing input data for buffer.
 * @param {Number} spacing The spacing, or itemSize, of the input buffer.
 * @param {Boolean} dynamic Boolean denoting whether a geometry is dynamic or static.
 */
BufferRegistry.prototype.allocate = function allocate(geometryId, name, value, spacing, dynamic) {
    var vertexBuffers = this.registry[geometryId] || (this.registry[geometryId] = { keys: [], values: [], spacing: [], offset: [], length: [] });

    var j = vertexBuffers.keys.indexOf(name);
    var isIndex = name === INDICES;
    var bufferFound = false;
    var newOffset;
    var offset = 0;
    var length;
    var buffer;
    var k;

    if (j === -1) {
        j = vertexBuffers.keys.length;
        length = isIndex ? value.length : Math.floor(value.length / spacing);

        if (dynamic) {

            // Use a previously created buffer if available.

            for (k = 0; k < this._staticBuffers.length; k++) {
                
                if (isIndex === this._staticBuffers[k].isIndex) {
                    newOffset = this._staticBuffers[k].offset + value.length;
                    if ((!isIndex && newOffset < this._arrayBufferMax) || (isIndex && newOffset < this._elementBufferMax)) {
                        buffer = this._staticBuffers[k].buffer;
                        offset = this._staticBuffers[k].offset;
                        this._staticBuffers[k].offset += value.length;
                        bufferFound = true;
                        break;
                    }
                }
            }

            // Create a new static buffer in none were found.

            if (!bufferFound) {
                buffer = new Buffer(
                    isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                    isIndex ? Uint16Array : Float32Array,
                    this.gl
                );

                this._staticBuffers.push({ buffer: buffer, offset: value.length, isIndex: isIndex });
            }
        }
        else {

            // For dynamic geometries, always create new buffer.

            buffer = new Buffer(
                isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                isIndex ? Uint16Array : Float32Array,
                this.gl
            );

            this._dynamicBuffers.push({ buffer: buffer, offset: value.length });
        }

        // Update the registry for the spec with buffer information.

        vertexBuffers.keys.push(name);
        vertexBuffers.values.push(buffer);
        vertexBuffers.spacing.push(spacing);
        vertexBuffers.offset.push(offset);
        vertexBuffers.length.push(length);
    }
    
    var len = value.length;
    for (var k = 0; k < len; k++) {
        vertexBuffers.values[j].data[offset + k] = value[k];
    }
    vertexBuffers.values[j].subData();
};

module.exports = BufferRegistry;

},{"./Buffer":275}],277:[function(require,module,exports){
'use strict';

// Generates a checkerboard pattern to be used as a placeholder texture
// while an image loads over the network.

module.exports = (function() {
    var context = document.createElement('canvas').getContext('2d');
    context.canvas.width = context.canvas.height = 128;
    for (var y = 0; y < context.canvas.height; y += 16) {
        for (var x = 0; x < context.canvas.width; x += 16) {
            context.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
            context.fillRect(x, y, 16, 16);
        }
    }
    
    return context.canvas;
})();

},{}],278:[function(require,module,exports){
/**
 * Takes the original rendering contexts' compiler function
 * and augments it with added functionality for parsing and
 * displaying errors.
 *
 * @method debug
 *
 * @returns {Function}
 */
module.exports = function Debug() {
    return _augmentFunction(
        this.gl.compileShader,
        function(shader) {
            if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
                var errors = this.getShaderInfoLog(shader);
                var source = this.getShaderSource(shader);
                _processErrors(errors, source);
            }
        }
    );
}

/**
 * Takes a function, keeps the reference and replaces it by a closure that
 * executes the original function and the provided callback.
 *
 * @param {Function} Function
 * @param {Function} Callback
 * @return {Function}
 */
function _augmentFunction(func, callback) {
    return function() {
        var res = func.apply(this, arguments);
        callback.apply(this, arguments);
        return res;
    }
}

/**
 * Parses errors and failed source code from shaders in order
 * to build displayable error blocks.
 * Inspired by Jaume Sanchez Elias.
 *
 * @param {String} Errors
 * @param {String} Source
 */
function _processErrors(errors, source) {

    var css = 'body,html{background:#e3e3e3;font-family:monaco,monospace;font-size:14px;line-height:1.7em}'
            + '#shaderReport{left:0;top:0;right:0;box-sizing:border-box;position:absolute;z-index:1000;color:'
            + '#222;padding:15px;white-space:normal;list-style-type:none;margin:50px auto;max-width:1200px}'
            + '#shaderReport li{background-color:#fff;margin:13px 0;box-shadow:0 1px 2px rgba(0,0,0,.15);'
            + 'padding:20px 30px;border-radius:2px;border-left:20px solid #e01111}span{color:#e01111;'
            + 'text-decoration:underline;font-weight:700}#shaderReport li p{padding:0;margin:0}'
            + '#shaderReport li:nth-child(even){background-color:#f4f4f4}'
            + '#shaderReport li p:first-child{margin-bottom:10px;color:#666}';

    var el = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(el);
    el.textContent = css;

    var report = document.createElement('ul');
    report.setAttribute('id', 'shaderReport');
    document.body.appendChild(report);

    var re = /ERROR: [\d]+:([\d]+): (.+)/gmi;
    var lines = source.split('\n');

    var m;
    while ((m = re.exec(errors)) != null) {
        if (m.index === re.lastIndex) re.lastIndex++;
        var li = document.createElement('li');
        var code = '<p><span>ERROR</span> "' + m[2] + '" in line ' + m[1] + '</p>'
        code += '<p><b>' + lines[m[1] - 1].replace(/^[ \t]+/g, '') + '</b></p>';
        li.innerHTML = code;
        report.appendChild(li);
    }
}

},{}],279:[function(require,module,exports){
'use strict';

var Utility = require('famous-utilities');

var vertexWrapper = require('famous-webgl-shaders').vertex;
var fragmentWrapper = require('famous-webgl-shaders').fragment;
var Debug = require('./Debug');

var VERTEX_SHADER = 35633;
var FRAGMENT_SHADER = 35632;
var identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

var header = 'precision mediump float;\n';

var TYPES = {
    undefined: 'float ',
    1: 'float ',
    2: 'vec2 ',
    3: 'vec3 ',
    4: 'vec4 ',
    16: 'mat4 '
};

var inputTypes = {
    baseColor: 'vec3',
    normal: 'vec3',
    glossiness: 'float',
    metalness: 'float',
    positionOffset: 'vert'
};

var masks =  {
    vert: 1,
    vec3: 2,
    float: 4
};

/**
 * Uniform keys and values
 */
var uniforms = Utility.keyValueToArrays({
    perspective: identityMatrix,
    view: identityMatrix,
    resolution: [0, 0, 0],
    transform: identityMatrix,
    size: [1, 1, 1],
    time: [0],
    opacity: [1],
    metalness: [0],
    glossiness: [0],
    baseColor: [1, 1, 1],
    normal: [1, 1, 1],
    positionOffset: [0, 0, 0],
    u_LightPosition: identityMatrix,
    u_LightColor: identityMatrix,
    u_AmbientLight: [0, 0, 0],
    u_FlatShading: [0],
    u_NumLights: [0]
});

/**
 * Attributes keys and values
 */
var attributes = Utility.keyValueToArrays({
    pos: [0, 0, 0],
    texCoord: [0, 0],
    normals: [0, 0, 0]
});

/**
 * Varyings keys and values
 */
var varyings = Utility.keyValueToArrays({
    v_TextureCoordinate: [0, 0],
    v_Normal: [0, 0, 0],
    v_Position: [0, 0, 0],
    v_EyeVector: [0, 0, 0]
});

/**
 * A class that handles interactions with the WebGL shader program
 * used by a specific context.  It manages creation of the shader program
 * and the attached vertex and fragment shaders.  It is also in charge of
 * passing all uniforms to the WebGLContext.
 *
 * @class Program
 * @constructor
 *
 * @param {WebGL_Context} gl Context to be used to create the shader program.
 */
function Program(gl, options) {
    this.gl = gl;
    this.textureSlots = 1;
    this.options = options || {};

    this.registeredMaterials = {};
    this.flaggedUniforms = [];
    this.cachedUniforms  = {};

    this.definitionVec = [];
    this.definitionFloat = [];
    this.applicationVec = [];
    this.applicationFloat = [];
    this.applicationVert = [];
    this.definitionVert = [];

    this.resetProgram();
}

/**
 * Determines whether a material has already been registered to
 * the shader program.
 *
 * @method registerMaterial
 *
 * @param {String} name Name of target input of material.
 * @param {Object} material Compiled material object being verified.
 *
 * @return {Object} Current program.
 */
Program.prototype.registerMaterial = function registerMaterial(name, material) {
    var compiled = material;
    var type = inputTypes[name];
    var mask = masks[type];

    if ((this.registeredMaterials[material._id] & mask) === mask) return;

    for (var k in compiled.uniforms) {
        if (uniforms.keys.indexOf(k) === -1) {
            uniforms.keys.push(k);
            uniforms.values.push(compiled.uniforms[k]);
        }
    }

    for (var k in compiled.varyings) {
        if (varyings.keys.indexOf(k) === -1) {
            varyings.keys.push(k);
            varyings.values.push(compiled.varyings[k]);
        }
    }

    for (var k in compiled.attributes) {
        if (attributes.keys.indexOf(k) === -1) {
            attributes.keys.push(k);
            attributes.values.push(compiled.attributes[k]);
        }
    }

    this.registeredMaterials[material._id] |= mask;

    if (type == 'float') {
        this.definitionFloat.push(material.defines);
        this.definitionFloat.push('float fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationFloat.push('if (int(abs(ID)) == ' + material._id + ') return fa_' + material._id  + '();');
    }

    if (type == 'vec3') {
        this.definitionVec.push(material.defines);
        this.definitionVec.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVec.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    if (type == 'vert') {
        this.definitionVert.push(material.defines);
        this.definitionVert.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVert.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    return this.resetProgram();
};

/**
 * Clears all cached uniforms and attribute locations.  Assembles
 * new fragment and vertex shaders and based on material from
 * currently registered materials.  Attaches said shaders to new
 * shader program and upon success links program to the WebGL
 * context.
 *
 * @method resetProgram
 *
 * @return {Program} Current program.
 */
Program.prototype.resetProgram = function resetProgram() {
    var vsChunkDefines = [];
    var vsChunkApplies = [];
    var fsChunkDefines = [];
    var fsChunkApplies = [];

    var vertexHeader = [header];
    var fragmentHeader = [header];

    var fragmentSource;
    var vertexSource;
    var material;
    var program;
    var chunk;
    var name;
    var value;
    var i;

    this.uniformLocations   = [];
    this.attributeLocations = {};

    this.attributeNames = Utility.clone(attributes.keys);
    this.attributeValues = Utility.clone(attributes.values);

    this.varyingNames = Utility.clone(varyings.keys);
    this.varyingValues = Utility.clone(varyings.values);

    this.uniformNames = Utility.clone(uniforms.keys);
    this.uniformValues = Utility.clone(uniforms.values);

    this.flaggedUniforms = [];
    this.cachedUniforms = {};

    fragmentHeader.push('uniform sampler2D image;\n');

    if (this.applicationVert.length > 1) {
        vertexHeader.push('uniform sampler2D image;\n');
    }

    for(i = 0; i < this.uniformNames.length; i++) {
        name = this.uniformNames[i], value = this.uniformValues[i];
        vertexHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
        fragmentHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.attributeNames.length; i++) {
        name = this.attributeNames[i], value = this.attributeValues[i];
        vertexHeader.push('attribute ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.varyingNames.length; i++) {
        name = this.varyingNames[i], value = this.varyingValues[i];
        vertexHeader.push('varying ' + TYPES[value.length]  + name + ';\n');
        fragmentHeader.push('varying ' + TYPES[value.length] + name + ';\n');
    }

    vertexSource = vertexHeader.join('') + vertexWrapper
        .replace('#vert_definitions', this.definitionVert.join('\n'))
        .replace('#vert_applications', this.applicationVert.join('\n'));

    fragmentSource = fragmentHeader.join('') + fragmentWrapper
        .replace('#vec_definitions', this.definitionVec.join('\n'))
        .replace('#vec_applications', this.applicationVec.join('\n'))
        .replace('#float_definitions', this.definitionFloat.join('\n'))
        .replace('#float_applications', this.applicationFloat.join('\n'));

    program = this.gl.createProgram();

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(VERTEX_SHADER), vertexSource)
    );

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(FRAGMENT_SHADER), fragmentSource)
    );

    this.gl.linkProgram(program);

    if (! this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        console.error('link error: ' + this.gl.getProgramInfoLog(program));
        this.program = null;
    }
    else {
        this.program = program;
        this.gl.useProgram(this.program);
    }

    this.setUniforms(this.uniformNames, this.uniformValues);

    return this;
};

/**
 * Compares the value of the input uniform value against
 * the cached value stored on the Program class.  Updates and
 * creates new entries in the cache when necessary.
 *
 * @method uniformIsCached
 *
 * @param {String} targetName Key of uniform spec being evaluated.
 * @param {Number|Array} value Value of uniform spec being evaluated.
 * @return {Boolean} Value indicating whether the uniform being set
 * is cached.
 */
Program.prototype.uniformIsCached = function(targetName, value) {
    if(this.cachedUniforms[targetName] == null) {
        if (value.length) {
            this.cachedUniforms[targetName] = new Float32Array(value);
        }
        else {
            this.cachedUniforms[targetName] = value;
        }
        return false;
    }
    else if (value.length) {
        var i = value.length;
        while (i--) {
            if(value[i] !== this.cachedUniforms[targetName][i]) {
                i = value.length;
                while(i--) this.cachedUniforms[targetName][i] = value[i];
                return false;
            }
        }
    }

    else if (this.cachedUniforms[targetName] !== value) {
        this.cachedUniforms[targetName] = value;
        return false;
    }

    return true;
};

/**
 * Handles all passing of uniforms to WebGL drawing context.  This
 * function will find the uniform location and then, based on
 * a type inferred from the javascript value of the uniform, it will call
 * the appropriate function to pass the uniform to WebGL.  Finally,
 * setUniforms will iterate through the passed in shaderChunks (if any)
 * and set the appropriate uniforms to specify which chunks to use.
 *
 * @method setUniforms
 *
 * @param {Array} uniformNames Array containing the keys of all uniforms to be set.
 * @param {Array} uniformValue Array containing the values of all uniforms to be set.
 *
 * @return {Program} Current program.
 */
Program.prototype.setUniforms = function (uniformNames, uniformValue) {
    var gl = this.gl;
    var location;
    var value;
    var name;
    var flag;
    var len;
    var i;

    if (!this.program) return;

    len = uniformNames.length;
    for (i = 0; i < len; i++) {
        name = uniformNames[i];
        value = uniformValue[i];

        // Retreive the cached location of the uniform,
        // requesting a new location from the WebGL context
        // if it does not yet exist.

        location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
        if (!location) continue;

        this.uniformLocations[name] = location;

        // Check if the value is already set for the
        // given uniform.

        if (this.uniformIsCached(name, value)) continue;

        // Determine the correct function and pass the uniform
        // value to WebGL.

        if (Array.isArray(value) || value instanceof Float32Array) {
            switch (value.length) {
                case 4:  gl.uniform4fv(location, value); break;
                case 3:  gl.uniform3fv(location, value); break;
                case 2:  gl.uniform2fv(location, value); break;
                case 16: gl.uniformMatrix4fv(location, false, value); break;
                case 1:  gl.uniform1fv(location, value); break;
                case 9:  gl.uniformMatrix3fv(location, false, value); break;
                default: throw 'cant load uniform "' + name + '" with value:' + JSON.stringify(value);
            }
        }
        else if (! isNaN(parseFloat(value)) && isFinite(value)) {
            gl.uniform1f(location, value);
        }
        else {
            throw 'set uniform "' + name + '" to invalid type :' + value;
        }
    }
    return this;
};

/**
 * Adds shader source to shader and compiles the input shader.  Checks
 * compile status and logs error if necessary.
 *
 * @method compileShader
 *
 * @param {Object} shader Program to be compiled.
 * @param {String} source Source to be used in the shader.
 *
 * @return {Object} Compiled shader.
 */
Program.prototype.compileShader = function compileShader(shader, source) {
    var i = 1;

    if (this.options.debug) {
        this.gl.compileShader = Debug.call(this);
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('compile error: ' + this.gl.getShaderInfoLog(shader));
        console.error('1: ' + source.replace(/\n/g, function () { return '\n' + (i+=1) + ': '; }));
    }

    return shader;
};

module.exports = Program;

},{"./Debug":278,"famous-utilities":231,"famous-webgl-shaders":274}],280:[function(require,module,exports){
'use strict';

/**
 * Texture is a private class that stores image data
 * to be accessed from a shader or used as a render target.
 *
 * @class Texture
 * @constructor
 */
function Texture(gl, options) {
    options = options || {};
    this.id = gl.createTexture();
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.format = options.format || gl.RGBA;
    this.type = options.type || gl.UNSIGNED_BYTE;
    this.gl = gl;

    this.bind();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[options.magFilter] || gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[options.minFilter] || gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[options.wrapS] || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[options.wrapS] || gl.CLAMP_TO_EDGE);

    gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, null);

    if (options.mipmap !== false && isPowerOfTwo(this.width, this.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    this.unbind();
}

/**
 * Binds this texture as the selected target.
 *
 * @method bind
 * @chainable
 *
 * @param {Number} unit The texture slot in which to upload the data.
 *
 * @return {Object} Current texture instance.
 */
Texture.prototype.bind = function bind(unit) {
    this.gl.activeTexture(this.gl.TEXTURE0 + (unit || 0));
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    return this;
};

/**
 * Erases the texture data in the given texture slot.
 *
 * @method unbind
 * @chainable
 *
 * @param {Number} unit The texture slot in which to clean the data.
 * 
 * @return {Object} Current texture instance.
 */
Texture.prototype.unbind = function unbind(unit) {
    this.gl.activeTexture(this.gl.TEXTURE0 + (unit || 0));
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return this;
};

/**
 * Replaces the image data in the texture with the given image.
 *
 * @method setImage
 * @chainable
 *
 * @param {Image} img The image object to upload pixel data from.
 *
 * @return {Object} Current texture instance.
 */
Texture.prototype.setImage = function setImage(img) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, this.format, this.type, img);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return this;
};

/**
 * Replaces the image data in the texture with an array of arbitrary data.
 *
 * @method setArray
 * @chainable
 *
 * @param {Array} input Array to be set as data to texture. 
 *
 * @return {Object} Current texture instance.
 */
Texture.prototype.setArray = function setArray(input) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, 1, 1, 0, this.format, this.type, new Uint8Array(input));
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return this;
};

/**
 * Dumps the rgb-pixel contents of a texture into an array for debugging purposes
 *
 * @method readBack
 * @chainable
 *
 * @param {Number} x-offset between texture coordinates and snapshot
 * @param {Number} y-offset between texture coordinates and snapshot
 * @param {Number} x-depth of the snapshot
 * @param {Number} y-depth of the snapshot
 * 
 * @return {Array} An array of the pixels contained in the snapshot.
 */
Texture.prototype.readBack = function readBack(x, y, width, height) {
    var gl = this.gl;
    var pixels;
    x = x || 0;
    y = y || 0;
    width = width || this.width;
    height = height || this.height;
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
        pixels = new Uint8Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    return pixels;
};

/*
 * Determines whether both input values are power-of-two numbers.
 *
 * @method isPowerOfTwo
 * @private
 *
 * @param {Number} width Number representing texture width.
 * @param {Number} height Number representing texture height.
 *
 * @return {Boolean} Boolean denoting whether the input dimensions
 * are both power-of-two values.
 */
function isPowerOfTwo(width, height) {
    return (width & width - 1) === 0 
        && (height & height - 1) === 0;
};

module.exports = Texture;

},{}],281:[function(require,module,exports){
'use strict';

var Texture = require('./Texture');
var Program = require('./Program');
var Buffer = require('./Buffer');
var BufferRegistry = require('./BufferRegistry');
var checkers = require('./Checkerboard');
var Plane = require('famous-webgl-geometries').Plane;
var sorter = require('./radixSort');
var Utility = require('famous-utilities');

var identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * WebGLRenderer is a private class that manages all interactions with the WebGL
 * API.  Each frame it receives commands from the compositor and updates its registries
 * accordingly.  Subsequently, the draw function is called and the WebGLRenderer
 * issues draw calls for all meshes in its registry.
 *
 * @class WebGLRenderer
 * @constructor
 *
 * @param {DOMElement} canvas The dom element that GL will paint itself onto.
 *
 */
function WebGLRenderer(canvas) {
    this.canvas = canvas;

    var gl = this.gl = this.getWebGLContext(this.canvas);

    gl.polygonOffset(0.1, 0.1);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);

    this.meshRegistry = {};
    this.meshRegistryKeys = [];

    this.cutoutRegistry = {};
    this.cutoutRegistryKeys = [];
    this.cutoutGeometry;

    /**
     * Lights
     */

    this.numLights = 0;
    this.ambientLightColor = [0, 0, 0];
    this.lightRegistry = {};
    this.lightRegistryKeys = [];
    this.lightPositions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.lightColors = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.textureRegistry = [];
    this.texCache = {};
    this.bufferRegistry = new BufferRegistry(gl);
    this.program = new Program(gl, { debug: false });

    this.state = {
        boundArrayBuffer: null,
        boundElementBuffer: null,
        lastDrawn: null,
        enabledAttributes: {},
        enabledAttributesKeys: []
    };

    this.resolutionName = ['resolution'];
    this.resolutionValues = [];

    this.cachedSize = [];

    this.projectionTransform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 * Attempts to retreive the WebGLRenderer context using several
 * accessors.  For browser compatability.  Throws on error.
 *
 * @method getWebGLContext
 *
 * @param {Object} canvas Canvas element from which the context is retreived.
 *
 * @return {Object} WebGLContext of canvas element.
 */
WebGLRenderer.prototype.getWebGLContext = function getWebGLContext(canvas) {
    var names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        }
        catch (error) {
            var msg = 'Error creating WebGL context: ' + error.toString();
            console.error(msg);
        }
        if (context) {
            break;
        }
    }
    return context ? context : false;
};

/**
 * Adds a new base spec to the light registry at a given path.
 *
 * @method createLight
 *
 * @param {String} Path used as id of new light in lightRegistry.
 *
 * @return {Object} Newly created light spec.
 */
WebGLRenderer.prototype.createLight = function createLight(path) {
    this.numLights++;
    this.lightRegistryKeys.push(path);
    return this.lightRegistry[path] = {
        color: [0, 0, 0],
        position: [0, 0, 0]
    };
};

/**
 * Adds a new base spec to the mesh registry at a given path.
 *
 * @method createMesh
 *
 * @param {String} Path used as id of new mesh in meshRegistry.
 *
 * @return {Object} Newly created mesh spec.
 */
WebGLRenderer.prototype.createMesh = function createMesh(path) {
    this.meshRegistryKeys.push(path);
    var uniforms = Utility.keyValueToArrays({
        opacity: 1,
        transform: identity,
        size: [0, 0, 0],
        baseColor: [0.5, 0.5, 0.5],
        positionOffset: [0, 0, 0],
        u_FlatShading: 0,
        glossiness: 0
    });
    return this.meshRegistry[path] = {
        depth: null,
        uniformKeys: uniforms.keys,
        uniformValues: uniforms.values,
        buffers: {},
        geometry: null,
        drawType: null,
        texture: null,
        visible: true
    };
};


/**
 * Creates or retreives cutout
 *
 * @method getOrSetCutout
 *
 * @param {String} Path used as id of new mesh in meshRegistry.
 *
 * @return {Object} Newly created cutout spec.
 */

WebGLRenderer.prototype.getOrSetCutout = function getOrSetCutout(path) {
    var geometry;

    if (this.cutoutRegistry[path]) {
        return this.cutoutRegistry[path];
    }
    else {
        if (!this.cutoutGeometry) {
            geometry = this.cutoutGeometry = Plane();

            this.bufferRegistry.allocate(geometry.id, 'pos', geometry.spec.bufferValues[0], 3);
            this.bufferRegistry.allocate(geometry.id, 'texCoord', geometry.spec.bufferValues[1], 2);
            this.bufferRegistry.allocate(geometry.id, 'normals', geometry.spec.bufferValues[2], 3);
            this.bufferRegistry.allocate(geometry.id, 'indices', geometry.spec.bufferValues[3], 1);
        }

        this.cutoutRegistryKeys.push(path);

        var uniforms = Utility.keyValueToArrays({
            transform: identity,
            size: [0, 0, 0],
            origin: [0, 0, 0],
            baseColor: [0, 0, 0],
            opacity: 0
        });
        return this.cutoutRegistry[path] = {
            uniformKeys: uniforms.keys,
            uniformValues: uniforms.values,
            geometry: this.cutoutGeometry.id,
            drawType: 4
        };
    }

};

/**
 * Prevents a mesh from being drawn to the canvas.
 *
 * @method hideMesh
 *
 * @param {String} path Path used as id of mesh in mesh registry.
 *
 */
WebGLRenderer.prototype.hideMesh = function hideMesh(path) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);
    mesh.visible = false;
};

/**
 * Allows a mesh to be drawn to the canvas.
 *
 * @method showMesh
 *
 * @param {String} path Path used as id of mesh in mesh registry.
 *
 */
WebGLRenderer.prototype.showMesh = function showMesh(path) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);
    mesh.visible = true;
};


/**
 * Creates or retreives cutout
 *
 * @method setCutoutUniform
 *
 * @param {String} Path used as id of cutout in cutout registry.
 * @param {String} uniformLocation identifier used to upload value
 * @param {Array} value of uniform data 
 *
 */

WebGLRenderer.prototype.setCutoutUniform = function setCutoutUniform(path, uniformName, uniformValue) {
    var cutout = this.getOrSetCutout(path);

    var index = cutout.uniformKeys.indexOf(uniformName);

    cutout.uniformValues[index] = uniformValue;
};


/**
 * Edits the options field on a mesh
 *
 * @method setMeshOptions
 *
 * @param {String} Path used as id of cutout in cutout registry.
 * @param {Object} map of draw options for mesh
 *
**/
WebGLRenderer.prototype.setMeshOptions = function(path, options) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.options = options;
    return this;
};


/**
 * Changes the color of the fixed intensity lighting in the scene
 *
 * @method setAmbientLightColor
 *
 * @param {String} path used as id of light
 * @param {Number} red channel
 * @param {Number} green channel
 * @param {Number} blue channel
 *
**/
WebGLRenderer.prototype.setAmbientLightColor = function setAmbientLightColor(path, r, g, b) {
    this.ambientLightColor[0] = r;
    this.ambientLightColor[1] = g;
    this.ambientLightColor[2] = b;
    return this;
};


/**
 * Changes the location of the light in the scene
 *
 * @method setLightPosition
 *
 * @param {String} path used as id of light
 * @param {Number} x position
 * @param {Number} y position
 * @param {Number} z position
 *
**/
WebGLRenderer.prototype.setLightPosition = function setLightPosition(path, x, y, z) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.position[0] = x;
    light.position[1] = y;
    light.position[2] = z;
    return this;
};


/**
 * Changes the color of a dynamic intensity lighting in the scene
 *
 * @method setLightColor
 *
 * @param {String} path used as id of light in light Registry.
 * @param {Number} red channel
 * @param {Number} green channel
 * @param {Number} blue channel
 *
**/
WebGLRenderer.prototype.setLightColor = function setLightColor(path, r, g, b) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.color[0] = r;
    light.color[1] = g;
    light.color[2] = b;
    return this;
};
/**
 * Compiles material spec into program shader
 *
 * @method handleMateriaInput
 *
 * @param {String} Path used as id of cutout in cutout registry.
 * @param {String} which rendering input the material is bound to
 * @param {Object} material spec
 *
**/
WebGLRenderer.prototype.handleMaterialInput = function handleMaterialInput(path, name, material) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.uniformValues[name === 'baseColor' ? 3 : 4][0] = - material._id;
    if (material.texture) mesh.texture = handleTexture.call(this, material.texture);
    this.program.registerMaterial(name, material);
    return this.updateSize();
};

/**
 * Changes the geometry data of a mesh
 *
 * @method setGeometry
 *
 * @param {String} Path used as id of cutout in cutout registry.
 * @param {Object} Geometry object containing vertex data to be drawn
 * @param {Number} primitive identifier
 * @param {Boolean} will the geometry data change?
 *
**/

WebGLRenderer.prototype.setGeometry = function setGeometry(path, geometry, drawType, dynamic) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.geometry = geometry;
    mesh.drawType = drawType;
    mesh.dynamic = dynamic;

    return this;
};

/**
 * Uploads a new value for the uniform data when the mesh is being drawn
 *
 * @method setMeshUniform
 *
 * @param {String} Path used as id of mesh in mesh registry
 * @param {String} uniformLocation identifier used to upload value
 * @param {Array} value of uniform data 
 *
**/
WebGLRenderer.prototype.setMeshUniform = function setMeshUniform(path, uniformName, uniformValue) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    var index = mesh.uniformKeys.indexOf(uniformName);

    if (index === -1) {
        mesh.uniformKeys.push(uniformName);
        mesh.uniformValues.push(uniformValue);
    }
    else {
        mesh.uniformValues[index] = uniformValue;
    }
}

/**
 * Triggers the 'draw' phase of the WebGLRenderer.  Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method bufferData
 *
 * @param {String} Path used as id of mesh in mesh registry
 * @param {Number} Id of geometry in geometry registry
 * @param {String} Attribute location name
 * @param {Array} Vertex data 
 * @param {Number} The dimensions of the vertex
 */


WebGLRenderer.prototype.bufferData = function bufferData(path, geometryId, bufferName, bufferValue, bufferSpacing) {
    this.bufferRegistry.allocate(geometryId, bufferName, bufferValue, bufferSpacing);

    return this;
};

/**
 * Triggers the 'draw' phase of the WebGLRenderer.  Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method draw
 *
 * @param {Object} renderState Parameters provided by the compositor, that
 * affect the rendering of all renderables.
 */
WebGLRenderer.prototype.draw = function draw(renderState) {
    this.setGlobalUniforms(renderState);
    this.meshRegistryKeys = sorter(this.meshRegistryKeys, this.meshRegistry);
    this.drawCutouts();
    this.drawMeshes();
};

WebGLRenderer.prototype.drawMeshes = function drawMeshes() {
    var mesh;
    var buffers;

    for(var i = 0; i < this.meshRegistryKeys.length; i++) {
        mesh = this.meshRegistry[this.meshRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[mesh.geometry];
        
        if (!mesh.visible) continue;

        var gl = this.gl;
        if (mesh.uniformValues[0] < 1) {
            gl.depthMask(false);
            gl.enable(gl.BLEND);
        } else {
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }

        if (!buffers) continue;

        if (mesh.options) this.handleOptions(mesh.options);
        if (mesh.texture) mesh.texture.bind();
        this.program.setUniforms(mesh.uniformKeys, mesh.uniformValues);
        this.drawBuffers(buffers, mesh.drawType, mesh.geometry);

        if (mesh.texture) mesh.texture.unbind();
        if (mesh.options) this.resetOptions(mesh.options);
    }
}

WebGLRenderer.prototype.drawCutouts = function drawCutouts() {
    var cutout;
    var buffers;

    for (var i = 0, len = this.cutoutRegistryKeys.length; i < len; i++) {
        cutout = this.cutoutRegistry[this.cutoutRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[cutout.geometry];

        this.gl.enable(this.gl.BLEND);
        this.program.setUniforms(cutout.uniformKeys, cutout.uniformValues);
        this.drawBuffers(buffers, cutout.drawType, cutout.geometry);
        this.gl.disable(this.gl.BLEND);
    }
};

WebGLRenderer.prototype.setGlobalUniforms = (function() {
    var uniformNames = [
        'u_NumLights',
        'u_AmbientLight',
        'u_LightPosition',
        'u_LightColor',
        'perspective',
        'time',
        'view'
    ];
    var uniformValues = [];

    return function setGlobalUniforms(renderState) {
        var light;
        var stride;

        /*
         * Set light uniforms
         */

        for(var i = 0; i < this.lightRegistryKeys.length; i++) {
            light = this.lightRegistry[this.lightRegistryKeys[i]];
            stride = i * 4;

            // Build the light positions' 4x4 matrix
            this.lightPositions[0 + stride] = light.position[0];
            this.lightPositions[1 + stride] = light.position[1];
            this.lightPositions[2 + stride] = light.position[2];

            // Build the light colors' 4x4 matrix
            this.lightColors[0 + stride] = light.color[0];
            this.lightColors[1 + stride] = light.color[1];
            this.lightColors[2 + stride] = light.color[2];
        }
        
        uniformValues[0] = this.numLights;
        uniformValues[1] = this.ambientLightColor;
        uniformValues[2] = this.lightPositions;
        uniformValues[3] = this.lightColors;

        /*
         * Set time and projection uniforms
         */

        this.projectionTransform[11] = renderState.perspectiveTransform[11];

        uniformValues[4] = this.projectionTransform;
        uniformValues[5] = Date.now()  % 100000 / 1000;
        uniformValues[6] = renderState.viewTransform;

        this.program.setUniforms(uniformNames, uniformValues);
    }
}());

/**
 * Loads the buffers and issues the draw command for a geometry.
 *
 * @method drawBuffers
 *
 * @param {Object} vertexBuffers All buffers used to draw the geometry.
 * @param {Number} mode Enumerator defining what primitive to draw
 * @param {Number} id ID of geometry being drawn.
 */
WebGLRenderer.prototype.drawBuffers = function drawBuffers(vertexBuffers, mode, id) {
    var gl = this.gl;
    var length = 0;
    var attribute;
    var location;
    var spacing;
    var offset;
    var buffer;
    var iter;
    var j;

    iter = vertexBuffers.keys.length;
    for (var i = 0; i < iter; i++) {
        attribute = vertexBuffers.keys[i];

        // Do not set vertexAttribPointer if index buffer.

        if (attribute === 'indices') {
            j = i; continue;
        }

        // Retreive the attribute location and make sure it is enabled.

        location = this.program.attributeLocations[attribute];

        if (location === -1) continue;
        if (location === undefined) {
            location = gl.getAttribLocation(this.program.program, attribute);
            this.program.attributeLocations[attribute] = location;
            if (location === -1) continue;
        }

        if (!this.state.enabledAttributes[attribute]) {
            gl.enableVertexAttribArray(location);
            this.state.enabledAttributes[attribute] = true;
            this.state.enabledAttributesKeys.push(attribute);
        }

        // Retreive buffer information used to set attribute pointer.

        buffer = vertexBuffers.values[i];
        spacing = vertexBuffers.spacing[i];
        offset = vertexBuffers.offset[i];
        length = vertexBuffers.length[i];

        // Skip bindBuffer if buffer is currently bound.

        if (this.state.boundArrayBuffer !== buffer) {
            gl.bindBuffer(buffer.target, buffer.buffer);
            this.state.boundArrayBuffer = buffer;
        }

        if (this.state.lastDrawn !== id) {
            gl.vertexAttribPointer(location, spacing, gl.FLOAT, gl.FALSE, 0, 4 * offset);
        }
    }

    // Disable any attributes that not currently being used.

    for(var i = 0, len = this.state.enabledAttributesKeys.length; i < len; i++) {
        var key = this.state.enabledAttributes[this.state.enabledAttributesKeys[i]];
        if (this.state.enabledAttributes[key] && vertexBuffers.keys.indexOf(key) === -1) {
            gl.disableVertexAttribArray(this.program.attributeLocations[key]);
            this.state.enabledAttributes[key] = false;
        }
    }

    if (length) {

        // If index buffer, use drawElements.

        if (j !== undefined) {
            buffer = vertexBuffers.values[j];
            offset = vertexBuffers.offset[j];
            spacing = vertexBuffers.spacing[j];
            length = vertexBuffers.length[j];

            // Skip bindBuffer if buffer is currently bound.

            if (this.state.boundElementBuffer !== buffer) {
                gl.bindBuffer(buffer.target, buffer.buffer);
                this.state.boundElementBuffer = buffer;
            }

            gl.drawElements(mode, length, gl.UNSIGNED_SHORT, 2 * offset);
        }
        else {
            gl.drawArrays(mode, 0, length);
        }
    }

    this.state.lastDrawn = id;
};

/**
 * Wraps draw methods in bound frame buffer
 *
 * @method renderOffscreen
 *
 * @param {Function} callback The render function to be called after setup and before cleanup.
 * @param {Array} size Size of framebuffer being drawn to.
 * @param {Object} texture Location where the render data is stored.
 */
function renderOffscreen(callback, size, texture) {
    var gl = this.gl;

    var framebuffer  = this.framebuffer ? this.framebuffer : this.framebuffer = gl.createFramebuffer();
    var renderbuffer = this.renderbuffer ? this.renderbuffer : this.renderbuffer = gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

    if (size[0] != renderbuffer.width || size[1] != renderbuffer.height) {
        renderbuffer.width = size[0];
        renderbuffer.height = size[1];
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size[0], size[1]);
    }

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.id, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    if (this.debug) checkFrameBufferStatus(gl);

    callback.call(this);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
};

/**
 * Diagnoses the failed intialization of an FBO.
 *
 * @method checkFrameBufferStatus
 *
 * @param {Object} the WebGLContext that owns this FBO.
 */
function checkFrameBufferStatus(gl) {
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    switch (status) {
        case gl.FRAMEBUFFER_COMPLETE:
            break;
        case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
            throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
        case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
            throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
        case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
            throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
        case gl.FRAMEBUFFER_UNSUPPORTED:
            throw("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED"); break;
        default:
            throw("Incomplete framebuffer: " + status);
    }
};

/**
 * Updates the width and height of parent canvas, sets the viewport size on
 * the WebGL context and updates the resolution uniform for the shader program.
 * Size is retreived from the container object of the renderer.
 *
 * @method updateSize
 * 
 * @param {Array} width, height and depth of canvas
 * 
 */
WebGLRenderer.prototype.updateSize = function updateSize(size) {
    if (size) {
        this.cachedSize[0] = size[0];
        this.cachedSize[1] = size[1];
        this.cachedSize[2] = (size[0] > size[1]) ? size[0] : size[1];
    }

    this.gl.viewport(0, 0, this.cachedSize[0], this.cachedSize[1]);

    this.resolutionValues[0] = this.cachedSize;
    this.program.setUniforms(this.resolutionName, this.resolutionValues);

    return this;
};

/**
 * Updates the state of the WebGL drawing context based on custom parameters
 * defined on a mesh.
 *
 * @method handleOptions
 *
 * @param {Object} options Draw state options to be set to the context.
 */
WebGLRenderer.prototype.handleOptions = function handleOptions(options) {
    var gl = this.gl;
    if (!options) return;
    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
};

/**
 * Resets the state of the WebGL drawing context to default values.
 *
 * @method resetOptions
 *
 * @param {Object} options Draw state options to be set to the context.
 */
WebGLRenderer.prototype.resetOptions = function resetOptions(options) {
    var gl = this.gl;
    if (!options) return;
    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

/**
 * Loads an image from a string or Image object and executes a callback function.
 *
 * @method loadImage
 * @private
 *
 * @param {Object | String} img The input image data to load as an asset.
 * @param {Function} callback The callback function to be fired when
 * the image has finished loading.
 *
 * @return {Object} Image object being loaded.
 */
function loadImage (img, callback) {
    var obj = (typeof img === 'string' ? new Image() : img) || {};
    obj.crossOrigin = 'anonymous';
    if (! obj.src) obj.src = img;
    if (! obj.complete) obj.onload = function () { callback(obj); };
    else callback(obj);
    return obj;
}

/**
 * Handles loading of texture objects.
 *
 * @method handleTexture
 * @private
 *
 * @param {Object} input The input texture object collected from mesh.
 *
 * @return {Object} Texture instance linked to input data.
 */
function handleTexture(input) {
    var source = input.data;
    var textureId = input.id;
    var options = input.options;
    var texture = this.textureRegistry[textureId];

    if (!texture) {
        if (Array.isArray(source)) {
            texture = new Texture(this.gl, options);
            texture.setArray(source);
        }

        else if (window && source instanceof window.HTMLVideoElement) {
            texture = new Texture(this.gl, options);
            texture.src = texture;
            texture.setImage(checkers);
            source.addEventListener('loadeddata', function() {
                texture.setImage(source);
                setInterval(function () { texture.setImage(source); }, 16);
            });
        }

        else if ('string' === typeof source) {
            texture = new Texture(this.gl, options);
            texture.setImage(checkers);
            loadImage(source, function (img) {
                texture.setImage(img);
            });
        }

        this.textureRegistry[textureId] = texture;
    }

    return texture;
}

module.exports = WebGLRenderer;

},{"./Buffer":275,"./BufferRegistry":276,"./Checkerboard":277,"./Program":279,"./Texture":280,"./radixSort":283,"famous-utilities":231,"famous-webgl-geometries":260}],282:[function(require,module,exports){
'use strict';

module.exports = {
    Buffer: require('./Buffer'),
    BufferRegistry: require('./BufferRegistry'),
    Checkerboard: require('./Checkerboard'),
    Program: require('./Program'),
    WebGLRenderer: require('./WebGLRenderer'),
    Texture: require('./Texture')
};

},{"./Buffer":275,"./BufferRegistry":276,"./Checkerboard":277,"./Program":279,"./Texture":280,"./WebGLRenderer":281}],283:[function(require,module,exports){
var radixBits = 11,
    maxRadix = 1 << (radixBits),
    radixMask = maxRadix - 1,
    buckets = new Array(maxRadix * Math.ceil(64 / radixBits)),
    msbMask = 1 << ((32 - 1) % radixBits),
    lastMask = (msbMask << 1) - 1,
    passCount = ((32 / radixBits) + 0.999999999999999) | 0,
    maxOffset = maxRadix * (passCount - 1),
    normalizer = Math.pow(20, 6);

var buffer = new ArrayBuffer(4);
var floatView = new Float32Array(buffer, 0, 1);
var intView = new Int32Array(buffer, 0, 1);

function comp(list, registry, i) {
    var key = list[i];
    var item = registry[key];
    return (item.depth ? item.depth : registry[key].uniformValues[1][14]) + normalizer;
}

function mutator(list, registry, i, value) {
    var key = list[i];
    registry[key].depth = intToFloat(value) - normalizer;
    return key;
}
function clean(list, registry, i) {
    registry[list[i]].depth = null;
}

function floatToInt(k) {
    floatView[0] = k;
    return intView[0];
}

function intToFloat(k) {
    intView[0] = k;
    return floatView[0];
}

function sort(list, registry) {
    var pass = 0;
    var out = [];

    var i, j, k, n, div, offset, swap, id, sum, tsum, size;

    passCount = ((32 / radixBits) + 0.999999999999999) | 0;

    for (i = 0, n = maxRadix * passCount; i < n; i++) buckets[i] = 0;

    for (i = 0, n = list.length; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        div ^= div >> 31 | 0x80000000;
        for (j = 0, k = 0; j < maxOffset; j += maxRadix, k += radixBits) {
            buckets[j + (div >>> k & radixMask)]++;
        }
        buckets[j + (div >>> k & lastMask)]++;
    }

    for (j = 0; j <= maxOffset; j += maxRadix) {
        for (id = j, sum = 0; id < j + maxRadix; id++) {
            tsum = buckets[id] + sum;
            buckets[id] = sum - 1;
            sum = tsum;
        }
    }
    if (--passCount) {
        for (i = 0, n = list.length; i < n; i++) {
            div = floatToInt(comp(list, registry, i));
            out[++buckets[div & radixMask]] = mutator(list, registry, i, div ^= div >> 31 | 0x80000000);
        }
        swap = out, out = list, list = swap;
        while (++pass < passCount) {
            for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
                div = floatToInt(comp(list, registry, i));
                out[++buckets[offset + (div >>> size & radixMask)]] = list[i];
            }
            swap = out, out = list, list = swap;
        }
    }

    for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        out[++buckets[offset + (div >>> size & lastMask)]] = mutator(list, registry, i, div ^ (~div >> 31 | 0x80000000));
        clean(list, registry, i);
    }

    return out;

}

module.exports = sort;

},{}],284:[function(require,module,exports){
'use strict';

var VirtualElement = require('famous-dom-renderers').VirtualElement;
var strip = require('famous-utilities').strip;
var flatClone = require('famous-utilities').flatClone;

var Context = require('./Context');

/**
 * Instantiates a new Compositor, used for routing commands received from the
 * WebWorker to the WebGL and DOM renderer.
 *
 * @class Compositor
 * @constructor
 */
function Compositor() {
    this._contexts = {};
    this._outCommands = [];
    this._inCommands = [];

    this.clearCommands();
}

/**
 * Schedules an event to be sent to the WebWorker the next time the out command
 * queue is being flushed.
 *
 * @method sendEvent
 * @private
 *
 * @param  {String} path    render path to the node the event should be
 *                          triggered on (*targeted event*)
 * @param  {String} ev      event type
 * @param  {Object} payload event object (serializable using structured
 *                          cloning algorithm)
 */
Compositor.prototype.sendEvent = function sendEvent(path, ev, payload) {
    this._outCommands.push('WITH', path, 'TRIGGER', ev, payload);
};

/**
 * Internal helper method used by `drawCommands`.
 *
 * @method handleWith
 * @private
 *
 * @param  {Array} commands     remaining message queue received from the
 *                              WebWorker, used to shift single messages from
 */
Compositor.prototype.handleWith = function handleWith (iterator, commands) {
    var path = commands[iterator];
    var pathArr = path.split('/');
    var context = this.getOrSetContext(pathArr.shift());
    return context.receive(pathArr, path, commands, iterator);
};

/**
 * Retrieves the top-level VirtualElement attached to the passed in document
 * selector.
 * If no such element exists, one will be instantiated, therefore representing
 * the equivalent of a Context in the Main Thread.
 *
 * @method getOrSetContext
 * @private
 *
 * @param  {String} selector            document query selector used for
 *                                      retrieving the DOM node the
 *                                      VirtualElement should be attached to
 * @return {Object} result
 * @return {VirtualElement} result.DOM  final VirtualElement
 */
Compositor.prototype.getOrSetContext = function getOrSetContext(selector) {
    if (this._contexts[selector]) return this._contexts[selector];
    else return (this._contexts[selector] = new Context(selector, this));
};

/**
 * Internal helper method used by `drawCommands`.
 *
 * @method giveSizeFor
 * @private
 *
 * @param  {Array} commands     remaining message queue received from the
 *                              WebWorker, used to shift single messages from
 */
Compositor.prototype.giveSizeFor = function giveSizeFor(iterator, commands) {
    var selector = commands[iterator];
    var size = this.getOrSetContext(selector).getRootSize();
    this.sendResize(selector, size);
    var _this = this;
    if (selector === 'body')
        window.addEventListener('resize', function() {
            if (!_this._sentResize) {
                _this.sendResize(selector, _this.getOrSetContext(selector).getRootSize());
            }
        });
};

/**
 * Internal helper method used for notifying the WebWorker about externally
 * resized contexts (e.g. by resizing the browser window).
 *
 * @method sendResize
 * @private
 *
 * @param  {String} selector    render path to the node (context) that should
 *                              be resized
 * @param  {Array} size         new context size
 */
Compositor.prototype.sendResize = function sendResize (selector, size) {
    this._outCommands.push('WITH', selector, 'TRIGGER', 'CONTEXT_RESIZE', size);
    this._sentResize = true;
};

Compositor.prototype._wrapProxyFunction = function _wrapProxyFunction(id) {
    var _this = this;
    return function() {
        var i;

        for (i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'object') {
                arguments[i] = strip(flatClone(arguments[i]));
            }
        }
        _this._outCommands.push('INVOKE', id, Array.prototype.slice.call(arguments));
    };
};

Compositor.prototype.invoke = function invoke (target, methodName, args, functionArgs) {
    var targetObject = window[target];

    for (var i = 0; i < args.length; i++) {
        if (functionArgs[i] != null) {
            args[i] = this._wrapProxyFunction(functionArgs[i]);
        }
    }

    targetObject[methodName].apply(targetObject, args);
};

/**
 * Processes the previously via `receiveCommands` updated incoming "in"
 * command queue.
 * Called by ThreadManager.
 *
 * @method drawCommands
 *
 * @return {Array} outCommands  set of commands to be sent back to the
 *                              WebWorker
 */
Compositor.prototype.drawCommands = function drawCommands() {
    var commands = this._inCommands;
    var localIterator = 0;
    var command = commands[localIterator];
    while (command) {
        switch (command) {
            case 'WITH':
                localIterator = this.handleWith(++localIterator, commands);
                break;

            case 'INVOKE':
                this.invoke(
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'NEED_SIZE_FOR':
                this.giveSizeFor(++localIterator, commands);
                break;
        }
        command = commands[++localIterator];
    }

    // TODO: Switch to associative arrays here...

    for (var key in this._contexts) {
        this._contexts[key].draw();
    }

    return this._outCommands;
};

/**
 * Used by ThreadManager to update the interal queue of incoming commands.
 * Receiving commands does not immediately start the rederning process.
 *
 * @param  {Array} commands     command queue to be processed by the
 *                              compositor's `drawCommands` method
 */
Compositor.prototype.receiveCommands = function receiveCommands(commands) {
    var len = commands.length;
    for (var i = 0; i < len; i++) {
        this._inCommands.push(commands[i]);
    }
};

/**
 * Flushes the queue of outgoing "out" commands.
 * Called by ThreadManager.
 *
 * @method clearCommands
 */
Compositor.prototype.clearCommands = function clearCommands() {
    this._inCommands.length = 0;
    this._outCommands.length = 0;
    this._sentResize = false;
};

module.exports = Compositor;

},{"./Context":285,"famous-dom-renderers":202,"famous-utilities":215}],285:[function(require,module,exports){
var WebGLRenderer = require('famous-webgl-renderers').WebGLRenderer;
var Camera = require('famous-components').Camera;
var DOMRenderer = require('famous-dom-renderers').DOMRenderer;

function Context(selector, compositor) {
    this._compositor = compositor;
    this._rootEl = document.querySelector(selector);

    if (this._rootEl === document.body) {
        window.addEventListener('resize', this.updateSize.bind(this));
    }

    var DOMLayerEl = document.createElement('div');
    DOMLayerEl.style.width = '100%';
    DOMLayerEl.style.height = '100%';
    DOMLayerEl.style.transformStyle = 'preserve-3d';
    DOMLayerEl.style.webkitTransformStyle = 'preserve-3d';
    this._rootEl.appendChild(DOMLayerEl);
    this.DOMRenderer = new DOMRenderer(DOMLayerEl, selector, compositor); 
 
    this.WebGLRenderer = null;
    this.canvas = null;

    this._renderState = {
        projectionType: Camera.ORTHOGRAPHIC_PROJECTION,
        perspectiveTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewDirty: false,
        perspectiveDirty: false
    };

    this._size = [];
    this._children = {};
    this._elementHash = {};

    this._meshTransform = [];
    this._meshSize = [0, 0, 0];

    this.updateSize();
}

Context.prototype.updateSize = function () {
    var newSize = this.DOMRenderer._getSize();

    var width = newSize[0];
    var height = newSize[1];

    this._size[0] = width;
    this._size[1] = height;
    this._size[2] = (width > height) ? width : height;

    if (this.canvas) {
        this.canvas.width  = width;
        this.canvas.height = height;
    }

    if (this.WebGLRenderer) this.WebGLRenderer.updateSize(this._size);

    return this;
}

Context.prototype.draw = function draw() {
    this.DOMRenderer.draw(this._renderState);
    if (this.WebGLRenderer) this.WebGLRenderer.draw(this._renderState);

    if (this._renderState.perspectiveDirty) this._renderState.perspectiveDirty = false;
    if (this._renderState.viewDirty) this._renderState.viewDirty = false;
};

Context.prototype.getRootSize = function getRootSize() {
    return this.DOMRenderer.getSize();
};

Context.prototype.initWebGL = function initWebGL() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'famous-webgl';
    this._rootEl.appendChild(this.canvas);
    this.WebGLRenderer = new WebGLRenderer(this.canvas);
    this.updateSize();
};

Context.prototype.receive = function receive(pathArr, path, commands, iterator) {
    var pointer;
    var parentEl;
    var element;
    var id;
    var localIterator = iterator;

    var command = commands[++localIterator];
    this.DOMRenderer.loadPath(path);
    this.DOMRenderer.findTarget();
    while (command) {

        switch (command) {
            case 'INIT_DOM':
                this.DOMRenderer.insertEl(commands[++localIterator]);
                break;

            case 'CHANGE_TRANSFORM':
                for (var i = 0 ; i < 16 ; i++) this._meshTransform[i] = commands[++localIterator];

                this.DOMRenderer.setMatrix(this._meshTransform);

                if (this.WebGLRenderer)
                    this.WebGLRenderer.setCutoutUniform(path, 'transform', this._meshTransform);
                
                break;

            case 'CHANGE_SIZE':
                var width = commands[++localIterator];
                var height = commands[++localIterator];

                this.DOMRenderer.setSize(width, height);
                if (this.WebGLRenderer) {
                    this._meshSize[0] = width;
                    this._meshSize[1] = height;
                    this.WebGLRenderer.setCutoutUniform(path, 'size', this._meshSize);
                }
                break;

            case 'CHANGE_PROPERTY':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setProperty(commands[++localIterator], commands[++localIterator]);
                break;

            case 'CHANGE_CONTENT':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setContent(commands[++localIterator]);
                break;

            case 'CHANGE_ATTRIBUTE':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setAttribute(commands[++localIterator], commands[++localIterator]);
                break;

            case 'ADD_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.addClass(commands[++localIterator]); 
                break;

            case 'REMOVE_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.removeClass(commands[++localIterator]);
                break;

            case 'ADD_EVENT_LISTENER':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);

                var type = commands[++localIterator];
                var properties = commands[++localIterator];
                var preventDefault = commands[++localIterator];

                this.DOMRenderer.addEventListener(path, type, properties, preventDefault);
                break;

            case 'GL_SET_DRAW_OPTIONS': 
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshOptions(path, commands[++localIterator]);
                break;

            case 'GL_AMBIENT_LIGHT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setAmbientLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_POSITION':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightPosition(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_COLOR':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'MATERIAL_INPUT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.handleMaterialInput(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_SET_GEOMETRY':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setGeometry(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_UNIFORMS':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshUniform(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_BUFFER_DATA':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.bufferData(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_HIDE_MESH':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.hideMesh(path);
                break;

            case 'GL_SHOW_MESH':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.showMesh(path);
                break;

            case 'PINHOLE_PROJECTION':
                this._renderState.projectionType = Camera.PINHOLE_PROJECTION;
                this._renderState.perspectiveTransform[11] = -1 / commands[++localIterator];

                this._renderState.perspectiveDirty = true;
                break;

            case 'ORTHOGRAPHIC_PROJECTION':
                this._renderState.projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
                this._renderState.perspectiveTransform[11] = 0;

                this._renderState.perspectiveDirty = true;
                break;

            case 'CHANGE_VIEW_TRANSFORM':
                this._renderState.viewTransform[0] = commands[++localIterator];
                this._renderState.viewTransform[1] = commands[++localIterator];
                this._renderState.viewTransform[2] = commands[++localIterator];
                this._renderState.viewTransform[3] = commands[++localIterator];

                this._renderState.viewTransform[4] = commands[++localIterator];
                this._renderState.viewTransform[5] = commands[++localIterator];
                this._renderState.viewTransform[6] = commands[++localIterator];
                this._renderState.viewTransform[7] = commands[++localIterator];

                this._renderState.viewTransform[8] = commands[++localIterator];
                this._renderState.viewTransform[9] = commands[++localIterator];
                this._renderState.viewTransform[10] = commands[++localIterator];
                this._renderState.viewTransform[11] = commands[++localIterator];

                this._renderState.viewTransform[12] = commands[++localIterator];
                this._renderState.viewTransform[13] = commands[++localIterator];
                this._renderState.viewTransform[14] = commands[++localIterator];
                this._renderState.viewTransform[15] = commands[++localIterator];

                this._renderState.viewDirty = true;
                break;

            case 'WITH': return localIterator - 1;
        }

        command = commands[++localIterator];
    }

    return localIterator;
};

module.exports = Context;

},{"famous-components":186,"famous-dom-renderers":202,"famous-webgl-renderers":282}],286:[function(require,module,exports){
'use strict';

/**
 * The ThreadManager is being updated by an Engine by consecutively calling its
 * `update` method. It can either manage a real Web-Worker or the global
 * Famous core singleton.
 *
 * @example
 * var compositor = new Compositor();
 * 
 * // Using a Web Worker
 * var worker = new Worker('worker.bundle.js');
 * var threadmanger = new ThreadManager(worker, compositor);
 * 
 * // Without using a Web Worker
 * var threadmanger = new ThreadManager(Famous, compositor);
 * 
 * @class  ThreadManager
 * @constructor
 * 
 * @param {Famous|Worker} thread        The thread being used to receive
 *                                      messages from and post messages to.
 *                                      Expected to expose a WebWorker-like
 *                                      API, which means providing a way to
 *                                      listen for updates by setting its
 *                                      `onmessage` property and sending
 *                                      updates using `postMessage`.
 * @param {Compositor} compositor       an instance of Compositor used to
 *                                      extract enqueued draw commands from to
 *                                      be sent to the thread
 */
function ThreadManager (thread, compositor) {
    this._thread = thread;
    this._compositor = compositor;

    var _this = this;
    this._thread.onmessage = function (ev) {
        _this._compositor.receiveCommands(ev.data ? ev.data : ev);
    };
    this._thread.onerror = function (error) {
        console.error(error);
    };
}

/**
 * Returns the thread being used by the ThreadManager.
 * This could either be an an actual web worker or a `Famous` singleton.
 *
 * @method getThread
 * 
 * @return {Worker|Famous}  Either a web worker or a `Famous` singleton.
 */
ThreadManager.prototype.getThread = function getThread() {
    return this._thread;
};

/**
 * Returns the compositor being used by this ThreadManager.
 *
 * @method getCompositor
 * 
 * @return {Compositor}     The compositor used by the ThreadManager.
 */
ThreadManager.prototype.getCompositor = function getCompositor() {
    return this._compositor;
};

/**
 * Update method being invoked by the Engine on every `requestAnimationFrame`.
 * Used for updating the notion of time within the managed thread by sending
 * a FRAME command and sending messages to 
 * 
 * @method update
 * 
 * @param  {Number} time unix timestamp to be passed down to the worker as a
 *                       FRAME command
 */
ThreadManager.prototype.update = function update (time) {
    this._thread.postMessage(['FRAME', time]);
    var threadMessages = this._compositor.drawCommands();
    this._thread.postMessage(threadMessages);
    this._compositor.clearCommands();
};

module.exports = ThreadManager;

},{}],287:[function(require,module,exports){
'use strict';

module.exports = {
    Compositor: require('./Compositor'),
    ThreadManager: require('./ThreadManager')
};

},{"./Compositor":284,"./ThreadManager":286}],288:[function(require,module,exports){
'use strict';

var sessionHistorySupport = window.history && window.history.pushState && window.history.replaceState;

/**
 * A stateless shim for hash routing. Used by router.
 *   Supports hash bang routing and HTML5 pushState.
 *   Falls back to hash bang urls when pushState is not supported.
 *   Implements subset of W3C spec in respect to
 *   http://www.w3.org/TR/2011/WD-html5-20110113/history.html#history-0
 *
 * @History
 * @class
 * @constructor
 * @private
 *
 * @example
 * var history = History();
 * console.log(history.hashBangUrls);
 * history.pushState({}, document.title, '/route');
 *
 * @param {Object} options
 * @param {Boolean} options.hashBangUrls force history to use URLs
 *   in the form of /#!/route
 * @param {String} root
 */
function History(options) {
    if (!(this instanceof History)) return new History(options);

    options = options || {};
    this._root = options.root || '';
    this._sessionHistorySupport = sessionHistorySupport;
    this.hashBangUrls = options.hashBangUrls || !this._sessionHistorySupport;
    this._location = window.location;
}

/**
 * @property {Boolean} hashBangUrls
 * @readonly
 */
History.prototype.hashBangUrls = false;

/**
 * Register a function to be invoked on every state change.
 *
 * @method onStateChange
 * @chainable
 *
 * @param {Function} handler callback to invoke on state change
 *
 * @return {History} this
 */
History.prototype.onStateChange = function onStateChange(handler) {
    // prefer HTML5 history API over hashchange when possible
    if (this._sessionHistorySupport) {
        window.addEventListener('popstate', handler);
        window.addEventListener('pushstate', handler);
    }
    else if (this.hashBangUrls && 'onhashchange' in window) {
        window.addEventListener('hashchange', handler);
    }
    else {
        // only possible solution at this point is to use an ugly combination
        // of setInterval and window.location.pathname
    }
    return this;
};

/**
 * Deregister a state change handler that has been previously registered
 *   through onStateChange.
 *
 * @method offStateChange
 * @chainable
 *
 * @param {Function} handler handler previously registered through onStateChange
 *
 * @return {History} this
 */
History.prototype.offStateChange = function offStateChange(handler) {
    window.removeEventListener('popstate', handler);
    window.removeEventListener('pushstate', handler);
    window.removeEventListener('hashchange', handler);
    return this;
};

/**
 * Shim for window.history.pushState
 * 
 * @method pushState
 * @chainable
 *
 * @params {Object} data state object passed through session API if possible,
 *   not accessable later on, used to make arguments list complaint with W3C
 *   spec
 * @params {String=document.title} title new document title, not associated with
 *   new state
 * @params {String} url
 *
 * @return {History} this
 */
History.prototype.pushState = function pushState(data, title, url) {
    document.title = title || document.title;
    if (this.hashBangUrls) {
        if (this._sessionHistorySupport) {
            window.history.pushState(data, title, '#!' + url);
        }
        else {
            window.location.hash = url;
        }
    }
    else {
        window.history.pushState(data, title, url);
    }
    return this;
};

/**
 * Shim for window.history.replaceState
 * 
 * @method replaceState
 * @chainable
 *
 * @params {Object} data state object passed through session API if possible,
 *   not accessable later on, used to make arguments list complaint with W3C
 *   spec
 * @params {String=document.title} title new document title, not associated with
 *   new state
 * @params {String} url
 *
 * @return {History} this
 */
History.prototype.replaceState = function replaceState(data, title, url) {
    document.title = title || document.title;
    if (this.hashBangUrls) {
        if (this._sessionHistorySupport) {
            window.history.replaceState(data, title, '#!' + url);
        }
        else {
            url = ('' + window.location).split('#')[0] + '#!' + url;
            window.location.replace(url);
        }
    }
    else {
        window.history.replaceState(data, title, url);
    }
    return this;
};

/**
 * Return current normalized state (routed pathname).
 * Not compliant with [W3C spec 5.4 Session history and
 * navigation](http://www.w3.org/TR/2011/WD-html5-20110113/history.html)
 *
 * @method getState
 *
 * @return {String|null} state as normalized pathname
 */
History.prototype.getState = function getState() {
    if (!this._location.pathname.match('^' + this._root)) {
        return null;
    }
    if (this.hashBangUrls) {
        return this._location.hash.substring(2);
    }
    else {
        return decodeURI(this._location.pathname).substring(this._root.length);
    }
};

module.exports = History;

},{}],289:[function(require,module,exports){
'use strict';

var _History = require('./History');

/**
 * A simple router supporting HTML5 pushState and hashbang  routing ("#!/").
 * 
 * @example
 * var router = Router({
 *     '/example-route-0': function() {
 *         console.log('/example-route-0');
 *     },
 *     '/example-route-1': function() {
 *         console.log('/example-route-1');
 *     },
 *     '/example-route-2': function() {
 *         console.log('/example-route-2');
 *     },
 *     '/example-route-3': function() {
 *         console.log('/example-route-3');
 *     }
 * });
 *
 * var currentState = 0;
 * var interval = setInterval(function() {
 *     if (currentState === 4) return clearTimeout(interval);
 *     router.navigate('/example-route-' + currentState, { invoke: true });
 *     currentState++;
 * }, 1000);
 * 
 * @class Router
 * @constructor
 *
 * @param {Object} routes
 * @param {Object} options
 * @param {Boolean} options.silent
 * @param {Boolean} options.hashBangUrls
 * @param {Object} options.proxy
 * @param {String} options.root
 * @param {Boolean} options.validate check for unknown routes
 */
function Router(routes, options) {
    if (!(this instanceof Router)) return new Router(routes, options);
    
    routes = routes || {};
    options = options || {};

    this._root = options.root || '';

    this._routes = [];
    this.proxy = options.proxy || {};
    if (options.validate) this.validate = true;

    // Avoids cylic routing by storing the last routed state
    // Seems like W3C spec doesn't mention if pushState event should be
    // dispatched on page load.
    this._lastState = null;

    _addInitialRoutes.call(this, routes);

    this._history = _History({
        hashBangUrls: options.hashBangUrls,
        root: this._root
    }).onStateChange(_onStateChange.bind(this));

    if (!options.silent) this.start();
}

/**
 * Starts the router by invoking the route handler bound to the current
 *   pathname. Will be called by constructor, unless silent option is
 *   in use.
 *
 * @method start
 * @chainable
 *
 * @return {Router} this
 */
Router.prototype.start = function start() {
    this.invoke();
    return this;
};

/**
 * Navigates to the given route. If no route is give, navigate to the current
 *   pathname (used during initialization).
 *
 * @method navigate
 * @chainable
 *
 * @param {String} [state=current pathname]
 * @param {Object} options
 * @param {Boolean} options.replace
 * @param {Boolean} options.invoke
 *
 * @return {Router} this
 */
Router.prototype.navigate = function navigate(state, options) {
    options = options || {};
    state = state || this._history.getState();
    if (this._lastState === state) return this;

    var method = options.replace ? 'replaceState' : 'pushState';
    this._history[method](null, null, state);

    if (options.invoke) this.invoke();
    return this;
};

/**
 * Dynamically adds a route to the register.
 *
 * @method addRoute
 * @chainable
 *
 * @param {String|RegExp} route
 * @param {Function} handler
 *
 * @return {Router} this
 */
Router.prototype.addRoute = function addRoute(route, handler) {
    if (typeof route === 'string') route = _createRegExpRoute(route);
    this._routes.push({ regExp: route, handler: handler });
    return this;
};

/**
 * Invokes the handler bound to the given state.
 *
 * @method invoke
 * @chainable
 *
 * @param {String} [state=current pathname] route
 *
 * @return {Router} this
 */
Router.prototype.invoke = function invoke(state) {
    if (this._lastState === state) return this;
    state = state || this._history.getState();
    if (state === null) return;
    var unknown = this._routes.every(function (route) {
        var result = _checkRoute.call(this, route, state);
        if (result) {
            if (typeof route.handler === 'string' && this.proxy[route.handler]) {
                this.proxy[route.handler].apply(null, result);
            }
            else {
                route.handler.apply(null, result);
            }
        }
        return !result;
    }.bind(this));
    if (unknown && this.validate) throw new Error('Unknown route');
    return this;
};

function _checkRoute(route, state) {
    var result = state.match(route.regExp);
    if (!result) return false;

    // no support for nested capturing groups
    result = result.slice(1);
    return result;
}

function _createRegExpRoute(route) {
    // TODO could be extended to splats etc.
    route = route.replace(/\:\w+/, function (param) {
        param = param.substring(1);
        return '(' + param + ')';
    });
    return new RegExp('^' + route + '$');
}

function _onStateChange() {
    /* jshint validthis: true */
    this.invoke();
}

function _addInitialRoutes(routes, scope) {
    /* jshint validthis: true */
    scope = scope || '';
    if (Array.isArray(routes)) {
        // composing nested sets of regular expressions of regular expressions
        // including lookarounds might lead to unexpected behavior. For now,
        // those can't be traversed.
        routes.forEach(function(routeSpec) {
            this.addRoute(routeSpec.route, routeSpec.handler);
        }.bind(this));
    } else {
        for (var route in routes) {
            var handler = routes[route];
            if (handler instanceof Function || typeof handler === 'string') {
                this.addRoute(scope + route, routes[route]);
            }
            else {
                _addInitialRoutes.call(this, routes[route], scope + route);
            }
        }
    }
}

module.exports = Router;

},{"./History":288}],290:[function(require,module,exports){
'use strict';

module.exports = {
    History: require('./History'),
    Router: require('./Router')
};

},{"./History":288,"./Router":289}],291:[function(require,module,exports){
module.exports = function (css, customDocument) {
  var doc = customDocument || document;
  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet()
    sheet.cssText = css;
    return sheet.ownerNode;
  } else {
    var head = doc.getElementsByTagName('head')[0],
        style = doc.createElement('style');

    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(doc.createTextNode(css));
    }

    head.appendChild(style);
    return style;
  }
};

module.exports.byUrl = function(url) {
  if (document.createStyleSheet) {
    return document.createStyleSheet(url).ownerNode;
  } else {
    var head = document.getElementsByTagName('head')[0],
        link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = url;

    head.appendChild(link);
    return link;
  }
};

},{}],292:[function(require,module,exports){
var css = "html {\n    width: 100%;\n    height: 100%;\n    margin: 0px;\n    padding: 0px;\n    overflow: hidden;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n}\n\nbody {\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    margin: 0px;\n    padding: 0px;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n    -webkit-font-smoothing: antialiased;\n    -webkit-tap-highlight-color: transparent;\n    -webkit-perspective: 0;\n    perspective: none;\n    overflow: hidden;\n}\n\n.famous-container, .famous-group {\n    position: absolute;\n    top: 0px;\n    left: 0px;\n    bottom: 0px;\n    right: 0px;\n    overflow: visible;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n    -webkit-backface-visibility: visible;\n    backface-visibility: visible;\n    pointer-events: none;\n}\n\n.famous-group {\n    width: 0px;\n    height: 0px;\n    margin: 0px;\n    padding: 0px;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d;\n}\n\n.fa-surface {\n    position: absolute;\n    -webkit-transform-origin: 0% 0%;\n    transform-origin: 0% 0%;\n    -webkit-backface-visibility: visible;\n    backface-visibility: visible;\n    -webkit-transform-style: preserve-3d;\n    transform-style: preserve-3d; /* performance */\n    -webkit-tap-highlight-color: transparent;\n    pointer-events: auto;\n    z-index: 1; /* HACK to account for browser issues with eventing on the same z-plane*/\n}\n\n.fa-content {\n    position: absolute;\n}\n\n.famous-container-group {\n    position: relative;\n    width: 100%;\n    height: 100%;\n}\n\n.fa-container {\n    position: absolute;\n    -webkit-transform-origin: center center;\n    transform-origin: center center;\n    overflow: hidden;\n}\n\ncanvas.famous-webgl {\n    pointer-events: none;\n    position: absolute;\n    z-index: 1;\n    top: 0px;\n    left: 0px;\n}"; (require("/Users/morgantheplant/Code/refactor/vectr/node_modules/famous/node_modules/famous-stylesheets/node_modules/cssify"))(css); module.exports = css;
},{"/Users/morgantheplant/Code/refactor/vectr/node_modules/famous/node_modules/famous-stylesheets/node_modules/cssify":291}],293:[function(require,module,exports){
'use strict';

require('./famous.css');

},{"./famous.css":292}],294:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],295:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./Curves":294,"dup":17}],296:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./Curves":294,"./Transitionable":295,"dup":18}],297:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],298:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./Curves":297,"dup":17}],299:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./Curves":297,"./Transitionable":298,"dup":18}],300:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],301:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":299}],302:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],303:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],304:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],305:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],306:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],307:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":300,"./Color":301,"./KeyCodes":302,"./MethodStore":303,"./ObjectManager":304,"./clone":305,"./flatClone":306,"./keyValueToArrays":308,"./loadURL":309,"./strip":310,"dup":31}],308:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],309:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],310:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],311:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],312:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./Mat33":311,"dup":12}],313:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],314:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],315:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"./Mat33":311,"./Quaternion":312,"./Vec2":313,"./Vec3":314,"dup":15}],316:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],317:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],318:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":316,"dup":21}],319:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],320:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":316,"./Easing":317,"./Transitionable":318,"./after":319,"dup":23}],321:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],322:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":320}],323:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],324:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],325:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],326:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],327:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],328:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":321,"./Color":322,"./KeyCodes":323,"./MethodStore":324,"./ObjectManager":325,"./clone":326,"./flatClone":327,"./keyValueToArrays":329,"./loadURL":330,"./strip":331,"dup":31}],329:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],330:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],331:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],332:[function(require,module,exports){
arguments[4][256][0].apply(exports,arguments)
},{"./Geometry":333,"dup":256}],333:[function(require,module,exports){
arguments[4][257][0].apply(exports,arguments)
},{"dup":257}],334:[function(require,module,exports){
arguments[4][258][0].apply(exports,arguments)
},{"dup":258,"famous-math":315}],335:[function(require,module,exports){
arguments[4][259][0].apply(exports,arguments)
},{"./GeometryHelper":334,"dup":259,"famous-utilities":328}],336:[function(require,module,exports){
arguments[4][260][0].apply(exports,arguments)
},{"./DynamicGeometry":332,"./Geometry":333,"./GeometryHelper":334,"./OBJLoader":335,"./primitives/Box":337,"./primitives/Circle":338,"./primitives/Cylinder":339,"./primitives/GeodesicSphere":340,"./primitives/Icosahedron":341,"./primitives/ParametricCone":342,"./primitives/Plane":343,"./primitives/Sphere":344,"./primitives/Tetrahedron":345,"./primitives/Torus":346,"./primitives/Triangle":347,"dup":260}],337:[function(require,module,exports){
arguments[4][261][0].apply(exports,arguments)
},{"../Geometry":333,"dup":261}],338:[function(require,module,exports){
arguments[4][262][0].apply(exports,arguments)
},{"../Geometry":333,"dup":262}],339:[function(require,module,exports){
arguments[4][263][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":263}],340:[function(require,module,exports){
arguments[4][264][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":264}],341:[function(require,module,exports){
arguments[4][265][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":265}],342:[function(require,module,exports){
arguments[4][266][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":266}],343:[function(require,module,exports){
arguments[4][267][0].apply(exports,arguments)
},{"../Geometry":333,"dup":267}],344:[function(require,module,exports){
arguments[4][268][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":268}],345:[function(require,module,exports){
arguments[4][269][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":269}],346:[function(require,module,exports){
arguments[4][270][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":270}],347:[function(require,module,exports){
arguments[4][271][0].apply(exports,arguments)
},{"../Geometry":333,"../GeometryHelper":334,"dup":271}],348:[function(require,module,exports){
'use strict';

var TextureRegistry = require('./TextureRegistry');

/** 
 * A list of glsl expressions which can interface with javascript data and
 * connected to each other to build custom shaders. 
 *
 */
var expressions = {};

var snippets = {

    /* Abs - The abs function returns the absolute value of x, i.e. x when x is positive or zero and -x for negative x. The input parameter can be a floating scalar or a float vector. In case of a float vector the operation is done component-wise.
     */ 

    abs: {glsl: 'abs(%1);'},
    /* Sign - The sign function returns 1.0 when x is positive, 0.0 when x is zero and -1.0 when x is negative. The input parameter can be a floating scalar or a float vector. In case of a float vector the operation is done component-wise. */


    sign: {glsl: 'sign(%1);'},

    /* Floor - The floor function returns the largest integer number that is smaller or equal to x. The input parameter can be a floating scalar or a float vector. In case of a float vector the operation is done component-wise. */

    floor: {glsl: 'floor(%1);'},

    /* Ceiling - The ceiling function returns the smallest number that is larger or equal to x. The input parameter can be a floating scalar or a float vector. In case of a float vector the operation is done component-wise. */

    ceiling: {glsl: 'ceil(%1);'},

    /* The mod expression returns the remained of the division operation of the two inputs. */
    mod: {glsl: 'mod(%1, %2);'},

    /* Min - The min function returns the smaller of the two arguments. The input parameters can be floating scalars or float vectors. In case of float vectors the operation is done component-wise. */

    min: {glsl: 'min(%1, %2);'},

    /* Max - The max function returns the larger of the two arguments. The input parameters can be floating scalars or float vectors. In case of float vectors the operation is done component-wise. */ 

    max: {glsl: 'max(%1, %2);'},
    /* Clamp - The clamp function returns x if it is larger than minVal and smaller than maxVal. In case x is smaller than minVal, minVal is returned. If x is larger than maxVal, maxVal is returned. The input parameters can be floating scalars or float vectors. In case of float vectors the operation is done component-wise. */

    clamp: {glsl: 'clamp(%1, %2, %3);'},

    /* Mix - The mix function returns the linear blend of x and y, i.e. the product of x and (1 - a) plus the product of y and a. The input parameters can be floating scalars or float vectors. In case of float vectors the operation is done component-wise. */

    mix: {glsl: 'mix(%1, %2, %3);'},

    /* Step - The step function returns 0.0 if x is smaller then edge and otherwise 1.0. The input parameters can be floating scalars or float vectors. In case of float vectors the operation is done component-wise. */

    step: {glsl: 'step(%1, %2, %3);'},
    
    /* Smoothstep - The smoothstep function returns 0.0 if x is smaller then edge0 and 1.0 if x is larger than edge1. Otherwise the return value is interpolated between 0.0 and 1.0 using Hermite polynomirals. The input parameters can be floating scalars or float vectors. In case of float vectors the operation is done component-wise. */ 

    smoothstep: {glsl: 'smoothstep(%1);'},


    /* fragCoord - The fragCoord function returns the fragment's position in screenspace. */

    fragCoord: {glsl: 'gl_FragColor.xy;'},

    /* Sin - The sin function returns the sine of an angle in radians. The input parameter can be a floating scalar or a float vector. In case of a float vector the sine is calculated separately for every component. */


    sin: {glsl: 'sin(%1);'},

    /* Cos - The cos function returns the cosine of an angle in radians. The input parameter can be a floating scalar or a float vector. */

    cos: {glsl: 'cos(%1);'},

    /* Pow - The power function returns x raised to the power of y. The input parameters can be floating scalars or float vectors. In case of float vectors the operation is done component-wise. */ 

    pow: {glsl: 'pow(%1, %2);'},

    /* Sqrt - The sqrt function returns the square root of x. The input parameter can be a floating scalar or a float vector. In case of a float vector the operation is done component-wise. */ 

    /* fragCoord - The time function returns the elapsed time in the unix epoch in milliseconds.*/

    time: {glsl: 'time;'},

    /* The Add function takes two inputs, adds them together and outputs the result. This addition operation is performed on a per channel basis, meaning that the inputs' R channels get added, G channels get added, B channels get added, etc. Both inputs must have the same number of channels unless one of them is a single Constant value. Constants can be added to a vector with any number of inputs. */
    add: {glsl: '%1 + %2;'},

    /* The Add function takes two inputs, adds them together and outputs the result. This addition operation is performed on a per channel basis, meaning that the inputs' R channels get added, G channels get added, B channels get added, etc. Both inputs must have the same number of channels unless one of them is a single Constant value. Constants can be added to a vector with any number of inputs. */
    multiply: {glsl: '%1 * %2;'},


    /* The normal function returns the 3-dimensional surface normal, which is a vector that is perpendicular to the tangent plane at that point.*/
    normal: {glsl:'(v_Normal + 1.0) * 0.5;'},

    /* The uv function returns the 2-dimensional vector that maps the object's 3-dimensional vertices to a 2D plane. */
    uv: {glsl:'vec3(v_TextureCoordinate, 1);'},

    /* The mesh position function returns the transformed fragment's position in world-space.  */
    meshPosition: {glsl:'(v_Position + 1.0) * 0.5;'},


    /* The image function fetches the model's */
    image: {glsl:'texture2D(image, v_TextureCoordinate).rgb;'},


    /* The constant function returns a static value which is defined at compile-time that cannot be changed dynamically.*/
    constant: {glsl: '%1;'},
    
    /* The Parameter expression has values that can be modified (dynamically during runtime in some cases) in a MaterialInstance of the base material containing the parameter. These expressions should be given unique names, via the Parameter Name property, to be used when identifying the specific parameter in the MaterialInstance. If two parameters of the same type have the same name in the same material, they will be assumed to be the same parameter. Changing the value of the parameter in the MaterialInstance would change the value of both the parameter expressions in the material. A default value for the parameter will also be set in the base material. This will be the value of the parameter in the MaterialInstance unless it is overridden and modified there. */

    parameter: {uniforms: {parameter: 1}, glsl: 'parameter;'}
};

expressions.registerExpression = function registerExpression(name, schema) {
    this[name] = function (inputs, options) {
        return new Material(name, schema, inputs, options);
    };
};

for (var name in snippets) {
    expressions.registerExpression(name, snippets[name]);
}

/**
 * Material is a public class that composes a material-graph out of expressions
 *
 *
 * @class Material
 * @constructor
 *
 * @param {Object} definiton of nascent expression with shader code, inputs and uniforms
 * @param {Array} list of Material expressions, images, or constant
 * @param {Object} map of uniform data of float, vec2, vec3, vec4
 */

function Material(name, chunk, inputs, options) {
    options = options || {};

    this.name = name;
    this.chunk = chunk;
    this.inputs = inputs ? (Array.isArray(inputs) ? inputs : [inputs]): [];
    this.uniforms = options.uniforms || {};
    this.varyings = options.varyings;
    this.attributes = options.attributes;
    if (options.texture) {
        this.texture = options.texture.__isATexture__ ? options.texture : TextureRegistry.register(null, options.texture);
    }

    this._id = Material.id++;

    this.invalidations = [];
}

Material.id = 1;

/**
 * Iterates over material graph
 *
 * @method traverse
 * @chainable
 *
 * @param {Function} invoked upon every expression in the graph
 */

Material.prototype.traverse = function traverse(callback) {
    var len = this.inputs && this.inputs.length, idx = -1;

    while (++idx < len) traverse.call(this.inputs[idx], callback, idx);

    callback(this);

    return this;
};

Material.prototype.setUniform = function setUniform(name, value) {
    this.uniforms[name] = value;

    this.invalidations.push(name);
};

/**
 * Converts material graph into chunk
 *
 * @method _compile
 * @protected
 *
 */

Material.prototype._compile = function _compile() {
    var glsl = '';
    var uniforms = {};
    var varyings = {};
    var attributes = {};
    var defines = [];
    var texture;

    this.traverse(function (node, depth) {
        if (! node.chunk) return;
        glsl += 'vec3 ' + makeLabel(node) + '=' + processGLSL(node.chunk.glsl, node.inputs) + '\n ';
        if (node.uniforms) extend(uniforms, node.uniforms);
        if (node.varyings) extend(varyings, node.varyings);
        if (node.attributes) extend(attributes, node.attributes);
        if (node.chunk.defines) defines.push(node.chunk.defines);
        if (node.texture) texture = node.texture;
    });

    return {
        _id: this._id,
        glsl: glsl + 'return ' + makeLabel(this) + ';',
        defines: defines.join('\n'),
        uniforms: uniforms,
        varyings: varyings,
        attributes: attributes,
        texture: texture
    };
};

function extend (a, b) { for (var k in b) a[k] = b[k]; }

function processGLSL(str, inputs) {
    return str.replace(/%\d/g, function (s) {
        return makeLabel(inputs[s[1]-1]);
    });
}
function makeLabel (n) {
    if (Array.isArray(n)) return arrayToVec(n);
    if (typeof n == 'object') return 'fa_' + (n._id);
    else return JSON.stringify(n);
}

function arrayToVec(array) {
    var len = array.length;
    return 'vec' + len + '(' + array.join(',')  + ')';
}

module.exports = expressions;
expressions.Material = Material;
expressions.Texture = function (source) {
    if (typeof window === 'undefined') return console.error('Texture constructor cannot be run inside of a worker');
    return expressions.image([], { texture: source });
};

},{"./TextureRegistry":349}],349:[function(require,module,exports){
'use strict';

/*
 * A singleton object that holds texture instances in a registry which
 * can be accessed by key.  Allows for texture sharing and easy referencing.
 *
 * @static
 * @class TextureRegistry
 */
var TextureRegistry = {
	registry: {},
	textureIds: 1
};

/*
 * Registers a new Texture object with a unique id and input parameters to be
 * handled by the WebGLRenderer.  If no accessor is input the texture will be 
 * created but not store in the registry.
 *
 * @method register
 *
 * @param {String} accessor Key used to later access the texture object.
 * @param {Object | Array | String} data Data to be used in the WebGLRenderer to
 * generate texture data.
 * @param {Object} options Optional parameters to affect the rendering of the
 * WebGL texture.
 *
 * @return {Object} Newly generated texture object.
 */
TextureRegistry.register = function register(accessor, data, options) {
	if (accessor) return (this.registry[accessor] = { id: this.textureIds++, __isATexture__: true, data: data, options: options });
	else return { id: this.textureIds++, data: data, __isATexture__: true, options: options };
};

/*
 * Retreives the texture object from registry.  Throws if no texture is
 * found at given key.
 *
 * @method get
 *
 * @param {String} accessor Key of a desired texture in the registry.
 *
 * @return {Object} Desired texture object.
 */
TextureRegistry.get = function get(accessor) {
	if (!this.registry[accessor]) {
		throw 'Texture "' + accessor + '" not found!';
	}
	else {
		return this.registry[accessor];
	}
}

module.exports = TextureRegistry;

},{}],350:[function(require,module,exports){
'use strict';

module.exports = {
    Material: require('./Material'),
    TextureRegistry: require('./TextureRegistry')
};
},{"./Material":348,"./TextureRegistry":349}],351:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],352:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./Mat33":351,"dup":12}],353:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],354:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14}],355:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"./Mat33":351,"./Quaternion":352,"./Vec2":353,"./Vec3":354,"dup":15}],356:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],357:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],358:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Curves":356,"dup":21}],359:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],360:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Curves":356,"./Easing":357,"./Transitionable":358,"./after":359,"dup":23}],361:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],362:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"famous-transitions":360}],363:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26}],364:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],365:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],366:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],367:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],368:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./CallbackStore":361,"./Color":362,"./KeyCodes":363,"./MethodStore":364,"./ObjectManager":365,"./clone":366,"./flatClone":367,"./keyValueToArrays":369,"./loadURL":370,"./strip":371,"dup":31}],369:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],370:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],371:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],372:[function(require,module,exports){
arguments[4][256][0].apply(exports,arguments)
},{"./Geometry":373,"dup":256}],373:[function(require,module,exports){
arguments[4][257][0].apply(exports,arguments)
},{"dup":257}],374:[function(require,module,exports){
arguments[4][258][0].apply(exports,arguments)
},{"dup":258,"famous-math":355}],375:[function(require,module,exports){
arguments[4][259][0].apply(exports,arguments)
},{"./GeometryHelper":374,"dup":259,"famous-utilities":368}],376:[function(require,module,exports){
arguments[4][260][0].apply(exports,arguments)
},{"./DynamicGeometry":372,"./Geometry":373,"./GeometryHelper":374,"./OBJLoader":375,"./primitives/Box":377,"./primitives/Circle":378,"./primitives/Cylinder":379,"./primitives/GeodesicSphere":380,"./primitives/Icosahedron":381,"./primitives/ParametricCone":382,"./primitives/Plane":383,"./primitives/Sphere":384,"./primitives/Tetrahedron":385,"./primitives/Torus":386,"./primitives/Triangle":387,"dup":260}],377:[function(require,module,exports){
arguments[4][261][0].apply(exports,arguments)
},{"../Geometry":373,"dup":261}],378:[function(require,module,exports){
arguments[4][262][0].apply(exports,arguments)
},{"../Geometry":373,"dup":262}],379:[function(require,module,exports){
arguments[4][263][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":263}],380:[function(require,module,exports){
arguments[4][264][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":264}],381:[function(require,module,exports){
arguments[4][265][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":265}],382:[function(require,module,exports){
arguments[4][266][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":266}],383:[function(require,module,exports){
arguments[4][267][0].apply(exports,arguments)
},{"../Geometry":373,"dup":267}],384:[function(require,module,exports){
arguments[4][268][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":268}],385:[function(require,module,exports){
arguments[4][269][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":269}],386:[function(require,module,exports){
arguments[4][270][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":270}],387:[function(require,module,exports){
arguments[4][271][0].apply(exports,arguments)
},{"../Geometry":373,"../GeometryHelper":374,"dup":271}],388:[function(require,module,exports){
'use strict';
var Geometry = require('famous-webgl-geometries');

/**
 * The Mesh class is responsible for providing the API for how
 * a RenderNode will interact with the WebGL API by adding
 * a set of commands to the renderer.
 *
 * @class Mesh
 * @constructor
 * @renderable
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved
 * @param {object} Options Optional params for configuring Mesh
 */
function Mesh (node, options) {
    this._node = node;
    this._changeQueue = [];
    this._initialized = false;
    this._requestingUpdate = false;
    this._inDraw = false;
    this.value = {
        drawOptions: null,
        color: null,
        expressions: {},
        geometry: null,
        flatShading: null,
        glossiness: null,
        positionOffset: null,
        normals: null
    };

    if (options) this.setDrawOptions(options);
    this._id = node.addComponent(this);
}

/**
 * Pass custom options to Mesh, such as a 3 element map
 * which displaces the position of each vertex in world space.
 *
 * @method setDrawOptions
 * @chainable
 *
 * @param {Object} Options
 * @chainable
 */
Mesh.prototype.setDrawOptions = function setOptions (options) {
    if (this.value.drawOptions.blendMode) {
        this.value.drawOptions.blendMode = options.blendMode;
        this._changeQueue.push('GL_SET_DRAW_OPTIONS');
        this._changeQueue.push(options);
    } else {
        this.vale.drawOptions = {
            blendMode: options.blendMode
        };
        this._changeQueue.push('GL_SET_DRAW_OPTIONS');
        this._changeQueue.push(options);
    }
    return this;
};

/**
 * Get the mesh's custom options.
 *
 * @method getDrawOptions
 * @returns {Object} Options
 */
Mesh.prototype.getDrawOptions = function getDrawOptions () {
    return this.value.drawOptions;
};

/**
 * Set the geometry of a mesh.
 *
 * @method setGeometry
 * @chainable
 *
 * @param {Geometry} geometry instance to be associated with the mesh
 * @param {Object} Options Various configurations for geometries.
 * @chainable
 */
Mesh.prototype.setGeometry = function setGeometry (geometry, options) {
    if (typeof geometry === 'string') {
        if (!Geometry[geometry]) throw 'Invalid geometry: "' + geometry + '".';
        else geometry = new Geometry[geometry](options);
    }

    if (this.value.geometry !== geometry || this._inDraw) {
        if (this._initialized) {
            this._changeQueue.push('GL_SET_GEOMETRY');
            this._changeQueue.push(geometry.id);
            this._changeQueue.push(geometry.spec.type);
            this._changeQueue.push(geometry.spec.dynamic);
        }
        this._requestUpdate();
        this.value.geometry = geometry;
    }

    return this;
};

/**
 * Get the geometry of a mesh.
 *
 * @method getGeometry
 * @returns {Geometry} geometry Geometry of mesh
 */
Mesh.prototype.getGeometry = function getGeometry () {
    return this.value.geometry;
};

/**
* Changes the color of Mesh, passing either a material expression or
* color using the 'Color' utility component.
*
* @method setBaseColor
* @param {Object|Color} Material, image, vec3, or Color instance
* @chainable
*/
Mesh.prototype.setBaseColor = function setBaseColor (color) {
    var uniformValue;
    if (color._compile) {
        this.value.expressions.baseColor = color;
        uniformValue = color._compile(); 
    } else if (color.getNormalizedRGB) {
        this.value.expressions.baseColor = null;
        this.value.color = color;
        uniformValue = color.getNormalizedRGB();
    }

    if (this._initialized) {
        // If a material expression
        if (color._compile) {
            this._changeQueue.push('MATERIAL_INPUT');
        }

        // If a color component
        else if (color.getNormalizedRGB) {
            this._changeQueue.push('GL_UNIFORMS');
        }
        this._changeQueue.push('baseColor');
        this._changeQueue.push(uniformValue);
    }

    this._requestUpdate();

    return this;
};

/**
 * Returns either the material expression or the color instance of Mesh.
 *
 * @method getBaseColor
 * @returns {MaterialExpress|Color}
 */
Mesh.prototype.getBaseColor = function getBaseColor () {
    return this.value.expressions.baseColor || this.value.color;
};

/**
 * Change whether the Mesh is affected by light. Default is true.
 *
 * @method setFlatShading
 * @param {boolean} Boolean
 * @chainable
 */
Mesh.prototype.setFlatShading = function setFlatShading (bool) {
    if (this._inDraw || this.value.flatShading !== bool) {
        this.value.flatShading = bool;
        if (this._initialized) {
            this._changeQueue.push('GL_UNIFORMS');
            this._changeQueue.push('u_FlatShading');
            this._changeQueue.push(bool ? 1 : 0);        
        }
        this._requestUpdate();
    }

    return this;
};

/**
 * Returns a boolean for whether Mesh is affected by light.
 *
 * @method getFlatShading
 * @returns {Boolean} Boolean
 */
Mesh.prototype.getFlatShading = function getFlatShading () {
    return this.value.flatShading;
};


/**
 * Defines a 3-element map which is used to provide significant physical
 * detail to the surface by perturbing the facing direction of each individual
 * pixel.
 *
 * @method normal
 * @chainable
 *
 * @param {Object|Array} Material, Image or vec3
 * @return {Element} current Mesh
 */
Mesh.prototype.setNormals = function setNormals (materialExpression) {
    if (materialExpression._compile) {
        this.value.expressions.normals = materialExpression;
        materialExpression = materialExpression._compile();
    }

    if (this._initialized) {
        this._changeQueue.push(materialExpression._compile ? 'MATERIAL_INPUT' : 'UNIFORM_INPUT');
        this._changeQueue.push('normal');
        this._changeQueue.push(materialExpression);
    }

    this._requestUpdate();

    return this;
};

/**
 * Returns the Normals expression of Mesh
 *
 * @method getNormals
 * @returns The normals expression for Mesh
 */
Mesh.prototype.getNormals = function getNormals (materialExpression) {
    return this.value.expressions.normals;
};

/**
 * Defines the glossiness of the mesh from either a material expression or a
 * scalar value
 *
 * @method setGlossiness
 * @param {MaterialExpression|Number}
 * @param {Object} Optional tweening parameter
 * @param {Function} Callback
 * @chainable
 */
Mesh.prototype.setGlossiness = function setGlossiness (materialExpression) {
    var glossiness;

    if (materialExpression._compile) {
        this.value.expressions.glossiness = materialExpression;
        glossiness = materialExpression._compile();
    }
    else {
        this.value.expressions.glossiness = null;
        this.value.glossiness = materialExpression;
        glossiness = this.value.glossiness;
    }

    if (this._initialized) {
        this._changeQueue.push(materialExpression._compile ? 'MATERIAL_INPUT' : 'GL_UNIFORMS');
        this._changeQueue.push('glossiness');
        this._changeQueue.push(glossiness);
    }

    this._requestUpdate();

    return this;
};

/**
 * Returns material expression or scalar value for glossiness.
 *
 * @method getGlossiness
 * @returns {MaterialExpress|Number}
 */
Mesh.prototype.getGlossiness = function getGlossiness () {
    return this.value.expressions.glossiness || this.value.glossiness;
};

/**
 * Defines 3 element map which displaces the position of each vertex in world
 * space.
 *
 * @method setPositionOffset
 * @chainable
 *
 * @param {MaterialExpression|Array}
 * @param {Object} Optional tweening parameter
 * @param {Function} Callback
 * @chainable
 */
Mesh.prototype.setPositionOffset = function positionOffset (materialExpression) {
    var uniformValue;

    if (materialExpression._compile) {
        this.value.expressions.positionOffset = materialExpression;
        uniformValue = materialExpression._compile();
    }
    else {
        this.value.expressions.positionOffset = null;
        this.value.positionOffset = materialExpression;
        uniformValue = this.value.positionOffset;
    }

    if (this._initialized) {
        this._changeQueue.push(materialExpression._compile ? 'MATERIAL_INPUT' : 'GL_UNIFORMS');
        this._changeQueue.push('positionOffset');
        this._changeQueue.push(uniformValue);
    }

    this._requestUpdate();

    return this;
};

/**
 * Returns position offset.
 *
 * @method getPositionOffset
 * @returns {MaterialExpress|Number}
 */
Mesh.prototype.getPositionOffset = function getPositionOffset (materialExpression) {
    return this.value.expressions.positionOffset || this.value.positionOffset;
};

/**
 * Get the mesh's custom options.
 *
 * @method getDrawOptions
 * @returns {Object} Options
 */
Mesh.prototype.getMaterialExpressions = function getMaterialExpressions () {
    return this.value.expressions;
};

Mesh.prototype.getValue = function getValue () {
    return this.value;
};

Mesh.prototype._pushInvalidations = function pushInvalidations (expressionName) {
    var uniformKey;
    var expression = this.value.expressions[expressionName];
    if (expression) {
        var i = expression.invalidations.length;
        while (i--) {
            uniformKey = expression.invalidations.pop();
            this._node.sendDrawCommand('GL_UNIFORMS');
            this._node.sendDrawCommand(uniformKey);
            this._node.sendDrawCommand(expression.uniforms[uniformKey]);
        }
    }
};

/**
* Sends draw commands to the renderer
*
* @private
* @method onUpdate
*/
Mesh.prototype.onUpdate = function onUpdate () {
    var node = this._node;
    var queue = this._changeQueue;

    if (node) {
        node.sendDrawCommand('WITH');
        node.sendDrawCommand(node.getLocation());

        if (this.value.geometry) {
        i = this.value.geometry.spec.invalidations.length;
            while (i--) {
                var bufferIndex = this.value.geometry.spec.invalidations.pop();
                node.sendDrawCommand('GL_BUFFER_DATA');
                node.sendDrawCommand(this.value.geometry.id);
                node.sendDrawCommand(this.value.geometry.spec.bufferNames[i]);
                node.sendDrawCommand(this.value.geometry.spec.bufferValues[i]);
                node.sendDrawCommand(this.value.geometry.spec.bufferSpacings[i]);
            }
        }

        // If any invalidations exist, push them into the queue
        if (this.value.color && this.value.color.isActive()) {
            this._node.sendDrawCommand('GL_UNIFORMS');
            this._node.sendDrawCommand('baseColor');
            this._node.sendDrawCommand(this.value.color.getNormalizedRGB());
            this._node.requestUpdateOnNextTick(this._id);
        } else {
            this._requestingUpdate = false;
        }

        // If any invalidations exist, push them into the queue
        this._pushInvalidations('baseColor');
        this._pushInvalidations('positionOffset');

        for (var i = 0; i < queue.length; i++) {
            node.sendDrawCommand(queue[i]);
        }

        queue.length = 0;
    }

};

Mesh.prototype.onMount = function onMount (node, id) {
    this._node = node;
    this._id = id;

    this.draw();
};

Mesh.prototype.onDismount = function onDismount () {
    this._initialized = false;
    this.onHide();
};

Mesh.prototype.onShow = function onShow () {
    this._changeQueue.push('GL_HIDE_MESH');
};

Mesh.prototype.onHide = function onHide () {
    this._changeQueue.push('GL_HIDE_MESH');
};

/**
 * Receives transform change updates from the scene graph.
 *
 * @private
 */
Mesh.prototype.onTransformChange = function onTransformChange (transform) {
    if (this._initialized) {
        this._changeQueue.push('GL_UNIFORMS');
        this._changeQueue.push('transform');
        this._changeQueue.push(transform);        
    }

    this._requestUpdate();
};

/**
 * Receives size change updates from the scene graph.
 *
 * @private
 */
Mesh.prototype.onSizeChange = function onSizeChange (size) {
    if (this._initialized) {
        this._changeQueue.push('GL_UNIFORMS');
        this._changeQueue.push('size');
        this._changeQueue.push(size);
    }

    this._requestUpdate();
};

/**
 * Receives opacity change updates from the scene graph.
 *
 * @private
 */
Mesh.prototype.onOpacityChange = function onOpacityChange (opacity) {
    if (this._initialized) {
        this._changeQueue.push('GL_UNIFORMS');
        this._changeQueue.push('opacity');
        this._changeQueue.push(opacity);
    }
    
    this._requestUpdate();
};

Mesh.prototype.onAddUIEvent = function onAddUIEvent (UIEvent, methods, properties) {
    //TODO
};

Mesh.prototype._requestUpdate = function _requestUpdate () {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
};

Mesh.prototype.init = function init () {
    this._initialized = true;
    this.onTransformChange(this._node.getTransform());
    this.onSizeChange(this._node.getSize());
    this.onOpacityChange(this._node.getOpacity());
    this._requestUpdate();
};

Mesh.prototype.draw = function draw () {
    var key;
    var i;
    var len;

    this._inDraw = true;

    this.init();

    var value = this.getValue();
    if (value.geometry != null) this.setGeometry(value.geometry);
    if (value.color != null) this.setBaseColor(value.color);
    if (value.drawOptions != null) this.setDrawOptions(value.drawOptions);
    if (value.flatShading != null) this.setFlatShading(value.flatShading);
    if (value.expressions.normals != null) this.setNormals(value.expressions.normals);
    if (value.expressions.baseColor != null) this.setBaseColor(value.expressions.baseColor);
    if (value.expressions.glossiness != null) this.setGlossiness(value.expressions.glossiness);
    if (value.expressions.positionOffset != null) this.setPositionOffset(value.expressions.positionOffset);

    this._inDraw = false;
};

module.exports = Mesh;

},{"famous-webgl-geometries":376}],389:[function(require,module,exports){
'use strict';

module.exports = {
    Mesh: require('./Mesh'),
    PointLight: require('./lights/PointLight'),
    AmbientLight: require('./lights/AmbientLight'),
};

},{"./Mesh":388,"./lights/AmbientLight":390,"./lights/PointLight":392}],390:[function(require,module,exports){
'use strict';

var Light = require('./Light');


/**
 * AmbientLight extends the functionality of Light. It sets the ambience in
 * the scene. Ambience is a light source that emits light in the entire
 * scene, evenly.
 *
 * @class AmbientLight
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved
 * from the corresponding Render Node
 */
function AmbientLight(node) {
    Light.call(this, node);
    this.commands.color = 'GL_AMBIENT_LIGHT';
};

/**
* Returns the definition of the Class: 'AmbientLight'
*
* @method toString
* @return {string} definition
*/
AmbientLight.toString = function toString() {
    return 'AmbientLight';
};

/**
 * Extends Light constructor
 */
AmbientLight.prototype = Object.create(Light.prototype);

/**
 * Sets AmbientLight as the constructor
 */
AmbientLight.prototype.constructor = AmbientLight;

module.exports = AmbientLight;

},{"./Light":391}],391:[function(require,module,exports){
'use strict';

/**
 * The blueprint for all light components for inheriting common functionality.
 *
 * @class Light
 * @constructor
 * @component
 * @param {Node} node The controlling node
 * from the corresponding Render Node
 */
function Light(node) {
    this._node = node;
    this._id = node.addComponent(this);
    this._requestingUpdate = false;
    this.queue = [];
    this._color;
    this.commands = { color: 'GL_LIGHT_COLOR' };
};

/**
* Returns the definition of the Class: 'Light'
*
* @method toString
* @return {String} definition
*/
Light.toString = function toString() {
    return 'Light';
};

/**
* Changes the color of the light, using the 'Color' utility component.
*
* @method setColor
* @param {Color} Color instance
* @chainable
*/
Light.prototype.setColor = function setColor(color) {
    if (!color.getNormalizedRGB) return false;
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._color = color;
    this.queue.push(this.commands.color);
    var rgb = this._color.getNormalizedRGB();
    this.queue.push(rgb[0]);
    this.queue.push(rgb[1]);
    this.queue.push(rgb[2]);
    return this;
};

/**
* Returns the current color.

* @method getColor
* @returns {Color} Color.
*/
Light.prototype.getColor = function getColor(option) {
    return this._color;
};

/**
* Sends draw commands to the renderer
*
* @private
* @method onUpdate
*/
Light.prototype.onUpdate = function clean() {
    var path = this._node.getLocation();

    this._node
        .sendDrawCommand('WITH')
        .sendDrawCommand(path);

    var i = this.queue.length;
    while (i--) {
        this._node.sendDrawCommand(this.queue.shift());
    }

    if (this._color && this._color.isActive()) {
        this._node.sendDrawCommand(this.commands.color);
        var rgb = this._color.getNormalizedRGB();
        this._node.sendDrawCommand(rgb[0]);
        this._node.sendDrawCommand(rgb[1]);
        this._node.sendDrawCommand(rgb[2]);
        this._node.requestUpdateOnNextTick(this._id);
    } else {
        this._requestingUpdate = false;
    }
};

module.exports = Light;

},{}],392:[function(require,module,exports){
'use strict';

var Light = require('./Light');

/**
 * PointLight extends the functionality of Light. PointLight is a light source
 * that emits light in all directions from a point in space.
 *
 * @class PointLight
 * @constructor
 * @component
 * @param {LocalDispatch} dispatch LocalDispatch to be retrieved
 * from the corresponding Render Node
 */
function PointLight(node) {
    Light.call(this, node);
    this.commands.position = 'GL_LIGHT_POSITION';
    this.onTransformChange(node.getTransform());
};

/**
* Returns the definition of the Class: 'PointLight'
*
* @method toString
* @return {string} definition
*/
PointLight.toString = function toString() {
    return 'PointLight';
};

/**
 * Extends Light constructor
 */
PointLight.prototype = Object.create(Light.prototype);

/**
 * Sets PointLight as the constructor
 */
PointLight.prototype.constructor = PointLight;

/**
 * Receives transform change updates from the scene graph.
 *
 * @private
 */
PointLight.prototype.onTransformChange = function onTransformChange (transform) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this.queue.push(this.commands.position);
    this.queue.push(transform[12]);
    this.queue.push(transform[13]);
    this.queue.push(transform[14]);
};

module.exports = PointLight;

},{"./Light":391}],393:[function(require,module,exports){
arguments[4][272][0].apply(exports,arguments)
},{"dup":272}],394:[function(require,module,exports){
arguments[4][273][0].apply(exports,arguments)
},{"dup":273}],395:[function(require,module,exports){
arguments[4][274][0].apply(exports,arguments)
},{"dup":274,"glslify":393,"glslify/simple-adapter.js":394}],396:[function(require,module,exports){
'use strict';

var FamousPlatform = require('famous');
var Size = FamousPlatform.components.Size;
var Position = FamousPlatform.components.Position;
var Rotation = FamousPlatform.components.Rotation;
var Align = FamousPlatform.components.Align;
var Origin = FamousPlatform.components.Origin;
var MountPoint = FamousPlatform.components.MountPoint;
var DOMElement = FamousPlatform.domRenderables.DOMElement;
var PhysicsEngine = FamousPlatform.physics.PhysicsEngine;
var Famous = FamousPlatform.core.Famous;
var Clock = Famous.getClock();
var physics = FamousPlatform.physics;
var math = FamousPlatform.math;
var UIEventHandler = FamousPlatform.components.UIEventHandler;
var Collision = physics.Collision;
var Box = physics.Box;
var Vec3 = math.Vec3;
var Wall = physics.Wall;
var Gravity = physics.Gravity1D;
var Transitionable = FamousPlatform.transitions.Transitionable;
var audio = new Audio('./sounds/plasma.mp3');

function Game(node) {
  this.simulation = new PhysicsEngine();
  this.node = node;
  this.mainBgPos = 0;

  this.mainEl = new DOMElement(this.node, {
    properties: {
      'background-image': 'url(./images/city2.png)',
      // 'background-color': 'teal',
      'background-repeat': 'repeat-x',
      'background-position': 'center',
      'background-position': '10px'
    }
  });

  this.currentEvent = null;
  this.stepsAmount = null;
  this.eventDuration = null;
  this.timer = 0;
  this.score = 0;

  this.bullets = [];
  this.enemies = [];

  //update the physics engine
  var updater = {
    onUpdate: (function (t) {
      this.simulation.update(t);
      this.update();
      Famous.requestUpdateOnNextTick(updater);
    }).bind(this)
  };

  Famous.requestUpdateOnNextTick(updater);

  _createKeyEvents.call(this);
  _createPlayer.call(this);
  _createTitles.call(this);
  _createBodies.call(this);

  createEnemy.call(this);
  createEnemy.call(this);
  createEnemy.call(this);
  createEnemy.call(this);

  var sizer = new Size(node);
  sizer.onSizeChange = (function (size) {
    this.mainHeight = size[0];
    this.mainWidth = size[1]
    // this.wall3.setPosition(this.mainWidth,0,0);
    // this.wall4.setPosition(0,this.mainHeight,0)

    ;
  }).bind(this);
}

Game.prototype.update = function () {

  //loop through bullet views and update to corresponding box in PE
  if (this.bullets.length > 0) {
    for (var i = 0; i < this.bullets.length; i++) {
      var bulletPosition = this.simulation.getTransform(this.bullets[i][0]).position;
      this.bullets[i][1].set(bulletPosition[0], bulletPosition[1], 2);
    }
  }

  //loop through enemies and update to corresponding box in PE
  if (this.enemies.length > 0) {
    for (var i = 0; i < this.enemies.length; i++) {
      var enemyPosition = this.simulation.getTransform(this.enemies[i][0]).position;
      this.enemies[i][1].set(enemyPosition[0], enemyPosition[1], 0);
    }
  }

  //box that updates player
  var boxTransform = this.simulation.getTransform(this.box).position;
  var x = boxTransform[0];
  var y = boxTransform[1];
  var z = boxTransform[2];

  this.player.position.set(x, y, z);

  //starts the sprite animations when a new event is called
  if (this.currentEvent !== null) {

    this.timer++;

    //calls sprite frame on 'this.eventDuration' intervals
    if (this.timer % this.eventDuration === 0) {
      this.currentEvent.call(this);
      this.player.currentStep++;
    }

    //reset to defaults when sprite animation is finished
    if (this.player.currentStep > this.stepsAmount) {
      this.currentEvent = null;
      this.timer = 0;
      this.player.currentStep = 0;
      this.player.backgroundPosition = 0;
      this.player.jumping = false;
    }
  }
};

function _createKeyEvents() {
  //hack until figure out keydown event
  window.addEventListener('keydown', (function (e) {

    //up
    if (e.which === 38) {
      initEvent.call(this, 13, 6, Jump);
    }

    //left
    if (e.which === 37) {
      initEvent.call(this, 13, 4, moveLeft);
    }
    //right
    if (e.which === 39) {
      initEvent.call(this, 13, 4, moveRight);
    }

    //spacebar
    if (e.which === 32) {
      console.log('pew');

      initEvent.call(this, 7, 5, shoot);
      new Audio('./sounds/plasma.mp3').play();
      createBullet.call(this);
    }
  }).bind(this));
}

function _createPlayer() {
  //player
  var playerNode = this.node.addChild();

  this.player = {
    node: playerNode,
    el: new DOMElement(playerNode),
    health: 50,
    currentStep: 0,
    backgroundPosition: 0,
    direction: 'right',
    movement: [],
    jumping: false,
    size: new Size(playerNode),
    position: new Position(playerNode),
    mountpoint: new MountPoint(playerNode)
  };

  this.player.el.setProperty('background-image', 'url(./images/vctrmanidle.png)');
  //size and center player
  this.player.size.setMode(1, 1);
  this.player.size.setAbsolute(96, 96);
  this.player.mountpoint.set(0.5, 0.5);
}

function _createTitles() {
  //titles
  var titles = this.node.addChild();
  this.titles = {
    align: new Align(titles),
    size: new Size(titles),
    el: new DOMElement(titles)
  };
  //size and set title
  this.titles.align.set(0.01, 0.01);
  this.titles.size.setMode(1, 1);
  this.titles.size.setAbsolute(150, 50);
  this.titles.el.setContent('score: ' + this.score + ' health: ' + this.player.health);
  this.titles.el.setProperty('color', 'white');
}

function _createBodies() {

  //create box for player
  this.box = new Box({
    size: [90, 90, 50],
    mass: 10,
    restrictions: ['z'],
    position: new Vec3(500, 50, 0)
  });

  //id player for collision events
  this.box.player = true;

  //set up boundaries
  this.wall1 = new Wall({ direction: physics.Wall.RIGHT, restitution: 5, friction: 2 });
  this.wall2 = new Wall({ direction: physics.Wall.DOWN, restitution: 5, friction: 2 });
  this.wall3 = new Wall({ direction: physics.Wall.LEFT, restitution: 5, friction: 2 });
  this.wall4 = new Wall({ direction: physics.Wall.UP, restitution: 5, friction: 2 });

  //best practice here for width/height?
  this.wall3.setPosition(window.innerWidth, 0, 0);
  this.wall4.setPosition(0, window.innerHeight, 0);

  this.gravity = new Gravity([this.box]);
  this.enemyCollision = new Collision([this.wall1, this.wall2, this.wall3, this.wall4]);

  this.collision = new Collision([this.box, this.wall1, this.wall2, this.wall3, this.wall4]);
  this.simulation.add(this.gravity, this.box, this.collision, this.enemyCollision);
}

function createEnemy() {

  var enemy = new Box({
    size: [90, 90, 50],
    mass: 50,
    restrictions: ['z'],
    position: new Vec3(Math.random() * window.innerWidth, -200, 0)
  });

  //id as enemy for collision events
  enemy.enemy = true;

  var enemyNode = this.node.addChild();
  //this.gravity.addTarget(enemy)
  this.simulation.addBody(enemy, this.gravity);
  //better implementation?
  //add el to enemy so we can modify it in bullet collision
  enemy.enemyEl = new DOMElement(enemyNode);
  var enemyPosition = new Position(enemyNode);
  var enemySize = new Size(enemyNode);
  var enemyMountPoint = new MountPoint(enemyNode);
  //enemy.enemyEl.setProperty('background-color', 'red')
  enemySize.setMode(1, 1, 0);
  enemySize.setAbsolute(90, 90, 0);
  enemyMountPoint.set(0.5, 0.5);
  enemyPosition.set(10, 10);
  this.collision.addTarget(enemy);
  this.enemyCollision.addTarget(enemy);
  this.enemies.push([enemy, enemyPosition]);
  enemy.enemyEl.setContent('<img src="./images/live.gif" />');

  //enemy collision event
  enemy.events.on('collision:start', (function (e) {
    //if collided with a player
    if (e.bodyA.player || e.bodyB.player) {
      //decrease health
      this.player.health--;

      //console.log('ouch', this.player.health)
      //update scoreboard
      //this.titles.el.setContent('score: '+this.score+ ' health: '+ this.player.health)

      //alert if no more health
    }
  }).bind(this));
}

function createBullet() {

  //init position of bullet
  var boxTransform = this.simulation.getTransform(this.box).position;
  var x = boxTransform[0] + 10;
  var y = boxTransform[1];

  var bullet = new Box({
    size: [10, 10, 50],
    mass: 110,
    restrictions: ['z'],
    position: new Vec3(x, y, 0)
  });

  //id as bullet for checking collision events
  bullet.bullet = true;

  this.enemyCollision.addTarget(bullet);
  this.simulation.addBody(bullet);

  var bulletShell = this.node.addChild();
  var bulletEl = new DOMElement(bulletShell);
  var bulletPosition = new Position(bulletShell);
  var bulletSize = new Size(bulletShell);
  bulletEl.setProperty('background-color', 'rgba(228, 240, 253, 0.76)');
  bulletEl.setProperty('border-radius', '50%');
  bulletEl.setProperty('box-shadow', '0px 0px 10px rgb(228, 240, 253)');
  bulletSize.setMode(1, 1, 1);
  bulletSize.setAbsolute(10, 10, 10);

  this.bullets.push([bullet, bulletPosition]);

  //set velocity based on player direction

  if (this.player.direction === 'left') {
    bullet.setVelocity(-1000, 0, 0);
  }

  if (this.player.direction === 'right') {
    bullet.setVelocity(1000, 0, 0);
  }

  this.collided = false;
  //bullet collision events
  bullet.events.on('collision:start', (function (e) {
    //check if collided body is an enemy
    if (e.bodyA.enemy) {
      this.score++;

      //on hit update score and change enemy image to dead
      //var updatedScore = 'score: '+this.score+ ' health: '+ this.player.health
      //console.log(updatedScore, this.titles.el.setContent(updatedScore))
      //this.titles.el.setContent()
      e.bodyA.enemyEl.setContent('<img src="./images/dead.png" />');
      //only play sound on bullet's first hit
      if (!this.collided) {
        new Audio('./sounds/hit.mp3').play();
        this.collided = true;
      }
    }
  }).bind(this));
}

//makes sure events aren't called twice
function initEvent(steps, duration, callback) {

  if (this.currentEvent !== callback) {
    this.player.currentStep = 0;
    this.currentEvent = callback;
    this.stepsAmount = steps;
    this.eventDuration = duration;
  }
}

function shoot() {

  //shoot right and not jumping sprite
  if (this.player.direction === 'right' && !this.player.jumping) {
    //move sprite frame
    if (this.player.currentStep > 0 && this.player.currentStep <= 7) {
      this.player.backgroundPosition -= 168;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init sprite
    if (this.player.currentStep === 0 && !this.player.jumping) {
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(168, 96);
      this.player.el.setProperty('background-position', 0 + 'px');
      this.player.el.setProperty('background-image', 'url(./images/shootRight.png)');
      this.player.backgroundPosition = 0;
    }
  }

  //shoot left and not jumping sprite
  if (this.player.direction === 'left' && !this.player.jumping) {
    //move sprite frame
    if (this.player.currentStep > 0 && this.player.currentStep <= 7) {
      this.player.backgroundPosition += 168;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init sprite
    if (this.player.currentStep === 0 && !this.player.jumping) {
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(168, 96);
      this.player.backgroundPosition = 168;
      this.player.el.setProperty('background-image', 'url(./images/shootLeft.png)');
      this.player.el.setProperty('background-position', 168 + 'px');
    }
  }

  //shoot right and jumping sprite
  if (this.player.direction === 'right' && this.player.jumping) {
    //move sprite frame
    if (this.player.currentStep > 1 && this.player.currentStep <= 7) {
      this.player.backgroundPosition -= 185;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init sprite
    if (this.player.currentStep === 0 && this.player.jumping) {
      this.player.backgroundPosition = 0;
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(185, 100);
      this.player.el.setProperty('background-position', 4 + 'px');
      this.player.el.setProperty('background-image', 'url(./images/jumpShootRight.png)');
      this.player.jumping = true;
    }
  }

  //shoot left and jumping sprite
  if (this.player.direction === 'left' && this.player.jumping) {
    //move sprite frame
    if (this.player.currentStep > 1 && this.player.currentStep <= 7) {
      this.player.backgroundPosition += 185;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init sprite
    if (this.player.currentStep === 0 && this.player.jumping) {
      this.player.backgroundPosition = 185;
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(185, 100);
      this.player.el.setProperty('background-position', 185 + 'px');
      this.player.el.setProperty('background-image', 'url(./images/jumpShootLeft.png)');
      this.player.jumping = true;
    }
  }
}

function moveRight() {
  var bgpos = this.mainBgPos -= 1;
  this.mainEl.setProperty('background-position', bgpos + 'px');

  this.player.direction = 'right';
  //do not start moverRight sprite if jumping
  if (!this.player.jumping) {
    //move sprite frame
    if (this.player.currentStep > 0 && this.player.currentStep <= 14) {
      this.player.backgroundPosition -= 96;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init move right sprite
    if (this.player.currentStep === 0) {
      this.player.el.setProperty('background-image', 'url(./images/moveRight.png)');
      this.player.backgroundPosition = 0;
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(96, 96);
      this.player.el.setProperty('background-position', 0 + 'px');
    }
  }
  this.box.setVelocity(50, this.box.getVelocity()[1], this.box.getVelocity()[2]);
}

function moveLeft() {
  var bgpos = this.mainBgPos += 1;
  this.mainEl.setProperty('background-position', bgpos + 'px');
  this.player.direction = 'left';
  //do not start moveLeft sprite if jumping
  if (!this.player.jumping) {
    //move sprite frame
    if (this.player.currentStep > 0 && this.player.currentStep <= 14) {
      this.player.backgroundPosition += 96;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init move left sprite
    if (this.player.currentStep === 0) {
      this.player.el.setProperty('background-image', 'url(./images/moveLeft.png)');
      this.player.backgroundPosition = 0;
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(96, 96);
      this.player.el.setProperty('background-position', 0 + 'px');
    }
  }
  this.box.setVelocity(-100, this.box.getVelocity()[1], this.box.getVelocity()[2]);
}

function Jump() {
  this.player.jumping = true;
  //right jump
  if (this.player.direction === 'right') {
    //move sprite frame
    if (this.player.currentStep > 0 && this.player.currentStep <= 13) {
      this.player.backgroundPosition -= 96;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init jump right sprite    
    if (this.player.currentStep === 0) {
      this.player.el.setProperty('background-image', 'url(./images/jumpRight.png)');
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(96, 96);
      this.player.backgroundPosition = 0;
      this.player.el.setProperty('background-position', 0 + 'px');
    }
  }
  //left jump
  if (this.player.direction === 'left') {
    //move sprite frame
    if (this.player.currentStep > 0 && this.player.currentStep <= 13) {
      this.player.backgroundPosition += 96;
      var num = this.player.backgroundPosition;
      this.player.el.setProperty('background-position', num + 'px');
    }
    //init jump left sprite   
    if (this.player.currentStep === 0) {
      this.player.el.setProperty('background-image', 'url(./images/jumpLeft.png)');
      this.player.size.setMode(1, 1);
      this.player.size.setAbsolute(96, 96);
      this.player.backgroundPosition = 0;
      this.player.el.setProperty('background-position', 0 + 'px');
    }
  }
  this.box.setVelocity(this.box.getVelocity()[0], -80, this.box.getVelocity()[2]);
}

module.exports = Game;
//this.enemyCollision = new Collision()

},{"famous":1}],397:[function(require,module,exports){
'use strict';

var FamousPlatform = require('famous');
var Compositor = FamousPlatform.renderers.Compositor;
var ThreadManager = FamousPlatform.renderers.ThreadManager;
var Engine = FamousPlatform.engine;
var DOMElement = FamousPlatform.domRenderables.DOMElement;
var Famous = FamousPlatform.core.Famous;

// Boilerplate
var compositor = new Compositor();
var threadmanger = new ThreadManager(Famous, compositor);
var engine = new Engine();
engine.update(threadmanger);

// App Code
var context = Famous.createContext();
var root = context.addChild();

var Game = require('./Game');
var game = new Game(root);

},{"./Game":396,"famous":1}]},{},[397])