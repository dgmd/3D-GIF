var Cube = function(size, cellOpts) {
    // 'this' can point to many, different things, so we grab an easy reference to the object
    // You can read more about 'this' at:
    // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
    // at http://www.quirksmode.org/js/this.html
    // and in a more detailed tutorial: http://javascriptissexy.com/understand-javascripts-this-with-clarity-and-master-it/
    var cube = this;

    var NOOP = function() {};   // does nothing, but useful to pass as argument to things expecting functions

    // DEFINE SOME PROPERTIES
    var defaultPlaybackOptions = {
        delay: 100,
        action: 'slide',
        direction: 'back',
        stepSize: 1,
        wrap: false,
    };

    var defaultCellOptions = {
        size: 50, // size of our cells in pixels
    };

    var defaultKeyListenerOptions = {
        keys: 'all',                // values: alpha, num, alphanum, symbols, all
        // letterColor: [0, 0, 255],   // NOT IMPLEMENTED: color of letter pixels on generated frame: rgb array
        // backgroundColor: [0, 0, 0], // NOT IMPLEMENTED: color of non-leter pixels on generated frame: rgb array
        // startFace: 'front',         // NOT IMPLEMENTED: values: front, back, left, right, bottom, top
        // endFace: 'back',            // NOT IMPLEMENTED: values: front, back, left, right, bottom, top
        animate: false,             // animate from frontFace to backFace: boolean
        animateRate: 125,           // delay between each playback frame (only applies if animate is true)
        stepSize: 1,                // number of steps for each animation (only applies if animate is true)
    };

    var _playbackOptions = _.extend({}, defaultPlaybackOptions);
    var _cellOptions = _.extend({}, defaultCellOptions, cellOpts || {});
    var _keyListenerOptions = _.extend({}, defaultKeyListenerOptions);

    var _container;

    var _prevStepButton;
    var _nextStepButton;
    var _playButton;
    var _clearButton;

    var _colorPicker;
    var _shapePicker;
    var _playbackControls;

    var _fontMap = {};
    var _activeFont;

    var _isPlaying = false;
    var _penColor = 'blue';

    var _xAngle = 0;
    var _yAngle = 0;
    var _transitionTransforms;
    var _rotateCells = false;


    /**
     * We use this "Promise" and expose these callbacks to ensure that functions
     * that expect the cube's DOM to be present and built don't run until this
     * is actually the case.
     *
     * To learn more about Promises in Javascript, see these links:
     * https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Promise
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
     */
    var htmlReadySuccessFn;
    var htmlReadyFailureFn;
    this.htmlReady = new Promise(function(resolve, reject) {
        htmlReadySuccessFn = resolve;
        htmlReadyFailureFn = reject;
    });

    Object.defineProperty(this, 'playbackOptions', {
        /**
         * Property that is referenced to determine the correct animation callbacks
         * to generate the next frame.
         */
        enumerable: true,
        get: function() {
            return _playbackOptions;
        },
        set: function(newOptions) {
            var validDirections = ['forward', 'back', 'up', 'down', 'left', 'right'];

            var resumePlayingAfterChange = cube.isPlaying;

            cube.pause();

            /**
             * Verify that the new direction, if present, is valid.
             */
            if (newOptions.direction &&
                validDirections.indexOf(newOptions.direction) !== -1)
            {
                /**
                 * If there are playback controls that are rendered, we want to keep
                 * them in sync with our internal state.
                 */
                if (this.playbackControls)
                {
                    var radioSelector = 'input[type="radio"][name="direction"]';
                    var radiosElList = this.playbackControls.querySelectorAll(radioSelector)
                    var radioElArray = Array.prototype.slice.apply(radiosElList);
                    radioElArray.forEach(function(input) {
                        // check or uncheck each of the radio buttons
                        input.checked = (input.value == newOptions.direction);
                    });
                }
            } else
            {
                /**
                 * Delete the invalid property on the new settings to prevent
                 * it from being applied.
                 */
                delete(newOptions.direction);
            }

            /**
             * Actually apply the new settings.
             */
            _.extend(_playbackOptions, newOptions);

            if (resumePlayingAfterChange)
            {
                cube.play();
            }
        }
    });

    Object.defineProperty(this, 'keyListenerOptions', {
        /**
         * Property that defines which keystrokes are listened for and sent to
         * the cube, and which playback settings to use for keyboard-generated
         * images. Custom keyboard playback settings only apply if the animate
         * option is true).
         */
        enumerable: true,
        get: function() {
            return _keyListenerOptions;
        },
        set: function(newOptions) {
            _.extend(_keyListenerOptions, newOptions);
        }
    });

    function applyCameraAngle() {
        /**
         * Helper function for xAngle and yAngle properties that helps ensure
         * that the visible angle of the cube is in sync with the internal state.
         */
        cube.htmlReady.then(function() {
            cube.html.style.transform = [
                ['rotateX(', cube.xAngle, 'deg)'].join(''),
                ['rotateY(', cube.yAngle, 'deg)'].join(''),
            ].join(' ');

            if (cube.rotateCells)
            {
                /**
                 * Only apply rotations if we need to because iterating over the cells
                 * is very expensive and reduces performance significantly. See the
                 * rotateCells property on "this" for more information.
                 */
                cube.cells.forEach(function(cell) {
                    cell.applyOptions({
                        rotation: [-1 * cube.xAngle, -1 * cube.yAngle, 0],
                    });
                });
            }
        });
    }

    Object.defineProperty(this, 'xAngle', {
        enumerable: true,
        get: function() {
            return _xAngle;
        },
        set: function(newAngle) {
            var parsedAngle = parseFloat(newAngle);
            if (!isNaN(parsedAngle))
            {
                _xAngle = parsedAngle;
                applyCameraAngle();
            }
        }
    });

    Object.defineProperty(this, 'yAngle', {
        enumerable: true,
        get: function() {
            return _yAngle;
        },
        set: function(newAngle) {
            var parsedAngle = parseFloat(newAngle);
            if (!isNaN(parsedAngle))
            {
                _yAngle = parsedAngle;
                applyCameraAngle();
            }
        }
    });

    Object.defineProperty(this, 'transitionTransforms', {
        /**
         * Animate transforms on the cube (does not apply to cells, whose property
         * is set separately).
         */
        enumerable: false,
        get: function() {
            return _transitionTransforms;
        },
        set: function(shouldTransition) {
            _transitionTransforms = shouldTransition;

            var TRANSITION_DURATION = '300ms';
            var TRANSITION_EASING = 'ease-in-out';

            this.htmlReady.then(function() {
                if (shouldTransition)
                {
                    cube.html.style.transitionProperty = 'transform';
                    cube.html.style.transitionDuration = TRANSITION_DURATION;
                    cube.html.style.transitionTimingFunction = TRANSITION_EASING;
                } else
                {
                    cube.html.style.transitionProperty = null;
                    cube.html.style.transitionDuration = null;
                    cube.html.style.transitionTimingFunction = null;
                }
            });
        }
    });

    Object.defineProperty(this, 'rotateCells', {
        /**
         * If true, each cell rotates opposite the cube so that it is always facing
         * you. It is computationally expensive and graphically looks a little weird.
         * It is thus not especially useful, yet I leave it here for posterity.
         */
        enumerable: true,
        get: function() {
            return _rotateCells;
        },
        set: function(shouldRotate) {
            _rotateCells = shouldRotate;
            if (!_rotateCells)
            {
                /**
                 * To improve performance of applyCameraAngle(), we only iterate over
                 * the cells if we need to rotate them. Thus, if we are not rotating
                 * the cells but were previously, we need to "clear" their rotation
                 * manually because applyCameraAngle() won't if the property is false.
                 */
                cube.cells.forEach(function(cell) {
                    cell.applyOptions({
                        rotation: [0, 0, 0],
                    });
                });
            }

            applyCameraAngle();
        }
    });

    Object.defineProperty(this, 'animationSteps', {
        /**
         * Read-only dictionary of some of the atomic changes that can be made to
         * the cube for an animation.
         */
        writable: false,
        enumerable: false,
        value: {
            shiftX: function() {
                cube.shiftPlane(
                    'X',
                    cube.playbackOptions.stepSize,
                    cube.playbackOptions.wrap
                );
            },
            unshiftX: function() {
                cube.shiftPlane(
                    'X',
                    -1 * cube.playbackOptions.stepSize,
                    cube.playbackOptions.wrap
                );
            },
            shiftY: function() {
                cube.shiftPlane(
                    'Y',
                    cube.playbackOptions.stepSize,
                    cube.playbackOptions.wrap
                );
            },
            unshiftY: function() {
                cube.shiftPlane(
                    'Y',
                    -1 * cube.playbackOptions.stepSize,
                    cube.playbackOptions.wrap
                );
            },
            shiftZ: function() {
                cube.shiftPlane(
                    'Z',
                    cube.playbackOptions.stepSize,
                    cube.playbackOptions.wrap
                );
            },
            unshiftZ: function() {
                cube.shiftPlane(
                    'Z',
                    -1 * cube.playbackOptions.stepSize,
                    cube.playbackOptions.wrap
                );
            },
        }
    });

    Object.defineProperty(this, 'animationCb', {
        /**
         * Read-only property for the correct animation callback to use for the
         * current action and direction.
         */
        enumerable: false,
        set: NOOP,
        get: function() {
            if (this.playbackOptions.action === 'slide')
            {
                var slideDirectionAnimationMap = {
                    'up': this.animationSteps.shiftX,
                    'down': this.animationSteps.unshiftX,
                    'left': this.animationSteps.shiftY,
                    'right': this.animationSteps.unshiftY,
                    'forward': this.animationSteps.shiftZ,
                    'back': this.animationSteps.unshiftZ,
                };

                return slideDirectionAnimationMap[this.playbackOptions.direction];
            }

            return undefined;   // just being explicit about this
        }
    });

    Object.defineProperty(this, 'shapes', {
        /**
         * An object of image slice arrays, each of which could have been serialized.
         */
        enumerable: true,
        writable: false,
        value: {
            circle: [{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[0,255,0],"on":true},{"color":[75,0,130],"on":false},{"color":[75,0,130],"on":false},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":true},{"color":[0,255,255],"on":false},{"color":[255,0,255],"on":false},{"color":[255,0,255],"on":false},{"color":[0,255,255],"on":false},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":true},{"color":[0,255,255],"on":false},{"color":[255,0,255],"on":false},{"color":[255,0,255],"on":false},{"color":[0,255,255],"on":false},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[0,255,0],"on":true},{"color":[0,255,255],"on":false},{"color":[0,255,255],"on":false},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[75,0,130],"on":false}],
            diamond: [{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,255],"on":false},{"color":[255,0,255],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,255],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false}],
            square: [{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,255],"on":true},{"color":[255,0,255],"on":true},{"color":[255,0,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,255],"on":true},{"color":[255,0,255],"on":true},{"color":[255,0,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,255],"on":true},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true},{"color":[255,127,0],"on":true}],
            heart: [{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[0,0,255],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false}],
            smile: [{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false}],
            frown: [{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false}],
            wink: [{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[75,0,130],"on":true},{"color":[255,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[255,255,0],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false}],
            battleaxe: [{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[0,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[0,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,127,0],"on":false},{"color":[255,0,0],"on":true},{"color":[0,255,0],"on":true},{"color":[0,255,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[255,255,0],"on":false},{"color":[0,0,255],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":true},{"color":[255,0,0],"on":false},{"color":[75,0,130],"on":true},{"color":[0,0,255],"on":false},{"color":[0,0,255],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[0,255,0],"on":false},{"color":[255,0,0],"on":true},{"color":[255,255,0],"on":false},{"color":[255,0,0],"on":false},{"color":[75,0,130],"on":true},{"color":[0,0,255],"on":false},{"color":[75,0,130],"on":false},{"color":[255,127,0],"on":false},{"color":[255,127,0],"on":false},{"color":[75,0,130],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[255,0,0],"on":false},{"color":[75,0,130],"on":true}],
        }
    });

    Object.defineProperty(this, 'shapeNames', {
        enumerable: true,
        set: NOOP,
        get: function() {
            return Object.keys(this.shapes);
        },
    });

    Object.defineProperty(this, 'outerDimensions', {
        enumerable: false,
        set: NOOP,
        get: function() {
            return this.size * _cellOptions.size;
        }
    });

    Object.defineProperty(this, 'isPlaying', {
        enumerable: false,
        get: function() {
            return _isPlaying;
        },
        set: function(nowPlaying) {
            _isPlaying = nowPlaying;

            if (_playButton)
            {   // if
                _playButton.classList.toggle('playing', _isPlaying);
                _playButton.classList.toggle('paused', !_isPlaying);
            }

            /**
             * Start / stop the actual animation loop
             */
            if (_isPlaying)
            {
                clearInterval(this.animateInterval);
                this.animateInterval = setInterval(function() {
                    this.animationCb.apply(this);
                }.bind(this), this.playbackOptions.delay);  // Use our "outside" this inside of the setInterval callback
            } else
            {
                clearInterval(cube.animateInterval);
            }
        }
    });


    /**
     * Colors-related properties
     */

    Object.defineProperty(this, 'colors', {
        enumerable: true,
        writable: false,
        value: {
            indigo: [75, 0, 130],
            blue: [0, 0, 255],
            cyan: [0, 255, 255],
            yellow: [255, 255, 0],
            green: [0, 255, 0],
            magenta: [255, 0, 255],
            orange: [255, 127, 0],
            red: [255, 0, 0],
            // white: [255, 255, 255],
            // gray: [125, 125, 125],
            // black: [0, 0, 0],
        }
    });

    Object.defineProperty(this, 'colorNames', {
        enumerable: true,
        set: NOOP,
        get: function() {
            return Object.keys(this.colors);
        },
    });

    Object.defineProperty(this, 'penColorRgb', {
        enumerable: true,
        set: NOOP,
        get: function() {
            return this.colors[this.penColor];
        },
    });

    Object.defineProperty(this, 'penColor', {
        enumerable: true,
        get: function() {
            return _penColor;
        },
        set: function(newColor) {
            if (this.colorNames.indexOf(newColor) === -1)
            {
                console.error('Invalid color. Known colors: ' + this.colorNames.join(', '));
                return;
            }

            _penColor = newColor;

            if (_colorPicker)
            {
                var radioSelector = 'input[type="radio"][name="color"]';
                var radioElList = _colorPicker.querySelectorAll(radioSelector);
                var radioElArray = Array.prototype.slice.apply(radioElList);
                radioElArray.forEach(function(input) {
                    input.checked = (input.value === _penColor);
                    var swatch = input.nextElementSibling;
                    swatch.style.backgroundColor = swatch.dataset.color;
                });
            }
        }
    });


    /**
     * DOM-RELATED PROPERTIES AND HELPER FUNCTIONS
     */

        /**
         * Color Picker property and helpers
         */
    var __colorPickerChangeListener = function(e) {
        /**
         * Undo the actions of _buildColorPicker() so that the element is left
         * in as close a state as possible to that it was before being called.
         */
        if ((e.target.nodeName === 'INPUT') && (e.target.name === 'color'))
        {
            cube.penColor = e.target.value;
        }
    };

    var _destroyColorPicker = function _destroyColorPicker() {
        /**
         * Undo the actions of _buildColorPicker() so that the element is left
         * in as close a state as possible to that it was before being called.
         */
        if (_colorPicker)
        {
            _colorPicker.classList.remove('color-list');
            _colorPicker.innerHTML = '';
            _colorPicker.style.position = null;
            _colorPicker.style.top = null;
            _colorPicker.style.right = null;
            _colorPicker.removeEventListener('change', __colorPickerChangeListener);
        }
    };

    var _buildColorPicker = function _buildColorPicker(parentEl) {
        /**
         * Build the color picker's components, position it, and bind its event
         * listener(s).
         */
        _destroyColorPicker();

        _colorPicker = parentEl;
        _colorPicker.classList.add('color-list');
        _colorPicker.innerHTML = this.colorNames.map(function(colorName) {
            return [
                '<label class="swatch">',
                    '<input type="radio" name="color" value="', colorName, '" />',
                    '<div data-color="', colorName, '"></div>',
                '</label>',
            ].join('')
        }).join('');

        /**
         * Position the color picker
         */
        var colorPickerHeight = _colorPicker.getBoundingClientRect().height;

        /**
         * !TODO: Fix this. We need this correction look correct.
         */
        colorPickerHeight -= 100;

        _colorPicker.style.position = 'absolute';
        _colorPicker.style.top = ['calc(50% - ', colorPickerHeight / 2, 'px)'].join('');
        _colorPicker.style.left = ['calc(50% - ', this.outerDimensions, 'px)'].join('');

        /**
         * Add event listener for change in DOM to be reflected in Cube's model
         */
        _colorPicker.addEventListener('change', __colorPickerChangeListener);

        /**
         * Sync DOM/Cube on build
         */
        this.penColor = this.penColor;
    };

    Object.defineProperty(this, 'colorPicker', {
        enumerable: false,
        get: function() {
            return _colorPicker;
        },
        set: function(newColorPickerEl) {
            /**
             * If the new parent element is a valid container for a color picker,
             * and if it's not the same as it is now, rebuild it. Otherwise, check
             * if the caller intended to remove the color picker, in which case
             * destory it. If neither is true, the caller likely misunderstood what
             * it was passing in, so show an error.
             */
            if ((newColorPickerEl instanceof HTMLElement) &&
                (newColorPickerEl !== _colorPicker))
            {
                _buildColorPicker.call(this, newColorPickerEl);
            } else if ((newColorPickerEl === null) ||
                (typeof newColorPickerEl === 'undefined'))
            {
                _destroyColorPicker();
                _colorPicker = undefined;
            } else
            {
                console.error('Invalid colorPicker: must be instance of HTMLElement');
                throw 'Invalid colorPicker';
            }
        },
    });


        /**
         * Shape Picker property and helpers
         */

    var __shapePickerClickListener = function(e) {
        if (e.target.dataset && e.target.dataset.shape)
        {
            cube.renderShape(e.target.dataset.shape);
        }
    };

    var _destroyShapePicker = function _destroyShapePicker() {
        /**
         * Undo the actions of _buildShapePicker() so that the element is left
         * in as close a state as possible to that it was before being called.
         */
        if (_shapePicker)
        {
            _shapePicker.classList.add('shape-list');
            _shapePicker.innerHTML = '';
            _shapePicker.style.position = null;
            _shapePicker.style.top = null;
            _shapePicker.style.right = null;
            _shapePicker.removeEventListener('click', __shapePickerClickListener);
        }
    }

    var _buildShapePicker = function _buildShapePicker(parentEl) {
        /**
         * Build the shape picker's components, position it, and bind its event
         * listener(s).
         */
        _destroyShapePicker();

        _shapePicker = parentEl;
        _shapePicker.classList.add('shape-list');
        _shapePicker.innerHTML = this.shapeNames.map(function(shapeName) {
            var shapeRender = this.getPngDataOfSlice(this.shapes[shapeName]);
            var styles = [
                'background-image:url(\'' + shapeRender + '\')',
                'background-size:cover',
                'background-position:50% 50%',
            ].join(';');

            return [
                '<div class="swatch" data-shape="', shapeName, '" ',
                    'style="', styles, '"></div>'
            ].join('')
        }.bind(this)).join('');   // Use our "outside" this inside of the map

        /**
         * Position the shape picker
         */
        var shapePickerHeight = _shapePicker.getBoundingClientRect().height;
        /**
         * !TODO: Fix this. We need this correction look correct.
         */
        shapePickerHeight -= 100;

        _shapePicker.style.position = 'absolute';
        _shapePicker.style.top = [
            'calc(50% - ', shapePickerHeight / 2, 'px)'
        ].join('');
        _shapePicker.style.right = [
            'calc(50% - ', this.outerDimensions, 'px)'
        ].join('');

        /**
         * Add event listener to parent, which will catch all events that bubble
         * up from children (the swatches).
         */
        _shapePicker.addEventListener('click', __shapePickerClickListener);
    };

    Object.defineProperty(this, 'shapePicker', {
        enumerable: false,
        get: function() {
            return _shapePicker;
        },
        set: function(newShapePickerEl) {
            /**
             * This property follows the same pattern as the colorPicker property.
             */
            if ((newShapePickerEl instanceof HTMLElement) &&
                (newShapePickerEl !== _shapePicker))
            {
                _buildShapePicker.call(this, newShapePickerEl);
            } else if ((newShapePickerEl === null) ||
                (typeof newShapePickerEl === 'undefined'))
            {
                _destroyShapePicker();
                _shapePicker = undefined;
            } else
            {
                console.error('Invalid shapePicker: must be instance of HTMLElement');
                throw 'Invalid shapePicker';
            }
        },
    });


        /**
         * Playback Controls property and helpers
         */

    var __playbackControlsChangeListener = function(e) {
        if ((e.target.nodeName === 'INPUT') && (e.target.name === 'direction'))
        {
            cube.playbackOptions = {
                direction: e.target.value,
            };
        }
    };

    var _destroyPlaybackControls = function _destroyPlaybackControls() {
        /**
         * Undo the actions of _buildPlaybackControls() so that the element is
         * left in as close a state as possible to that it was before being
         * called.
         */

        if (_playbackControls)
        {
            _playbackControls.removeEventListener('change', __playbackControlsChangeListener);
            _playbackControls.classList.remove('playback-controls');
            _playbackControls.innerHTML = '';
        }
    };

    var _buildPlaybackControls = function _buildPlaybackControls(parentEl) {
        /**
         * Build the color picker's components, position it, and bind its event
         * listener(s).
         */

        _destroyPlaybackControls();

        /**
         * Compose an array of strings into HTML using a template and Array.map(),
         * which converts each item in the array using the passed-in function.
         */
        var directions = ['back', 'left', 'up', 'down', 'right', 'forward'];
        var optionsHtml = directions.map(function(direction) {
            return [
                '<input id="direction-radio-', direction, '" type="radio" name="direction" value="', direction, '" />',
                '<label for="direction-radio-', direction, '" class="control-button radio-tab">', direction, '</label>',
            ].join('')
        }).join('');

        _playbackControls = parentEl;
        _playbackControls.classList.add('playback-controls');

        _playbackControls.innerHTML = [
            '<div class="radio-tabs">', optionsHtml, '</div>'
        ].join('');

        _playbackControls.addEventListener('change', __playbackControlsChangeListener);

        this.playbackOptions = {
            direction: this.playbackOptions.direction,  // trigger sync of DOM with state
        }
    }

    Object.defineProperty(this, 'playbackControls', {
        enumerable: false,
        get: function() {
            return _playbackControls;
        },
        set: function(newPlaybackControlsEl) {
            /**
             * This property follows the same pattern as the colorPicker property.
             */
            if ((newPlaybackControlsEl instanceof HTMLElement) &&
                (newPlaybackControlsEl !== _playbackControls))
            {
                _buildPlaybackControls.call(this, newPlaybackControlsEl);
            } else if ((newPlaybackControlsEl === null) ||
                (typeof newPlaybackControlsEl === 'undefined'))
            {
                _destroyPlaybackControls();
                _playbackControls = undefined;
            } else
            {
                console.error('Invalid playbackControls: must be instance of HTMLElement');
                throw 'Invalid playbackControls';
            }
        }
    });

        /**
         * Cube Container property
         */

    Object.defineProperty(this, 'container', {
        enumerable: false,
        get: function() {
            return _container;
        },
        set: function(newContainer) {
            /**
             * This property follows the same pattern as the colorPicker property.
             */
            if ((newContainer instanceof HTMLElement) &&
                (newContainer !== _container))
            {
                _container = newContainer;
                _container.appendChild(this.html);
            } else if ((newContainer === null) ||
                (typeof newContainer === 'undefined'))
            {
                _container.removeChild(this.html);
                _container = undefined;
            } else
            {
                console.error('Invalid container: must be instance of HTMLElement');
                throw 'Invalid container';
            }
        }
    });


        /**
         * Prev Step Button property and listener
         */

    var __prevStepButtonClickListener = function(event) {
        if (cube.isPlaying)
        {
            cube.pause();
        }

        cube.step(-1);
    };

    Object.defineProperty(this, 'prevStepButton', {
        enumerable: false,
        get: function() {
            return _prevStepButton;
        },
        set: function(newPrevStepButton) {
            /**
             * This property follows the same pattern as the colorPicker property.
             */
            if ((newPrevStepButton instanceof HTMLElement) &&
                (newPrevStepButton !== _prevStepButton))
            {
                if (_prevStepButton)
                {   // unbind a click listener that may have been previously bound
                    _prevStepButton.removeEventListener('click', __prevStepButtonClickListener);
                }

                // get the new button
                _prevStepButton = newPrevStepButton;

                // bind the click listener to the new button
                _prevStepButton.addEventListener('click', __prevStepButtonClickListener);
            } else if ((newPrevStepButton === null) ||
                (typeof newPrevStepButton === 'undefined'))
            {
                _prevStepButton.removeEventListener('click', __prevStepButtonClickListener);
                _prevStepButton = undefined;
            } else
            {
                console.error('Invalid prevStepButton: must be instance of HTMLElement');
            }
        }
    });


        /**
         * Next Step Button property and listener
         */

    var __nextStepButtonClickListener = function(event) {
        cube.pause();
        cube.step();
    };

    Object.defineProperty(this, 'nextStepButton', {
        enumerable: false,
        get: function() {
            return _nextStepButton;
        },
        set: function(newNextStepButton) {
            /**
             * This property follows the same pattern as the colorPicker property.
             */
            if ((newNextStepButton instanceof HTMLElement) &&
                (newNextStepButton !== _nextStepButton))
            {
                if (_nextStepButton)
                {   // unbind a click listener that may have been previously bound
                    _nextStepButton.removeEventListener('click', __nextStepButtonClickListener);
                }

                // get the new button
                _nextStepButton = newNextStepButton;

                // bind the click listener to the new button
                _nextStepButton.addEventListener('click', __nextStepButtonClickListener);
            } else if ((newNextStepButton === null) ||
                (typeof newNextStepButton === 'undefined'))
            {
                _nextStepButton.removeEventListener('click', __nextStepButtonClickListener);
                _nextStepButton = undefined;
            } else
            {
                console.error('Invalid nextStepButton: must be instance of HTMLElement');
            }
        }
    });


        /**
         * Play Button property and listener
         */

    var __playButtonClickListener = function(event) {
        cube.togglePlaying();
    };

    Object.defineProperty(this, 'playButton', {
        enumerable: false,
        get: function() {
            return _playButton;
        },
        set: function(newPlayButton) {
            /**
             * This property follows the same pattern as the colorPicker property.
             */
            if ((newPlayButton instanceof HTMLElement) &&
                (newPlayButton !== _playButton))
            {
                if (_playButton)
                {   // unbind a click listener that may have been previously bound
                    _playButton.removeEventListener('click', __playButtonClickListener);
                }

                // get the new button
                _playButton = newPlayButton;

                // bind the click listener to the new button
                _playButton.addEventListener('click', __playButtonClickListener);
            } else if ((newPlayButton === null) ||
                (typeof newPlayButton === 'undefined'))
            {
                _playButton.removeEventListener('click', __playButtonClickListener);
                _playButton = undefined;
            } else
            {
                console.error('Invalid playButton: must be instance of HTMLElement');
            }
        }
    });


        /**
         * Clear Button property and listener
         */

    var __clearButtonClickListener = function(event) {
        cube.clear();
    };

    Object.defineProperty(this, 'clearButton', {
        enumerable: false,
        get: function() {
            return _clearButton;
        },
        set: function(newClearButton) {
            /**
             * This property follows the same pattern as the colorPicker property.
             */
            if ((newClearButton instanceof HTMLElement) &&
                (newClearButton !== _clearButton))
            {
                if (_clearButton)
                {   // unbind a click listener that may have been previously bound
                    _clearButton.removeEventListener('click', __clearButtonClickListener);
                }

                // get the new button
                _clearButton = newClearButton;

                // bind the click listener to the new button
                _clearButton.addEventListener('click', __clearButtonClickListener);
            } else if ((newClearButton === null) ||
                (typeof newClearButton === 'undefined'))
            {
                _clearButton.removeEventListener('click', __clearButtonClickListener);
                _clearButton = undefined;
            } else
            {
                console.error('Invalid clearButton: must be instance of HTMLElement');
            }
        }
    });


    /**
     * FONT-RELATED PROPERTIES
     */

    Object.defineProperty(this, 'hasFont', {
        enumerable: true,
        set: NOOP,
        get: function() {
            return !!Object.keys(_fontMap).length;
        },
    });

    Object.defineProperty(this, 'fonts', {
        enumerable: true,
        set: NOOP,
        get: function() {
            return Object.keys(_fontMap);
        },
    });

    Object.defineProperty(this, 'activeFont', {
        enumerable: true,
        get: function() {
            return _activeFont;
        },
        set: function(newFont) {
            if (!_fontMap[newFont])
            {
                var availableFontsList = Object.keys(_fontMap).length ?
                    Object.keys(_fontMap).join(', ') :
                    '(none)';

                console.error(
                    'No such font loaded: ' + newFont + '. ' +
                    'Available fonts: ' + availableFontsList
                );
                return;
            }

            _activeFont = newFont;
        },
    });

    Object.defineProperty(this, 'activeFontChars', {
        enumerable: true,
        set: NOOP,
        get: function() {
            return _fontMap[_activeFont];
        },
    });

    function fetchJSONFile(path, successCb, failureCb) {
        /**
         * Helper function to make AJAX loading nicer. Grabbed from here: http://stackoverflow.com/questions/14388452/how-do-i-load-a-json-object-from-a-file-with-ajax
         */
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === 4)
            {
                if (httpRequest.status === 200)
                {
                    var data = JSON.parse(httpRequest.responseText);

                    successCb ? successCb(data) : NOOP();

                    return;
                }
            }

            failureCb ? failureCb() : NOOP();
        };
        httpRequest.open('GET', path);
        httpRequest.send();
    }

    /**
     * These functions are attached inside of the original definition of the cube
     * because they need access to "private" variables: _fontMap, _shapeMap.
     */

     this.loadFont = function(handle, url) {
         /**
          * Load a remote JSON file of a map of characters that can be displayed on
          * the cube. Save the loaded map of shapes by a handle for optional removal.
          */

        // this fetch is asynchronous
        fetchJSONFile(url, function(fontData) {
            _fontMap[handle] = fontData;
            if (Object.keys(_fontMap).length === 1)
            {   // if this newly loaded font is the only one available...
                this.activeFont = handle;   // ... use it.
            }
        }.bind(this));  // Use our "outside" this inside of the ajax success callback
     };

     this.unloadFont = function(handle) {
         /**
          * Unload a previously loaded font.
          */

        delete(_fontMap[handle]);

        if (!Object.keys(_fontMap).length)
        {   // if there aren't any more loaded fonts after unloading this one...
            _activeFont = undefined;    // ... we can't have an active font
        } else if (handle === _activeFont)
        {   // if we unloaded our current font, but have another available...
            _activeFont = Object.keys(_fontMap)[0]; // ... use it
        }
     };

    this.transitionTransforms = true;

    this.size = size; // How many rows and columns do I have?

    (function buildHTML() {
        // The HTML display of the cube istelf
        this.html = document.createElement('div');
        this.html.id = 'cube';

        this.html.style.height = this.outerDimensions + 'px';
        this.html.style.width = this.outerDimensions + 'px';
        this.html.style.transformStyle = 'preserve-3d';
        this.html.style.transformOrigin = [
            ['calc(', this.outerDimensions, 'px/2)'].join(''),
            ['calc(', this.outerDimensions, 'px/2)'].join(''),
            ['calc(-1 * ', this.outerDimensions, 'px/2)'].join(''),
        ].join(' ');

        htmlReadySuccessFn();
    }.bind(this)());  // Use our "outside" this inside of buildHTML

    this.cells = [];
    for (var depth = 0; depth < this.size; depth++) {
        // Iterate over each Z-plane
        for (var row = 0; row < this.size; row++) {
            // Iterate over each row
            for (var column = 0; column < this.size; column++) {
                // Iterate over each column

                // Create a cell
                var cell = new Cell({
                    cube: this,
                    size: _cellOptions.size,
                    depth: depth,
                    column: column,
                    row: row,
                    clickable: depth === 0,
                });

                this.cells.push(cell);

                this.htmlReady.then(function() {
                    this.cells.forEach(function(cell) {
                        this.html.appendChild(cell.html); // Actually render the cell
                    }.bind(this));  // Use our "outside" this inside of the foreach
                }.bind(this));  // Use our "outside" this inside of the promise callback
            }
        }
    }

    return this;
};

