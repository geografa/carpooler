var mapboxgl = require('mapbox-gl');
var getOptimizedTrip = require('./getOptimizedTrip.js');

mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhZmEiLCJhIjoiY2oyamZ0cTVqMDIwYzMybWU4N25kenpjMCJ9.9clBFPj-fOP8ZToWfis7rQ';

var total_stops = document.getElementById('total-stops'),
  total_time = document.getElementById('total-time'),
  info_wrapper = document.getElementById('info-wrapper'),
  total_distance = document.getElementById('total-distance'),
  map_spinner = document.getElementById('map-spinner'),
  spinner_div = document.getElementById('spinner-div'),
  green = '#3865ed',
  origin,
  origin_coords = [-122.67773866653444,45.52245801087795],
  stops_coordinates = [],
  counter = 0,
  // Holds mousedown state for events. if this
  // flag is active, we move the point on `mousemove`.
  isDragging,
  // Is the cursor over a point? if this
  // flag is active, we listen for a mousedown event.
  isCursorOverPoint,
  sonarMarker,
  trip;

var bounds = [
    [-123.2238762601873, 45.34774165498007], // Southwest coordinates
    [-121.96865160547848, 45.676905323738026]  // Northeast coordinates
];

var map = new mapboxgl.Map({
  container: 'map', 
  style: 'mapbox://styles/grafa/cj6icrjym4lrs2rljruycazub',
  center: [-122.67773866653444,45.52245801087795], 
  zoom: 12.5,
  maxZoom: 17,
  minZoom: 9,
  // maxBounds: bounds
});

map.addControl(new MapboxGeocoder({
    accessToken: mapboxgl.accessToken
}));

var canvas = map.getCanvasContainer();

var origin_feature = {
  "type": "FeatureCollection",
  "features": [{
      "type": "Feature",
      "geometry": {
          "type": "Point",
          "coordinates": origin_coords
      }
  }]
};
function mouseDown() {
// Prevent the default map drag behavior.
  e.preventDefault();

  canvas.style.cursor = 'grab';

  map.on('mousemove', onMove);
  map.once('mouseup', onUp);
}

// update marker location
function onMove(e) {
  var coords = e.lngLat;

  // Set a UI indicator for dragging.
  canvas.style.cursor = 'grabbing';

  // Update the Point feature in `geojson` coordinates
  // and call setData to the source layer `point` on it.
  origin_feature.features[0].geometry.coordinates = [coords.lng, coords.lat];
  map.getSource('trip-origin-casing').setData(origin_feature);
  map.getSource('trip-origin').setData(origin_feature);
}

function onUp(e) {
  var coords = e.lngLat;

  canvas.style.cursor = '';
  isDragging = false;

  // Add sonar marker back to map
  origin_coords = [coords.lng, coords.lat];

  sonarMarker.setLngLat(origin_coords)
  .addTo(map);

  // Re-draw map
  if (counter !== 0 && stops_coordinates.length > 0) {
    origin = tripOrigin(origin_coords);
    var api_coordinates = stops_coordinates.join(';');

    getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar);
  }
  // Unbind mouse events
  map.off('mousemove', onMove);
  map.off('touchmove', onMove);
}

function tripOrigin(origin_coords) {
  return origin_coords.join(',');
}

function buildSidebar(trip) {
  // Extract the info you need from trip
  var waypoints = trip.waypoints.length;
  var distance = trip.trips[0].distance;
  var duration = trip.trips[0].duration;

  // Convert meters to miles
  var miles = distance * 0.000621371192;
  var miles_clipped = Math.round(miles*100)/100;

  // Convert seconds to minutes
  var minutes = duration * 0.0166667;
  var minutes_clipped = Math.round(minutes);

  // Add total trip distance/duration to sidebar
  total_stops.textContent = waypoints - 1;
  total_time.textContent = minutes_clipped;
  total_distance.textContent = miles_clipped;
  info_wrapper.classList.remove('none');
}
function removeMarkers(){
  if (counter !== 1) {
    var markers = document.getElementsByClassName('marker');

    for (var i = markers.length - 1; i > -1; i--) {
      markers[i].parentNode.removeChild(markers[i]);
    }
  }
}
function addMarkers(waypoints){
  waypoints.forEach(function(waypoint, i){
    // Do not show 0 way point -- this is the origin point.
    if (waypoint.waypoint_index === 0) return;
    
    var el = document.createElement('div');
      el.className = 'marker';
      el.textContent = waypoint.waypoint_index; 
      el.classList.add('marker', 'shadow-darken25');
      el.style.cursor = 'pointer';

    var marker = new mapboxgl.Marker(el);

    el.addEventListener('click', function(e) {
      e.stopPropagation();
      marker_coords = i - 1;
      stops_coordinates.splice(marker_coords, 1);
      marker.remove();

      if (stops_coordinates.length === 0) {
        map.getSource('trip-feature').setData(empty_feature);
        info_wrapper.classList.add('none');
      } else {
        map_spinner.classList.remove('none');

        origin = tripOrigin(origin_coords);
        var api_coordinates = stops_coordinates.join(';');

        getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar);
      }
    });

    marker.setLngLat(waypoint.location)
    marker.addTo(map);
  });
}
function drawMapFeatures(){
  var trip_feature = {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "properties": {},
      "geometry": trip.trips[0].geometry
    }]
  };
  // Add trip feature + remove points
  map.getSource('trip-feature').setData(trip_feature);
  map.getSource('trip-stops').setData(empty_feature);
  map.getSource('trip-stops-casing').setData(empty_feature);
  map.getSource('trip-stops-box-shadow').setData(empty_feature);
  stops_feature = {
    "type": "FeatureCollection",
    "features": []
  } 
}
function updateMapAndSidebar(err, body){
  trip = body;
  
  // Remove sidebar spinner
  spinner_div.classList.add('none');
  // Build sidebar
  buildSidebar(trip);
  // Remove markers
  removeMarkers();
  // Add markers
  addMarkers(trip.waypoints);
  // Update map
  drawMapFeatures();
  // Remove map spinner
  map_spinner.classList.add('none');
}
var stops_feature = {
  "type": "FeatureCollection",
  "features": []
}
var empty_feature = {
  "type": "FeatureCollection",
  "features": []
}

