var Slice = function() {
    var me = this; // 'this' can point to many, different things, so we grab an easy reference to the object
    // You can read more about 'this' at:
    // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
    // at http://www.quirksmode.org/js/this.html
    // and in a more detailed tutorial: http://javascriptissexy.com/understand-javascripts-this-with-clarity-and-master-it/

    // Connection to a cube
    this.cube = null;

    // Which plane am I in? {xy, yz, xz}
    this.plane = null;

    // Which number slice am I in my plane? {0..7}
    this.index = null;

    // How many rows and columns do I have?
    this.width = null;
    this.height = null;

    // Make the HTML that represents me:
    this.html = document.createElement('div');
    this.html.classList.add('slice');

    // // The reset button
    // var reset = document.getElementById('reset');
    // reset.addEventListener('click', function(event) { // When we click reset
    //     me.resetSlice();
    // });

    // // The submit button
    // var send = document.querySelector('.status-display.valid');
    // send.addEventListener('click', function(event) {
    //     me.sendSlice();
    // });

    var _cells = null;
    Object.defineProperty(this, 'cells', {
        // Custom getters and setters; you can read more about this at:
        // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
        // Yehuda Katz's tutorial: http://yehudakatz.com/2011/08/12/understanding-prototypes-in-javascript/
        get: function() {
            // When someone asks for slice.cells, give them _cells
            return _cells;
        },
        set: function(array) {
            var slice = this;
            _cells = array; // When someone sets slice.cells, save the array they give us in _cells

            // And then go through each cell
            _cells.forEach(function(cell, index) {
                cell.slice = slice;

                // Set its row and column
                cell.row = Math.floor(index / me.width);
                cell.column = index % me.width;

                // Set its position explicitly, so the other cells don't slide around if and when its moved to the tray
                cell.html.style.left = String((index % slice.width) * (100 / slice.width)) + '%';
                cell.html.style.top = String(Math.floor(index / slice.height) * (100 / slice.height)) + '%';

                // Add an event listener for when that cell is submitted to the tray
                // We want it to dispatch an event to me
                // cell.html.addEventListener('cellSubmit', me);

                // Then actually move my HTML into the word tray
                cube.html.appendChild(slice.html);
            });
        }
    });

    return this;
};

// // We want our Slice to be able to respond to events— in particular, the cellSubmit event we made
// Slice.prototype.handleEvent = function(event) {
//     // When I receive an event
//     if (event.type == 'cellSubmit') {
//         // If it's a cellSubmit event
//     }
// };