Cube.prototype.toJSON = function() {
    /**
     * Overrides the default (inherited) Object.toJSON() function to for custom
     * serialization. This is necessary because of the cube.html property,
     * which contains what are called "circular references," which prevent the
     * serializer from completing. To prevent this, we expose only the relevant
     * and serializable properties of the object.
     *
     * Example of a circular reference:
     *     var y = {
     *         property1: 'one',
     *         property2: 'two',
     *     };
     *     var x = {
     *         property1: 'aye',
     *         property2: 'bee',
     *         property3: y,
     *     };
     *     y.property3 = x;
     *
     * If you run the above code in the Chrome developer's console, you'll find
     * that both x and y are valid objects and that each points to the other.
     * You can verify this by expanding the properties of each (to see them,
     * just type each's variable name in the console and hit enter) and seeing
     * that the nesting of the objects never stops. This presents a problem for
     * the .toJSON() method because it's doing a similar traversal when
     * generating a string representation of each object.
     */

    return {
        size: this.size,
        cells: this.cells,
        playbackOptions: this.playbackOptions,
    };
};

Cube.prototype.nudge = function(direction, amount) {
    /**
     * Rotate the cube in a direction (left, right, up, down) by an amount
     * (in degrees).
     */

    amount = !isNaN(parseFloat(amount, 10)) ? amount : 1;

    switch (direction) {
        case 'left':
            this.yAngle -= amount;
            break;
        case 'up':
            this.xAngle += amount;
            break;
        case 'right':
            this.yAngle += amount;
            break;
        case 'down':
            this.xAngle -= amount;
            break;
    };

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.shiftPlane = function(axis, stepSize, wrap) {
    /**
     * Apply the state of any given cell to its n'th-away neighbor (stepSize)
     * along a given plane (axis: X, Y, Z). Wrap defines whether cells "fall
     * off" or wrap to the opposite face when shifting out of bounds.
     */

    stepSize = typeof stepSize !== 'undefined' ? stepSize : -1;
    wrap = typeof wrap !== 'undefined' ? !!wrap : true;

    var cube = this;

    function getNewValueForShift(cell, axis) {
        if ((cell[axis] + stepSize) >= 0 && (cell[axis] + stepSize) < cube.size)
        {   // your new coord originated from inside of bounds
            return (cell[axis] + stepSize) % cube.size;
        } else
        {   // your new coord originated from outside of bounds
            if (wrap)
            {   // reach around the other side
                return (cube.size + cell[axis] + stepSize) % cube.size;
            } else
            {   // screw it, your new value is nothing
                return -1;
            }
        }
    };

    function getNewRowForXShift(cell) {
        return getNewValueForShift(cell, 'row');
    }

    function getNewColForYShift(cell) {
        return getNewValueForShift(cell, 'column');
    }

    function getNewDepthForZShift(cell) {
        return getNewValueForShift(cell, 'depth');
    }

    var nextState = cube.cells.map(function(cell) {
        // We want to calculate the coordinates of the 'previous' cell along various directions
        var shiftedCoords = {
            'X': [
                getNewRowForXShift(cell),
                cell.column,
                cell.depth,
            ],
            'Y': [
                cell.row,
                getNewColForYShift(cell),
                cell.depth,
            ],
            'Z': [
                cell.row,
                cell.column,
                getNewDepthForZShift(cell),
            ]
        }[axis];

        // Once we have it, grab its on status and color and return it
        return {
            'on': cube.getCellAt(shiftedCoords[0], shiftedCoords[1], shiftedCoords[2]).on,
            'color': cube.getCellAt(shiftedCoords[0], shiftedCoords[1], shiftedCoords[2]).color
        };
    });

    // Iterate over all the cells and change their on status and color to their 'previous' neighbor's
    cube.cells.forEach(function(cell, index) {
        cell.on = false;
        cell.on = nextState[index].on;
        if (cell.on) {
            cell.color = nextState[index].color;
        }
    });

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.getCellAt = function(row, column, depth) {
    /**
     * Returns the cell for a given coordinate. If the coordinate is invalid,
     * return a Cell that is off and has no color. Note that this Cell does not
     * need to have a link to the cube or any other attributes set on it
     * because it represents an invalid point and is only used to set the state
     * of existing, valid cells. See cell.setFromCell() for the list of
     * properties that are copied between cells.
     */

    if ((row < 0) || (row > this.size - 1) ||
        (column < 0) || (column > this.size - 1) ||
        (depth < 0) ||  (depth > this.size - 1))
    {
        return new Cell({
            on: false,
            color: [0, 0, 0],
        });
    }

    var cellIndex = (depth * this.size * this.size) + (row * this.size) + column;
    return this.cells[cellIndex];
};

Cube.prototype.setCellAt = function(row, column, depth, newCell) {
    /**
     * Apply newCell's state to a cell at a given coordinate.
     *
     * Throws "Invalid coordinate" if the coordinate is impossible.
     */

    if ((row < 0) || (row > this.size - 1) ||
        (column < 0) || (column > this.size - 1) ||
        (depth < 0) ||  (depth > this.size - 1))
    {
        console.error('Invalid Coord', row, column, depth, newCell);
        throw 'Invalid coordinate';
    }

    var cellIndex = (depth * this.size * this.size) + (row * this.size) + column;
    var matchedCell = this.cells[cellIndex];

    matchedCell.setFromCell(newCell);

    return matchedCell;
};

Cube.prototype.applyCell = function(newCell) {
    /**
     * Convenience function for cube.setCellAt(). Expects a cell whose row,
     * column, and depth are all set. This may be useful for programatically
     * created Cell objects.
     */

    return this.setCellAt(newCell.row, newCell.column, newCell.depth, newCell);
};


/**
 * ANIMATION FUNCTIONS
 */

Cube.prototype.step = function(numSteps) {
    /**
     * Performs a single step of the current animation. If the number of steps
     * is negative, we take the number of steps in the "opposite" direction for
     * the current animation settings.
     */

    var DEFAULT_NUM_STEPS = 1;
    numSteps = typeof numSteps !== 'undefined' ? parseInt(numSteps, 10) || DEFAULT_NUM_STEPS : DEFAULT_NUM_STEPS;

    if (numSteps < 0)
    {   // step "backward"
        var startDirection = this.playbackOptions.direction;
        var oppositeDirection = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left',
            'forward': 'back',
            'back': 'forward',
        }[startDirection];  // get the opposite direction

        this.playbackOptions.direction = oppositeDirection; // apply the opposite direction for our next steps

        this.step(Math.abs(numSteps));  // call this very function, but with a positive number of steps

        this.playbackOptions.direction = startDirection;    // re-apply the old direction
    }

    for (var i = 0; i < numSteps; i++)
    {
        /**
         * animationCb is a property of the cube object, the getter of which
         * returns the function that will apply the desired animation for the
         * current settings.
         */
        this.animationCb();
    }

    return this;    // enables multiple calls on cube to be "chained"
}

Cube.prototype.play = function(opts) {
    /**
     * Starts the animation loop. The loop can be stopped using cube.clear();
     */

    opts = typeof opts !== 'undefined' ? opts : {};

    this.playbackOptions = opts;
    this.isPlaying = true;

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.pause = function() {
    /**
     * Stop the animation loop. The loop can be started using cube.play();
     */

    this.isPlaying = false;

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.togglePlaying = function(force) {
    this.isPlaying = (typeof force !== 'undefined') ?
        force :
        !this.isPlaying;
};

Cube.prototype.clear = function() {
    /**
     * Clear the contents of the cube.
     */

    this.cells.forEach(function(cell) {
        cell.on = false;
    });

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.listenForKeystrokes = function(opts) {
    var cube = this;

    this.keyListenerOptions = opts;

    var validKeyFns = {
        specials: function(e) {
            return (
                (e.keyCode === 32) ||   // spacebar
                (e.keyCode === 8) ||    // backspace
                (e.keyCode === 13) ||   // enter
                (e.keyCode >= 37 && e.keyCode <= 40)    // arrow keys
            );
        },
        alpha: function(e) {
            return validKeyFns.specials(e) || (e.keyCode >= 65 && e.keyCode <= 90);
        },
        num: function(e) {
            return (
                validKeyFns.specials(e) ||
                (e.keyCode >= 48 && e.keyCode <= 57) || // top row
                (e.keyCode >= 96 && e.keyCode <= 105)   // num pad
            );
        },
        symbols: function(e) {
            return (
                validKeyFns.specials(e) ||
                (e.keyCode >= 106 && e.keyCode <= 111) ||  // math operators
                (e.keyCode >= 186 && e.keyCode <= 222) ||  // punctuation
                (e.shiftKey && e.keyCode >= 48 && e.keyCode <= 57)    // "uppercase" numbers
            );
        },
        alphanum: function(e) {
            return validKeyFns.alpha(e) || validKeyFns.num(e);
        },
        all: function(e) {
            return validKeyFns.alphanum(e) || validKeyFns.symbols(e);
        },
    }

    this.validKeyFilterFn = function(e) {
        /**
         * Call the validator for the current set of desired keys
         * (cube.keyListenerOptions.keys) passing in the current event for
         * evaluation. If the key is valid, allow the event to proceed,
         * otherwise don't let other listeners see it.
         */
        if (validKeyFns[cube.keyListenerOptions.keys](e))
        {
            return true;
        }

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    this.actionKeyListenerFn = function(e) {
        /**
         * Capture key events that are supposed to trigger an action on the cube.
         * In the event that an action is typed, we don't want to let the event
         * propagate up to this.keyListenerFn(). If it were to, the letters
         * pressed to trigger actions would appear on the cube. For example,
         * CTRL+B would both change the cube's animation direction and show a 'b'
         * on the front face.
         */

        var keyDirectionMap = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            70 : 'front',   // "Front:  CTRL+F"
            66 : 'back',    // "Back:   CTRL+B"
            85 : 'up',      // "Up:     CTRL+U"
            68 : 'down',    // "Down:   CTRL+D"
            82 : 'right',   // "Right:  CTRL+R"
            76 : 'left',    // "Left:   CTRL+L"
        };

        function keyIsDirectionalAction() {
            return Object.keys(keyDirectionMap).indexOf(e.keyCode.toString()) !== -1;
        }

        if ((e.ctrlKey && (e.keyCode === 32)) || e.keyCode === 13)  // ctrl+space, or enter
        {
            /**
             * Prevent the browser's default behavior for the event. For example,
             * arrow keys scroll the browser window by default. This would be
             * prevented by e.preventDefault().
             *
             * Also prevent the event from "bubbling up" to higher points in the
             * listening tree or DOM. This is useful, as mentioned in the comment
             * above for preventing other event handlers for doing work that might
             * conflict with that done by this handler.
             *
             * For a more thorough explanation, see here: http://stackoverflow.com/questions/4616694/what-is-event-bubbling-and-capturing
             */
            e.preventDefault();
            e.stopPropagation();

            cube.togglePlaying();
        } else if (e.keyCode === 8) // delete
        {
            e.preventDefault();
            e.stopPropagation();

            if (e.ctrlKey)
            {
                cube.pause();
                cube.clear();   // clear whole cube
            } else
            {
                cube.writeSlice(cube.getCharacterRender(' '), 'front');   // "space" character
            }
        } else if (e.ctrlKey && (e.keyCode === 189))    // ctrl+minus
        {   // prev step
            e.preventDefault();
            e.stopPropagation();

            cube.step(-1);
        } else if (e.ctrlKey && (e.keyCode === 187))    // ctrl+equals
        {   // next step
            e.preventDefault();
            e.stopPropagation();

            cube.step();
        } else if (e.ctrlKey && keyIsDirectionalAction(e))
        {
            e.preventDefault();
            e.stopPropagation();

            var newDirection = keyDirectionMap[e.keyCode];
            if (e.altKey)
            {
                if (newDirection === 'up')
                {
                    newDirection = 'back';
                } else if (newDirection === 'down')
                {
                    newDirection = 'forward';
                }
            }

            cube.playbackOptions = {
                direction: newDirection,
            };
        } else if (e.ctrlKey && e.keyCode >= 48 && e.keyCode <= 57) // ctrl + num row
        {
            e.preventDefault();
            e.stopPropagation();

            var shapeIndex = parseInt(String.fromCharCode(e.keyCode), 10) - 1;
            var numShapes = cube.shapeNames.length;
            if ((shapeIndex >= 0) && (shapeIndex < numShapes))
            {
                cube.renderShape(cube.shapeNames[shapeIndex]);
            }
        }
    };

    this.keyListenerFn = function(e) {
        /**
         * Called for each keypress that is allowed to pass through the
         * validation function.
         */

        var char = String.fromCharCode(e.which);

        if (cube.keyListenerOptions.animate)
        {
            cube.writeSlice(cube.getCharacterRender(char), 'front');

            cube.play({
                direction: 'back',
                stepSize: cube.keyListenerOptions.stepSize,
                delay: cube.keyListenerOptions.animateRate,
            });
        } else
        {
            cube.writeSlice(cube.getCharacterRender(char), 'front');
        }
    };

    if (!this.listeningForKeystrokes)
    {
        /**
         * By checking that this.listeningForKeystrokes is not already set, we
         * prevent double-binding of these listeners to single events.
         */

        this.listeningForKeystrokes = true;
        document.addEventListener('keydown', this.validKeyFilterFn);
        document.addEventListener('keydown', this.actionKeyListenerFn);
        document.addEventListener('keypress', this.keyListenerFn);
    }

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.stopListeningForKeystrokes = function() {
    /**
     * Removes event listeners added by cube.listenForKeystrokes()
     */

    if (this.listeningForKeystrokes)
    {
        /**
         * By checking that we were listening for keystrokes before, we are sure
         * that the event listeners were bound and that the functions we are
         * referencing to unbind have been defined.
         */

        document.removeEventListener('keydown', this.validKeyFilterFn);
        document.removeEventListener('keydown', this.actionKeyListenerFn);
        document.removeEventListener('keypress', this.keyListenerFn);
        this.listeningForKeystrokes = false;
    }

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.getCharacterRender = function(char, desiredColor) {
    /**
     * Return a slice containing a character (char, a single character) in a
     * color (desiredColor, a string) for rendering to the cube. This function
     * does not draw to the cube; the output of this function needs to get to
     * cube.writeSlice() for rendering.
     */

    desiredColor = typeof desiredColor !== 'undefined' ? desiredColor : this.penColorRgb;
    var invalidRgbValueFn = function(val) {
        return val < 0 || val > 255;
    }

    if (!(desiredColor instanceof Array) ||
        desiredColor.length !== 3 ||
        desiredColor.some(invalidRgbValueFn))
    {
        console.error(
            'Invalid desired color: ', desiredColor,
            'Defaulted to this.penColor: ', this.penColorRgb
        );
        desiredColor = this.penColorRgb;
    }

    var charPixels = cube.activeFontChars[char];


    /**
     * Loop over each pixel to apply the current penColor if the pixel is on.
     */

    charPixels.forEach(function(cell) {
        if (cell.on)
        {
            cell.color = desiredColor;
        }
    });

    return charPixels;
};

Cube.prototype.renderShape = function(shape) {
    /**
     * Draw a shape to the front face of the cube.
     */

    if (this.shapeNames.indexOf(shape) === -1)
    {
        console.error('Invalid shape. Known shapes: ' + this.shapeNames.join(', '));
        return;
    }

    cube.writeSlice(this.shapes[shape], 'front', 0);
};


/**
 * SLICE MANIPULATION FUNCTIONS
 */

Cube.prototype.affectXSlice = function(column, fn) {
    /**
     * Call a function on each cell within a given X slice starting from the left
     */

    for (var depth = cube.size - 1; depth >= 0; depth--)
    {
        for (var row = 0; row < cube.size; row++)
        {
            fn.apply(this, [row, column, depth]);
        }
    }

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.affectYSlice = function(row, fn) {
    /**
     * Call a function on each cell within a given Y slice starting from the top
     */

    for (var column = 0; column < this.size; column++)
    {
        for (var depth = this.size - 1; depth >= 0; depth--)
        {
            fn.apply(this, [row, column, depth]);
        }
    }

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.affectZSlice = function(depth, fn) {
    /**
     * Call a function on each cell within a given Z slice starting from the front
     */

    for (var column = 0; column < cube.size; column++)
    {
        for (var row = 0; row < cube.size; row++)
        {
            fn.apply(this, [row, column, depth]);
        }
    }

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.readSlice = function(face, offset, output) {
    /**
     * Read a slice "offset" slices in from "face", and return in format: "output"
     *
     * Note: readSlice('left') returns the same thing as readSlice('right', 7);
     *  they are _NOT_ reflections of each other. Both are captured as if looking
     *  from the left with the origin in the upper left. The same applies for top
     *  and bottom and for front and back. The intuitive faces are FRONT, TOP, and
     *  LEFT.
     */

    var validFaces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    var validOutputs = ['object', 'object-deep', 'json'];

    /**
     * Use reasonable default values if the caller didn't give you any or gave
     * values that are out of bounds or otherwise invalid.
     *
     * !TODO: log an error the console?
     */
    offset = (typeof offset !== 'undefined') ?
        Math.max(0, Math.min(parseInt(offset, 10), this.size - 1)) :
        0;
    face = (typeof face !== 'undefined') && (validFaces.indexOf(face) !== -1) ?
        face :
        'front';
    output = (typeof output !== 'undefined') && (validOutputs.indexOf(output) !== -1) ?
        output :
        'object-deep';

    var cells = [];

    function captureCell(r, c, d) {
        /**
         * Callback, called for each cell, for getting the cell data in the
         * correct format and gathering them into a single data structure.
         */
        var cell = (output === 'object-deep') ?
            _.cloneDeep(this.getCellAt(r, c, d)) :
            this.getCellAt(r, c, d);
        cells.push(cell);
    }

    /**
     * Use the correct affectFooSlice function for the axis
     */
    if ((face === 'front') || (face === 'back'))
    {
        var depth = (face === 'back') ? (this.size - 1) - offset : offset;
        this.affectZSlice(depth, captureCell);
    } else if ((face === 'top') || (face === 'bottom'))
    {
        var row = (face === 'bottom') ? (this.size - 1) - offset : offset;
        this.affectYSlice(row, captureCell);
    } else if ((face === 'left') || (face === 'right'))
    {
        var column = (face === 'right') ? (this.size - 1) - offset : offset;
        this.affectXSlice(column, captureCell);
    }

    if (output === 'json')
    {
        return JSON.stringify(cells);
    }

    return cells;
};

Cube.prototype.writeSlice = function(data, face, offset) {
    /**
     * Write a saved slice (recorded in the formats output by cube.readSlice) to
     * "offset" slices in from "face".
     *
     * Note: Refer to note in cube.readSlice() on left/right, front/back, etc. origins.
     */

    var validFaces = ['front', 'back', 'left', 'right', 'top', 'bottom'];

    offset = (typeof offset !== 'undefined') ?
        Math.max(0, Math.min(parseInt(offset, 10), this.size - 1)) :
        0;
    face = (typeof face !== 'undefined') && (validFaces.indexOf(face) !== -1) ?
        face :
        'front';

    try
    {   // handle different types of data input: JSON or raw object
        data = JSON.parse(data);    // throws SyntaxError if not valid JSON string
    } catch (err)
    {   // pass
    }

    if (!(data instanceof Array) || (data.length !== Math.pow(this.size, 2)))
    {
        throw 'Malformed data';
    }

    var cells = data.slice();

    function writeCellFromData(r, c, d) {
        var cell = cells.shift();
        this.setCellAt(r, c, d, cell);
    };

    if ((face === 'front') || (face === 'back'))
    {
        var depth = (face === 'back') ? (this.size - 1) - offset : offset;
        this.affectZSlice(depth, writeCellFromData);
    } else if ((face === 'top') || (face === 'bottom'))
    {
        var row = (face === 'bottom') ? (this.size - 1) - offset : offset;
        this.affectYSlice(row, writeCellFromData);
    } else if ((face === 'left') || (face === 'right'))
    {
        var column = (face === 'right') ? (this.size - 1) - offset : offset;
        this.affectXSlice(column, writeCellFromData);
    }

    return this;    // enables multiple calls on cube to be "chained"
};

Cube.prototype.getPngDataOfSlice = function(slice) {
    /**
     * Helper function to render icons that resemble 2d slices of the cube.
     * Returns a data url.
     *
     * Helpful links:
     * http://stackoverflow.com/questions/4899799/whats-the-best-way-to-set-a-single-pixel-in-an-html5-canvas
     * http://www.html5canvastutorials.com/advanced/html5-canvas-save-drawing-as-an-image/
     */

    var PNG_OUTPUT_WIDTH = 64;
    var PNG_OUTPUT_HEIGHT = 64;

    var PIXEL_MULTIPLIER_W = Math.floor(PNG_OUTPUT_WIDTH / this.size);
    var PIXEL_MULTIPLIER_H = Math.floor(PNG_OUTPUT_HEIGHT / this.size);

    var c;
    var ctx;
    var id;
    var d;

    this.sliceRenderer = {};

    c = this.sliceRenderer.c = document.createElement('canvas');
    c.width = PNG_OUTPUT_WIDTH;
    c.height = PNG_OUTPUT_HEIGHT;

    ctx = this.sliceRenderer.ctx = c.getContext('2d');

    id = ctx.createImageData(1, 1);
    d = id.data;

    try
    {   // handle different types of data input: JSON or raw object
        slice = JSON.parse(slice);    // throws SyntaxError if not valid JSON string
    } catch (err)
    {   // pass
    }

    if (!(slice instanceof Array) || (slice.length !== Math.pow(this.size, 2)))
    {
        throw 'Malformed data';
    }

    slice.forEach(function drawCell(cell, idx) {
        /**
         * if we don't have row or column information, we need to populate it
         * on each cell so that it can be drawn in the correct spot of the png.
         */
        cell.row = !isNaN(parseInt(cell.row, 10)) ? cell.row : Math.floor(idx % this.size);
        cell.column = !isNaN(parseInt(cell.column, 10)) ? cell.column : Math.floor(idx / this.size);

        /**
         * Because we are scaling the image up, we are drawing multiple real
         * pixels in the PNG for each big, fat cell in the slice.
         */
        var pixelOffsetX = cell.row * PIXEL_MULTIPLIER_W;
        var pixelOffsetY = cell.column * PIXEL_MULTIPLIER_H;

        for (var subpixelCol = 0; subpixelCol < PIXEL_MULTIPLIER_W; subpixelCol++)
        {
            for (var subpixelRow = 0; subpixelRow < PIXEL_MULTIPLIER_H; subpixelRow++)
            {
                d[0] = cell.color[0];
                d[1] = cell.color[1];
                d[2] = cell.color[2];
                d[3] = cell.on ? 255 : 0;

                var y = pixelOffsetX + subpixelRow; // the x/y are swapped in the slice serialization
                var x = pixelOffsetY + subpixelCol;

                ctx.putImageData(id, x, y);
            }
        }
    }.bind(this));  // Use our "outside" this inside of the foreach

    return c.toDataURL();
};