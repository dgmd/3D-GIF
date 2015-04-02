var Cell = function() {
    var me = this; // 'this' can point to many, different things, so we grab an easy reference to the object
    // You can read more about 'this' at:
    // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
    // at http://www.quirksmode.org/js/this.html
    // and in a more detailed tutorial: http://javascriptissexy.com/understand-javascripts-this-with-clarity-and-master-it/

    // We're going to want to know what row, column, and depth I'm at, but we won't 'til I'm added to a cube
    this.row = null;
    this.column = null;
    this.depth = null;

    // Connection to a cube
    this.cube = null;

    // Let's make the HTML that'll display me
    me.html = document.createElement('div');
    me.html.classList.add('cell');

    this.led = document.createElement('div');
    this.led.classList.add('led');
    me.html.appendChild(this.led);

    // We'll store colors internally as an RGB array
    this.defaultColor = [0, 0, 255];
    var _color = [0, 0, 0]; // we start out off
    Object.defineProperty(this, 'color', {
        'get': function() {
            return _color;
        },
        'set': function(rgbDictionary) {
            // A custom setter which both updates our color attribute and renders that color
            if (this.on) {
                _color = rgbDictionary;
                var led = me.html.querySelector('.led'); // the LED's HTML
                led.style.backgroundColor = 'rgba(' + this.color.join(',') + ',' + '1' + ')';
                me.html.style.backgroundColor = 'rgba(' + this.color.join(',') + ',' + '0.05' + ')';
            }
        }
    });
    // Initialize our color
    this.led.style.backgroundColor = 'rgba(' + this.color.join(',') + ',' + '1)';


    var _on = false;
    Object.defineProperty(this, 'on', {
        'get': function() {
            return _on;
        },
        'set': function(turnOn) {
            // A custom setter for my on status which both toggles my on status and changes my color to black
            if (turnOn) {
                _on = turnOn;
                this.led.classList.add('on');
                this.color = this.defaultColor;
                me.html.style.opacity = 1;
            } else {
                this.led.classList.remove('on');
                this.color = [0, 0, 0];
                _on = turnOn;
                me.html.style.opacity = 0.375;
            }
        }
    });
    this.on = false;

    // If I'm in the front plane
    me.html.addEventListener('click', function(event) {
        if (me.depth === 0) {
            // Toggle my on status when someone clicks the cell
            me.on = !me.on;
        }
    });

    return this;
};
