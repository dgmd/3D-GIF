var Cell = function() {
    var me = this; // 'this' can point to many, different things, so we grab an easy reference to the object
    // You can read more about 'this' at:
    // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
    // at http://www.quirksmode.org/js/this.html
    // and in a more detailed tutorial: http://javascriptissexy.com/understand-javascripts-this-with-clarity-and-master-it/

    // We're going to want to know what row and column I'm in, but we won't 'til I'm added to a slice
    this.row = null;
    this.column = null;

    // Which slice owns me
    this.slice = null;

    // Connection to a cube
    this.cube = null;

    // Let's make the HTML that'll display me
    me.html = document.createElement('div');
    me.html.classList.add('cell');

    // Let's create an event for when I want to submit myself to the tray
    // You can read more about this on MDN at https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events
    var submit = new CustomEvent('cellSubmit', {
        detail: {
            'cell': me // and send along all my info
        }
    });
    me.html.addEventListener('click', function(event) {
    	me.html.dispatchEvent(submit); // and trigger my custom event when someone clicks my HTML
    });

    var _color; // the letter I actually contain
    Object.defineProperty(this, 'color', {
        // Custom getters and setters; you can read more about this at:
        // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
        // Yehuda Katz's tutorial: http://yehudakatz.com/2011/08/12/understanding-prototypes-in-javascript/
        get: function() {
            // when someone asks for cell.letter, just give them back _letter
            return _color;
        },
        set: function(color) {
            // when someone sets cell.letter = something, reset _letter
            _color = color;
            // and change what my HTML displays
            me.html.style.background = color;
        }
    });

    return this;
};