var xhr = require('xhr');

module.exports = function(origin, waypoints, callback) {
  xhr({
    url: "https://api.mapbox.com/optimized-trips/v1/mapbox/driving/" + origin + ";" + waypoints + "?access_token=pk.eyJ1Ijoic2FyYWhrbGVpbnMiLCJhIjoiY2l5b2pmdDNnMDA1bTJ4cGZneDFqMmx1ZyJ9.i8GsZn75pDMDHnFdj6fRuw" + "&source=first&destination=last&geometries=geojson&roundtrip=false"
  }, function(err, response, body) {
    if (err) return callback(err);
    return callback(err, JSON.parse(body)); 
  });
};
