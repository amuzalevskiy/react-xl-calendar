babel --presets es2015,react node_modules/react-oro-calendar/index.jsx -o node_modules/react-oro-calendar/index.js
browserify -t [ babelify --presets [ react ] ] main.js -o bundle.js
