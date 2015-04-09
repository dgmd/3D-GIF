var cube;
window.addEventListener('load', function() { // When everything is loaded

    // Define cell properties for passing into the Cube
    var cellOptions = {
        size: 50,
    };

    // Build a new Cube object
    cube = new Cube(8, cellOptions);

    // Load the cube's typeface
    cube.loadFont('printChar21', 'js/assets/cube8PrintChar21Font.json');

    // attach the cube itself to the DOM
    cube.container = document.getElementById('cube-wrapper');

    // Get a better perspective for seeing what's inside the cube
    cube.xAngle = -30;
    cube.yAngle = 30;

    // add the color and shape pickers that appear on the sides
    cube.colorPicker = document.getElementById('color-picker');
    cube.shapePicker = document.getElementById('shape-picker');

    // attach buttons and other behaviors
    cube.prevStepButton = document.getElementById('prev-step');
    cube.nextStepButton = document.getElementById('next-step');
    cube.playButton = document.getElementById('play');
    cube.clearButton = document.getElementById('clear');
    cube.playbackControls = document.getElementById('playback-controls');

    // Listen for keyboard shortcuts (except nudging)
    //  and for characters being pressed to display
    cube.listenForKeystrokes();

    (function bindCubeRotationKeyListeners() {
        /**
         * Add cube rotation listeners
         */

        var KEY_LISTEN_RATE = 10;   // in milliseconds

        var keyDirectionMap = {
            /**
             * Which keyCodes correspond to which directions of movement for the
             * cube
             */
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
        };

        document.addEventListener('keydown', _.throttle(function(e) {
            if (e.ctrlKey || e.altKey)
            {
                // don't try to move the cube if the ctrl or alt keys are down
                return;
            }

            var direction = keyDirectionMap[e.keyCode];
            if (direction)
            {
                /**
                 * If the keyCode pressed has a binding for a direction in the map
                 * above, disable CSS transitions so that they don't interfere
                 * during our rapid changes to the cube's transform property.
                 */
                cube.transitionTransforms = false;
                cube.nudge(direction);  // actually rotate the cube
            }
        }, KEY_LISTEN_RATE), false);

        document.addEventListener('keyup', function(e) {
            if (keyDirectionMap[e.keyCode])
            {   // if we are done rotating the cube...
                cube.transitionTransforms = true;    // ... restore the transitions
            }
        }, false);
    }());
});