map.on('load', function(){
 map.addSource('trip-origin-casing',{
    "type": "geojson",
    "data": origin_feature
  });   
 map.addLayer({   
   "id": "trip-origin-casing-layer",    
   "source": "trip-origin-casing",    
   "type": "circle",    
   "paint": {   
     "circle-color": "#fff",    
     "circle-radius": 10
    }    
  });
  map.addSource('trip-origin', {
    "type": "geojson",
    "data": origin_feature
  });    
 map.addLayer({   
  "id": "trip-origin-layer",   
    "source": "trip-origin",   
  "type": "circle",    
    "paint": {   
      "circle-color": '#f25c5c',   
      "circle-radius": 6   
    }    
  });
  map.addSource('trip-feature', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip",
    "source": "trip-feature",
    "type": "line",
    "paint": {
      "line-color": green,
      "line-width": 3
    }
  });
  map.addSource('trip-stops-box-shadow', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip-stops-box-shadow-layer",
    "source": "trip-stops-box-shadow",
    "type": "circle",
    "paint": {
      "circle-color": "hsl(0, 0%, 62%)",
      "circle-radius": 9,
      "circle-opacity": 0.5,
      "circle-blur": 0.3
    }
  });
  map.addSource('trip-stops-casing', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip-stops-casing-layer",
    "source": "trip-stops-casing", 
    "type": "circle",
    "paint": {
      "circle-color": "#fff",
      "circle-radius": 7
    }
  });
  map.addSource('trip-stops', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip-markers",
    "source": "trip-stops",
    "type": "circle",
    "paint": {
      "circle-color": 'hsl(185, 3%, 77%)',
      "circle-radius": 5
    }
  });

  // Add sonar marker
  var divSonar = document.createElement('div');
  divSonar.classList.add('sonar-marker');

  sonarMarker = new mapboxgl.Marker(divSonar).setLngLat(origin_coords)
    .addTo(map);

  map.on('mouseenter', 'trip-origin-casing-layer', function() {
      map.setPaintProperty('trip-origin-casing-layer', 'circle-color', '#ddd');
      canvas.style.cursor = 'move';
  });

  map.on('mouseleave', 'trip-origin-casing-layer', function() {
      map.setPaintProperty('trip-origin-casing-layer', 'circle-color', '#f25c5c');
      canvas.style.cursor = '';
  });

  map.on('mousedown', 'trip-origin-layer', function(e) {
      // Prevent the default map drag behavior.
      e.preventDefault();

      canvas.style.cursor = 'grab';

      map.on('mousemove', onMove);
      map.once('mouseup', onUp);
  });

  map.on('touchstart', 'trip-origin-layer', function(e) {
      if (e.points.length !== 1) return;

      // Prevent the default map drag behavior.
      e.preventDefault();

      map.on('touchmove', onMove);
      map.once('touchend', onUp);
  });

});

// Add points on click (if not dragging point)
map.on('click', function(e){
  if (!isDragging) {
    var features = map.queryRenderedFeatures(e.point, { layers: ['trip-stops-box-shadow-layer', 'trip-stops-casing-layer', 'trip-markers']});

    var lngLat = map.unproject(e.point);
    stops_feature.features.push({
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [lngLat.lng,lngLat.lat]
      }
    });

    // If the number of stops is less than 11...
    if (stops_coordinates.length <= 10) {
     stops_coordinates.push([lngLat.lng,lngLat.lat]); 
      // Add points to the map
      map.getSource('trip-stops-box-shadow').setData(stops_feature);
      map.getSource('trip-stops-casing').setData(stops_feature);
      map.getSource('trip-stops').setData(stops_feature);

      counter++;

      // Add spinners
      if (counter === 1) { spinner_div.classList.remove('none'); }
      map_spinner.classList.remove('none');

      origin = tripOrigin(origin_coords);
      var api_coordinates = stops_coordinates.join(';');

      getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar);

    // Remove the first stops the user added and re-run
    } else if (stops_coordinates.length > 10) {
      stops_coordinates.push([lngLat.lng,lngLat.lat]); 
      // Add points to the map
      map.getSource('trip-stops-box-shadow').setData(stops_feature);
      map.getSource('trip-stops-casing').setData(stops_feature);
      map.getSource('trip-stops').setData(stops_feature);

      stops_coordinates.shift();

      origin = tripOrigin(origin_coords);
      var api_coordinates = stops_coordinates.join(';');

      getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar); 
    }    
  }
});
