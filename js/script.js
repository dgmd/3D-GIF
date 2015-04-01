window.addEventListener('load', function() { // When everything is loaded
    var xAngle = 0,
        yAngle = 0;

    var body = document.querySelector('body');
    body.addEventListener("keydown", function(evt) {
        switch (evt.keyCode) {
            case 37: // left
                yAngle -= 11.25;
                evt.preventDefault();
                break;

            case 38: // up
                xAngle += 11.25;
                evt.preventDefault();
                break;

            case 39: // right
                yAngle += 11.25;
                evt.preventDefault();
                break;

            case 40: // down
                xAngle -= 11.25;
                evt.preventDefault();
                break;
        };
        document.querySelector('#cube').style.transform = 'rotateX(' + xAngle + 'deg' + ')' + ' ' + 'rotateY(' + yAngle + 'deg' + ')'
    }, false);
});
