const base = require('./base');
const utils = require('../utils');
const InteractEvent = require('../InteractEvent');
const Interactable = require('../Interactable');
const scope = base.scope;
const signals = require('../utils/signals');
const defaultOptions = require('../defaultOptions');

const gesture = {
  defaults: {
    manualStart  : false,
    enabled      : false,
    max          : Infinity,
    maxPerElement: 1,

    restrict: null,
  },

  checker: function (pointer, event, interactable, element, interaction) {
    if (interaction.pointerIds.length >= 2) {
      return { name: 'gesture' };
    }

    return null;
  },

  getCursor: function () {
    return '';
  },

  beforeStart: utils.blank,

  start: function (interaction, event) {
    const gestureEvent = new InteractEvent(interaction, event, 'gesture', 'start', interaction.element);

    gestureEvent.ds = 0;

    interaction.gesture.startDistance = interaction.gesture.prevDistance = gestureEvent.distance;
    interaction.gesture.startAngle = interaction.gesture.prevAngle = gestureEvent.angle;
    interaction.gesture.scale = 1;

    interaction._interacting = true;

    interaction.target.fire(gestureEvent);

    return gestureEvent;
  },

  move: function (interaction, event) {
    if (!interaction.pointerIds.length) {
      return interaction.prevEvent;
    }

    let gestureEvent;

    gestureEvent = new InteractEvent(interaction, event, 'gesture', 'move', interaction.element);
    gestureEvent.ds = gestureEvent.scale - interaction.gesture.scale;

    interaction.target.fire(gestureEvent);

    interaction.gesture.prevAngle = gestureEvent.angle;
    interaction.gesture.prevDistance = gestureEvent.distance;

    if (gestureEvent.scale !== Infinity
        && gestureEvent.scale !== null
        && gestureEvent.scale !== undefined
        && !isNaN(gestureEvent.scale)) {

      interaction.gesture.scale = gestureEvent.scale;
    }

    return gestureEvent;
  },

  end: function (interaction, event) {
    const endEvent = new InteractEvent(interaction, event, 'gesture', 'end', interaction.element);

    interaction.target.fire(endEvent);
  },

  stop: utils.blank,
};

/*\
 * Interactable.gesturable
 [ method ]
 *
 * Gets or sets whether multitouch gestures can be performed on the
 * Interactable's element
 *
 = (boolean) Indicates if this can be the target of gesture events
   | var isGestureable = interact(element).gesturable();
 * or
 - options (boolean | object) #optional true/false or An object with event listeners to be fired on gesture events (makes the Interactable gesturable)
 = (object) this Interactable
 | interact(element).gesturable({
 |     onstart: function (event) {},
 |     onmove : function (event) {},
 |     onend  : function (event) {},
 |
 |     // limit multiple gestures.
 |     // See the explanation in @Interactable.draggable example
 |     max: Infinity,
 |     maxPerElement: 1,
 | });
\*/
Interactable.prototype.gesturable = function (options) {
  if (utils.isObject(options)) {
    this.options.gesture.enabled = options.enabled === false? false: true;
    this.setPerAction('gesture', options);
    this.setOnEvents('gesture', options);

    return this;
  }

  if (utils.isBool(options)) {
    this.options.gesture.enabled = options;

    return this;
  }

  return this.options.gesture;
};

signals.on('interactevent-delta', function (arg) {
  if (arg.action !== 'gesture') { return; }

  const { interaction, iEvent, starting, ending, deltaSource } = {arg};
  const pointers = interaction.pointers;

  iEvent.touches = [pointers[0], pointers[1]];

  if (starting) {
    iEvent.distance = utils.touchDistance(pointers, deltaSource);
    iEvent.box      = utils.touchBBox(pointers);
    iEvent.scale    = 1;
    iEvent.ds       = 0;
    iEvent.angle    = utils.touchAngle(pointers, undefined, deltaSource);
    iEvent.da       = 0;
  }
  else if (ending || event instanceof InteractEvent) {
    iEvent.distance = interaction.prevEvent.distance;
    iEvent.box      = interaction.prevEvent.box;
    iEvent.scale    = interaction.prevEvent.scale;
    iEvent.ds       = iEvent.scale - 1;
    iEvent.angle    = interaction.prevEvent.angle;
    iEvent.da       = iEvent.angle - interaction.gesture.startAngle;
  }
  else {
    iEvent.distance = utils.touchDistance(pointers, deltaSource);
    iEvent.box      = utils.touchBBox(pointers);
    iEvent.scale    = iEvent.distance / interaction.gesture.startDistance;
    iEvent.angle    = utils.touchAngle(pointers, interaction.gesture.prevAngle, deltaSource);

    iEvent.ds = iEvent.scale - interaction.gesture.prevScale;
    iEvent.da = iEvent.angle - interaction.gesture.prevAngle;
  }
});

base.gesture = gesture;
base.names.push('gesture');
utils.merge(scope.eventTypes, [
  'gesturestart',
  'gesturemove',
  'gestureinertiastart',
  'gestureend',
]);
base.methodDict.gesture = 'gesturable';

defaultOptions.gesture = gesture.defaults;

module.exports = gesture;
