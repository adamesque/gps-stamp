//= require 'jquery'
//= require 'fastclick'
//= require_tree .

FastClick.attach(document.body);

var geo = navigator.geolocation;
var $body = $(document.body);
var isTracking = false;
var $toggleTrackingBtn = $("#toggle-tracking");
var watchId;
var $coords = $("#coords");
var currentCoords = {};
var $data = $("#data");
var $stampBtn = $("#stamp").hide();

$toggleTrackingBtn.click(function (e) {
  if (!isTracking) {
    startTracking();
    isTracking = true;
    $toggleTrackingBtn.text("Stop Tracking");
  } else {
    stopTracking();
    isTracking = false;
    $stampBtn.hide();
    $toggleTrackingBtn.text("Start Tracking");
  }

  $body.toggleClass("is-tracking");
});

$stampBtn.click(function (e) {
  stampPosition();
});


function startTracking () {
  watchId = geo.watchPosition(updatePosition);
}

function stopTracking () {
  geo.clearWatch(watchId);
}

function updatePosition (pos) {
  $stampBtn.show();
  currentCoords = pos.coords;
  $coords.text(currentCoords.latitude + ", " + currentCoords.longitude);
  $data.text(JSON.stringify(pos, null, "  "));
}

function stampPosition () {
  alert("sweet");
}
