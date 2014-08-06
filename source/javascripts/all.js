//= require 'jquery'
//= require 'fastclick'
//= require 'pouchdb'
//= require_tree .

FastClick.attach(document.body);

var db = new PouchDB('stamp-gps');

var geo = navigator.geolocation;
var $body = $(document.body);
var isTracking = false;
var $toggleTrackingBtn = $("#toggle-tracking");
var watchId;
var $coords = $("#coords");
var currentPosition = null;
var $data = $("#data");
var $stampBtn = $("#stamp").hide();
var $stampsContainer = $("#stamps").hide();
var $stampList = $("#stamp-list");
var $clearAllBtn = $("#clear-all-stamps");

//
// Event Listeners
//

$toggleTrackingBtn.click(function (e) {
  if (!isTracking) {
    startTracking();
    isTracking = true;
    $toggleTrackingBtn.text("Stop GPS Tracking");
  } else {
    stopTracking();
    isTracking = false;
    $stampBtn.hide();
    $toggleTrackingBtn.text("Start GPS Tracking");
  }

  $body.toggleClass("is-tracking");
});

$stampBtn.click(function (e) {
  stampPosition();
});

$clearAllBtn.click(function (e) {
  if (window.confirm("Clear All Stamps?")) {
    deleteStamps();
  }
});

//
// DB setup
//

db.info(function(err, info) {
  db.changes({
    since: info.update_seq,
    live: true
  }).on('change', showStamps);
});

//
// Func'uns
//

function startTracking () {
  watchId = geo.watchPosition(updatePosition);
}

function stopTracking () {
  geo.clearWatch(watchId);
}

function updatePosition (pos) {
  $stampBtn.show();
  currentPosition = pos;
  var coords = pos.coords;
  $coords.text(coords.latitude + ", " + coords.longitude);
  $data.text(JSON.stringify(pos, null, "  "));
}

function stampPosition () {
  if (!currentPosition) { throw new Error("currentPosition isn't set"); }

  var stamp = {
    _id: currentPosition.timestamp.toString(),
    coords: JSON.parse(JSON.stringify(currentPosition.coords))
  };

  db.put(stamp).then(function (res) {
    console.log('put success');
  }).catch(function (err) {
    console.log('put failed: ' + err.message);
  });
}

function showStamps () {
  db.allDocs({include_docs: true, descending: true}).then(function (doc) {
    redrawStampsUI(doc.rows);
  });
}

function redrawStampsUI (rows) {
  console.log(rows);
  if (rows.length) {
    $stampList.html(rows.map(function (row) {
      var doc = row.doc;
      var timestamp = new Date(+doc._id).toLocaleString();
      var lat = doc.coords.latitude;
      var lng = doc.coords.longitude;
      return "<li>" + lat + ",<br>" + lng + "<span class='timestamp'>" + timestamp + "</span></li>";
    }).join("\n"));

    $stampsContainer.show();
  } else {
    $stampsContainer.hide();
  }
}

function deleteStamps () {
  db.allDocs({include_docs: true }).then(function (all) {
    var toDelete = all.rows.map(function (row) { row.doc._deleted = true; return row.doc; });
    return db.bulkDocs(toDelete);
  });
}

//
// Init
//

showStamps();

