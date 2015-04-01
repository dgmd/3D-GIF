var Cube = function(sideLength) {
    var me = this;
    // 'this' can point to many, different things, so we grab an easy reference to the object
    // You can read more about 'this' at:
    // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
    // at http://www.quirksmode.org/js/this.html
    // and in a more detailed tutorial: http://javascriptissexy.com/understand-javascripts-this-with-clarity-and-master-it/

    // How many rows and columns do I have?
    this.depth = sideLength;

    // The cube istelf
    this.html = document.createElement('div');
    this.html.id = 'cube';

    ['xy', 'yz', 'xz'].forEach(function(plane) {
        var faceLabels = {
            'xy': ['FRONT', 'BACK'],
            'yz': ['LEFT', 'RIGHT'],
            'xz': ['TOP', 'BOTTOM']
        };

        var planeContainer = document.createElement('div');
        planeContainer.classList.add(plane);

        [0, 1].forEach(function(index) {
            var faceDisplay = document.createElement('div');
            faceDisplay.classList.add('face');
            faceDisplay.id = faceLabels[plane][index].toLowerCase();

            var label = document.createElement('label');
            label.classList.add('label');
            label.innerHTML = faceLabels[plane][index];

            faceDisplay.appendChild(label);
            planeContainer.appendChild(faceDisplay);
        });

        me.html.appendChild(planeContainer);
    });

    // // The reset button
    // var reset = document.getElementById('reset');
    // reset.addEventListener('click', function(event) { // When we click reset
    //     me.reset();
    // });

    // // The clear button
    // var clear = document.getElementById('clear');
    // clear.addEventListener('click', function(event) { // When we click clear
    //     me.clear();
    // });

    // The rotate around x buttons
    var rotx_cw = document.getElementById('rotx+');
    rotx_cw.addEventListener('click', function(event) { // When we click reset
        me.rotate(1, 0);
    });

    var rotx_ccw = document.getElementById('rotx-');
    rotx_ccw.addEventListener('click', function(event) { // When we click reset
        me.rotate(-1, 0);
    });

    // The rotate around x buttons
    var roty_cw = document.getElementById('roty+');
    roty_cw.addEventListener('click', function(event) { // When we click reset
        me.rotate(0, 1);
    });

    var roty_ccw = document.getElementById('roty-');
    roty_ccw.addEventListener('click', function(event) { // When we click reset
        me.rotate(0, -1);
    });

    // // The save and send buttons
    // var save = document.getElementById('save');
    // save.addEventListener('click', function(event) {
    //     me.save();
    // });

    // var send = document.getElementById('send');
    // send.addEventListener('click', function(event) {
    //     me.send();
    // });

    var _slices;
    Object.defineProperty(this, 'slices', {
        // Custom getters and setters; you can read more about this at:
        // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
        // Yehuda Katz's tutorial: http://yehudakatz.com/2011/08/12/understanding-prototypes-in-javascript/
        get: function() {
            // When someone asks for slice.cells, give them _cells
            return _slices;
        },
        set: function(array) {
            var cube = this;
            _slices = array; // When someone sets slice.cells, save the array they give us in _cells

            // And then go through each cell
            _slices.forEach(function(slice, index) {
                slice.cube = cube;
                slice.plane = 'xy';
                slice.index = index;

                console.log("Setting the transform for", slice, "to", generateTransformCSS(slice));
                slice.html.style.transform = generateTransformCSS(slice);
                console.log("Transform is now", slice.html.style.transform);
                console.log(generateTransformCSS(slice));

                // Add an event listener for when that cell is submitted to the tray
                // We want it to dispatch an event to me
                // cell.html.addEventListener('cellSubmit', me);

                // Then actually move my HTML into the word tray
                cube.html.querySelector('.' + slice.plane).appendChild(slice.html);
            });
        }
    });

    var calculateTransform = function(slice) {
        return {
            'xy': {
                'translate': {
                    'x': 0,
                    'y': 0,
                    'z': 375 - 50 * slice.index
                },
                'rotate': {
                    'x': 0,
                    'y': 0,
                    'z': 0
                }
            },
            'yz': {
                'translate': {
                    'x': 0,
                    'y': 200,
                    'z': 175 - 50 * slice.index
                },
                'rotate': {
                    'x': 90,
                    'y': 0,
                    'z': 0
                }
            },
            'xz': {
                'translate': {
                    'x': 200,
                    'y': 0,
                    'z': 175 - 50 * slice.index
                },
                'rotate': {
                    'x': 0,
                    'y': -90,
                    'z': 0
                }
            }
        }
    };

    var generateTransformCSS = function(slice) {
        var transform = calculateTransform(slice);
        return ['translate', 'rotate'].map(function(transformType) {
            var unit = {
                'translate': 'px',
                'rotate': 'deg'
            }[transformType];

            var transformDictionary = transform[slice.plane][transformType]
            return Object.keys(transformDictionary).map(function(key) {
                return transformType + key.toUpperCase() + '(' + transformDictionary[key] + unit + ')';
            }).join(' ');
        }).join(' ');
    };

    document.querySelector('#container').appendChild(this.html);

    return this;
};

// We want our Slice to be able to respond to events— in particular, the cellSubmit event we made
Cube.prototype.handleEvent = function(event) {
    // When I receive an event
    if (event.type == 'cellSubmit') {
        // If it's a cellSubmit event
    }
};

Cube.prototype.randomColor = function() {
    var random = Math.random() * 0xFFFFFF; // Choose a random number

    // And then find the region our random number corresponds to
    return random;
};

Cube.prototype.reset = function() {
    var me = this;
};

Cube.prototype.clear = function() {
    var me = this;
};

Cube.prototype.save = function() {
    var me = this;
};

Cube.prototype.send = function() {
    var me = this;
};

Cube.prototype.rotate = function(x, y) {
    var me = this;
};
